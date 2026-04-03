import Foundation

// MARK: - API Errors

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse(statusCode: Int)
    case decodingFailed(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "The request URL is invalid."
        case .invalidResponse(let code):
            return "The server returned an unexpected response (HTTP \(code))."
        case .decodingFailed:
            return "Failed to parse the server response."
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

// MARK: - API Service

@MainActor
final class APIService: ObservableObject {
    static let shared = APIService()

    private let baseURL = "https://api.curtaincall.app"
    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
    }

    // MARK: - Public

    /// Fetch the full catalog of shows.
    func fetchShows() async throws -> [Show] {
        let url = try buildURL(path: "/v1/shows")
        return try await perform(URLRequest(url: url))
    }

    /// Fetch a single show by ID.
    func fetchShow(id: String) async throws -> Show {
        let url = try buildURL(path: "/v1/shows/\(id)")
        return try await perform(URLRequest(url: url))
    }

    /// Search shows by query string.
    func searchShows(query: String) async throws -> [Show] {
        var url = try buildURL(path: "/v1/shows/search")
        url.append(queryItems: [URLQueryItem(name: "q", value: query)])
        return try await perform(URLRequest(url: url))
    }

    // MARK: - Private Helpers

    private func buildURL(path: String) throws -> URL {
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }
        return url
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data: Data
        let response: URLResponse

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse(statusCode: 0)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.invalidResponse(statusCode: httpResponse.statusCode)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingFailed(error)
        }
    }
}
