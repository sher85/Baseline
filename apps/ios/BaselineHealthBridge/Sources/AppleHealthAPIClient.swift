import Foundation

struct AppleHealthStatusResponse: Decodable {
    let provider: String
    let configured: Bool
    let latestSyncAt: String?
    let latestSuccessfulSyncAt: String?
    let latestStatus: String
    let lastErrorMessage: String?
}

struct AppleHealthIngestReceipt: Decodable {
    let success: Bool
    let batchId: String
    let receivedRecordCount: Int
    let storedRecordCount: Int
    let upsertedRecordCount: Int
    let duplicateCount: Int
    let serverSyncedAt: String
    let warnings: [String]
}

struct AppleHealthIngestRequest: Encodable {
    struct Device: Encodable {
        let name: String?
        let model: String?
        let systemVersion: String?
        let bundleIdentifier: String?
        let appVersion: String?
    }

    let clientSyncedThrough: String?
    let device: Device
    let records: AppleHealthPayloadBundle
}

struct AppleHealthPayloadBundle: Encodable {
    let workouts: [HealthBridgeWorkout]
    let quantities: [HealthBridgeQuantitySample]
    let categories: [HealthBridgeCategorySample]
}

struct AppleHealthAPIClient {
    let baseURL: String
    let token: String

    private var session: URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 180
        configuration.waitsForConnectivity = false

        return URLSession(configuration: configuration)
    }

    func testConnection() async throws -> AppleHealthStatusResponse {
        try await request(path: "/api/integrations/apple-health/status", method: "GET", body: Optional<String>.none)
    }

    func ingest(_ payload: AppleHealthIngestRequest) async throws -> AppleHealthIngestReceipt {
        try await request(path: "/api/integrations/apple-health/ingest", method: "POST", body: payload)
    }

    private func request<T: Decodable, Body: Encodable>(
        path: String,
        method: String,
        body: Body?
    ) async throws -> T {
        let normalizedBaseURL = baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        guard let url = URL(string: normalizedBaseURL + path) else {
            throw BridgeError.invalidBaseURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.sortedKeys]
            encoder.dateEncodingStrategy = .iso8601
            request.httpBody = try encoder.encode(body)
        }

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw BridgeError.invalidResponse
        }

        guard (200 ..< 300).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown server error"
            throw BridgeError.serverError(statusCode: httpResponse.statusCode, message: message)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode(T.self, from: data)
    }
}

enum BridgeError: LocalizedError {
    case invalidBaseURL
    case invalidResponse
    case serverError(statusCode: Int, message: String)
    case healthKitUnavailable

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "The Baseline API URL is invalid."
        case .invalidResponse:
            return "The Baseline API returned an invalid response."
        case let .serverError(statusCode, message):
            return "Baseline API error \(statusCode): \(message)"
        case .healthKitUnavailable:
            return "HealthKit is not available on this device."
        }
    }
}
