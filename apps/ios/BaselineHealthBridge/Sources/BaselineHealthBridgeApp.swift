import BackgroundTasks
import SwiftUI
import UIKit

@main
struct BaselineHealthBridgeApp: App {
    @StateObject private var settings = BridgeSettingsStore()

    init() {
        BackgroundSyncManager.shared.register()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(settings)
                .task {
                    await settings.performLaunchSyncIfNeeded()
                }
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                    Task {
                        await settings.performLaunchSyncIfNeeded()
                    }
                }
        }
    }
}
