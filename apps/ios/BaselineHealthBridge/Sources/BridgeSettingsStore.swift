import Foundation
import SwiftUI

@MainActor
final class BridgeSettingsStore: ObservableObject {
    @AppStorage("baseline.apiURL") var apiURL = "http://192.168.1.10:3001"
    @AppStorage("baseline.authToken") var authToken = ""
    @AppStorage(BackgroundSyncManager.syncFrequencyDefaultsKey) private var syncFrequencyRawValue = SyncFrequency.manual.rawValue
    @AppStorage("baseline.lastSuccessfulSyncAt") private var lastSuccessfulSyncAtValue = ""
    @AppStorage("baseline.lastStatus") var lastStatus = "Idle"
    @AppStorage("baseline.lastError") var lastError = ""

    @Published var isSyncing = false
    @Published var isTestingConnection = false

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

    func performLaunchSyncIfNeeded() async {
        guard !isSyncing else {
            return
        }

        if lastStatus == "Idle" || syncFrequency != .manual {
            await syncNow(trigger: .appLaunch)
        }
    }

    func testConnection() async {
        isTestingConnection = true
        defer { isTestingConnection = false }

        do {
            _ = try await AppleHealthAPIClient(baseURL: apiURL, token: authToken).testConnection()
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

        isSyncing = true
        lastStatus = "Sync Running"
        defer { isSyncing = false }

        do {
          let engine = AppleHealthSyncEngine(
              healthKitManager: HealthKitManager(),
              apiClient: AppleHealthAPIClient(baseURL: apiURL, token: authToken),
              lastSuccessfulSyncAt: lastSuccessfulSyncAt
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
