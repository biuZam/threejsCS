// Doodle District desktop shell: just boots the Tauri window and loads the
// bundled static frontend (see ../dist). No custom commands needed.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Doodle District");
}
