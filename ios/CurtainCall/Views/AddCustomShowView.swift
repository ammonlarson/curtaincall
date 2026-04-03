import SwiftUI

struct AddCustomShowView: View {
    var defaultStatus: UserShow.ShowStatus = .seen

    @EnvironmentObject private var userDataVM: UserDataViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var title: String = ""
    @State private var theater: String = ""
    @State private var description: String = ""
    @State private var status: UserShow.ShowStatus = .seen

    @ScaledMetric(relativeTo: .body) private var descriptionMinHeight: CGFloat = 80

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Show Details") {
                    TextField("Title", text: $title)
                        .textInputAutocapitalization(.words)

                    TextField("Theater", text: $theater)
                        .textContentType(.organizationName)
                        .textInputAutocapitalization(.words)
                }

                Section("Description") {
                    TextEditor(text: $description)
                        .frame(minHeight: descriptionMinHeight)
                        .overlay(alignment: .topLeading) {
                            if description.isEmpty {
                                Text("Optional description...")
                                    .foregroundStyle(.tertiary)
                                    .padding(.top, 8)
                                    .padding(.leading, 4)
                                    .allowsHitTesting(false)
                            }
                        }
                }

                Section("Status") {
                    Picker("Status", selection: $status) {
                        ForEach(UserShow.ShowStatus.allCases, id: \.self) { s in
                            Text(s.rawValue).tag(s)
                        }
                    }
                    .pickerStyle(.segmented)
                }
            }
            .navigationTitle("Add Custom Show")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        userDataVM.addCustomShow(
                            title: title.trimmingCharacters(in: .whitespaces),
                            theater: theater.trimmingCharacters(in: .whitespaces),
                            description: description.trimmingCharacters(in: .whitespaces),
                            status: status
                        )
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(!canSave)
                }
            }
            .onAppear {
                status = defaultStatus
            }
        }
    }
}

#Preview {
    AddCustomShowView()
        .environmentObject(UserDataViewModel())
}
