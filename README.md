# Doodle District Desktop

Tauri shell around the Doodle District web game (static assets copied into
`dist/` from `../doodle`). Produces a real desktop window on Windows/macOS/
Linux instead of opening a browser tab.

## Local dev (needs Rust + the platform's native build tools)

```bash
npx @tauri-apps/cli dev
```

## Building the Windows installer

Tauri cannot cross-compile a Windows build from macOS/Linux (it links against
the native WebView2/MSVC toolchain). Two options:

1. **CI (recommended)**: push to `main` on GitHub — `.github/workflows/build.yml`
   builds the Windows `.exe` (NSIS) and macOS `.dmg` and publishes them
   to the GitHub release `v<version>`.
2. **On an actual Windows machine**: install Rust + "Desktop development with
   C++" (Visual Studio Build Tools), then run:
   ```bash
   npx @tauri-apps/cli build
   ```
   The installer lands in `src-tauri/target/release/bundle/nsis/`.

## Updating the bundled frontend

`dist/` is the release build of the game (minified + obfuscated, `npm run dist`
in `doodle-district/doodle`), post-processed by `tools/app-www.mjs` (drops
Google Analytics, sets `window.DOODLE_APP = 1` so multiplayer uses the same
signalling server and room pool as the web version). To re-sync:

```bash
cd ../doodle-district/doodle
node tools/app-www.mjs ../../doodle-desktop/dist
```
