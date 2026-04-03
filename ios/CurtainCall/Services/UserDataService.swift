import Foundation

final class UserDataService {
    static let shared = UserDataService()

    private let storageKey = "userShows"
    private let defaults = UserDefaults.standard
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    private init() {}

    // MARK: - Read

    func loadUserShows() -> [UserShow] {
        guard let data = defaults.data(forKey: storageKey) else { return [] }
        do {
            return try decoder.decode([UserShow].self, from: data)
        } catch {
            print("[UserDataService] Failed to decode user shows: \(error)")
            return []
        }
    }

    // MARK: - Write

    func saveUserShows(_ shows: [UserShow]) {
        do {
            let data = try encoder.encode(shows)
            defaults.set(data, forKey: storageKey)
        } catch {
            print("[UserDataService] Failed to encode user shows: \(error)")
        }
    }

    // MARK: - Convenience Mutations

    func addOrUpdateUserShow(_ show: UserShow) {
        var shows = loadUserShows()
        if let index = shows.firstIndex(where: { $0.id == show.id }) {
            shows[index] = show
        } else {
            shows.append(show)
        }
        saveUserShows(shows)
    }

    func removeUserShow(id: UUID) {
        var shows = loadUserShows()
        shows.removeAll(where: { $0.id == id })
        saveUserShows(shows)
    }

    func addViewing(to showId: UUID, viewing: Viewing) {
        var shows = loadUserShows()
        guard let index = shows.firstIndex(where: { $0.id == showId }) else { return }
        shows[index].viewings.append(viewing)
        saveUserShows(shows)
    }

    func removeViewing(from showId: UUID, viewingId: UUID) {
        var shows = loadUserShows()
        guard let index = shows.firstIndex(where: { $0.id == showId }) else { return }
        shows[index].viewings.removeAll(where: { $0.id == viewingId })
        saveUserShows(shows)
    }
}
