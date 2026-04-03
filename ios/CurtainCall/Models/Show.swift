import Foundation

struct Show: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let description: String
    let openingDate: String?
    let closingDate: String?
    let theater: String
    let imageURL: String?
    let composer: String?
    let lyricist: String?
    let bookWriter: String?
    let director: String?
    let musicDirector: String?
    let choreographer: String?
    let isCurrentlyRunning: Bool
    let category: ShowCategory

    enum ShowCategory: String, Codable, CaseIterable {
        case musical = "Musical"
        case play = "Play"
        case revival = "Revival"
        case special = "Special Event"
    }
}

// MARK: - Convenience

extension Show {
    /// Human-readable date range for display.
    var dateRange: String {
        let open = openingDate ?? "TBD"
        if let close = closingDate {
            return "\(open) – \(close)"
        }
        return isCurrentlyRunning ? "\(open) – Present" : open
    }

    /// Aggregated credits suitable for iteration.
    var credits: [(role: String, name: String)] {
        var result: [(String, String)] = []
        if let v = composer       { result.append(("Composer", v)) }
        if let v = lyricist       { result.append(("Lyricist", v)) }
        if let v = bookWriter     { result.append(("Book", v)) }
        if let v = director       { result.append(("Director", v)) }
        if let v = musicDirector  { result.append(("Music Director", v)) }
        if let v = choreographer  { result.append(("Choreographer", v)) }
        return result
    }
}
