import SwiftUI

struct StarRatingView: View {
    @Binding var rating: Int?
    var maxStars: Int = 5
    var readOnly: Bool = false

    @ScaledMetric(relativeTo: .body) private var starSize: CGFloat = 24

    var body: some View {
        HStack(spacing: 4) {
            ForEach(1...maxStars, id: \.self) { star in
                Image(systemName: starImageName(for: star))
                    .resizable()
                    .scaledToFit()
                    .frame(width: starSize, height: starSize)
                    .foregroundStyle(starColor(for: star))
                    .onTapGesture {
                        guard !readOnly else { return }
                        withAnimation(.easeInOut(duration: 0.15)) {
                            if rating == star {
                                rating = nil // tap again to deselect
                            } else {
                                rating = star
                            }
                        }
                    }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityText)
        .accessibilityAdjustableAction { direction in
            guard !readOnly else { return }
            switch direction {
            case .increment:
                let current = rating ?? 0
                if current < maxStars { rating = current + 1 }
            case .decrement:
                let current = rating ?? 0
                if current > 1 { rating = current - 1 } else { rating = nil }
            @unknown default:
                break
            }
        }
    }

    // MARK: - Helpers

    private func starImageName(for star: Int) -> String {
        guard let current = rating else { return "star" }
        return star <= current ? "star.fill" : "star"
    }

    private func starColor(for star: Int) -> Color {
        guard let current = rating else { return .gray.opacity(0.4) }
        return star <= current ? .yellow : .gray.opacity(0.4)
    }

    private var accessibilityText: String {
        if let rating {
            return "\(rating) of \(maxStars) stars"
        }
        return "No rating"
    }
}

// MARK: - Read-Only Convenience

struct StarRatingDisplayView: View {
    let rating: Double?
    var maxStars: Int = 5

    @ScaledMetric(relativeTo: .caption) private var starSize: CGFloat = 14

    var body: some View {
        if let rating {
            HStack(spacing: 2) {
                ForEach(1...maxStars, id: \.self) { star in
                    Image(systemName: Double(star) <= rating ? "star.fill" : (Double(star) - 0.5 <= rating ? "star.leadinghalf.filled" : "star"))
                        .resizable()
                        .scaledToFit()
                        .frame(width: starSize, height: starSize)
                        .foregroundStyle(.yellow)
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(String(format: "%.1f of %d stars", rating, maxStars))
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        StarRatingView(rating: .constant(3))
        StarRatingView(rating: .constant(nil))
        StarRatingDisplayView(rating: 3.5)
    }
    .padding()
}
