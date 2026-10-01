// ReaLayout editor. Everything project-specific (canvas size, panels and
// their states, elements, knob text geometry) comes from
// window.REALAYOUT_PROJECT, loaded from projects/<name>.js by index.html.
const PROJECT = window.REALAYOUT_PROJECT;
const DEFAULT_ELEMENTS = PROJECT.elements;
const PANEL_OUTLINES = PROJECT.panels;


// From the real Knob::draw() (the real plugin source): label text at y+r+3 (11pt),
// numeric value readout right under it at y+r+14 (10pt). Shared by render()
// and the drag/resize live-tracking code so they can never drift apart.
const KNOB_LABEL_TOP_OFFSET = PROJECT.knob.labelTopOffset, KNOB_LABEL_BLOCK_H = PROJECT.knob.labelBlockH;

const STORAGE_KEY = PROJECT.storageKey;

// A saved layout always takes priority over DEFAULT_ELEMENTS -- but that
// would silently hide any element added to DEFAULT_ELEMENTS *after* you'd
// already saved a layout (like these title/label text elements). Fold in
// anything missing by id, without touching what you've already moved.
//
// Also re-sync shape/panel/state for elements you already have: those are
// pure classification data I control from the source extraction, never
// editable in this tool's UI, so a saved copy can never legitimately
// disagree with the current default on them -- only ever be stale (e.g.
// something I later re-classified from a plain box into a proper text
// label). Position/size/label are the real edits and are never touched here.
function mergeWithDefaults(loaded) {
  if (!loaded) return DEFAULT_ELEMENTS.map(e => ({...e}));
  const defaultsById = new Map(DEFAULT_ELEMENTS.map(e => [e.id, e]));
  const synced = loaded.map(e => {
    const def = defaultsById.get(e.id);
    if (!def) return e; // a "+ Add"-created element with no matching default -- leave as-is
    return {...e, shape: def.shape, panel: def.panel, state: def.state};
  });
  const existingIds = new Set(loaded.map(e => e.id));
  const missing = DEFAULT_ELEMENTS.filter(e => !existingIds.has(e.id)).map(e => ({...e}));
  return synced.concat(missing);
}

// `nextNewId` (below) was never persisted, so it restarted at 1 on every
// page load -- if you'd already created elements in an earlier session
// (getting ids like "new_1"), reloading and creating more could mint that
// exact id again, giving two different array entries the same id. Every
// id-based lookup (resize/render/select) then only ever finds the FIRST
// match, so you could resize one element's data correctly while watching a
// completely different, same-id element visually update instead. Repair
// any such collision on load by giving every duplicate after the first a
// fresh, guaranteed-unique id -- nothing about position/label/shape changes.
function dedupeIds(list) {
  const seen = new Set();
  let n = 1;
  for (const el of list) {
    if (!seen.has(el.id)) { seen.add(el.id); continue; }
    let fresh;
    do { fresh = 'dedup_' + (n++); } while (seen.has(fresh));
    el.id = fresh;
    seen.add(fresh);
  }
  return list;
}

let elements = dedupeIds(mergeWithDefaults(loadFromStorage()));

// ── Undo/redo ────────────────────────────────────────────────────────────
// One snapshot of the full elements array per logical action (a whole drag
// or resize gesture counts as one step, not one per mousemove frame -- call
// pushUndo() once at the START of a mutation, before it happens).
let undoStack = [];
let redoStack = [];
const UNDO_LIMIT = 60;

