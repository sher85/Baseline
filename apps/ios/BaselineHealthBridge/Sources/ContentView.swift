import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var settings: BridgeSettingsStore

    var body: some View {
        NavigationStack {
            Form {
                Section("Baseline API") {
                    TextField("http://192.168.1.166:3001", text: $settings.apiURL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    SecureField("Bearer token", text: $settings.authToken)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }

                Section("Sync") {
                    Picker("Frequency", selection: Binding(
                        get: { settings.syncFrequency },
                        set: { settings.syncFrequency = $0 }
                    )) {
                        ForEach(SyncFrequency.allCases) { option in
                            Text(option.label).tag(option)
                        }
                    }

                    if let lastSuccess = settings.lastSuccessfulSyncAt {
                        LabeledContent("Last Successful Sync") {
                            Text(lastSuccess.formatted(date: .abbreviated, time: .shortened))
                        }
                    } else {
                        LabeledContent("Last Successful Sync") {
                            Text("Never")
                        }
                    }

                    LabeledContent("Last Status") {
                        Text(settings.lastStatus)
                    }

                    if !settings.lastError.isEmpty {
                        Text(settings.lastError)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Actions") {
                    Button(settings.isTestingConnection ? "Testing..." : "Test Connection") {
                        Task {
                            await settings.testConnection()
                        }
                    }
                    .disabled(settings.isTestingConnection)

                    Button(settings.isSyncing ? "Syncing..." : "Sync Now") {
                        Task {
                            await settings.syncNow(trigger: .manual)
                        }
                    }
                    .disabled(settings.isSyncing)
                }

                Section("What Baseline Reads") {
                    Text("Workouts, routes when available, steps, active energy, sleep, resting heart rate, HRV, VO2 max, body weight, and body fat percentage.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Health Bridge")
        }
    }
}
