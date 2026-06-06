import HealthKit

final class HealthKitManager {
    private let store = HKHealthStore()
    private let initialLookbackDays = 14
    static let backfillChunkDays = 14

    private var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            HKSeriesType.workoutRoute(),
            HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!
        ]

        [
            HKQuantityTypeIdentifier.stepCount,
            HKQuantityTypeIdentifier.activeEnergyBurned,
            HKQuantityTypeIdentifier.heartRate,
            HKQuantityTypeIdentifier.restingHeartRate,
            HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
            HKQuantityTypeIdentifier.vo2Max,
            HKQuantityTypeIdentifier.bodyMass,
            HKQuantityTypeIdentifier.bodyFatPercentage,
            HKQuantityTypeIdentifier.distanceWalkingRunning
        ]
            .compactMap { HKQuantityType.quantityType(forIdentifier: $0) }
            .forEach { types.insert($0) }

        return types
    }

    func requestAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw BridgeError.healthKitUnavailable
        }

        try await store.requestAuthorization(toShare: [], read: readTypes)
    }

    func fetchPayloadBundle(since lastSuccessfulSyncAt: Date?) async throws -> AppleHealthPayloadBundle {
        let overlapSeconds: TimeInterval = 7 * 24 * 60 * 60
        let initialLookbackSeconds = TimeInterval(initialLookbackDays * 24 * 60 * 60)
        let queryStart = lastSuccessfulSyncAt.map {
            $0.addingTimeInterval(-overlapSeconds)
        } ?? Date().addingTimeInterval(-initialLookbackSeconds)

        return try await fetchPayloadBundle(from: queryStart, to: nil)
    }

    func fetchPayloadBundle(from startDate: Date, to endDate: Date?) async throws -> AppleHealthPayloadBundle {
        async let workouts = fetchWorkouts(from: startDate, to: endDate)
        async let quantities = fetchQuantitySamples(from: startDate, to: endDate)
        async let categories = fetchCategorySamples(from: startDate, to: endDate)

        return try await AppleHealthPayloadBundle(
            workouts: workouts,
            quantities: quantities,
            categories: categories
        )
    }

    private func fetchWorkouts(from startDate: Date, to endDate: Date?) async throws -> [HealthBridgeWorkout] {
        let samples = try await fetchSamples(
            sampleType: HKObjectType.workoutType(),
            predicate: HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [])
        )

        var results: [HealthBridgeWorkout] = []

        for sample in samples {
            guard let workout = sample as? HKWorkout else {
                continue
            }

            let heartRateSummary = try await workoutHeartRateSummary(for: workout)
            let source = healthBridgeSource(from: workout.sourceRevision)
            let metadata = [
                "averageHeartRateBpm": heartRateSummary.average.map { String(format: "%.1f", $0) } ?? "",
                "minimumHeartRateBpm": heartRateSummary.minimum.map { String(format: "%.1f", $0) } ?? "",
                "maximumHeartRateBpm": heartRateSummary.maximum.map { String(format: "%.1f", $0) } ?? ""
            ].filter { !$0.value.isEmpty }

            results.append(
                HealthBridgeWorkout(
                externalId: workout.uuid.uuidString,
                activityType: workout.workoutActivityType.displayName,
                startTime: ISO8601DateFormatter.shared.string(from: workout.startDate),
                endTime: ISO8601DateFormatter.shared.string(from: workout.endDate),
                totalActiveEnergyCalories: workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()),
                totalDistanceMeters: workout.totalDistance?.doubleValue(for: .meter()),
                source: source,
                label: workout.metadata?[HKMetadataKeyWorkoutBrandName] as? String,
                metadata: metadata,
                route: []
            )
            )
        }

        return results
    }

    private func fetchQuantitySamples(from startDate: Date, to endDate: Date?) async throws -> [HealthBridgeQuantitySample] {
        let identifiers: [(HKQuantityTypeIdentifier, String, HKUnit)] = [
            (.stepCount, "step_count", .count()),
            (.activeEnergyBurned, "active_energy_burned", .kilocalorie()),
            (.restingHeartRate, "resting_heart_rate", HKUnit.count().unitDivided(by: .minute())),
            (.heartRateVariabilitySDNN, "heart_rate_variability_sdnn", .secondUnit(with: .milli)),
            (.vo2Max, "vo2_max", HKUnit(from: "mL/(kg*min)")),
            (.bodyMass, "body_mass", .gramUnit(with: .kilo)),
            (.bodyFatPercentage, "body_fat_percentage", .percent()),
            (.distanceWalkingRunning, "walking_running_distance", .meter())
        ]

        var results: [HealthBridgeQuantitySample] = []

        for (identifier, sampleType, unit) in identifiers {
            guard let quantityType = HKQuantityType.quantityType(forIdentifier: identifier) else {
                continue
            }

            let samples = try await fetchSamples(
                sampleType: quantityType,
                predicate: HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [])
            )

            for sample in samples {
                guard let quantitySample = sample as? HKQuantitySample else {
                    continue
                }

                results.append(
                    HealthBridgeQuantitySample(
                        externalId: quantitySample.uuid.uuidString,
                        sampleType: sampleType,
                        startTime: ISO8601DateFormatter.shared.string(from: quantitySample.startDate),
                        endTime: ISO8601DateFormatter.shared.string(from: quantitySample.endDate),
                        value: quantitySample.quantity.doubleValue(for: unit),
                        unit: unit.unitString,
                        source: healthBridgeSource(from: quantitySample.sourceRevision),
                        metadata: [:]
                    )
                )
            }
        }

        return results
    }

    private func fetchCategorySamples(from startDate: Date, to endDate: Date?) async throws -> [HealthBridgeCategorySample] {
        guard let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else {
            return []
        }

        let samples = try await fetchSamples(
            sampleType: sleepType,
            predicate: HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [])
        )

        return samples.compactMap { sample in
            guard let categorySample = sample as? HKCategorySample else {
                return nil
            }

            return HealthBridgeCategorySample(
                externalId: categorySample.uuid.uuidString,
                categoryType: "sleep_analysis",
                startTime: ISO8601DateFormatter.shared.string(from: categorySample.startDate),
                endTime: ISO8601DateFormatter.shared.string(from: categorySample.endDate),
                value: String(categorySample.value),
                source: healthBridgeSource(from: categorySample.sourceRevision),
                metadata: [:]
            )
        }
    }

    private func workoutHeartRateSummary(for workout: HKWorkout) async throws -> (average: Double?, minimum: Double?, maximum: Double?) {
        guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
            return (nil, nil, nil)
        }

        let samples = try await fetchSamples(
            sampleType: heartRateType,
            predicate: HKQuery.predicateForSamples(withStart: workout.startDate, end: workout.endDate, options: [])
        )

        let values = samples.compactMap { sample -> Double? in
            guard let quantitySample = sample as? HKQuantitySample else {
                return nil
            }

            return quantitySample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
        }

        guard !values.isEmpty else {
            return (nil, nil, nil)
        }

        let average = values.reduce(0, +) / Double(values.count)

        return (average, values.min(), values.max())
    }

    private func fetchSamples(sampleType: HKSampleType, predicate: NSPredicate?) async throws -> [HKSample] {
        try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: sampleType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                continuation.resume(returning: samples ?? [])
            }

            store.execute(query)
        }
    }

    private func healthBridgeSource(from sourceRevision: HKSourceRevision) -> HealthBridgeSource {
        HealthBridgeSource(
            bundleIdentifier: sourceRevision.source.bundleIdentifier,
            name: sourceRevision.source.name,
            productType: sourceRevision.productType
        )
    }
}

private extension HKWorkoutActivityType {
    var displayName: String {
        switch self {
        case .running:
            return "running"
        case .traditionalStrengthTraining, .functionalStrengthTraining:
            return "weight_lifting"
        case .paddleSports:
            return "kayaking"
        default:
            return String(describing: self)
                .replacingOccurrences(of: "HKWorkoutActivityType", with: "")
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .lowercased()
        }
    }
}

private extension HKUnit {
    var unitString: String {
        if self == .count() {
            return "count"
        }

        if self == .kilocalorie() {
            return "kcal"
        }

        if self == .meter() {
            return "m"
        }

        if self == .gramUnit(with: .kilo) {
            return "kg"
        }

        if self == .percent() {
            return "percent"
        }

        if self == .secondUnit(with: .milli) {
            return "ms"
        }

        return String(describing: self)
    }
}
