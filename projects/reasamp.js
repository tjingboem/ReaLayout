// ReaSamp project for ReaLayout. Geometry extracted from ReaSampUI.cpp.
// Elements: panel = a panel id below; state = '*' (always visible) or one of
// that panel's state ids; shape = 'box' | 'knob' | 'text'.
window.REALAYOUT_PROJECT = {
  name: 'ReaSamp',
  id: 'reasamp',
  storageKey: 'reasamp_layout_v1',
  viewStorageKey: 'reasamp_layout_view_v1',
  canvas: { w: 1100, h: 800 },
  // Knob label + value text drawn under a knob circle (from ReaSamp's
  // Knob::draw(): label at y+r+3, value under it), so a knob element's
  // box covers circle only and a hint strip shows where the text lands.
  knob: { labelTopOffset: 3, labelBlockH: 23 },
  panels: [
    {id:'sample',    label:'SAMPLE',     x:8,   y:346, w:210, h:434,
     states:[{id:'loop',label:'Loop'},{id:'reverse',label:'Reverse'},{id:'freeze',label:'Freeze'},{id:'pause',label:'Pause'}],
     defaultState:'loop'},
    {id:'filter',    label:'FILTER',     x:226, y:346, w:260, h:434},
    {id:'out',       label:'OUT',        x:490, y:346, w:260, h:434},
    {id:'localmidi', label:'LOCAL MIDI', x:754, y:346, w:338, h:434,
     states:[{id:'16',label:'16 Samplers'},{id:'mpe',label:'MPE'}],
     defaultState:'16'},
  ],
  elements: [
  // ── Panel titles (real, separate text draws in the plugin — not part of
  // the enable toggle except FILTER, whose "FILTER" IS the toggle's own
  // label, already covered by flt_enable below) ────────────────────────────
  {panel:'sample',    state:'*', id:'ttl_sample', label:'SAMPLE',     shape:'text', x:12,  y:350, w:70,  h:16},
  {panel:'out',       state:'*', id:'ttl_out',    label:'OUT',        shape:'text', x:494, y:349, w:40,  h:16},
  {panel:'localmidi', state:'*', id:'ttl_lmidi',  label:'LOCAL MIDI', shape:'text', x:800, y:349, w:110, h:16},

  // ── FILTER (dcfX=226, single state) ──────────────────────────────────────
  {panel:'filter', state:'*', id:'flt_enable',  label:'FILTER (on/off)', shape:'box',  x:228,y:348,w:52,h:16},
  {panel:'filter', state:'*', id:'flt_cutoff',  label:'Cutoff',          shape:'knob', x:233,y:452,w:32,h:32},
  {panel:'filter', state:'*', id:'flt_reso',    label:'Resonance',       shape:'knob', x:283,y:452,w:32,h:32},
  {panel:'filter', state:'*', id:'flt_velcut',  label:'VelCut',          shape:'knob', x:333,y:452,w:32,h:32},
  {panel:'filter', state:'*', id:'flt_env',     label:'Envelope',        shape:'knob', x:233,y:518,w:32,h:32},
  {panel:'filter', state:'*', id:'flt_tension', label:'Tension',         shape:'knob', x:283,y:518,w:32,h:32},
  {panel:'filter', state:'*', id:'flt_keytrack',label:'KeyTrack',        shape:'knob', x:333,y:518,w:32,h:32},
  {panel:'filter', state:'*', id:'flt_cutviewer',label:'Cutoff viewer (freq response)', shape:'box', x:230,y:366,w:134,h:88},
  {panel:'filter', state:'*', id:'flt_type',    label:'Type\n(LPF/BPF/HPF/BRF)',     shape:'box', x:382,y:374,w:90,h:74},
  {panel:'filter', state:'*', id:'flt_slope',   label:'Slope\n(12/24/Biquad/Formant)', shape:'box', x:382,y:454,w:90,h:74},
  {panel:'filter', state:'*', id:'flt_adsr',    label:'Filter ADSR graph', shape:'box', x:230,y:598,w:240,h:177},

  // ── OUT (dcaX=490, single state) ─────────────────────────────────────────
  {panel:'out', state:'*', id:'out_width',   label:'Width',   shape:'knob', x:494,y:518,w:36,h:36},
  {panel:'out', state:'*', id:'out_pan',     label:'Pan',     shape:'knob', x:550,y:518,w:36,h:36},
  {panel:'out', state:'*', id:'out_volume',  label:'Volume',  shape:'knob', x:606,y:518,w:36,h:36},
  {panel:'out', state:'*', id:'out_tension', label:'Tension', shape:'knob', x:662,y:518,w:36,h:36},
  {panel:'out', state:'*', id:'out_ms',      label:'MS',      shape:'box',  x:498,y:500,w:28,h:14},
  {panel:'out', state:'*', id:'out_stereo',  label:'STEREO',  shape:'box',  x:546,y:500,w:44,h:14},
  {panel:'out', state:'*', id:'out_panseed', label:'PanSeed', shape:'box',  x:658,y:496,w:44,h:18},
  {panel:'out', state:'*', id:'out_adsr',    label:'Amp ADSR graph', shape:'box', x:494,y:598,w:240,h:177},

  // Real current position (OUT panel rows 1-2) of the 7 controls slated to
  // move to a future Settings page -- deliberately excluded from the OUT
  // mockup itself until now, per tjingboem's own earlier call. Added here
  // so they can be dragged into the Settings-page mockup being built in
  // LOCAL MIDI's old MPE space, same "start from truth, then relocate"
  // pattern every other element in this tool already follows.
  {panel:'out', state:'*', id:'out_pitchbnd', label:'PitchBend', shape:'knob', x:494,y:366,w:36,h:36},
  {panel:'out', state:'*', id:'out_modw',     label:'ModWheel',  shape:'knob', x:550,y:366,w:36,h:36},
  {panel:'out', state:'*', id:'out_press2',   label:'Pressure',  shape:'knob', x:606,y:366,w:36,h:36},
  {panel:'out', state:'*', id:'out_velocity', label:'Velocity',  shape:'knob', x:662,y:366,w:36,h:36},
  {panel:'out', state:'*', id:'out_glide',    label:'Glide',     shape:'knob', x:494,y:430,w:36,h:36},
  {panel:'out', state:'*', id:'out_time',     label:'Time',      shape:'knob', x:550,y:430,w:36,h:36},
  {panel:'out', state:'*', id:'out_polymono', label:'Poly/Mono/Legato', shape:'box', x:602,y:436,w:90,h:60},

  // ── SAMPLE, always visible regardless of state ───────────────────────────
  {panel:'sample', state:'*', id:'smp_root',    label:'Root',    shape:'knob', x:26,y:374,w:36,h:36},
  {panel:'sample', state:'*', id:'smp_octave',  label:'Octave',  shape:'knob', x:100,y:374,w:36,h:36},
  {panel:'sample', state:'*', id:'smp_tune',    label:'Tune',    shape:'knob', x:168,y:374,w:36,h:36},
  {panel:'sample', state:'*', id:'smp_loopbtn', label:'LOOP',    shape:'box', x:12,y:446,w:49,h:20},
  {panel:'sample', state:'*', id:'smp_revbtn',  label:'REVERSE', shape:'box', x:63,y:446,w:49,h:20},
  {panel:'sample', state:'*', id:'smp_frzbtn',  label:'FREEZE',  shape:'box', x:114,y:446,w:49,h:20},
  {panel:'sample', state:'*', id:'smp_paubtn',  label:'PAUSE',   shape:'box', x:165,y:446,w:49,h:20},
  {panel:'sample', state:'*', id:'smp_regnum',  label:'Region #',  shape:'text', x:12,y:474,w:40,h:14},
  {panel:'sample', state:'*', id:'smp_prob',    label:'Probability slider', shape:'box', x:32,y:485,w:182,h:13},
  {panel:'sample', state:'*', id:'smp_pct',     label:'%',         shape:'text', x:180,y:474,w:34,h:14},
  {panel:'sample', state:'*', id:'smp_scatter', label:'Scatter', shape:'box', x:20,y:608,w:186,h:20},
  {panel:'sample', state:'*', id:'smp_dice',    label:'Dice',    shape:'box', x:146,y:631,w:60,h:16},
  {panel:'sample', state:'*', id:'smp_keyrange',label:'Key Range', shape:'box', x:20,y:659,w:186,h:25},
  {panel:'sample', state:'*', id:'smp_cyclesel',label:'Cycle Selection', shape:'box', x:28,y:692,w:110,h:20},
  {panel:'sample', state:'*', id:'smp_actseed', label:'Action Seed', shape:'box', x:168,y:692,w:44,h:20},
  {panel:'sample', state:'*', id:'smp_fold_lbl',label:'Foldover:', shape:'text', x:28,y:730,w:60,h:14},
  {panel:'sample', state:'*', id:'smp_foldover',label:'Foldover slider', shape:'box', x:28,y:746,w:170,h:14},
  {panel:'sample', state:'*', id:'smp_fold_c',  label:'clean',    shape:'text', x:28,y:754,w:34,h:12},
  {panel:'sample', state:'*', id:'smp_fold_f',  label:'foldover', shape:'text', x:170,y:754,w:54,h:12},

  // ── SAMPLE — Loop only ────────────────────────────────────────────────────
  {panel:'sample', state:'loop', id:'lp_zero',   label:'Zero',   shape:'box', x:12,y:501,w:202,h:18},
  {panel:'sample', state:'loop', id:'lp_cycles', label:'Cycles', shape:'box', x:12,y:566,w:92,h:18},
  {panel:'sample', state:'loop', id:'lp_tail',   label:'Tail (?)', shape:'box', x:106,y:537,w:78,h:20},
  {panel:'sample', state:'loop', id:'lp_escape', label:'Escape', shape:'box', x:12,y:537,w:202,h:18},

  // ── SAMPLE — Reverse only ─────────────────────────────────────────────────
  {panel:'sample', state:'reverse', id:'rv_zero',   label:'Zero',   shape:'box', x:12,y:502,w:202,h:18},
  {panel:'sample', state:'reverse', id:'rv_cycles', label:'Cycles', shape:'box', x:12,y:566,w:92,h:18},
  {panel:'sample', state:'reverse', id:'rv_escape', label:'Escape', shape:'box', x:12,y:537,w:202,h:18},

  // ── SAMPLE — Freeze only ──────────────────────────────────────────────────
  {panel:'sample', state:'freeze', id:'fz_fft',    label:'FFT size',   shape:'knob', x:32,y:507,w:28,h:28},
  {panel:'sample', state:'freeze', id:'fz_bins',   label:'Bins',       shape:'knob', x:99,y:507,w:28,h:28},
  {panel:'sample', state:'freeze', id:'fz_vol',    label:'Volume',     shape:'knob', x:166,y:507,w:28,h:28},
  {panel:'sample', state:'freeze', id:'fz_coher',  label:'Coherence',  shape:'knob', x:23,y:567,w:28,h:28},
  {panel:'sample', state:'freeze', id:'fz_decorr', label:'Decorrel',   shape:'knob', x:74,y:567,w:28,h:28},
  {panel:'sample', state:'freeze', id:'fz_drift',  label:'Drift',      shape:'knob', x:124,y:567,w:28,h:28},
  {panel:'sample', state:'freeze', id:'fz_hold',   label:'Hold',       shape:'box',  x:70,y:649,w:44,h:18},
  {panel:'sample', state:'freeze', id:'fz_escape', label:'Escape',     shape:'box',  x:12,y:624,w:202,h:18},

  // ── SAMPLE — Pause only ───────────────────────────────────────────────────
  {panel:'sample', state:'pause', id:'pa_zero',   label:'Zero',  shape:'box', x:12,y:502,w:202,h:18},
  {panel:'sample', state:'pause', id:'pa_field',  label:'Pause', shape:'box', x:74,y:566,w:44,h:18},
  {panel:'sample', state:'pause', id:'pa_escape', label:'Escape', shape:'box', x:12,y:537,w:202,h:18},

  // ── LOCAL MIDI, always visible regardless of mode ────────────────────────
  {panel:'localmidi', state:'*', id:'lm_sqdisp',  label:'Squine Shape', shape:'box',  x:760,y:380,w:60,h:40},
  {panel:'localmidi', state:'*', id:'lm_clip',    label:'Clip',      shape:'knob', x:842,y:378,w:32,h:32},
  {panel:'localmidi', state:'*', id:'lm_skew',    label:'Skew',      shape:'knob', x:902,y:378,w:32,h:32},
  {panel:'localmidi', state:'*', id:'lm_rate',    label:'Rate',      shape:'knob', x:764,y:434,w:32,h:32},
  {panel:'localmidi', state:'*', id:'lm_depth',   label:'Depth',     shape:'knob', x:820,y:434,w:32,h:32},
  {panel:'localmidi', state:'*', id:'lm_phasedev',label:'PhaseDev',  shape:'knob', x:876,y:434,w:32,h:32},
  {panel:'localmidi', state:'*', id:'lm_ratedev', label:'RateDev',   shape:'knob', x:932,y:434,w:32,h:32},
  {panel:'localmidi', state:'*', id:'lm_seed',    label:'Seed',      shape:'box',  x:1000,y:444,w:44,h:20},
  {panel:'localmidi', state:'*', id:'lm_scale_lbl',label:'Scale:',   shape:'text', x:758,y:500,w:36,h:14},
  {panel:'localmidi', state:'*', id:'lm_scale',   label:'Scale name (click to load .scl)', shape:'box', x:796,y:496,w:160,h:20},
  {panel:'localmidi', state:'*', id:'lm_base_lbl',label:'Base:',     shape:'text', x:966,y:500,w:32,h:14},
  {panel:'localmidi', state:'*', id:'lm_base',    label:'Base note', shape:'box',  x:998,y:496,w:30,h:20},
  {panel:'localmidi', state:'*', id:'lm_refhz',   label:'440.0 Hz (display only)', shape:'text', x:1036,y:500,w:60,h:14},
  {panel:'localmidi', state:'*', id:'lm_grid_lbl',label:'Grid:',     shape:'text', x:758,y:526,w:30,h:14},
  {panel:'localmidi', state:'*', id:'lm_grid',    label:'Grid on/off', shape:'box', x:790,y:522,w:36,h:20},
  {panel:'localmidi', state:'*', id:'lm_bpm_lbl', label:'BPM:',      shape:'text', x:848,y:526,w:32,h:14},
  {panel:'localmidi', state:'*', id:'lm_bpm',     label:'BPM value', shape:'box',  x:882,y:522,w:36,h:20},
  {panel:'localmidi', state:'*', id:'lm_beats_lbl',label:'Beats:',   shape:'text', x:758,y:552,w:36,h:14},
  {panel:'localmidi', state:'*', id:'lm_beats',   label:'Beats value', shape:'box', x:800,y:548,w:20,h:20},
  {panel:'localmidi', state:'*', id:'lm_div_lbl', label:'Division:', shape:'text', x:874,y:552,w:54,h:14},
  {panel:'localmidi', state:'*', id:'lm_div',     label:'Division value', shape:'box', x:932,y:548,w:30,h:20},
  {panel:'localmidi', state:'*', id:'lm_mode16',  label:'16 samplers', shape:'box', x:758,y:752,w:96,h:20},
  {panel:'localmidi', state:'*', id:'lm_modempe', label:'MPE',      shape:'box',  x:857,y:752,w:96,h:20},
  {panel:'localmidi', state:'*', id:'lm_clone',   label:'Clone to 2-16', shape:'box', x:956,y:752,w:132,h:20},

  // ── LOCAL MIDI — MPE mode only ────────────────────────────────────────────
  {panel:'localmidi', state:'mpe', id:'mpe_divider',   label:'MPE (Tabs 2-16)', shape:'text', x:758,y:586,w:280,h:16},
  {panel:'localmidi', state:'mpe', id:'mpe_pb_lbl',    label:'PitchBend:',  shape:'text', x:758,y:608,w:62,h:14},
  {panel:'localmidi', state:'mpe', id:'mpe_pbvalue',   label:'PitchBend value', shape:'box',  x:822,y:604,w:26,h:18},
  {panel:'localmidi', state:'mpe', id:'mpe_pbtoggle',  label:'PB On/Off',   shape:'box',  x:854,y:604,w:32,h:18},
  {panel:'localmidi', state:'mpe', id:'mpe_press_lbl', label:'Pressure:',   shape:'text', x:758,y:636,w:56,h:14},
  {panel:'localmidi', state:'mpe', id:'mpe_pressdepth',label:'Pressure Depth',  shape:'knob', x:832,y:634,w:32,h:32},
  {panel:'localmidi', state:'mpe', id:'mpe_pressoff',  label:'Pressure Offset', shape:'knob', x:892,y:634,w:32,h:32},
  {panel:'localmidi', state:'mpe', id:'mpe_bright_lbl',label:'Brightness:', shape:'text', x:758,y:694,w:68,h:14},
  {panel:'localmidi', state:'mpe', id:'mpe_brightdepth',label:'Brightness Depth', shape:'knob', x:832,y:692,w:32,h:32},
  {panel:'localmidi', state:'mpe', id:'mpe_brightoff', label:'Brightness Offset', shape:'knob', x:892,y:692,w:32,h:32},
],
};
