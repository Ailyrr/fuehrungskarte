# Führungskarte

A mobile-first digital **Führungskarte** (military command / tactical map). Create location-based map projects, then draw, place labels and NATO tactical symbols on a rotatable map. Everything is stored locally in your browser and can be exported as a file for sharing — no backend, database, or account required.

## Features

- **Location-based projects** — search for any city or area (e.g. "Osaka" or "Seeland Switzerland") and the map opens framed on that place.
- **Full touch map** — zoom, pan, two-finger rotate and tilt (pitch), plus zoom buttons and a reset-north compass.
- **Annotate the map** with the `+` button:
  - **Labels** — text annotations with a color and optional background panel.
  - **Drawings** — freehand finger sketches held inside a movable container.
  - **Tactical symbols** — a NATO **APP-6 / MIL-STD-2525** symbol creator (affiliation, icon, echelon, HQ/planned status and an optional designation), rendered with [milsymbol](https://github.com/spatialillusions/milsymbol).
- **Move / edit / delete** any object. Tap to select, drag to reposition.
- **Auto-save** — every change is saved to `localStorage` automatically (debounced).
- **Export / import** — share a project as a `.fk.json` file and import it on another device.
- **Installable PWA** — "Add to Home Screen" for an app-like, offline-capable shell.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for the mobile-first UI
- [MapLibre GL JS](https://maplibre.org/) with free [OpenFreeMap](https://openfreemap.org/) vector tiles (no API key)
- [Nominatim](https://nominatim.org/) (OpenStreetMap) for location search (no API key)
- [milsymbol](https://github.com/spatialillusions/milsymbol) for NATO tactical symbols
- [Zustand](https://github.com/pmndrs/zustand) for state + auto-save

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # preview the production build
```

Open the printed local URL on your phone (same network) or desktop browser.

## How it works / data model

All data lives in the browser via a small storage layer (`src/lib/storage.ts`) so a
cloud sync backend can be added later without touching the UI:

- `fk:projects` — an index of project summaries.
- `fk:project:<id>` — the full project JSON (camera position + placed objects).

A project stores the map camera (center, zoom, bearing, pitch) and a list of
objects. Each object is anchored to a geographic point and rendered as a
draggable MapLibre marker.

### Limitations

- **Storage limit:** `localStorage` is capped at roughly **5 MB** per site. Freehand
  drawings are stored as compact vector strokes to stay well under this, and the
  home screen shows current usage. If you hit the limit, export and remove old
  projects. (Moving to IndexedDB / cloud sync is a planned improvement.)
- **Offline maps:** the app shell is cached for offline use, but map tiles and
  location search require an internet connection.
- **Location search** uses the public Nominatim service and is subject to its
  usage policy; searches are debounced to be a good citizen.

## Project structure

```
src/
  types.ts               data model
  lib/
    storage.ts           localStorage CRUD + export/import
    geocode.ts           Nominatim location search
    symbols.ts           milsymbol SIDC builder + catalog
    markers.ts           object -> DOM/SVG marker content
    id.ts                id helper
  store/projectStore.ts  active project + debounced auto-save
  pages/
    HomePage.tsx         project list, create/import/export
    ProjectPage.tsx      loads a project and renders the map
  components/
    NewProjectModal.tsx  location search + project creation
    MapView.tsx          MapLibre map, markers, controls
    AddMenu.tsx          the "+" action sheet
    LabelEditor.tsx      label create/edit
    DrawingCanvas.tsx    freehand sketch surface
    SymbolCreator.tsx    NATO tactical symbol builder
```

## Roadmap

- Cloud sync (optional) while keeping the offline-first, no-account model.
- Geo-referenced (scaling) drawing overlays in addition to point-anchored ones.
- Expanded tactical symbol library (equipment, installations, control measures).
