import SwiftUI

struct ShowDetailView: View {
    let show: Show

    @EnvironmentObject private var userDataVM: UserDataViewModel
    @State private var showingAddViewing = false
    @State private var showingConfirmRemoval = false

    @ScaledMetric(relativeTo: .body) private var headerHeight: CGFloat = 250

    private var userShow: UserShow? {
        userDataVM.userShow(for: show.id)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                headerImage
                contentSection
            }
        }
        .navigationTitle(show.title)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingAddViewing) {
            AddViewingView(defaultTheater: show.theater) { viewing in
                if let us = userShow {
                    userDataVM.addViewing(to: us.id, viewing: viewing)
                } else {
                    // Auto-mark as seen when adding a viewing.
                    userDataVM.markAsSeen(show: show)
                    if let us = userDataVM.userShow(for: show.id) {
                        userDataVM.addViewing(to: us.id, viewing: viewing)
                    }
                }
            }
        }
        .alert("Remove Show", isPresented: $showingConfirmRemoval) {
            Button("Remove", role: .destructive) {
                if let us = userShow {
                    userDataVM.removeUserShow(id: us.id)
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Remove \"\(show.title)\" from your list? This will delete all associated viewings.")
        }
    }

    // MARK: - Header

    private var headerImage: some View {
        ZStack(alignment: .bottomLeading) {
            if let urlString = show.imageUrl, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        headerPlaceholder
                    }
                }
            } else {
                headerPlaceholder
            }
        }
        .frame(height: headerHeight)
        .frame(maxWidth: .infinity)
        .clipped()
    }

    private var headerPlaceholder: some View {
        ZStack {
            LinearGradient(
                colors: [.accentColor.opacity(0.6), .accentColor.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Image(systemName: "theatermasks.fill")
                .font(.system(size: 60))
                .foregroundStyle(.white.opacity(0.5))
        }
    }

    // MARK: - Content

    private var contentSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Title and basic info
            VStack(alignment: .leading, spacing: 6) {
                Text(show.title)
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Label(show.theater, systemImage: "building.2")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Label(show.dateRange, systemImage: "calendar")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                HStack(spacing: 8) {
                    Text(show.category.displayName)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.accentColor.cornerRadius(4))

                    if show.isCurrentlyRunning {
                        Text("NOW PLAYING")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(.green)
                    }
                }
            }

            // Action buttons
            actionButtons

            // Description
            if !show.description.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("About")
                        .font(.headline)
                    Text(show.description)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
            }

            // Credits
            if !show.credits.isEmpty {
                creditsSection
            }

            // Viewings (if user has this show)
            if let us = userShow, us.status == .seen {
                viewingsSection(us)
            }

            Spacer(minLength: 40)
        }
        .padding()
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 12) {
            if let us = userShow {
                // Show current status with options
                if us.status == .seen {
                    Button {
                        showingAddViewing = true
                    } label: {
                        Label("Add Viewing", systemImage: "plus.circle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)

                    Menu {
                        Button {
                            userDataVM.updateStatus(showId: us.id, status: .wantToSee)
                        } label: {
                            Label("Move to Want to See", systemImage: "star")
                        }
                        Button(role: .destructive) {
                            showingConfirmRemoval = true
                        } label: {
                            Label("Remove from List", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.title3)
                    }
                    .buttonStyle(.bordered)
                } else {
                    Button {
                        userDataVM.updateStatus(showId: us.id, status: .seen)
                    } label: {
                        Label("Mark as Seen", systemImage: "checkmark.circle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)

                    Button(role: .destructive) {
                        showingConfirmRemoval = true
                    } label: {
                        Image(systemName: "trash")
                    }
                    .buttonStyle(.bordered)
                }
            } else {
                Button {
                    userDataVM.markAsSeen(show: show)
                } label: {
                    Label("Mark as Seen", systemImage: "checkmark.circle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)

                Button {
                    userDataVM.markAsWantToSee(show: show)
                } label: {
                    Label("Want to See", systemImage: "star")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
        }
    }

    // MARK: - Credits

    private var creditsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Credits")
                .font(.headline)

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), alignment: .topLeading),
                    GridItem(.flexible(), alignment: .topLeading)
                ],
                spacing: 10
            ) {
                ForEach(show.credits, id: \.role) { credit in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(credit.role)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(credit.name)
                            .font(.subheadline)
                    }
                }
            }
        }
    }

    // MARK: - Viewings

    private func viewingsSection(_ userShow: UserShow) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Viewings (\(userShow.viewings.count))")
                    .font(.headline)
                Spacer()
                Button {
                    showingAddViewing = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                }
            }

            if userShow.viewings.isEmpty {
                Text("No viewings recorded yet.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 8)
            } else {
                ForEach(userShow.viewings.sorted(by: { $0.date > $1.date })) { viewing in
                    viewingRow(viewing, userShowId: userShow.id)
                    if viewing.id != userShow.viewings.sorted(by: { $0.date > $1.date }).last?.id {
                        Divider()
                    }
                }
            }
        }
    }

    private func viewingRow(_ viewing: Viewing, userShowId: UUID) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(viewing.formattedDate)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Spacer()
                if let rating = viewing.rating {
                    HStack(spacing: 2) {
                        ForEach(1...5, id: \.self) { star in
                            Image(systemName: star <= rating ? "star.fill" : "star")
                                .font(.caption2)
                                .foregroundStyle(.yellow)
                        }
                    }
                }
                Button(role: .destructive) {
                    userDataVM.removeViewing(from: userShowId, viewingId: viewing.id)
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.red.opacity(0.7))
            }

            if !viewing.theater.isEmpty {
                Label(viewing.theater, systemImage: "building.2")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if !viewing.companions.isEmpty {
                Label(viewing.companions, systemImage: "person.2")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if !viewing.notes.isEmpty {
                Text(viewing.notes)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    NavigationStack {
        ShowDetailView(
            show: Show(
                id: "1",
                title: "Hamilton",
                description: "The story of America then, told by America now. Featuring a score that blends hip-hop, jazz, R&B, and Broadway.",
                openingDate: "2015-08-06",
                closingDate: nil,
                theater: "Richard Rodgers Theatre",
                imageUrl: nil,
                composer: "Lin-Manuel Miranda",
                lyricist: "Lin-Manuel Miranda",
                bookWriter: "Lin-Manuel Miranda",
                director: "Thomas Kail",
                musicDirector: "Alex Lacamoire",
                choreographer: "Andy Blankenbuehler",
                isCurrentlyRunning: true,
                category: .musical
            )
        )
        .environmentObject(UserDataViewModel())
    }
}
