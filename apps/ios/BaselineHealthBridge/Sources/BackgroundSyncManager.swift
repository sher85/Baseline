import BackgroundTasks
import Foundation

final class BackgroundSyncManager {
    static let shared = BackgroundSyncManager()

    static let syncFrequencyDefaultsKey = "baseline.syncFrequency"

    private let taskIdentifier = "com.baseline.HealthBridge.refresh"

    private init() {}

    func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskIdentifier, using: nil) { task in
            guard let refreshTask = task as? BGAppRefreshTask else {
                task.setTaskCompleted(success: false)
                return
            }

            self.handle(task: refreshTask)
        }
    }

    func schedule(using frequency: SyncFrequency) {
        guard let interval = frequency.interval else {
            return
        }

        let request = BGAppRefreshTaskRequest(identifier: taskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: interval)

        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("Unable to schedule background sync: \(error)")
        }
    }

    private func handle(task: BGAppRefreshTask) {
        schedule(using: currentSyncFrequency())

        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }

        Task {
            let settings = await MainActor.run { BridgeSettingsStore() }
            await settings.syncNow(trigger: .background)
            task.setTaskCompleted(success: true)
        }
    }

    private func currentSyncFrequency() -> SyncFrequency {
        let rawValue = UserDefaults.standard.string(forKey: Self.syncFrequencyDefaultsKey)

        return rawValue.flatMap(SyncFrequency.init(rawValue:)) ?? .manual
    }
}
