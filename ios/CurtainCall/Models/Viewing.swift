import Foundation

struct Viewing: Identifiable, Codable, Equatable {
    let id: UUID
    var date: Date
    var theater: String
    var companions: String
    var notes: String
    var rating: Int? // 1-5 stars, optional

    init(
        id: UUID = UUID(),
        date: Date = .now,
        theater: String = "",
        companions: String = "",
        notes: String = "",
        rating: Int? = nil
    ) {
        self.id = id
        self.date = date
        self.theater = theater
        self.companions = companions
        self.notes = notes
        self.rating = rating
    }
}

// MARK: - Formatting

extension Viewing {
    /// Formatted date string for display.
    var formattedDate: String {
        date.formatted(date: .long, time: .omitted)
    }

    /// Short summary used in list rows.
    var summary: String {
        var parts: [String] = [formattedDate]
        if !theater.isEmpty { parts.append(theater) }
        return parts.joined(separator: " · ")
    }
}
