import Foundation

struct HealthBridgeWorkout: Encodable {
    struct RoutePoint: Encodable {
        let latitude: Double
        let longitude: Double
        let altitudeMeters: Double?
        let horizontalAccuracyMeters: Double?
        let timestamp: String
    }

    let externalId: String?
    let activityType: String
    let startTime: String
    let endTime: String
    let totalActiveEnergyCalories: Double?
    let totalDistanceMeters: Double?
    let source: HealthBridgeSource
    let label: String?
    let metadata: [String: String]
    let route: [RoutePoint]
}

struct HealthBridgeQuantitySample: Encodable {
    let externalId: String?
    let sampleType: String
    let startTime: String
    let endTime: String?
    let value: Double
    let unit: String
    let source: HealthBridgeSource
    let metadata: [String: String]
}

struct HealthBridgeCategorySample: Encodable {
    let externalId: String?
    let categoryType: String
    let startTime: String
    let endTime: String
    let value: String
    let source: HealthBridgeSource
    let metadata: [String: String]
}

struct HealthBridgeSource: Encodable {
    let bundleIdentifier: String?
    let name: String?
    let productType: String?
}
