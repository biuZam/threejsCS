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

1. **CI (recommended)**: push to `main` on GitHub — `.github/workflows/build-windows.yml`
   builds on a `windows-latest` runner and uploads the `.exe` (NSIS installer)
   as a workflow artifact.
2. **On an actual Windows machine**: install Rust + "Desktop development with
   C++" (Visual Studio Build Tools), then run:
   ```bash
   npx @tauri-apps/cli build
   ```
   The installer lands in `src-tauri/target/release/bundle/nsis/`.

## Updating the bundled frontend

`dist/` is a copy of the relevant files from `../doodle` (everything except
the dev-server scripts and Node tooling). After editing the game, re-sync:

```bash
cd ../doodle
cp index.html game.js style.css i18n.js ads.js three-hook.js peer-hook.js paper.js favicon.ico ../doodle-desktop/dist/
cp -R ads lib translations ../doodle-desktop/dist/
```

Multiplayer signalling: the desktop build always uses the public
`0.peerjs.com` server (see `peer-hook.js`) since it doesn't bundle the local
`peerserver-go` signalling server.
