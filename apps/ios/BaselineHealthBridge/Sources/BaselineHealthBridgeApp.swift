import SwiftUI
import UIKit

@main
struct BaselineHealthBridgeApp: App {
    @StateObject private var settings = BridgeSettingsStore()

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
