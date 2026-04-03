import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var buttonTitle: String? = nil
    var buttonAction: (() -> Void)? = nil

    @ScaledMetric(relativeTo: .largeTitle) private var iconSize: CGFloat = 60

    var body: some View {
        ContentUnavailableView {
            Label {
                Text(title)
            } icon: {
                Image(systemName: icon)
                    .font(.system(size: iconSize))
                    .foregroundStyle(.secondary)
            }
        } description: {
            Text(message)
                .multilineTextAlignment(.center)
        } actions: {
            if let buttonTitle, let buttonAction {
                Button(action: buttonAction) {
                    Text(buttonTitle)
                        .fontWeight(.medium)
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }
}

#Preview {
    EmptyStateView(
        icon: "ticket",
        title: "No Shows Yet",
        message: "Shows you've seen will appear here.",
        buttonTitle: "Browse Catalog",
        buttonAction: {}
    )
}
