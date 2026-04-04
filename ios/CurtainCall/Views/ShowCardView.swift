import SwiftUI

struct ShowCardView: View {
    let show: Show
    var userStatus: UserShow.ShowStatus?
    var viewingCount: Int = 0

    @ScaledMetric(relativeTo: .body) private var imageHeight: CGFloat = 120
    @ScaledMetric(relativeTo: .caption2) private var badgePadding: CGFloat = 4

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Poster image
            posterImage
                .frame(width: imageHeight * 0.7, height: imageHeight)
                .clipShape(RoundedRectangle(cornerRadius: 8))

            // Show info
            VStack(alignment: .leading, spacing: 4) {
                // Category badge
                Text(show.category.displayName.uppercased())
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, badgePadding * 2)
                    .padding(.vertical, badgePadding)
                    .background(categoryColor.cornerRadius(4))

                Text(show.title)
                    .font(.headline)
                    .lineLimit(2)

                Text(show.theater)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if let dates = formattedDates {
                    Text(dates)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }

                Spacer(minLength: 0)

                // Status row
                HStack(spacing: 6) {
                    if let userStatus {
                        Label(
                            userStatus.rawValue,
                            systemImage: userStatus == .seen ? "checkmark.circle.fill" : "star.fill"
                        )
                        .font(.caption)
                        .foregroundStyle(userStatus == .seen ? .green : .orange)
                    }

                    if viewingCount > 0 {
                        Text("\(viewingCount) viewing\(viewingCount == 1 ? "" : "s")")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if show.isCurrentlyRunning {
                        Text("NOW PLAYING")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundStyle(.green)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
    }

    // MARK: - Subviews

    @ViewBuilder
    private var posterImage: some View {
        if let urlString = show.imageUrl, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    placeholderImage
                case .empty:
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color(.systemGray6))
                @unknown default:
                    placeholderImage
                }
            }
        } else {
            placeholderImage
        }
    }

    private var placeholderImage: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "theatermasks")
                .font(.title2)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Helpers

    private var categoryColor: Color {
        switch show.category {
        case .musical:  return .accentColor
        case .play:     return .blue
        case .revival:  return .purple
        case .special:  return .orange
        }
    }

    private var formattedDates: String? {
        show.dateRange
    }
}

#Preview {
    ShowCardView(
        show: Show(
            id: "1",
            title: "Hamilton",
            description: "A musical about Alexander Hamilton",
            openingDate: "2015-08-06",
            closingDate: nil,
            theater: "Richard Rodgers Theatre",
            imageUrl: nil,
            composer: "Lin-Manuel Miranda",
            lyricist: "Lin-Manuel Miranda",
            bookWriter: "Lin-Manuel Miranda",
            director: "Thomas Kail",
            musicDirector: nil,
            choreographer: "Andy Blankenbuehler",
            isCurrentlyRunning: true,
            category: .musical
        ),
        userStatus: .seen,
        viewingCount: 3
    )
    .padding()
}
