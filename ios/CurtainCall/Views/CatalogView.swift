import SwiftUI

struct CatalogView: View {
    @EnvironmentObject private var catalogVM: CatalogViewModel
    @EnvironmentObject private var userDataVM: UserDataViewModel

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter chips
                FilterChipRow(
                    categories: Show.ShowCategory.allCases,
                    selectedCategory: $catalogVM.filterCategory
                )
                .padding(.vertical, 8)

                // Content
                Group {
                    if catalogVM.isLoading && catalogVM.shows.isEmpty {
                        loadingView
                    } else if let error = catalogVM.errorMessage, catalogVM.shows.isEmpty {
                        errorView(error)
                    } else if catalogVM.filteredShows.isEmpty {
                        EmptyStateView(
                            icon: "magnifyingglass",
                            title: "No Shows Found",
                            message: catalogVM.searchText.isEmpty
                                ? "No shows match the current filters."
                                : "No results for \"\(catalogVM.searchText)\".",
                            buttonTitle: "Clear Filters"
                        ) {
                            catalogVM.searchText = ""
                            catalogVM.filterCategory = nil
                        }
                    } else {
                        showsList
                    }
                }
            }
            .navigationTitle("Discover")
            .searchable(
                text: $catalogVM.searchText,
                placement: .navigationBarDrawer(displayMode: .always),
                prompt: "Search shows, theaters, artists..."
            )
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    sortMenu
                }
            }
            .task {
                if catalogVM.shows.isEmpty {
                    await catalogVM.loadShows()
                }
            }
        }
    }

    // MARK: - Subviews

    private var showsList: some View {
        List {
            ForEach(catalogVM.filteredShows) { show in
                NavigationLink(value: show.id) {
                    let userShow = userDataVM.userShow(for: show.id)
                    ShowCardView(
                        show: show,
                        userStatus: userShow?.status,
                        viewingCount: userShow?.viewings.count ?? 0
                    )
                }
            }
        }
        .listStyle(.plain)
        .refreshable {
            await catalogVM.loadShows()
        }
        .navigationDestination(for: String.self) { showId in
            if let show = catalogVM.shows.first(where: { $0.id == showId }) {
                ShowDetailView(show: show)
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            Spacer()
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading shows...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
        }
    }

    private func errorView(_ message: String) -> some View {
        EmptyStateView(
            icon: "exclamationmark.triangle",
            title: "Something Went Wrong",
            message: message,
            buttonTitle: "Try Again"
        ) {
            Task { await catalogVM.loadShows() }
        }
    }

    private var sortMenu: some View {
        Menu {
            Picker("Sort By", selection: $catalogVM.sortOption) {
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
    CatalogView()
        .environmentObject(CatalogViewModel())
        .environmentObject(UserDataViewModel())
}
