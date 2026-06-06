import Foundation
import UIKit

struct AppleHealthSyncEngine {
    let healthKitManager: HealthKitManager
    let apiClient: AppleHealthAPIClient
    let lastSuccessfulSyncAt: Date?
    let progress: @MainActor (String) -> Void

    func runSync(trigger: SyncTrigger) async throws -> AppleHealthIngestReceipt {
        await MainActor.run {
            progress("Requesting Health Access")
        }
        try await healthKitManager.requestAuthorization()
        await MainActor.run {
            progress("Reading Health Data")
        }
        let payloadBundle = try await healthKitManager.fetchPayloadBundle(
            since: lastSuccessfulSyncAt
        )
        await MainActor.run {
            progress("Uploading Health Data")
        }
        let payload = AppleHealthIngestRequest(
            clientSyncedThrough: lastSuccessfulSyncAt.map {
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

        return receipt
    }
}
