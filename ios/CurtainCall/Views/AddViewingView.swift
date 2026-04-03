import SwiftUI

struct AddViewingView: View {
    var defaultTheater: String = ""
    var onSave: (Viewing) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var date: Date = .now
    @State private var theater: String = ""
    @State private var companions: String = ""
    @State private var notes: String = ""
    @State private var rating: Int? = nil

    @ScaledMetric(relativeTo: .body) private var notesMinHeight: CGFloat = 80

    var body: some View {
        NavigationStack {
            Form {
                Section("When") {
                    DatePicker(
                        "Date",
                        selection: $date,
                        in: ...Date.now,
                        displayedComponents: .date
                    )
                }

                Section("Where") {
                    TextField("Theater", text: $theater)
                        .textContentType(.organizationName)
                }

                Section("Who") {
                    TextField("Companions (e.g., Sarah, Mike)", text: $companions)
                        .textContentType(.name)
                }

                Section("Rating") {
                    HStack {
                        Text("Your Rating")
                        Spacer()
                        StarRatingView(rating: $rating)
                    }
                }

                Section("Notes") {
                    TextEditor(text: $notes)
                        .frame(minHeight: notesMinHeight)
                        .overlay(alignment: .topLeading) {
                            if notes.isEmpty {
                                Text("What did you think? Any memorable moments?")
                                    .foregroundStyle(.tertiary)
                                    .padding(.top, 8)
                                    .padding(.leading, 4)
                                    .allowsHitTesting(false)
                            }
                        }
                }
            }
            .navigationTitle("Add Viewing")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let viewing = Viewing(
                            date: date,
                            theater: theater,
                            companions: companions,
                            notes: notes,
                            rating: rating
                        )
                        onSave(viewing)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .onAppear {
                if theater.isEmpty {
                    theater = defaultTheater
                }
            }
        }
    }
}

#Preview {
    AddViewingView(defaultTheater: "Richard Rodgers Theatre") { viewing in
        print("Saved: \(viewing)")
    }
}
