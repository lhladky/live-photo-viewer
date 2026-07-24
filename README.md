# Live Photo Viewer

A cross-platform desktop app that displays a local folder of iPhone **Live Photos** the way iOS
does: a still image that animates when you press-and-hold. Point it at a folder, and it pairs each
still with its short video, shows a virtualized thumbnail strip plus one large preview, and plays
the motion on demand.

> Browse a folder of iPhone Live Photos and play them with press-and-hold. Windows, macOS, and
> Linux builds are supported. HEIC stills are **experimental** (see below).

## Features

- Open a folder via dialog, drag-and-drop, or a CLI argument.
- Pairs stills with their videos by filename (`IMG_1234.JPG` + `IMG_1234.MOV`), format-tolerant and
  case-insensitive.
- Virtualized thumbnail strip that stays smooth with thousands of photos.
- Fast, disk-cached thumbnails.
- **Press-and-hold** the preview to play the Live Photo; releasing (or the clip ending) reverts to
  the still.
- Arrow-key navigation between photos.

## How it works

The still and video are decoded/prepared locally rather than relying on the browser's codecs, so
playback is identical across operating systems:

- **Stills** — JPEG/PNG render natively in Chromium. HEIC is decoded with `libheif-js` (wasm) and is
  currently experimental (the bundled ffmpeg build cannot demux HEIF).
- **Thumbnails** — generated with a bundled `ffmpeg` (scaled JPEG), cached to disk, and produced by a
  small concurrency pool so the UI never blocks. Only visible thumbnails are decoded (lazy).
- **Videos** — probed with `ffprobe`; H.264 clips are remuxed to MP4 (near-instant), HEVC clips are
  transcoded to H.264. Prepared on selection so holding plays immediately.
- **Local files** reach the sandboxed renderer through a custom `media://` protocol that only serves
  files inside allow-listed folders.

## Tech stack

| Area           | Choice                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell          | [Electron](https://electronjs.org)                                                                                                                                                             |
| Build/dev      | [electron-vite](https://electron-vite.org) + [Vite](https://vite.dev)                                                                                                                          |
| UI             | [React](https://react.dev) + TypeScript                                                                                                                                                        |
| Virtualization | [react-window](https://github.com/bvaughn/react-window)                                                                                                                                        |
| Media          | [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static), [ffprobe-static](https://github.com/joshwnj/node-ffprobe-static), [libheif-js](https://github.com/catdad-experiments/libheif-js) |
| Lint / format  | [oxlint](https://oxc.rs) + [Prettier](https://prettier.io)                                                                                                                                     |
| Tests          | [Vitest](https://vitest.dev)                                                                                                                                                                   |

Chromium is bundled by Electron for consistent rendering. `oxlint` is used instead of ESLint because
`typescript-eslint` does not yet support TypeScript 7.

## Requirements

- **Node 26** (managed via nvm in this project). node/npm may not be on your `PATH` in
  non-interactive shells — either use an interactive shell or prefix commands with the nvm bin path,
  e.g. `export PATH="$HOME/.nvm/versions/node/v26.1.0/bin:$PATH"`.

## Local development

```bash
npm install          # installs deps + Electron binary + git hooks

npm run dev          # launch the app with hot reload
npm run build        # type-checked production build into out/

# Open a folder on launch without using the dialog (also powers drag-and-drop / open-with):
LPV_OPEN="/path/to/photos" npm run dev
```

Quality checks:

```bash
npm run typecheck    # tsc (node + web projects)
npm test             # vitest (pairing logic)
npm run lint         # oxlint --fix
npm run format       # prettier --write .
```

Put a few sample iPhone Live Photos (`.JPG`/`.HEIC` + `.MOV` pairs) in `_examples/` for manual
testing; that folder is gitignored.

## Project structure

```
src/
  main/       # Electron main process: window, IPC, folder scan, ffmpeg pipeline, media:// protocol
  preload/    # contextBridge API exposed to the renderer (window.viewer)
  renderer/   # React UI: gallery, thumbnail strip, preview, hold-to-play
  shared/     # types + helpers shared across processes
```

## Development guidelines

- **Formatting & linting are automatic.** A `simple-git-hooks` pre-commit hook runs `oxlint --fix`
  and `prettier --write` on staged files via `lint-staged` — don't hand-format.
- **Style:** always brace blocks (`curly`), prefer `import type` for type-only imports, no unused
  vars (prefix intentional ones with `_`).
- **TypeScript everywhere**, strict mode. Keep the renderer sandboxed (no Node APIs; go through the
  preload bridge).
- **Commits:** Conventional Commits with a functional scope describing the area, e.g.
  `feat(playback): …`, `fix(media): …`, `feat(gallery): …` — not milestone names.
- **Tests:** the file-pairing logic is pure and unit-tested; add cases there when changing it. Media
  decoding is verified manually against real samples.
- **Don't commit** `_examples/`, `node_modules/`, or build output (`out/`, `dist/`).

## Packaging & releases

Packaging uses [electron-builder](https://electron.build) (config in `electron-builder.yml`).

```bash
npm run package         # build installers for the current OS into dist/
npm run package:mac     # .dmg + .zip
npm run package:win     # NSIS installer + .zip
npm run package:linux   # AppImage + .deb
npm run package:dir     # unpacked app (fast, for smoke-testing)
```

> **Build each OS on that OS.** `ffmpeg-static` (and `ffprobe-static`) install only the _host_
> platform's binary, so a Windows build produced on macOS would bundle the macOS ffmpeg and fail to
> run. The `.github/workflows/release.yml` workflow builds Windows, macOS, and Linux on their own
> runners and attaches the installers to a GitHub Release when you push a `v*` tag:
>
> ```bash
> git tag v0.1.0 && git push --tags
> ```
>
> The ffmpeg/ffprobe binaries and the libheif-js wasm are unpacked out of the asar archive
> (`asarUnpack`) so they can execute at runtime.

## License

MIT
