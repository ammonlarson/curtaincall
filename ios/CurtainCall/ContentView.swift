import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            CatalogView()
                .tabItem {
                    Label("Discover", systemImage: "magnifyingglass")
                }

            SeenShowsView()
                .tabItem {
                    Label("Seen", systemImage: "ticket")
                }

            WantToSeeView()
                .tabItem {
                    Label("Want to See", systemImage: "star")
                }
        }
        .tint(.accentColor)
    }
}

#Preview {
    ContentView()
        .environmentObject(CatalogViewModel())
        .environmentObject(UserDataViewModel())
}
