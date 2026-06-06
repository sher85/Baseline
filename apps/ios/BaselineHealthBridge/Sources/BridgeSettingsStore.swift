import Foundation
import SwiftUI

@MainActor
final class BridgeSettingsStore: ObservableObject {
    @AppStorage("baseline.apiURL") var apiURL = "http://192.168.1.166:3001"
    @AppStorage("baseline.authToken") var authToken = ""
    @AppStorage(BackgroundSyncManager.syncFrequencyDefaultsKey) private var syncFrequencyRawValue = SyncFrequency.manual.rawValue
    @AppStorage("baseline.lastSuccessfulSyncAt") private var lastSuccessfulSyncAtValue = ""
    @AppStorage("baseline.backfillCursorAt") private var backfillCursorAtValue = ""
    @AppStorage("baseline.lastStatus") var lastStatus = "Idle"
    @AppStorage("baseline.lastError") var lastError = ""

    @Published var isSyncing = false
    @Published var isTestingConnection = false
    @Published var isBackfilling = false

    var syncFrequency: SyncFrequency {
        get {
            SyncFrequency(rawValue: syncFrequencyRawValue) ?? .manual
        }
        set {
            syncFrequencyRawValue = newValue.rawValue
            BackgroundSyncManager.shared.schedule(using: newValue)
        }
    }

    var lastSuccessfulSyncAt: Date? {
        get {
            ISO8601DateFormatter.shared.date(from: lastSuccessfulSyncAtValue)
        }
        set {
            lastSuccessfulSyncAtValue = newValue.map { ISO8601DateFormatter.shared.string(from: $0) } ?? ""
        }
    }

    var backfillCursorAt: Date? {
        get {
            ISO8601DateFormatter.shared.date(from: backfillCursorAtValue)
        }
        set {
            backfillCursorAtValue = newValue.map { ISO8601DateFormatter.shared.string(from: $0) } ?? ""
        }
    }

    func performLaunchSyncIfNeeded() async {
        guard syncFrequency != .manual else {
            return
        }

        guard !isSyncing, !isTestingConnection, !isBackfilling else {
            return
        }

        await syncNow(trigger: .appLaunch)
    }

    private func trimmedAPIURL() -> String {
        apiURL.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func trimmedAuthToken() -> String {
        authToken.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func validateConnectionSettings() -> Bool {
        if trimmedAPIURL().isEmpty {
            lastStatus = "Missing API URL"
            lastError = "Enter the Baseline API URL first."

            return false
        }

        if trimmedAuthToken().isEmpty {
            lastStatus = "Missing Token"
            lastError = "Enter the API_TOKEN first."

            return false
        }

        return true
    }

    func testConnection() async {
        guard !isSyncing, !isBackfilling else {
            lastStatus = "Sync Running"
            lastError = "Wait for the current sync to finish before testing the connection."

            return
        }

        guard validateConnectionSettings() else {
            return
        }

        isTestingConnection = true
        lastStatus = "Testing Connection"
        lastError = ""
        defer { isTestingConnection = false }

        do {
            _ = try await AppleHealthAPIClient(
                baseURL: trimmedAPIURL(),
                token: trimmedAuthToken()
            ).testConnection()
            lastStatus = "Connection OK"
            lastError = ""
        } catch {
            lastStatus = "Connection Failed"
            lastError = error.localizedDescription
        }
    }

    func syncNow(trigger: SyncTrigger) async {
        guard !isSyncing else {
            return
        }

        guard validateConnectionSettings() else {
            return
        }

        isSyncing = true
        lastStatus = "Sync Running"
        defer { isSyncing = false }

        do {
          let engine = AppleHealthSyncEngine(
              healthKitManager: HealthKitManager(),
              apiClient: AppleHealthAPIClient(
                  baseURL: trimmedAPIURL(),
                  token: trimmedAuthToken()
              ),
              lastSuccessfulSyncAt: lastSuccessfulSyncAt,
              progress: { [weak self] status in
                  self?.lastStatus = status
              }
          )
          let receipt = try await engine.runSync(trigger: trigger)
          lastSuccessfulSyncAt = ISO8601DateFormatter.shared.date(from: receipt.serverSyncedAt)
          lastStatus = "Sync Succeeded"
          lastError = receipt.warnings.joined(separator: "\n")
        } catch {
          lastStatus = "Sync Failed"
          lastError = error.localizedDescription
        }
    }

    func backfillHistory() async {
        guard !isSyncing, !isBackfilling else {
            return
        }

        guard validateConnectionSettings() else {
            return
        }

        isBackfilling = true
        lastStatus = "Backfill Running"
        lastError = ""
        defer { isBackfilling = false }

        let chunkSeconds = TimeInterval(HealthKitManager.backfillChunkDays * 24 * 60 * 60)
        let targetDate = Date().addingTimeInterval(-365 * 24 * 60 * 60)
        var chunkEnd = backfillCursorAt ?? Date().addingTimeInterval(-chunkSeconds)
        var completedChunks = 0
        var storedRecords = 0
        var upsertedRecords = 0

        do {
            let engine = AppleHealthSyncEngine(
                healthKitManager: HealthKitManager(),
                apiClient: AppleHealthAPIClient(
                    baseURL: trimmedAPIURL(),
                    token: trimmedAuthToken()
                ),
                lastSuccessfulSyncAt: lastSuccessfulSyncAt,
                progress: { [weak self] status in
                    self?.lastStatus = status
                }
            )

            while chunkEnd > targetDate {
                let chunkStart = maxDate(chunkEnd.addingTimeInterval(-chunkSeconds), targetDate)
                let chunkNumber = completedChunks + 1
                lastStatus = "Backfilling Chunk \(chunkNumber)"

                let receipt = try await engine.runBackfillChunk(
                    from: chunkStart,
                    to: chunkEnd
                )

                completedChunks += 1
                storedRecords += receipt.storedRecordCount
                upsertedRecords += receipt.upsertedRecordCount
                backfillCursorAt = chunkStart
                chunkEnd = chunkStart
            }

            lastStatus = "Backfill Succeeded"
            lastError = "Backfilled \(completedChunks) chunks. Stored \(storedRecords) new records and updated \(upsertedRecords)."
        } catch {
            lastStatus = "Backfill Paused"
            lastError = "\(error.localizedDescription)\n\nProgress was saved through the last successful chunk. Tap Backfill History to continue."
        }
    }
}

private func maxDate(_ first: Date, _ second: Date) -> Date {
    first > second ? first : second
}

enum SyncFrequency: String, CaseIterable, Identifiable {
    case manual
    case every6Hours
    case every12Hours
    case every24Hours

    var id: String { rawValue }

    var label: String {
        switch self {
        case .manual:
            return "Manual only"
        case .every6Hours:
            return "Every 6h"
        case .every12Hours:
            return "Every 12h"
        case .every24Hours:
            return "Every 24h"
        }
    }

    var interval: TimeInterval? {
        switch self {
        case .manual:
            return nil
        case .every6Hours:
            return 6 * 60 * 60
        case .every12Hours:
            return 12 * 60 * 60
        case .every24Hours:
            return 24 * 60 * 60
        }
    }
}

enum SyncTrigger: String {
    case appLaunch
    case manual
    case background
}

extension ISO8601DateFormatter {
    static let shared: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
