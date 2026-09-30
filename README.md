# ReaLayout

A single-page layout editor for plugin and tool UIs. Drag, resize and rename
boxes, knobs and text labels on a canvas that uses the real pixel coordinates
of the plugin window, then export the positions to translate into code.

Open `index.html` in a browser (works straight from disk, no server needed).
`index.html?project=name` loads `projects/name.js`; the default is `reasamp`.

## Using it

- Drag to move, green handle to resize, double-click a label to rename.
- Shift+click adds to a multi-selection, Alt+click cycles through overlapping elements.
- Ctrl+click and hold shows a crosshair with its x,y in plugin pixels.
- Each panel that has states (an Action type, a mode) gets its own button group; elements with state `*` show in all of them.
- **Save to file** / **Load from file** write and read the layout as JSON; **Export as text** gives the coordinate list.
- The working layout is also kept in the browser's localStorage, but save to file for anything you care about.

## Adding a project

Copy `projects/reasamp.js`, change the canvas size, panels (with optional
`states`), knob label geometry and `elements`. Each element is
`{panel, state, id, label, shape: 'box'|'knob'|'text', x, y, w, h}`.

`projects/reasamp_layout_2026-09-30.json` is a saved ReaSamp layout for reference.
