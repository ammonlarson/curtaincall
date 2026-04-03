import SwiftUI

struct FilterChipView: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    @ScaledMetric(relativeTo: .subheadline) private var verticalPadding: CGFloat = 6
    @ScaledMetric(relativeTo: .subheadline) private var horizontalPadding: CGFloat = 14

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, horizontalPadding)
                .padding(.vertical, verticalPadding)
                .foregroundStyle(isSelected ? .white : .primary)
                .background(
                    Capsule()
                        .fill(isSelected ? Color.accentColor : Color(.systemGray5))
                )
                .overlay(
                    Capsule()
                        .strokeBorder(isSelected ? Color.clear : Color(.systemGray3), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Filter Chip Row

struct FilterChipRow: View {
    let categories: [Show.ShowCategory]
    @Binding var selectedCategory: Show.ShowCategory?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChipView(
                    title: "All",
                    isSelected: selectedCategory == nil
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedCategory = nil
                    }
                }

                ForEach(categories, id: \.rawValue) { category in
                    FilterChipView(
                        title: category.rawValue,
                        isSelected: selectedCategory == category
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedCategory = (selectedCategory == category) ? nil : category
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

#Preview {
    VStack {
        FilterChipRow(
            categories: Show.ShowCategory.allCases,
            selectedCategory: .constant(.musical)
        )
    }
}
