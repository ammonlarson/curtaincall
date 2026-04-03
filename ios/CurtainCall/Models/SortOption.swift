import Foundation

enum SortOption: String, CaseIterable {
    case titleAZ = "Title (A-Z)"
    case titleZA = "Title (Z-A)"
    case newestFirst = "Newest First"
    case oldestFirst = "Oldest First"
    case recentlyViewed = "Recently Viewed"
    case rating = "Highest Rated"
}
