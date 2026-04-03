import SwiftUI

struct SeenShowsView: View {
    @EnvironmentObject private var catalogVM: CatalogViewModel
    @EnvironmentObject private var userDataVM: UserDataViewModel
    @State private var showingAddCustomShow = false

    private var sortedSeenShows: [UserShow] {
        userDataVM.sortedShows(userDataVM.seenShows, by: userDataVM.sortOption, catalog: catalogVM.shows)
    }

    var body: some View {
        NavigationStack {
            Group {
                if sortedSeenShows.isEmpty {
                    EmptyStateView(
                        icon: "ticket",
                        title: "No Shows Seen",
                        message: "Shows you mark as seen will appear here. Start by browsing the catalog!",
                        buttonTitle: "Add Custom Show"
                    ) {
                        showingAddCustomShow = true
                    }
                } else {
                    seenList
                }
            }
            .navigationTitle("Seen")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    sortMenu
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddCustomShow = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddCustomShow) {
                AddCustomShowView(defaultStatus: .seen)
            }
        }
    }

    // MARK: - List

    private var seenList: some View {
        List {
            ForEach(sortedSeenShows) { userShow in
                NavigationLink {
                    if let show = catalogVM.shows.first(where: { $0.id == userShow.showId }) {
                        ShowDetailView(show: show)
                    } else {
                        customShowDetail(userShow)
                    }
                } label: {
                    seenShowRow(userShow)
                }
            }
            .onDelete(perform: deleteShows)
        }
        .listStyle(.plain)
    }

    private func seenShowRow(_ userShow: UserShow) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(userShow.displayTitle(from: catalogVM.shows))
                .font(.headline)

            HStack(spacing: 12) {
                Label(
                    "\(userShow.viewings.count) viewing\(userShow.viewings.count == 1 ? "" : "s")",
                    systemImage: "ticket"
                )
                .font(.caption)
                .foregroundStyle(.secondary)

                if let lastDate = userShow.lastViewedDate {
                    Label(
                        lastDate.formatted(date: .abbreviated, time: .omitted),
                        systemImage: "calendar"
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
            }

            if let avgRating = userShow.averageRating {
                StarRatingDisplayView(rating: avgRating)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Custom Show Detail Fallback

    private func customShowDetail(_ userShow: UserShow) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(userShow.customTitle ?? "Untitled")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                if let theater = userShow.customTheater, !theater.isEmpty {
                    Label(theater, systemImage: "building.2")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if let desc = userShow.customDescription, !desc.isEmpty {
                    Text(desc)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }

                Divider()

                Text("Viewings (\(userShow.viewings.count))")
                    .font(.headline)

                ForEach(userShow.viewings.sorted(by: { $0.date > $1.date })) { viewing in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(viewing.formattedDate)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        if !viewing.theater.isEmpty {
                            Text(viewing.theater)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if !viewing.notes.isEmpty {
                            Text(viewing.notes)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 2)
                    Divider()
                }
            }
            .padding()
        }
        .navigationTitle(userShow.customTitle ?? "Show")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Sort

    private var sortMenu: some View {
        Menu {
            Picker("Sort By", selection: $userDataVM.sortOption) {
                ForEach(SortOption.allCases, id: \.self) { option in
                    Text(option.rawValue).tag(option)
                }
            }
        } label: {
            Label("Sort", systemImage: "arrow.up.arrow.down")
        }
    }

    // MARK: - Actions

    private func deleteShows(at offsets: IndexSet) {
        let showsToDelete = offsets.map { sortedSeenShows[$0] }
        for show in showsToDelete {
            userDataVM.removeUserShow(id: show.id)
        }
    }
}

#Preview {
    SeenShowsView()
        .environmentObject(CatalogViewModel())
        .environmentObject(UserDataViewModel())
}
