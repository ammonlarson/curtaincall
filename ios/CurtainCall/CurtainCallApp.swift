import SwiftUI

@main
struct CurtainCallApp: App {
    @StateObject private var catalogVM = CatalogViewModel()
    @StateObject private var userDataVM = UserDataViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(catalogVM)
                .environmentObject(userDataVM)
        }
    }
}