function pushUndo() {
  undoStack.push(JSON.stringify(elements));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack = []; // a new action invalidates any redo history
}
function doUndo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(elements));
  elements = JSON.parse(undoStack.pop());
  selectedIds = new Set();
  saveToStorage();
  render();
}
function doRedo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(elements));
  elements = JSON.parse(redoStack.pop());
  selectedIds = new Set();
  saveToStorage();
  render();
}
document.addEventListener('keydown', (ev) => {
  if (!ev.ctrlKey && !ev.metaKey) return;
  if (ev.key === 'z' && !ev.shiftKey) { ev.preventDefault(); doUndo(); }
  else if ((ev.key === 'z' && ev.shiftKey) || ev.key === 'y') { ev.preventDefault(); doRedo(); }
});
// View settings (zoom/snap/which panel-state you're looking at) used to
// live in plain variables with no persistence at all -- reloading the page
// silently reset zoom back to 150% and the panel view back to Loop/16
// Samplers, with nothing on screen explaining why something you'd zoomed
// out to see, or a state you'd switched to, was suddenly "gone" again.
const VIEW_STORAGE_KEY = PROJECT.viewStorageKey;
function loadViewSettings() {
  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function saveViewSettings() {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify({ viewStates, scale, snapGrid }));
  } catch (e) {}
}
const savedView = loadViewSettings();
// Which state each stateful panel is currently showing, {panelId: stateId}.
const viewStates = {};
for (const p of PROJECT.panels) {
  if (!p.states) continue;
  const saved = savedView.viewStates && savedView.viewStates[p.id];
  viewStates[p.id] = p.states.some(s => s.id === saved) ? saved : (p.defaultState || p.states[0].id);
}
let scale = savedView.scale || 1.5;
let snapGrid = savedView.snapGrid !== undefined ? savedView.snapGrid : 5;
let selectedIds = new Set();
// Start above the highest "new_N" id already in use, so a freshly created
// element can never collide with one from an earlier session again.
let nextNewId = 1 + elements.reduce((max, e) => {
  const m = /^new_(\d+)$/.exec(e.id);
  return m ? Math.max(max, parseInt(m[1], 10)) : max;
}, 0);

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
function saveToStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(elements)); } catch (e) {}
}

function isVisible(el) {
  if (!(el.panel in viewStates)) return true; // panel has no states
  if (el.state === '*') {
    // Always visible, except in a state that lists this element id under `hide`
    // (e.g. ReaSamp's "No Action" screen has no Action number or probability slider).
    const panel = PROJECT.panels.find(p => p.id === el.panel);
    const st = panel.states.find(s => s.id === viewStates[el.panel]);
    return !(st && st.hide && st.hide.includes(el.id));
  }
  return el.state === viewStates[el.panel];
}

const canvas = document.getElementById('canvas');

// Overlapping elements are expected while building a layout (a newly added
// or duplicated element renders on top of whatever it lands on, since later
// = higher in the DOM = wins a plain click). Alt+click cycles down through
// everything stacked at that point instead of always landing on the top one.
function screenToReal(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
}
function elementsAtPoint(rx, ry) {
  // Bottom-to-top order (matches `elements` array order, which is also DOM/
  // stacking order -- later entries render on top).
  return elements.filter(el => isVisible(el) && rx >= el.x && rx <= el.x + el.w && ry >= el.y && ry <= el.y + el.h);
}

