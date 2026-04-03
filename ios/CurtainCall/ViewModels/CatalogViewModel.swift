import Foundation
import Combine

@MainActor
final class CatalogViewModel: ObservableObject {

    // MARK: - Published State

    @Published var shows: [Show] = []
    @Published var searchText: String = ""
    @Published var sortOption: SortOption = .titleAZ
    @Published var filterCategory: Show.ShowCategory? = nil
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil

    // MARK: - Private

    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()
    private var searchTask: Task<Void, Never>?

    // MARK: - Init

    init() {
        // Debounce search text changes for remote search.
        $searchText
            .debounce(for: .milliseconds(400), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] query in
                guard let self else { return }
                if query.isEmpty {
                    // Reset to full catalog when search is cleared.
                    Task { await self.loadShows() }
                } else {
                    Task { await self.searchShows() }
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Computed

    var filteredShows: [Show] {
        var result = shows

        // Apply local search filter (supplements server-side search).
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.title.lowercased().contains(query)
                || $0.theater.lowercased().contains(query)
                || ($0.composer?.lowercased().contains(query) ?? false)
                || ($0.director?.lowercased().contains(query) ?? false)
            }
        }

        // Apply category filter.
        if let category = filterCategory {
            result = result.filter { $0.category == category }
        }

        // Apply sort.
        switch sortOption {
        case .titleAZ:
            result.sort { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        case .titleZA:
            result.sort { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedDescending }
        case .newestFirst:
            result.sort { ($0.openingDate ?? "") > ($1.openingDate ?? "") }
        case .oldestFirst:
            result.sort { ($0.openingDate ?? "") < ($1.openingDate ?? "") }
        case .recentlyViewed, .rating:
            // These sorts apply to user data, not catalog. Fall back to title.
            result.sort { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        }

        return result
    }

    // MARK: - Actions

    func loadShows() async {
        isLoading = true
        errorMessage = nil
        do {
            shows = try await apiService.fetchShows()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func searchShows() async {
        searchTask?.cancel()
        let query = searchText
        guard !query.isEmpty else { return }

        searchTask = Task {
            isLoading = true
            errorMessage = nil
            do {
                let results = try await apiService.searchShows(query: query)
                if !Task.isCancelled {
                    shows = results
                }
            } catch {
                if !Task.isCancelled {
                    errorMessage = error.localizedDescription
                }
            }
            if !Task.isCancelled {
                isLoading = false
            }
        }
    }
}
