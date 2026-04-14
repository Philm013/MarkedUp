# DevMarkup Studio Pro

A comprehensive, single-file web application for capturing, marking up, and managing webpage screenshots.

## Project Overview

**DevMarkup Studio Pro** is a powerful annotation tool that allows users to capture websites directly in their browser and add rich annotations. It features a dual-view interface: a **Browse** mode for navigating and capturing, and a **Markup** mode for editing.

### Key Features
- **Capture:** Real-time webpage capture using `getDisplayMedia`.
- **Annotation:** Support for basic shapes (rect, circle, arrow, line), text, icons, and emojis.
- **Assets:** Integrated search for icons (Iconify) and stock photos (Unsplash, Pexels).
- **Persistence:** Local storage of captures and annotation data using IndexedDB.
- **Export:** High-quality exports in ZIP (multiple PNGs) or PDF formats.
- **Modern UI:** Responsive, dark-themed interface with CSS-variable based styling.

### Technology Stack
- **Core:** HTML5, Vanilla CSS, Vanilla JavaScript (ES6+).
- **Storage:** IndexedDB (Data), LocalStorage (Settings).
- **Libraries:**
  - `jspdf`: PDF generation.
  - `jszip`: ZIP archive creation.
  - `FileSaver.js`: File download management.
- **APIs:** Iconify, Unsplash, Pexels, Lorem Picsum.

## Architecture

The application is structured into several modular object literals:
- `App`: Main controller and event handling.
- `Editor`: Canvas-based drawing engine and tool management.
- `Library`: Manages the collection of captures and their metadata.
- `Browser`: Handles the iframe-based browsing and screenshot capture.
- `DB`: IndexedDB wrapper for session persistence.
- `Exporter`: Logic for rendering final images and generating ZIP/PDF files.
- `Settings`: Global configuration manager.
- `Icons` / `Emojis` / `Stock`: Asset management and API integration.

## Building and Running

### Development
As a single-file application, no build step is required. You can run the project by:
1. Opening `index.html` in any modern web browser.
2. Hosting it via a simple static server (e.g., `npx serve .` or `python -m http.server`).

### Deployment
The project is designed to be hosted as a static site (e.g., GitHub Pages).

## Development Conventions

- **State Management:** Local state is maintained within modules; persistence is handled via the `DB` module.
- **Styling:** Uses CSS Custom Properties for all colors and spacing, defined in `:root`.
- **Icons:** Uses SVG strings for built-in icons and API fetches for external ones.
- **Canvas:** Coordinate mapping between screen and world space is handled by `toWorld` and `toScreen` in the `Editor` module.