function render() {
  canvas.innerHTML = '';
  canvas.style.width = (PROJECT.canvas.w * scale) + 'px';
  canvas.style.height = (PROJECT.canvas.h * scale) + 'px';

  // panel boundary backdrops
  for (const p of PANEL_OUTLINES) {
    const d = document.createElement('div');
    d.className = 'panelOutline';
    d.style.left = (p.x * scale) + 'px';
    d.style.top = (p.y * scale) + 'px';
    d.style.width = (p.w * scale) + 'px';
    d.style.height = (p.h * scale) + 'px';
    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    lbl.textContent = p.label;
    d.appendChild(lbl);
    canvas.appendChild(d);
  }

  for (const el of elements) {
    if (!isVisible(el)) continue;
    const d = document.createElement('div');
    d.className = 'el ' + el.shape + (selectedIds.has(el.id) ? ' selected' : '');
    d.style.left = (el.x * scale) + 'px';
    d.style.top = (el.y * scale) + 'px';
    d.style.width = (el.w * scale) + 'px';
    d.style.height = (el.h * scale) + 'px';
    d.dataset.id = el.id;
    const txt = document.createElement('span');
    txt.textContent = el.label;
    txt.style.whiteSpace = 'pre-line';
    txt.style.pointerEvents = 'none';
    d.appendChild(txt);

    d.addEventListener('mousedown', (ev) => {
      if (ev.altKey) {
        ev.preventDefault();
        ev.stopPropagation();
        const pt = screenToReal(ev.clientX, ev.clientY);
        const hits = elementsAtPoint(pt.x, pt.y); // bottom-to-top order
        if (hits.length <= 1) { selectEl(el); return; }
        const curId = selectedIds.size === 1 ? [...selectedIds][0] : null;
        const curIdx = hits.findIndex(h => h.id === curId);
        const startIdx = curIdx === -1 ? hits.length - 1 : curIdx;
        const nextIdx = (startIdx - 1 + hits.length) % hits.length; // one level down, wrap to top
        selectEl(hits[nextIdx]);
        return;
      }
      startDrag(ev, el);
    });
    d.addEventListener('dblclick', (ev) => {
      ev.stopPropagation();
      const name = prompt('Rename element:', el.label);
      if (name !== null && name.trim() !== '') { pushUndo(); el.label = name.trim(); saveToStorage(); render(); }
    });

    // Resize handle only when exactly this one thing is selected -- resizing
    // several differently-sized elements as a group has no single sensible
    // meaning, so multi-selection intentionally supports move only.
    if (selectedIds.has(el.id) && selectedIds.size === 1) {
      d.appendChild(createHandleFor(el));
    }
    canvas.appendChild(d);

    // Real Knob::draw() (the real plugin source) puts the label text at y+r+3 (11pt)
    // and a numeric value readout right under it at y+r+14 (10pt) -- both
    // centered on the knob's own x. That's real claimed screen space a knob
    // takes up beyond its circle; show it as a non-interactive ghost box
    // that tracks the knob live, rather than 35+ separate static elements
    // that would drift out of sync the moment a knob gets moved or resized.
    if (el.shape === 'knob') {
      const g = document.createElement('div');
      g.className = 'labelGhost';
      g.dataset.forId = el.id;
      g.style.left = (el.x * scale) + 'px';
      g.style.top = ((el.y + el.h + KNOB_LABEL_TOP_OFFSET) * scale) + 'px';
      g.style.width = (el.w * scale) + 'px';
      g.style.height = (KNOB_LABEL_BLOCK_H * scale) + 'px';
      g.textContent = 'label + value';
      canvas.appendChild(g);
    }
  }
  drawCrosshair();
  updateInspector();
}

