import SwiftUI

struct WantToSeeView: View {
    @EnvironmentObject private var catalogVM: CatalogViewModel
    @EnvironmentObject private var userDataVM: UserDataViewModel
    @State private var showingAddCustomShow = false

    private var sortedWantToSeeShows: [UserShow] {
        userDataVM.sortedShows(userDataVM.wantToSeeShows, by: userDataVM.sortOption, catalog: catalogVM.shows)
    }

    var body: some View {
        NavigationStack {
            Group {
                if sortedWantToSeeShows.isEmpty {
                    EmptyStateView(
                        icon: "star",
                        title: "No Shows on Your List",
                        message: "Browse the catalog and tap \"Want to See\" to add shows here.",
                        buttonTitle: "Add Custom Show"
                    ) {
                        showingAddCustomShow = true
                    }
                } else {
                    wantToSeeList
                }
            }
            .navigationTitle("Want to See")
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
                AddCustomShowView(defaultStatus: .wantToSee)
            }
        }
    }

    // MARK: - List

    private var wantToSeeList: some View {
        List {
            ForEach(sortedWantToSeeShows) { userShow in
                NavigationLink {
                    if let show = catalogVM.shows.first(where: { $0.id == userShow.showId }) {
                        ShowDetailView(show: show)
                    } else {
                        customShowPlaceholder(userShow)
                    }
                } label: {
                    wantToSeeRow(userShow)
                }
                .swipeActions(edge: .leading, allowsFullSwipe: true) {
                    Button {
                        userDataVM.updateStatus(showId: userShow.id, status: .seen)
                    } label: {
                        Label("Seen", systemImage: "checkmark.circle")
                    }
                    .tint(.green)
                }
                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                    Button(role: .destructive) {
                        userDataVM.removeUserShow(id: userShow.id)
                    } label: {
                        Label("Remove", systemImage: "trash")
                    }
                }
            }
        }
        .listStyle(.plain)
    }

    private func wantToSeeRow(_ userShow: UserShow) -> some View {
        HStack(spacing: 12) {
            showThumbnail(userShow)
                .frame(width: 50, height: 50)
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text(userShow.displayTitle(from: catalogVM.shows))
                    .font(.headline)

                if let show = catalogVM.shows.first(where: { $0.id == userShow.showId }) {
                    Text(show.theater)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if show.isCurrentlyRunning {
                        Text("NOW PLAYING")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundStyle(.green)
                    }
                } else if let theater = userShow.customTheater, !theater.isEmpty {
                    Text(theater)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func showThumbnail(_ userShow: UserShow) -> some View {
        if let show = catalogVM.shows.first(where: { $0.id == userShow.showId }),
           let urlString = show.imageURL,
           let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    thumbnailPlaceholder
                }
            }
        } else {
            thumbnailPlaceholder
        }
    }

    private var thumbnailPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            Image(systemName: "theatermasks")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func customShowPlaceholder(_ userShow: UserShow) -> some View {
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

            Spacer()
        }
        .padding()
        .navigationTitle(userShow.customTitle ?? "Show")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Sort

    private var sortMenu: some View {
        Menu {
            Picker("Sort By", selection: $userDataVM.sortOption) {
                ForEach([SortOption.titleAZ, .titleZA, .newestFirst, .oldestFirst], id: \.self) { option in
                    Text(option.rawValue).tag(option)
                }
            }
        } label: {
            Label("Sort", systemImage: "arrow.up.arrow.down")
        }
    }
}

#Preview {
    WantToSeeView()
        .environmentObject(CatalogViewModel())
        .environmentObject(UserDataViewModel())
}
