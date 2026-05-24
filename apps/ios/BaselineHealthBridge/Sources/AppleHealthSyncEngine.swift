import Foundation
import UIKit

protocol BridgeSettingsProviding: AnyObject {
    var apiURL: String { get }
    var authToken: String { get }
    var lastSuccessfulSyncAt: Date? { get set }
}

extension BridgeSettingsStore: BridgeSettingsProviding {}

struct AppleHealthSyncEngine {
    let settingsProvider: BridgeSettingsProviding
    let healthKitManager: HealthKitManager
    let apiClient: AppleHealthAPIClient

    func runSync(trigger: SyncTrigger) async throws -> AppleHealthIngestReceipt {
        try await healthKitManager.requestAuthorization()
        let payloadBundle = try await healthKitManager.fetchPayloadBundle(
            since: settingsProvider.lastSuccessfulSyncAt
        )
        let payload = AppleHealthIngestRequest(
            clientSyncedThrough: settingsProvider.lastSuccessfulSyncAt.map {
                ISO8601DateFormatter.shared.string(from: $0)
            },
            device: .init(
                name: UIDevice.current.name,
                model: UIDevice.current.model,
                systemVersion: UIDevice.current.systemVersion,
                bundleIdentifier: Bundle.main.bundleIdentifier,
                appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
            ),
            records: payloadBundle
        )
        let receipt = try await apiClient.ingest(payload)

        if receipt.success {
            settingsProvider.lastSuccessfulSyncAt = ISO8601DateFormatter.shared.date(
                from: receipt.serverSyncedAt
            )
        }

        return receipt
    }
}