// Ctrl+click and HOLD on the canvas (also on top of an element): two pink
// dashed guide lines plus an x,y readout in real plugin pixels follow the
// cursor for as long as the button is held. Releasing the button (or Ctrl)
// removes it. Visual guide only; never saved, never touches the layout data.
let crosshair = null; // {x, y} in real plugin pixels, or null
let crosshairEls = null;
function placeCrosshair() {
  if (!crosshair || !crosshairEls) return;
  const px = crosshair.x * scale, py = crosshair.y * scale;
  crosshairEls.v.style.left = px + 'px';
  crosshairEls.h.style.top = py + 'px';
  crosshairEls.t.style.left = (px + 8) + 'px';
  crosshairEls.t.style.top = (py + 8) + 'px';
  crosshairEls.t.textContent = crosshair.x + ', ' + crosshair.y;
}
function drawCrosshair() {
  crosshairEls = null;
  if (!crosshair) return;
  const mk = (css) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;pointer-events:none;z-index:9999;' + css;
    canvas.appendChild(d);
    return d;
  };
  crosshairEls = {
    v: mk('top:0;width:0;height:100%;border-left:1px dashed #ff4fa3;'),
    h: mk('left:0;height:0;width:100%;border-top:1px dashed #ff4fa3;'),
    t: mk('background:#ff4fa3;color:#000;font:11px monospace;padding:1px 4px;' +
          'border-radius:2px;white-space:nowrap;')
  };
  placeCrosshair();
}
function endCrosshair() {
  if (!crosshair) return;
  crosshair = null;
  render();
}
// Capture phase, so it wins over an element's own mousedown (which would
// start a drag or change the selection).
canvas.addEventListener('mousedown', (ev) => {
  if (!ev.ctrlKey) return;
  ev.preventDefault();
  ev.stopPropagation();
  const pt = screenToReal(ev.clientX, ev.clientY);
  crosshair = { x: Math.round(pt.x), y: Math.round(pt.y) };
  render();
}, true);
document.addEventListener('mousemove', (ev) => {
  if (!crosshair) return;
  const pt = screenToReal(ev.clientX, ev.clientY);
  crosshair.x = Math.round(pt.x);
  crosshair.y = Math.round(pt.y);
  placeCrosshair(); // move the existing guide elements; no full re-render
});
document.addEventListener('mouseup', endCrosshair);
document.addEventListener('keyup', (ev) => { if (ev.key === 'Control') endCrosshair(); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') endCrosshair(); });

// selectEl/startDrag/startResize deliberately never call the full render()
// mid-gesture -- rebuilding canvas.innerHTML destroys and recreates every
// element node, and if that happens to the node that just received
// mousedown, browsers won't fire click/dblclick on it at all (a well-known
// quirk: removing the mousedown target before mouseup silently kills the
// click sequence). So these three only ever touch the DOM directly
// (classList/style on the one node involved), never tear the canvas down.

// Shared by render() and selectEl() so the two can never drift apart again
// (selectEl's own handle used to skip the knob circle-edge positioning that
// render() had, so a handle could appear in the wrong spot immediately
// after a plain click, only correcting itself on the next full render).
function createHandleFor(el) {
  const h = document.createElement('div');
  h.className = 'handle';
  if (el.shape === 'knob') {
    const rPx = (el.w * scale) / 2;
    const pt = rPx + rPx * 0.7071 - 6;
    h.style.right = 'auto';
    h.style.bottom = 'auto';
    h.style.left = pt + 'px';
    h.style.top = pt + 'px';
  }
  h.addEventListener('mousedown', (ev) => startResize(ev, el));
  return h;
}

function clearSelectionVisuals() {
  canvas.querySelectorAll('.el.selected').forEach(n => {
    n.classList.remove('selected');
    const h = n.querySelector('.handle');
    if (h) h.remove();
  });
}

function applySelectionVisuals() {
  // Resize handle only when exactly one element is selected -- see the
  // matching comment in render() for why group-resize isn't supported.
  const showHandle = selectedIds.size === 1;
  for (const id of selectedIds) {
    const node = canvas.querySelector(`.el[data-id="${id}"]`);
    if (!node) continue;
    node.classList.add('selected');
    if (showHandle) {
      const el = elements.find(e => e.id === id);
      if (el) node.appendChild(createHandleFor(el));
    }
  }
}

// additive=true (Shift held): toggle el in/out of the current selection,
// leaving everything else untouched. additive=false/omitted: plain click,
// replaces the whole selection with just el (or clears it if el is null).
function selectEl(el, additive) {
  if (additive && el) {
    if (selectedIds.has(el.id)) selectedIds.delete(el.id);
    else selectedIds.add(el.id);
  } else if (!additive) {
    selectedIds = new Set(el ? [el.id] : []);
  }
  clearSelectionVisuals();
  applySelectionVisuals();
  updateInspector();
}

canvas.addEventListener('mousedown', (ev) => {
  // Shift+click on empty canvas is a no-op, not a clear -- Shift always
  // means "adjust the set," never "start over," even here.
  if (ev.target === canvas && !ev.shiftKey) selectEl(null);
});

function startDrag(ev, el) {
  ev.preventDefault();
  ev.stopPropagation();

  if (ev.shiftKey) {
    // Shift toggles membership only -- it never starts a drag, so building
    // up a selection doesn't risk accidentally nudging something.
    selectEl(el, true);
    return;
  }

  // Dragging an element that's already part of a multi-selection moves the
  // whole group together; dragging anything else (or a single selection)
  // replaces the selection with just that one element, as before.
  const groupMove = selectedIds.size > 1 && selectedIds.has(el.id);
  if (!groupMove) selectEl(el, false);

  const targetEls = groupMove
    ? [...selectedIds].map(id => elements.find(e => e.id === id)).filter(Boolean)
    : [el];
  const targets = targetEls.map(t => ({
    el: t,
    node: canvas.querySelector(`.el[data-id="${t.id}"]`),
    ghost: t.shape === 'knob' ? canvas.querySelector(`.labelGhost[data-for-id="${t.id}"]`) : null,
    origX: t.x, origY: t.y,
  }));

  const startX = ev.clientX, startY = ev.clientY;
  let pushedUndo = false;
  function onMove(e) {
    if (!pushedUndo) { pushUndo(); pushedUndo = true; } // lazy: a plain click with no movement shouldn't create an undo step
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;
    for (const t of targets) {
      t.el.x = snap(t.origX + dx);
      t.el.y = snap(t.origY + dy);
      if (t.node) {
        t.node.style.left = (t.el.x * scale) + 'px';
        t.node.style.top = (t.el.y * scale) + 'px';
      }
      if (t.ghost) {
        t.ghost.style.left = (t.el.x * scale) + 'px';
        t.ghost.style.top = ((t.el.y + t.el.h + KNOB_LABEL_TOP_OFFSET) * scale) + 'px';
      }
    }
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    saveToStorage();
    // NOT render() here -- rebuilding the DOM on mouseup destroys the node
    // that's mid-click, which silently kills the browser's click/dblclick
    // synthesis for it (the exact bug fixed earlier for selectEl). The
    // ghost box already tracks live during onMove above, so nothing here
    // actually needs a full rebuild -- just refresh the read-only inspector text.
    updateInspector();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startResize(ev, el) {
  ev.preventDefault();
  ev.stopPropagation();
  const node = canvas.querySelector(`[data-id="${el.id}"]`);
  const ghost = el.shape === 'knob' ? canvas.querySelector(`.labelGhost[data-for-id="${el.id}"]`) : null;
  const handle = node ? node.querySelector('.handle') : null;
  const startX = ev.clientX, startY = ev.clientY;
  const origW = el.w, origH = el.h;
  const isKnob = el.shape === 'knob';
  let pushedUndo = false;
  function onMove(e) {
    if (!pushedUndo) { pushUndo(); pushedUndo = true; }
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;
    if (isKnob) {
      const d = Math.max(dx, dy);
      el.w = snap(Math.max(10, origW + d));
      el.h = el.w;
    } else {
      el.w = snap(Math.max(10, origW + dx));
      el.h = snap(Math.max(10, origH + dy));
    }
    if (node) {
      node.style.width = (el.w * scale) + 'px';
      node.style.height = (el.h * scale) + 'px';
    }
    if (ghost) {
      ghost.style.width = (el.w * scale) + 'px';
      ghost.style.top = ((el.y + el.h + KNOB_LABEL_TOP_OFFSET) * scale) + 'px';
    }
    if (handle && isKnob) {
      const rPx = (el.w * scale) / 2;
      const pt = rPx + rPx * 0.7071 - 6;
      handle.style.left = pt + 'px';
      handle.style.top = pt + 'px';
    }
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    saveToStorage();
    // See startDrag's onUp for why this is deliberately NOT render().
    updateInspector();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function updateInspector() {
  const insp = document.getElementById('inspector');
  if (selectedIds.size === 0) { insp.style.display = 'none'; return; }
  insp.style.display = 'block';
  if (selectedIds.size > 1) {
    document.getElementById('inspLabel').textContent = selectedIds.size + ' elements selected';
    document.getElementById('inspPanel').textContent = '';
    document.getElementById('inspState').textContent = '';
    document.getElementById('inspXY').textContent = '(drag to move together)';
    document.getElementById('inspWH').textContent = '';
    return;
  }
  const el = elements.find(e => e.id === [...selectedIds][0]);
  if (!el) { insp.style.display = 'none'; return; }
  document.getElementById('inspLabel').textContent = el.label;
  document.getElementById('inspPanel').textContent = el.panel;
  document.getElementById('inspState').textContent = el.state;
  document.getElementById('inspXY').textContent = `${Math.round(el.x)}, ${Math.round(el.y)}`;
  document.getElementById('inspWH').textContent = `${Math.round(el.w)}, ${Math.round(el.h)}`;
}

// ── toolbar wiring ──────────────────────────────────────────────────────────
// One button group per panel that has states, built from the project file.
for (const p of PROJECT.panels) {
  if (!p.states) continue;
  const grp = document.createElement('div');
  grp.className = 'grp';
  const t = document.createElement('label');
  t.className = 'grptitle'; t.textContent = p.label;
  grp.appendChild(t);
  for (const s of p.states) {
    const b = document.createElement('button');
    b.textContent = s.label;
    b.classList.toggle('active', viewStates[p.id] === s.id);
    b.addEventListener('click', () => {
      viewStates[p.id] = s.id;
      [...grp.querySelectorAll('button')].forEach(x => x.classList.toggle('active', x === b));
      saveViewSettings();
      render();
    });
    grp.appendChild(b);
  }
  document.getElementById('toolbar').insertBefore(grp, document.getElementById('toolbarEdit'));
}

document.querySelectorAll('[data-snap]').forEach(btn => {
  btn.addEventListener('click', () => {
    snapGrid = parseInt(btn.dataset.snap, 10);
    document.querySelectorAll('[data-snap]').forEach(b => b.classList.toggle('active', b === btn));
    saveViewSettings();
  });
});
document.querySelector(`[data-snap="${snapGrid}"]`)?.classList.add('active');

function snap(v) {
  return snapGrid > 0 ? Math.round(v / snapGrid) * snapGrid : v;
}

document.getElementById('btnDuplicate').addEventListener('click', () => {
  if (selectedIds.size === 0) return;
  pushUndo();
  const newIds = [];
  for (const id of selectedIds) {
    const el = elements.find(e => e.id === id);
    if (!el) continue;
    const copy = {...el, id: 'new_' + (nextNewId++), label: el.label + ' copy', x: el.x + 16, y: el.y + 16};
    elements.push(copy);
    newIds.push(copy.id);
  }
  selectedIds = new Set(newIds); // select the new copies, ready to drag into place
  saveToStorage();
  render();
});

document.getElementById('btnDelete').addEventListener('click', () => {
  if (selectedIds.size === 0) return;
  pushUndo();
  elements = elements.filter(e => !selectedIds.has(e.id));
  selectedIds = new Set();
  saveToStorage();
  render();
});

document.getElementById('btnMatchKnobSize').addEventListener('click', () => {
  if (selectedIds.size !== 1) { alert('Select exactly one knob first (e.g. Width) to use as the reference size.'); return; }
  const ref = elements.find(e => e.id === [...selectedIds][0]);
  if (!ref || ref.shape !== 'knob') { alert('Select a knob first (e.g. Width), then click this to make every knob that size.'); return; }
  pushUndo();
  const w = ref.w, h = ref.h;
  for (const el of elements) {
    if (el.shape !== 'knob') continue;
    // Keep each knob's own center fixed -- only its diameter changes, so it
    // doesn't visually jump position just because it changed size.
    const cx = el.x + el.w/2, cy = el.y + el.h/2;
    el.w = w; el.h = h;
    el.x = snap(cx - w/2); el.y = snap(cy - h/2);
  }
  saveToStorage();
  render();
});

// New elements start in the first panel that has states (at the state being
// shown), else in the first panel. Just a starting point; drag it anywhere.
const newHome = {
  get panel() { return (PROJECT.panels.find(p => p.states) || PROJECT.panels[0]).id; },
  get state() { return this.panel in viewStates ? viewStates[this.panel] : '*'; }
};

document.getElementById('btnAdd').addEventListener('click', () => {
  // New elements always start in SAMPLE at whichever state is currently
  // shown -- there's no click position to infer intent from, so this is
  // just a starting point; drag it wherever it actually belongs.
  pushUndo();
  const newEl = {
    panel: newHome.panel, state: newHome.state, id: 'new_' + (nextNewId++),
    label: 'New', shape: 'box', x: 20, y: 460, w: 60, h: 24
  };
  elements.push(newEl);
  selectedIds = new Set([newEl.id]);
  saveToStorage();
  render();
});

document.getElementById('btnAddText').addEventListener('click', () => {
  pushUndo();
  const newEl = {
    panel: newHome.panel, state: newHome.state, id: 'new_' + (nextNewId++),
    label: '=====AM=====', shape: 'text', x: 20, y: 460, w: 100, h: 16
  };
  elements.push(newEl);
  selectedIds = new Set([newEl.id]);
  saveToStorage();
  render();
});

document.getElementById('btnUndo').addEventListener('click', doUndo);
document.getElementById('btnRedo').addEventListener('click', doRedo);

document.getElementById('zoomIn').addEventListener('click', () => { scale = Math.min(3, scale + 0.1); updateZoomLabel(); saveViewSettings(); render(); });
document.getElementById('zoomOut').addEventListener('click', () => { scale = Math.max(0.3, scale - 0.1); updateZoomLabel(); saveViewSettings(); render(); });
function updateZoomLabel() { document.getElementById('zoomLabel').textContent = Math.round(scale*100) + '%'; }
updateZoomLabel();

document.getElementById('btnReset').addEventListener('click', () => {
  if (!confirm('Reset ALL panels back to the original layout? This discards everything you\'ve moved. (Ctrl+Z will still undo this if you change your mind.)')) return;
  pushUndo();
  elements = DEFAULT_ELEMENTS.map(e => ({...e}));
  selectedIds = new Set();
  saveToStorage();
  render();
});

document.getElementById('btnSave').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(elements, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = PROJECT.id + '_layout.json';
  a.click();
});

document.getElementById('btnLoad').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('not an array');
      pushUndo();
      elements = dedupeIds(data); // guard against a file saved before the id-collision fix
      selectedIds = new Set();
      saveToStorage();
      render();
    } catch (e) { alert('Could not read that file: ' + e.message); }
  };
  reader.readAsText(file);
  ev.target.value = '';
});

function buildExportText() {
  const byPanel = {};
  for (const el of elements) {
    const key = el.panel + (el.state === '*' ? '' : ' — ' + el.state);
    (byPanel[key] = byPanel[key] || []).push(el);
  }
  let out = '';
  for (const key of Object.keys(byPanel)) {
    out += '## ' + key.toUpperCase() + '\n';
    for (const el of byPanel[key]) {
      if (el.shape === 'knob') {
        const cx = Math.round(el.x + el.w/2), cy = Math.round(el.y + el.h/2), r = Math.round(el.w/2);
        out += `  ${el.label.replace(/\n/g,' ')}: knob cx=${cx} cy=${cy} r=${r}\n`;
      } else if (el.shape === 'text') {
        out += `  ${el.label.replace(/\n/g,' ')}: text x=${Math.round(el.x)} y=${Math.round(el.y)}\n`;
      } else {
        out += `  ${el.label.replace(/\n/g,' ')}: box x=${Math.round(el.x)} y=${Math.round(el.y)} w=${Math.round(el.w)} h=${Math.round(el.h)}\n`;
      }
    }
    out += '\n';
  }
  return out;
}

document.getElementById('btnExport').addEventListener('click', () => {
  document.getElementById('exportText').textContent = buildExportText();
  document.getElementById('exportBox').classList.add('show');
});
document.getElementById('closeExport').addEventListener('click', () => {
  document.getElementById('exportBox').classList.remove('show');
});
document.getElementById('copyExport').addEventListener('click', async () => {
  const txt = document.getElementById('exportText').textContent;
  try {
    await navigator.clipboard.writeText(txt);
    const btn = document.getElementById('copyExport');
    const old = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = old, 1200);
  } catch (e) {
    alert('Clipboard access blocked by the browser — select the text manually and copy it (Ctrl+C).');
  }
});

render();
