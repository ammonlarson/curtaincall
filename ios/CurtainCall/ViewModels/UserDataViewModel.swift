import Foundation
import Combine

@MainActor
final class UserDataViewModel: ObservableObject {

    // MARK: - Published State

    @Published var userShows: [UserShow] = []
    @Published var sortOption: SortOption = .titleAZ

    // MARK: - Private

    private let dataService = UserDataService.shared

    // MARK: - Init

    init() {
        userShows = dataService.loadUserShows()
    }

    // MARK: - Computed

    var seenShows: [UserShow] {
        userShows.filter { $0.status == .seen }
    }

    var wantToSeeShows: [UserShow] {
        userShows.filter { $0.status == .wantToSee }
    }

    // MARK: - Lookup

    /// Find the UserShow for a given catalog show ID, if one exists.
    func userShow(for showId: String) -> UserShow? {
        userShows.first(where: { $0.showId == showId })
    }

    /// Check whether a show has been added to the user's collection.
    func status(for showId: String) -> UserShow.ShowStatus? {
        userShows.first(where: { $0.showId == showId })?.status
    }

    // MARK: - Mark Actions

    func markAsSeen(show: Show) {
        if let index = userShows.firstIndex(where: { $0.showId == show.id }) {
            userShows[index].status = .seen
        } else {
            let userShow = UserShow(showId: show.id, status: .seen)
            userShows.append(userShow)
        }
        persist()
    }

    func markAsWantToSee(show: Show) {
        if let index = userShows.firstIndex(where: { $0.showId == show.id }) {
            userShows[index].status = .wantToSee
        } else {
            let userShow = UserShow(showId: show.id, status: .wantToSee)
            userShows.append(userShow)
        }
        persist()
    }

    func updateStatus(showId: UUID, status: UserShow.ShowStatus) {
        guard let index = userShows.firstIndex(where: { $0.id == showId }) else { return }
        userShows[index].status = status
        persist()
    }

    // MARK: - Viewing Management

    func addViewing(to showId: UUID, viewing: Viewing) {
        guard let index = userShows.firstIndex(where: { $0.id == showId }) else { return }
        userShows[index].viewings.append(viewing)
        persist()
    }

    func removeViewing(from showId: UUID, viewingId: UUID) {
        guard let index = userShows.firstIndex(where: { $0.id == showId }) else { return }
        userShows[index].viewings.removeAll(where: { $0.id == viewingId })
        persist()
    }

    // MARK: - Custom Shows

    func addCustomShow(title: String, theater: String, description: String, status: UserShow.ShowStatus) {
        let customId = "custom-\(UUID().uuidString)"
        let userShow = UserShow(
            showId: customId,
            status: status,
            customTitle: title,
            customTheater: theater,
            customDescription: description,
            isCustom: true
        )
        userShows.append(userShow)
        persist()
    }

    // MARK: - Remove

    func removeUserShow(id: UUID) {
        userShows.removeAll(where: { $0.id == id })
        persist()
    }

    // MARK: - Sorting

    func sortedShows(_ shows: [UserShow], by option: SortOption, catalog: [Show]) -> [UserShow] {
        switch option {
        case .titleAZ:
            return shows.sorted {
                $0.displayTitle(from: catalog)
                    .localizedCaseInsensitiveCompare($1.displayTitle(from: catalog)) == .orderedAscending
            }
        case .titleZA:
            return shows.sorted {
                $0.displayTitle(from: catalog)
                    .localizedCaseInsensitiveCompare($1.displayTitle(from: catalog)) == .orderedDescending
            }
        case .newestFirst:
            return shows.sorted { lhs, rhs in
                let d0 = catalog.first(where: { $0.id == lhs.showId })?.openingDate ?? ""
                let d1 = catalog.first(where: { $0.id == rhs.showId })?.openingDate ?? ""
                return d0 > d1
            }
        case .oldestFirst:
            return shows.sorted { lhs, rhs in
                let d0 = catalog.first(where: { $0.id == lhs.showId })?.openingDate ?? ""
                let d1 = catalog.first(where: { $0.id == rhs.showId })?.openingDate ?? ""
                return d0 < d1
            }
        case .recentlyViewed:
            return shows.sorted {
                ($0.lastViewedDate ?? .distantPast) > ($1.lastViewedDate ?? .distantPast)
            }
        case .rating:
            return shows.sorted {
                ($0.averageRating ?? 0) > ($1.averageRating ?? 0)
            }
        }
    }

    // MARK: - Persistence

    private func persist() {
        dataService.saveUserShows(userShows)
    }
}
