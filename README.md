# MarkedUp

MarkedUp is a local-first browser capture and annotation tool for collecting webpages, screenshots, and PDFs, then marking them up with shapes, text, icons, emojis, notes, and exports.

This file is the canonical project guide. `GEMINI.md` points here so the documentation stays in one place.

## Current State

MarkedUp is no longer a static, single-file prototype. The current app is a modular vanilla JavaScript tool with:

- A local Node server for static hosting, proxying, and Playwright-powered captures
- A browse workflow based on a proxied iframe
- An annotation canvas with layered editing tools
- IndexedDB-backed collections and captures
- PDF import, clipboard image paste, asset search, notes, and export workflows
- A settings panel that controls capture behavior, providers, defaults, and data management

The codebase is functional and fairly feature-rich, but it is still an app-in-browser architecture without automated tests or a formal build pipeline.

## Feature Set

### Capture and Input

- Browse websites inside the app and capture the current viewport or full page
- Use `captureMode = auto` to try live iframe capture first, then fall back to the Node/Playwright service
- Force `live` or `node` capture mode from settings when needed
- Paste images directly from the clipboard
- Import PDFs from a URL or local file and convert the first page into a capture

### Markup and Review

- Draw rectangles, circles, arrows, lines, freehand paths, text, point markers, icons, emojis, and stock images
- Add notes to numbered point markers and include those notes in exports
- Use undo/redo, zoom, fit-to-view, hand/select tools, layers, and history-style editing flows
- Switch between browse, markup, and library-oriented workflows across desktop and mobile layouts

### Library and Organization

- Organize work into collections
- Rename or delete collections and captures
- Search, sort, and switch between grid/list library views
- Persist captures, thumbnails, annotations, viewport state, and related metadata locally

### Assets and External Providers

- Built-in icon support
- Optional Iconify search
- Emoji browsing
- Stock image search through Picsum, with optional Unsplash and Pexels integration when API keys are supplied
- Favorites stored in settings

### Export and Settings

- Export selected captures as a ZIP of PNG files
- Export selected captures as a PDF
- Copy multiple marked-up captures into a combined image grid on the clipboard
- Export and import settings JSON
- Clear all stored data from the app

## Architecture

### Frontend modules

- `js/app.js`: Application bootstrap, view switching, event wiring, mobile tool tray, and shared actions
- `js/features/browser.js`: Browsing, proxied iframe navigation, live capture, Node capture fallback, and capture profiles
- `js/features/library.js`: Collections, captures, search, sort, selection, and loading captures into the editor
- `js/editor/editor.js`: Canvas editor state, tools, rendering, history, and interaction model
- `js/editor/exporter.js`: PNG/PDF export rendering and combined clipboard export
- `js/features/pdf-viewer.js`: PDF ingestion and first-page rendering
- `js/features/notes.js`: Point annotations and note management
- `js/core/db.js`: IndexedDB persistence
- `js/core/settings.js`: Local settings storage and defaults
- `js/ui/settings-ui.js`: Settings modal behavior and data-management flows

### Backend services

- `server.js`: Express host for the UI, `/api/health`, `/api/capture`, and `/proxy`
- `/api/capture`: Playwright-backed screenshot service with viewport/profile support
- `/proxy`: Same-origin HTML proxy that strips frame-blocking headers, injects a bridge script, and relays scroll/location state back to the app

## Runtime Model

MarkedUp works best when run through the local Node server.

Why the server matters:

- The proxied iframe depends on `/proxy`
- Playwright capture depends on `/api/capture`
- Local health checks and same-origin navigation depend on the Express host

Opening `index.html` directly is not the primary workflow. Some client-side features may still render, but browsing and capture behavior are designed around `npm start`.

## Setup

### Requirements

- Node.js 18+
- npm
- Playwright browser binaries or a local Chrome installation

### Install

```bash
npm install
npx playwright install chromium
```

### Run

```bash
npm start
```

Open:

```text
http://127.0.0.1:4777
```

The server attempts to launch bundled Chromium first and falls back to the local Chrome channel if Chromium is unavailable.

## Capture Behavior

### Modes

- `auto`: Try client-side live capture of the proxied iframe, then fall back to Playwright
- `live`: Use `html2canvas` against the iframe DOM only
- `node`: Always use the Playwright capture endpoint

### Proxy constraints

The proxy intentionally blocks localhost and common private-network targets. That reduces SSRF-style abuse and prevents the app from proxying back into local infrastructure.

### Viewport profiles

Capture requests carry viewport and environment details such as:

- width and height
- device scale factor
- locale and timezone
- color scheme and reduced-motion preferences
- touch/mobile hints
- iframe scroll position when available

## Storage Model

- IndexedDB database: `DevMarkupPro`
- Stores:
  - `sessions_v2` for collections
  - `captures_v2` for captures
- LocalStorage key: `devmarkup_settings`

Persisted capture data includes the original image, thumbnail, annotation shapes, viewport state, timestamps, and optional PDF payloads.

## Project Structure

```text
MarkedUp/
  index.html
  server.js
  css/
  js/
    app.js
    main.js
    assets/
    core/
    editor/
    features/
    ui/
```

## Development Notes

- The app is written in plain HTML, CSS, and modular browser-side JavaScript; there is no bundler.
- Several third-party browser libraries are loaded from CDNs in `index.html`.
- The current package scripts are intentionally minimal: `npm start` and `npm run dev` both start the local server.
- There is no automated test suite configured in `package.json` at the moment.

## Known Gaps and Caveats

- Documentation had drifted from the implementation; this file now reflects the current tool behavior.
- The app depends on browser APIs, CDN assets, and local IndexedDB, so behavior can vary across environments.
- Some external sites may still behave poorly inside a proxied iframe even after header stripping.
- PDF import currently turns the first rendered page into a capture rather than exposing a full document workflow.
- The project does not currently define lint, test, or build commands beyond starting the server.

## Suggested Next Documentation Targets

If this project continues to evolve, the most useful follow-up docs would be:

1. A short user guide covering common workflows
2. A contributor guide describing module responsibilities and editing conventions
3. A troubleshooting guide for Playwright, proxy, and browser-capture failures
