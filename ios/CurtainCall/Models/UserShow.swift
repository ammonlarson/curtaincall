import Foundation

struct UserShow: Identifiable, Codable, Equatable {
    let id: UUID
    let showId: String
    var status: ShowStatus
    var viewings: [Viewing]
    var customTitle: String?
    var customTheater: String?
    var customDescription: String?
    var customImageData: Data?
    var isCustom: Bool

    enum ShowStatus: String, Codable, CaseIterable {
        case seen = "Seen"
        case wantToSee = "Want to See"
    }

    init(
        id: UUID = UUID(),
        showId: String,
        status: ShowStatus,
        viewings: [Viewing] = [],
        customTitle: String? = nil,
        customTheater: String? = nil,
        customDescription: String? = nil,
        customImageData: Data? = nil,
        isCustom: Bool = false
    ) {
        self.id = id
        self.showId = showId
        self.status = status
        self.viewings = viewings
        self.customTitle = customTitle
        self.customTheater = customTheater
        self.customDescription = customDescription
        self.customImageData = customImageData
        self.isCustom = isCustom
    }
}

// MARK: - Computed Helpers

extension UserShow {
    /// Display title — prefers the catalog title but falls back to custom.
    func displayTitle(from catalog: [Show]) -> String {
        if isCustom { return customTitle ?? "Untitled" }
        return catalog.first(where: { $0.id == showId })?.title ?? customTitle ?? "Unknown Show"
    }

    /// Most recent viewing date, if any.
    var lastViewedDate: Date? {
        viewings.map(\.date).max()
    }

    /// Average rating across all viewings that have a rating.
    var averageRating: Double? {
        let rated = viewings.compactMap(\.rating)
        guard !rated.isEmpty else { return nil }
        return Double(rated.reduce(0, +)) / Double(rated.count)
    }

    /// Best (highest) rating across viewings.
    var bestRating: Int? {
        viewings.compactMap(\.rating).max()
    }
}
