/* Max Theme Maker — the dummy patch.
 *
 * The whole preview is built here. Each painted element reads its colors from CSS
 * variables set by app.js on .pv:
 *   --c-<id>   oncolor of a theme color
 *   --o-<id>   offcolor (if it exists)
 *   --s-<key>  styledefaults color; --s-bgfill = box background (gradient)
 * and declares what it uses in data-c (space-separated tokens):
 *   "patcher_box_selection"  theme color
 *   "o:patcher_box_selection" its offcolor
 *   "s:bgcolor"              style color
 * Clicking an element opens those colors; hovering a row in the editor makes the
 * elements that use it blink.
 *
 * Object → style color mapping: dynamiccolor_default attribute of the Max 9
 * reference pages (docs/refpages/*.maxref.xml).
 */
(function () {
  "use strict";

  const C = (id) => `var(--c-${id})`;
  const O = (id) => `var(--o-${id}, var(--c-${id}))`;
  const S = (k) => `var(--s-${k})`;
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const anno = (text, x, y, extra = "") =>
    `<div class="anno" style="left:${x}px;top:${y}px;${extra}">${esc(text)}</div>`;

  /* ------------------------------------------------------------------ */
  /* Toolbar icons (simple drawings, colored via currentColor) */
  const ICON = {
    lock: '<svg viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
    pres: '<svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="9" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5 14h6" stroke="currentColor" stroke-width="1.5"/></svg>',
    grid: '<svg viewBox="0 0 16 16"><path d="M2 5h12M2 11h12M5 2v12M11 2v12" stroke="currentColor" stroke-width="1.4"/></svg>',
    box: '<svg viewBox="0 0 16 16"><rect x="2" y="5" width="12" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
    msg: '<svg viewBox="0 0 16 16"><path d="M2 5h12l-2 3 2 3H2z" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
    btn: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
    tgl: '<svg viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.4"/></svg>',
    num: '<svg viewBox="0 0 16 16"><path d="M3 4l3 4-3 4z" fill="currentColor"/><text x="8" y="12" font-size="9" fill="currentColor">0</text></svg>',
    sld: '<svg viewBox="0 0 16 16"><rect x="6" y="2" width="4" height="12" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="5" y="8" width="6" height="2" fill="currentColor"/></svg>',
    live: '<svg viewBox="0 0 16 16"><circle cx="8" cy="9" r="5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-dasharray="24 8"/></svg>',
    star: '<svg viewBox="0 0 16 16"><path d="M8 2l1.8 4 4.2.4-3.2 2.8 1 4.2L8 11.3 4.2 13.4l1-4.2L2 6.4l4.2-.4z" fill="currentColor"/></svg>',
    clock: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 5v3.5l2 1.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
    bubble: '<svg viewBox="0 0 16 16"><path d="M2 3h12v8H7l-3 3v-3H2z" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
    power: '<svg viewBox="0 0 16 16"><path d="M5 4.5a5 5 0 1 0 6 0" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M8 2v6" stroke="currentColor" stroke-width="1.7"/></svg>',
    mute: '<svg viewBox="0 0 16 16"><text x="3" y="12" font-size="10" font-weight="700" fill="currentColor">M</text></svg>',
    solo: '<svg viewBox="0 0 16 16"><text x="4" y="12" font-size="10" font-weight="700" fill="currentColor">S</text></svg>',
    play: '<svg viewBox="0 0 16 16"><path d="M4 3l9 5-9 5z" fill="currentColor"/></svg>',
    pin: '<svg viewBox="0 0 16 16"><path d="M6 2h4l-1 4 3 3H4l3-3zM8 9v5" stroke="currentColor" stroke-width="1.3" fill="currentColor"/></svg>',
    info: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M8 7v4M8 4.6v.8" stroke="currentColor" stroke-width="1.6"/></svg>',
    list: '<svg viewBox="0 0 16 16"><path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" stroke-width="1.6"/></svg>',
    book: '<svg viewBox="0 0 16 16"><path d="M3 3h4a1 1 0 0 1 1 1v9a1 1 0 0 0-1-1H3zM13 3H9a1 1 0 0 0-1 1v9a1 1 0 0 1 1-1h4z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>',
    search: '<svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M10 10l4 4" stroke="currentColor" stroke-width="1.6"/></svg>',
    gear: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 1.5v2.5M8 12v2.5M1.5 8H4M12 8h2.5M3.4 3.4l1.8 1.8M10.8 10.8l1.8 1.8M3.4 12.6l1.8-1.8M10.8 5.2l1.8-1.8" stroke="currentColor" stroke-width="1.4"/></svg>',
    snow: '<svg viewBox="0 0 16 16"><path d="M8 1v14M2 4.5l12 7M2 11.5l12-7" stroke="currentColor" stroke-width="1.4"/></svg>',
    warn: '<svg viewBox="0 0 16 16"><path d="M8 2l7 12H1z" fill="currentColor"/><path d="M8 6v4M8 11.6v.8" stroke="#000" stroke-opacity=".55" stroke-width="1.5"/></svg>',
  };
  const ico = (name, color, token, title, extra = "") =>
    `<span class="ico" data-c="${token}" title="${esc(title || token)}" style="color:${color};${extra}">${ICON[name]}</span>`;

  /* ------------------------------------------------------------------ */
  /* The patch                                                          */

  // Text tokens of an object box: o = name, a = argument, t = @attribute, v = attribute value
  const boxes = [
    { k: "obj", id: "metro", x: 40, y: 34, t: [["o", "metro"], ["a", "250"], ["t", "@active"], ["v", "1"]], ins: 2, outs: 1 },
    { k: "obj", id: "counter", x: 40, y: 96, t: [["o", "counter"], ["a", "0"], ["a", "7"]], ins: 3, outs: 4 },
    { k: "num", id: "num1", x: 40, y: 150, w: 54, val: "5", ins: 1, outs: 2 },
    { k: "num", id: "num2", x: 106, y: 150, w: 62, val: "0.75", ins: 1, outs: 2, drag: true },
    { k: "msg", id: "msgbang", x: 250, y: 34, text: "bang", ins: 1, outs: 1 },
    { k: "msg", id: "msgset", x: 300, y: 34, text: "set 3, 4 5", ins: 1, outs: 1 },
    { k: "obj", id: "mtof", x: 40, y: 206, t: [["o", "mtof"]], ins: 1, outs: 1 },
    { k: "obj", id: "cycle", x: 40, y: 258, t: [["o", "cycle~"], ["a", "440"]], ins: 2, outs: 1 },
    { k: "obj", id: "mul", x: 40, y: 318, t: [["o", "*~"], ["a", "0.2"]], ins: 2, outs: 1, hover: true },
    { k: "obj", id: "line", x: 180, y: 258, t: [["o", "line~"]], ins: 2, outs: 2 },
    { k: "msg", id: "msgramp", x: 180, y: 206, text: "0.2 50", ins: 1, outs: 1 },
    { k: "ezdac", id: "dac", x: 44, y: 400, ins: 2, outs: 0 },
    { k: "obj", id: "sel", x: 250, y: 96, t: [["o", "sel"], ["a", "0"]], ins: 2, outs: 2, selected: true },
    { k: "obj", id: "print", x: 250, y: 150, t: [["o", "print"], ["a", "click"]], ins: 1, outs: 0, selected: true },
    { k: "bogus", id: "bogus", x: 420, y: 34, text: "nonexistent.obj 3", ins: 1, outs: 0 },
    { k: "edit", id: "edit", x: 420, y: 96, ins: 1, outs: 1 },
    { k: "obj", id: "tinge", x: 420, y: 150, t: [["o", "pack"], ["a", "0"], ["a", "0."]], ins: 2, outs: 1, tinge: true },
    { k: "obj", id: "pres", x: 420, y: 206, t: [["o", "zl.group"], ["a", "4"]], ins: 2, outs: 2, pres: true },
    { k: "obj", id: "guide", x: 588, y: 96, t: [["o", "route"], ["a", "freq"], ["a", "amp"]], ins: 2, outs: 3 },
    { k: "obj", id: "guide2", x: 588, y: 150, t: [["o", "unpack"], ["a", "f"], ["a", "f"]], ins: 1, outs: 2 },
  ];
  const cords = [
    ["metro", 0, "counter", 0],
    ["counter", 0, "num1", 0, "", "break"],
    ["counter", 0, "sel", 0],
    ["sel", 0, "print", 0, "", "post"],
    ["msgbang", 0, "metro", 0],
    ["num1", 0, "mtof", 0, "", "monitor"],
    ["mtof", 0, "cycle", 0],
    ["cycle", 0, "mul", 0, "sig"],
    ["msgramp", 0, "line", 0, "", "disabled"],
    ["line", 0, "mul", 1, "sig"],
    ["mul", 0, "dac", 0, "sig"],
    ["mul", 0, "dac", 1, "sig"],
    ["guide", 0, "guide2", 0],
  ];

  function textWidth(b) {
    let n;
    if (b.t) n = b.t.reduce((s, x) => s + x[1].length + 1, -1);
    else n = (b.text || b.val || "").length;
    return Math.max(32, Math.round(n * 6.6 + 14));
  }
  for (const b of boxes) {
    b.w = b.w || (b.k === "ezdac" ? 45 : b.k === "edit" ? 128 : textWidth(b));
    b.h = b.k === "ezdac" ? 45 : 22;
  }
  const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));
  const portX = (b, i, n) => (n <= 1 ? b.x + 4 : b.x + 4 + ((b.w - 8) * i) / (n - 1));
  const connected = new Set();
  for (const c of cords) {
    connected.add(c[0] + ":o" + c[1]);
    connected.add(c[2] + ":i" + c[3]);
  }

  function syntaxSpans(t) {
    const col = { o: "syntax_objectcolor", a: "syntax_objargcolor", t: "syntax_attributecolor", v: "syntax_attrargcolor" };
    return t
      .map(([k, s]) => `<span data-c="s:${col[k]}" style="color:${S(col[k])}">${esc(s)}</span>`)
      .join(" ");
  }

  // Inlets/outlets, as measured in Max 9.2: a 6 × 4 pt pad sitting in the accent
  // band of the object box, visible even when the patch is locked.
  //   free      : solid patcher_io_unconnected
  //   connected : center patcher_io_connected_inside, 1 pt ring on the three sides facing
  //               the box — patcher_hot_inlet (1st inlet), patcher_cool_inlet (the others),
  //               patcher_outlet (outlets). The side where the cord arrives stays open.
  function ports(b) {
    let h = "";
    const band = b.k === "obj" || b.k === "edit"; // only object boxes have the band
    const put = (n, inlet) => {
      for (let i = 0; i < n; i++) {
        // box-local coordinates (portX is in patch coordinates)
        const x = portX(b, i, n) - b.x - 3 - (band ? 0 : 1);
        const key = b.id + (inlet ? ":i" : ":o") + i;
        const pos = band ? (inlet ? "top:-4px;" : "bottom:-4px;") : inlet ? "top:-1px;" : `top:${b.h - 3}px;`;
        if (connected.has(key)) {
          const ring = inlet ? (i === 0 ? "patcher_hot_inlet" : "patcher_cool_inlet") : "patcher_outlet";
          const open = inlet ? "border-top:0;" : "border-bottom:0;";
          h += `<span class="port ${inlet ? "in" : "out"} ${band ? "" : "unlocked-only"}" data-c="${ring} patcher_io_connected_inside" style="left:${x}px;${pos}background:${C("patcher_io_connected_inside")};border:1px solid ${C(ring)};${open}"></span>`;
        } else {
          h += `<span class="port ${inlet ? "in" : "out"} ${band ? "" : "unlocked-only"}" data-c="patcher_io_unconnected" style="left:${x}px;${pos}background:${C("patcher_io_unconnected")}"></span>`;
        }
      }
    };
    put(b.ins, true);
    put(b.outs, false);
    return h;
  }

  function boxHTML(b) {
    const pos = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;`;
    let inner = "", cls = "pbox", tok = "", style = pos;
    // Measured in Max 9.2 (diagnostic theme): an OBJECT box is painted in bgcolor;
    // bgfillcolor is only used by message boxes (and umenu, panel).
    // It also has a full-width 4 pt accentcolor band at top and bottom.
    if (b.k === "obj") {
      cls += " obj";
      tok = "s:bgcolor s:accentcolor s:textcolor_inverse";
      style += `background:${S("bgcolor")};color:${S("textcolor_inverse")};border-color:${S("accentcolor")};`;
      inner = syntaxSpans(b.t);
    } else if (b.k === "msg") {
      cls += " msg";
      tok = "s:bgfillcolor_color2 s:bgfillcolor_color1 s:textcolor_inverse";
      style += `background:${S("bgfill")};color:${S("textcolor_inverse")};`;
      inner = esc(b.text);
    } else if (b.k === "num") {
      cls += " num";
      tok = "s:bgcolor s:textcolor_inverse " + (b.drag ? "s:selectioncolor" : "s:accentcolor");
      style += `background:${S("bgcolor")};color:${S("textcolor_inverse")};`;
      inner = `<span class="tri" style="border-left-color:${b.drag ? S("selectioncolor") : S("accentcolor")}"></span>${esc(b.val)}`;
    } else if (b.k === "bogus") {
      cls += " bogus";
      // measured: the whole box is painted in object_bogus_color
      tok = "object_bogus_color o:object_bogus_color s:textcolor_inverse";
      style += `background:${C("object_bogus_color")};color:${S("textcolor_inverse")};border-color:${O("object_bogus_color")};`;
      inner = esc(b.text);
    } else if (b.k === "edit") {
      cls += " obj";
      tok = "s:bgcolor s:accentcolor text_editingcolor s:textcolor_inverse";
      style += `background:${S("bgcolor")};color:${S("textcolor_inverse")};border-color:${S("accentcolor")};`;
      inner = `<span data-c="s:syntax_objectcolor" style="color:${S("syntax_objectcolor")}">scale</span> <span data-c="text_editingcolor" style="background:${C("text_editingcolor")};color:${S("textcolor_inverse")}">0 127</span> 0. 1.<span class="caret" style="background:${S("textcolor_inverse")}"></span>`;
    } else if (b.k === "ezdac") {
      cls += " ui";
      tok = "s:bgcolor s:color s:elementcolor";
      style += `background:${S("bgcolor")};`;
      inner = `<svg viewBox="0 0 45 45" width="45" height="45"><path d="M12 17h7l9-7v25l-9-7h-7z" fill="${S("color")}"/><path d="M31 15q5 7 0 15" stroke="${S("elementcolor")}" stroke-width="2" fill="none"/></svg>`;
    }
    if (b.hover) cls += " hover";
    let out = `<div class="${cls}" data-c="${tok}" style="${style}">${inner}${ports(b)}</div>`;
    // Hover in edit mode (measured in Max 9.2): 4 pt frame around the box in
    // patcher_box_selection at 40% opacity, and half-circle ports sticking out.
    if (b.hover) out += `<div class="hover-halo unlocked-only" data-c="patcher_box_selection" style="left:${b.x - 4}px;top:${b.y - 4}px;width:${b.w + 8}px;height:${b.h + 8}px;border-color:color-mix(in srgb, ${C("patcher_box_selection")} 40%, transparent)"></div>`;
    if (b.selected) out += `<div class="sel-frame" data-c="patcher_box_selection" style="left:${b.x - 2}px;top:${b.y - 2}px;width:${b.w}px;height:${b.h}px;border-color:${C("patcher_box_selection")}"></div>`;
    if (b.tinge) {
      out += `<div class="tinge" data-c="patcher_tinge_object" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;background:${C("patcher_tinge_object")}"></div>`;
      out += `<div class="tinge-hi" data-c="patcher_tinge_hilite" style="left:${b.x - 3}px;top:${b.y - 3}px;width:${b.w + 6}px;height:${b.h + 6}px;border-color:${C("patcher_tinge_hilite")}"></div>`;
    }
    if (b.pres) out += `<div class="pres-frame unlocked-only" data-c="presentation_frame" style="left:${b.x - 3}px;top:${b.y - 3}px;width:${b.w + 6}px;height:${b.h + 6}px;background:${C("presentation_frame")}"></div>`;
    return out;
  }

  function cordsSVG() {
    let s = "";
    for (const [fa, fo, ta, ti, kind, badge] of cords) {
      const A = byId[fa], B = byId[ta];
      const x1 = portX(A, fo, A.outs), y1 = A.y + A.h;
      const x2 = portX(B, ti, B.ins), y2 = B.y;
      if (kind === "sig") {
        s += `<g data-c="s:patchlinecolor"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${S("patchlinecolor")}" stroke-width="3"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${S("locked_bgcolor")}" class="sigstripe" stroke-width="1" stroke-dasharray="3 3"/></g>`;
      } else {
        s += `<line data-c="s:patchlinecolor" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${S("patchlinecolor")}" stroke-width="1.5"/>`;
      }
      if (badge) {
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const id = "patchline_badge_" + badge;
        s += `<g data-c="${id}"><circle cx="${mx}" cy="${my}" r="7" fill="${C(id)}"/><text x="${mx}" y="${my + 3.5}" text-anchor="middle" font-size="9" font-weight="700" fill="#000" fill-opacity=".7">${{ break: 1, post: 2, monitor: 3, disabled: 4 }[badge]}</text></g>`;
      }
    }
    // patch cord being dragged to the hot inlet of the hovered *~
    const M = byId.mul;
    s += `<line data-c="s:patchlinecolor" x1="${M.x + 140}" y1="${M.y - 36}" x2="${portX(M, 0, 2)}" y2="${M.y - 2}" stroke="${S("patchlinecolor")}" stroke-width="1.5" stroke-dasharray="4 3" class="unlocked-only"/>`;
    return s;
  }

  function hoverDecor() {
    const M = byId.mul;
    let h = "";
    // (The old hot/cool/outlet hover circles are gone: measured in Max 9.2,
    // these colors make up the ring of CONNECTED ports, drawn by ports().)
    // box menu button (circle on hover, left edge)
    h += `<span class="boxmenu-circle unlocked-only" data-c="patcher_circle_fill patcher_circle_outline" style="left:${M.x - 9}px;top:${M.y + 5}px;background:${C("patcher_circle_fill")};border-color:${C("patcher_circle_outline")}"></span>`;
    // assistance bubble for the outlet
    h += `<div class="assist" data-c="assistance_background assistance_text" style="left:${M.x + 2}px;top:${M.y + 30}px;background:${C("assistance_background")};color:${C("assistance_text")}">(signal) Output</div>`;
    return h;
  }

  function patchCanvas() {
    let h = `<div class="canvas" data-c="s:locked_bgcolor s:editing_bgcolor">`;
    h += `<svg class="cords" width="760" height="470">${cordsSVG()}</svg>`;
    for (const b of boxes) h += boxHTML(b);
    h += hoverDecor();
    // comment (outline visible in edit mode) and bubble comment
    h += `<div class="comment" data-c="s:textcolor comment_outline" style="left:250px;top:206px;color:${S("textcolor")};--outline:${C("comment_outline")}">← comment (textcolor)</div>`;
    h += `<div class="bubble" data-c="s:bubble_bgcolor s:bubble_outlinecolor s:textcolor" style="left:250px;top:258px;background:${S("bubble_bgcolor")};border-color:${S("bubble_outlinecolor")};color:${S("textcolor")}">bubble comment<span class="bubble-tail" style="border-top-color:${S("bubble_outlinecolor")}"></span></div>`;
    // drag selection
    h += `<div class="dragsel" data-c="box_selection_background" style="left:236px;top:86px;width:110px;height:94px;background:${C("box_selection_background")};border-color:${C("box_selection_background")}"></div>`;
    // alignment guide
    h += `<div class="guide unlocked-only" data-c="alignmentguide" style="left:${byId.guide.x}px;top:80px;height:110px;border-color:${C("alignmentguide")}"></div>`;
    // annotations
    h += anno("unknown object", 420, 18) + anno("text being edited", 420, 80) + anno("tinge", 420 + byId.tinge.w + 8, 153)
      + anno("presentation frame", 420 + byId.pres.w + 8, 209) + anno("selection", 236, 72)
      + anno("hover: inlets/outlet, box menu, assistance", 116, 322) + anno("drag (htricolor)", 106, 176)
      + anno("alignment guide", 590, 64) + anno("patch cord badges 1–4", 120, 120);
    h += `</div>`;
    return h;
  }

  /* ------------------------------------------------------------------ */
  /* UI objects (style colors)                                          */

  function uiObjects() {
    const it = (label, tok, body, w = 70, extra = "") =>
      `<div class="ui-item" style="width:${w}px;${extra}"><div class="ui-obj" data-c="${tok}">${body}</div><div class="ui-cap">${esc(label)}</div></div>`;
    let h = `<div class="ui-grid">`;
    h += it("button", "s:bgcolor s:elementcolor", `<svg width="34" height="34"><rect width="34" height="34" fill="${S("bgcolor")}"/><circle cx="17" cy="17" r="11" fill="none" stroke="${S("elementcolor")}" stroke-width="3"/></svg>`, 48);
    h += it("button (flashing)", "s:bgcolor s:color", `<svg width="34" height="34"><rect width="34" height="34" fill="${S("bgcolor")}"/><circle cx="17" cy="17" r="11" fill="${S("color")}" stroke="${S("color")}" stroke-width="3"/></svg>`, 70);
    h += it("toggle", "s:bgcolor s:elementcolor", `<svg width="34" height="34"><rect width="34" height="34" fill="${S("bgcolor")}"/><path d="M8 8l18 18M26 8L8 26" stroke="${S("elementcolor")}" stroke-width="3"/></svg>`, 48);
    h += it("toggle (checked)", "s:bgcolor s:color", `<svg width="34" height="34"><rect width="34" height="34" fill="${S("bgcolor")}"/><path d="M8 8l18 18M26 8L8 26" stroke="${S("color")}" stroke-width="3"/></svg>`, 64);
    h += it("slider", "s:bgcolor s:elementcolor s:color", `<svg width="22" height="96"><rect width="22" height="96" fill="${S("bgcolor")}"/><rect x="9" y="6" width="4" height="84" fill="${S("elementcolor")}"/><rect x="9" y="40" width="4" height="50" fill="${S("color")}"/><rect x="3" y="36" width="16" height="6" rx="1" fill="${S("color")}"/></svg>`, 40);
    h += it("dial", "s:bgcolor s:elementcolor s:color", `<svg width="44" height="44"><rect width="44" height="44" fill="${S("bgcolor")}"/><path d="M10.7 33.3A15 15 0 1 1 33.3 33.3" fill="none" stroke="${S("elementcolor")}" stroke-width="3"/><path d="M10.7 33.3A15 15 0 0 1 17 8.3" fill="none" stroke="${S("color")}" stroke-width="3"/><path d="M22 22L15 10" stroke="${S("color")}" stroke-width="2.5"/></svg>`, 54);
    h += it("rslider", "s:bgcolor s:accentcolor s:color", `<svg width="110" height="20"><rect width="110" height="20" fill="${S("bgcolor")}" stroke="${S("accentcolor")}"/><rect x="28" y="3" width="50" height="14" fill="${S("color")}"/></svg>`, 116);
    h += it("multislider", "s:bgcolor s:color", `<svg width="110" height="70"><rect width="110" height="70" fill="${S("bgcolor")}"/>${[30, 50, 22, 60, 41, 12, 35, 55, 27, 45].map((v, i) => `<rect x="${3 + i * 10.6}" y="${70 - v}" width="9" height="${v}" fill="${S("color")}"/>`).join("")}</svg>`, 116);
    h += it("kslider", "s:darkcolor s:lightcolor s:selectioncolor s:elementcolor", kslider(), 150);
    h += it("number / flonum", "s:bgcolor s:accentcolor s:textcolor_inverse", `<div class="mini-num" style="background:${S("bgcolor")};color:${S("textcolor_inverse")}"><span class="tri" style="border-left-color:${S("accentcolor")}"></span>127</div>`, 74);
    h += it("attrui", "s:bgcolor s:accentcolor s:textcolor_inverse", `<div class="mini-num" style="width:120px;background:${S("bgcolor")};color:${S("textcolor_inverse")}"><span class="tri" style="border-left-color:${S("accentcolor")}"></span>interval &nbsp;250</div>`, 128);
    h += it("umenu", "s:bgfillcolor_color2 s:bgfillcolor_color1 s:textcolor_inverse s:color", `<div class="mini-menu" style="background:${S("bgfill")};color:${S("textcolor_inverse")}">sine<span class="arr" style="border-top-color:${S("color")}"></span></div>`, 96);
    h += it("textedit", "s:bgcolor s:elementcolor s:textcolor_inverse", `<div class="mini-te" style="background:${S("bgcolor")};border-color:${S("elementcolor")};color:${S("textcolor_inverse")}">typed text…</div>`, 110);
    h += it("tab", "s:elementcolor s:color s:textcolor_inverse", `<div class="mini-tab">${["one", "two", "three"].map((t, i) => `<span style="background:${i === 1 ? S("color") : S("elementcolor")};color:${S("textcolor_inverse")}">${t}</span>`).join("")}</div>`, 130);
    h += it("radiogroup", "s:bgcolor s:elementcolor s:color", `<svg width="20" height="60"><rect width="20" height="60" fill="${S("bgcolor")}"/>${[0, 1, 2].map((i) => `<circle cx="10" cy="${10 + i * 20}" r="6" fill="${i === 1 ? S("color") : "none"}" stroke="${S("elementcolor")}" stroke-width="2"/>`).join("")}</svg>`, 70);
    h += it("matrixctrl", "s:bgcolor s:elementcolor s:color", `<svg width="64" height="48"><rect width="64" height="48" fill="${S("bgcolor")}"/>${[...Array(12)].map((_, i) => { const x = 4 + (i % 4) * 15, y = 4 + Math.floor(i / 4) * 14.5; return `<rect x="${x}" y="${y}" width="11" height="11" rx="2" fill="${[1, 6, 11].includes(i) ? S("color") : S("elementcolor")}"/>`; }).join("")}</svg>`, 76);
    h += it("gain~", "s:bgcolor s:elementcolor s:color", `<svg width="24" height="96"><rect width="24" height="96" fill="${S("bgcolor")}"/>${[...Array(12)].map((_, i) => `<rect x="2" y="${4 + i * 7.6}" width="20" height="3" fill="${S("elementcolor")}"/>`).join("")}<rect x="1" y="44" width="22" height="7" fill="${S("color")}"/></svg>`, 44);
    h += it("meter~", "s:bgcolor s:elementcolor s:color", `<svg width="16" height="96"><rect width="16" height="96" fill="${S("bgcolor")}"/>${[...Array(12)].map((_, i) => `<rect x="3" y="${4 + i * 7.6}" width="10" height="5.5" fill="${i > 4 ? S("color") : S("elementcolor")}"/>`).join("")}</svg>`, 44);
    h += it("scope~ / spectroscope~", "s:bgcolor s:elementcolor s:color", `<svg width="140" height="70"><rect width="140" height="70" fill="${S("bgcolor")}"/><path d="M0 35H140M70 0V70M35 0V70M105 0V70" stroke="${S("elementcolor")}"/><path d="M0 35 ${[...Array(29)].map((_, i) => `L${i * 5} ${35 - Math.sin(i / 2.2) * 24}`).join(" ")}" fill="none" stroke="${S("color")}" stroke-width="1.6"/></svg>`, 146);
    h += it("function", "s:bgcolor s:elementcolor s:color s:textcolor_inverse", `<svg width="140" height="70"><rect width="140" height="70" fill="${S("bgcolor")}"/><path d="M35 0V70M70 0V70M105 0V70" stroke="${S("elementcolor")}"/><path d="M4 64L40 12L90 40L136 22" fill="none" stroke="${S("color")}" stroke-width="1.6"/>${[[4, 64], [40, 12], [90, 40], [136, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${S("color")}"/>`).join("")}<text x="44" y="12" font-size="9" fill="${S("textcolor_inverse")}">0.82</text></svg>`, 146);
    h += it("waveform~", "s:bgcolor s:elementcolor s:color s:accentcolor s:selectioncolor", `<svg width="140" height="60"><rect width="140" height="60" fill="${S("bgcolor")}"/><rect x="40" width="44" height="60" fill="${S("selectioncolor")}" fill-opacity=".35"/><path d="M0 30H140" stroke="${S("elementcolor")}"/>${[...Array(70)].map((_, i) => { const a = Math.abs(Math.sin(i / 5) * Math.sin(i / 1.7)) * 22 + 2; return `<rect x="${i * 2}" y="${30 - a}" width="1.4" height="${a}" fill="${S("color")}"/><rect x="${i * 2}" y="30" width="1.4" height="${a * 0.7}" fill="${S("accentcolor")}"/>`; }).join("")}</svg>`, 146);
    h += it("chooser (stripecolor)", "s:bgcolor s:stripecolor s:selectioncolor s:textcolor_inverse", `<div class="mini-list" style="background:${S("bgcolor")};color:${S("textcolor_inverse")}">${["kick.wav", "snare.wav", "hat.wav", "tom.wav"].map((t, i) => `<div style="background:${i === 2 ? S("selectioncolor") : i % 2 ? S("stripecolor") : "transparent"}">${t}</div>`).join("")}</div>`, 110);
    h += it("preset", "s:bgcolor s:elementcolor s:accentcolor s:color s:textcolor", `<svg width="84" height="36"><rect width="84" height="36" fill="${S("bgcolor")}"/>${[...Array(10)].map((_, i) => { const x = 4 + (i % 5) * 16, y = 4 + Math.floor(i / 5) * 16; return `<circle cx="${x + 6}" cy="${y + 6}" r="5.5" fill="${i === 2 ? S("color") : i < 5 ? S("accentcolor") : S("elementcolor")}"/>`; }).join("")}</svg>`, 92);
    h += it("nodes", "s:bgcolor s:elementcolor s:accentcolor s:selectioncolor", `<svg width="100" height="70"><rect width="100" height="70" fill="${S("bgcolor")}"/><circle cx="34" cy="30" r="22" fill="${S("elementcolor")}" fill-opacity=".8"/><circle cx="66" cy="42" r="18" fill="${S("elementcolor")}" fill-opacity=".8"/><circle cx="34" cy="30" r="3" fill="${S("accentcolor")}"/><circle cx="66" cy="42" r="3" fill="${S("accentcolor")}"/><circle cx="52" cy="34" r="5" fill="${S("selectioncolor")}"/></svg>`, 106);
    // measured: despite the reference page (live_control_bg), the panel is painted in bgfillcolor
    h += it("panel", "s:bgfillcolor_color2 s:bgfillcolor_color1 s:color", `<div class="mini-panel" style="background:${S("bgfill")};border-color:${S("color")}"></div>`, 92);
    h += it("textbutton", "live_control_bg live_control_fg_off live_control_selection live_control_fg", `<div class="mini-tb"><span style="background:${C("live_control_bg")};color:${C("live_control_fg_off")}">Off</span><span style="background:${C("live_control_selection")};color:${C("live_control_fg")}">On</span></div>`, 92);
    h += `</div>`;
    return h;
  }

  function kslider() {
    let w = "", b = "";
    for (let i = 0; i < 14; i++) {
      const sel = i === 4, hk = i === 9;
      w += `<rect x="${i * 10}" y="0" width="10" height="44" fill="${sel ? S("selectioncolor") : hk ? S("elementcolor") : S("lightcolor")}" stroke="${S("darkcolor")}" stroke-width=".6"/>`;
    }
    [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].forEach((k) => {
      b += `<rect x="${k * 10 + 6.5}" y="0" width="7" height="27" fill="${S("darkcolor")}"/>`;
    });
    return `<svg width="140" height="44">${w}${b}</svg>`;
  }

  /* ------------------------------------------------------------------ */
  /* Patcher window chrome                                              */

  function menubar(inactive) {
    const sfx = inactive ? "_inactive" : "";
    const items = ["Max", "File", "Edit", "View", "Object", "Arrange", "Options", "Window", "Help"];
    return `<div class="menubar" data-c="menubar_background${sfx} menubar_text${sfx}" style="background:${C("menubar_background" + sfx)};color:${C("menubar_text" + sfx)}">${items
      .map((t, i) =>
        i === 2
          ? `<span class="mb-hi" data-c="menubar_highlighted_background${sfx}${inactive ? "" : " menubar_highlighted_text"}" style="background:${C("menubar_highlighted_background" + sfx)};${inactive ? "" : `color:${C("menubar_highlighted_text")}`}">${t}</span>`
          : `<span>${t}</span>`
      )
      .join("")}</div>`;
  }

  function topToolbar() {
    return `<div class="tb tb-top" data-c="toolbar_background_active" style="background:${C("toolbar_background_active")}">
      ${ico("lock", C("toolbar_enabled_on"), "toolbar_enabled_on", "Lock (on)")}
      ${ico("pres", C("toolbar_enabled_off"), "toolbar_enabled_off", "Presentation (off)")}
      ${ico("grid", C("toolbar_enabled_modified"), "toolbar_enabled_modified", "Modified value")}
      <span class="tb-div" data-c="toolbar_divider_active" style="background:${C("toolbar_divider_active")}"></span>
      ${ico("box", C("basic"), "basic", "Palette: basic objects")}
      ${ico("msg", C("parchment"), "parchment", "Left toolbar items")}
      ${ico("btn", C("buttoned_up"), "buttoned_up", "Palette: buttons")}
      ${ico("num", C("number_one"), "number_one", "Palette: numbers")}
      ${ico("sld", C("sliderweb"), "sliderweb", "Palette: sliders")}
      ${ico("live", C("lively"), "lively", "Palette: Live objects")}
      <span class="tb-div" data-c="toolbar_divider_active" style="background:${C("toolbar_divider_active")}"></span>
      ${ico("clock", C("objectified"), "objectified", "Recent objects menu")}
      ${ico("bubble", C("urgentmessage"), "urgentmessage", "Recent messages menu")}
      ${ico("star", C("favicolor"), "favicolor", "Save a snippet")}
      <span class="tb-badge-wrap">${ico("warn", C("toolbar_enabled_off"), "toolbar_enabled_off", "")}<span class="tb-badge" data-c="toolbar_badge" style="background:${C("toolbar_badge")}">3</span></span>
      ${ico("gear", C("toolbar_disabled_active"), "toolbar_disabled_active", "Disabled item")}
      <span class="tb-flex"></span>
      <span class="searchbar" data-c="toolbar_searchbar_background toolbar_searchbar_emptytext" style="background:${C("toolbar_searchbar_background")};color:${C("toolbar_searchbar_emptytext")}">${ICON.search} Search…</span>
      <span class="searchbar" data-c="toolbar_searchbar_background toolbar_searchbar_text toolbar_searchbar_hilite" style="background:${C("toolbar_searchbar_background")};color:${C("toolbar_searchbar_text")}">${ICON.search} <span style="background:${C("toolbar_searchbar_hilite")}">cyc</span>le~</span>
    </div>`;
  }

  function tabs(inactiveWin) {
    const act = inactiveWin ? O("patcher_active_tab") : C("patcher_active_tab");
    const ina = inactiveWin ? O("patcher_inactive_tab") : C("patcher_inactive_tab");
    const pre = inactiveWin ? "o:" : "";
    return `<div class="tabs" data-c="patcher_tab_top_line patcher_tab_bottom_line" style="border-top-color:${C("patcher_tab_top_line")};border-bottom-color:${C("patcher_tab_bottom_line")};background:${ina}">
      <span class="tab act" data-c="${pre}patcher_active_tab patcher_tab_text_active" style="background:${act};color:${C("patcher_tab_text_active")}">synth.maxpat</span>
      <span class="tab" data-c="${pre}patcher_inactive_tab patcher_tab_text_inactive" style="background:${ina};color:${C("patcher_tab_text_inactive")}">[p sequencer]</span>
      <span class="tab" data-c="${pre}patcher_inactive_tab patcher_tab_text_inactive" style="background:${ina};color:${C("patcher_tab_text_inactive")}">help.maxhelp</span>
    </div>`;
  }

  function leftToolbar() {
    return `<div class="tb tb-left" data-c="toolbar_background_active" style="background:${C("toolbar_background_active")}">
      ${ico("box", C("parchment"), "parchment", "Left toolbar items")}
      ${ico("msg", C("parchment"), "parchment", "Left toolbar items")}
      ${ico("btn", C("parchment"), "parchment", "Left toolbar items")}
      ${ico("tgl", C("parchment"), "parchment", "Left toolbar items")}
      ${ico("num", C("parchment"), "parchment", "Left toolbar items")}
      <span class="tb-hdiv" data-c="toolbar_divider_active" style="background:${C("toolbar_divider_active")}"></span>
      ${ico("star", C("toolbar_active_unique"), "toolbar_active_unique", "Selected choice")}
      ${ico("clock", C("toolbar_enabled_off"), "toolbar_enabled_off", "")}
    </div>`;
  }

  function rightToolbar() {
    return `<div class="tb tb-left" data-c="toolbar_background_active" style="background:${C("toolbar_background_active")}">
      ${ico("list", C("sidebarblues"), "sidebarblues", "Sidebar controls (on)")}
      ${ico("info", C("toolbar_enabled_off"), "toolbar_enabled_off", "")}
      ${ico("book", C("toolbar_enabled_off"), "toolbar_enabled_off", "")}
      ${ico("search", C("toolbar_enabled_off"), "toolbar_enabled_off", "")}
      ${ico("snow", C("iceice"), "iceice", "Frozen attribute")}
      ${ico("warn", C("wolfsburg"), "wolfsburg", "Error / conflict")}
    </div>`;
  }

  function bottomToolbar() {
    return `<div class="tb tb-bottom" data-c="toolbar_background_active" style="background:${C("toolbar_background_active")}">
      ${ico("lock", C("toolbar_enabled_off"), "toolbar_enabled_off", "")}
      ${ico("pres", C("toolbar_enabled_off"), "toolbar_enabled_off", "")}
      <span class="tb-div" data-c="toolbar_divider_active" style="background:${C("toolbar_divider_active")}"></span>
      ${ico("power", C("audiocolor"), "audiocolor", "Global audio on")}
      ${ico("power", C("local_audiocolor"), "local_audiocolor", "Local audio on")}
      ${ico("mute", C("mute_on"), "mute_on", "Mute")}
      ${ico("solo", C("solo_on"), "solo_on", "Solo")}
      ${ico("play", C("transport_green"), "transport_green", "Transport: play")}
      ${ico("pin", C("yellowpin"), "yellowpin", "Pin")}
      <span class="tb-flex"></span>
      <span class="tb-text" style="color:${C("toolbar_enabled_off")}" data-c="toolbar_enabled_off">100 %</span>
    </div>`;
  }

  function patchWindow() {
    return `<div class="win">
      ${menubar(false)}
      ${topToolbar()}
      ${tabs(false)}
      <div class="win-mid">
        ${leftToolbar()}
        <div class="canvas-wrap">${patchCanvas()}</div>
        ${rightToolbar()}
      </div>
      ${bottomToolbar()}
    </div>`;
  }

  function inactiveWindow() {
    // a background window: inactive bar, tabs and selection frame in offcolor
    return `<div class="win win-small">
      ${menubar(true)}
      <div class="tb tb-top" data-c="toolbar_background_inactive" style="background:${C("toolbar_background_inactive")}">
        ${ico("lock", C("toolbar_enabled_off"), "toolbar_enabled_off", "")}
        ${ico("pres", C("toolbar_disabled_inactive"), "toolbar_disabled_inactive", "Disabled item (inactive toolbar)")}
        <span class="tb-div" data-c="toolbar_divider_inactive" style="background:${C("toolbar_divider_inactive")}"></span>
        ${ico("box", C("toolbar_disabled_inactive"), "toolbar_disabled_inactive", "")}
        ${ico("gear", C("toolbar_disabled_inactive"), "toolbar_disabled_inactive", "")}
      </div>
      ${tabs(true)}
      <div class="canvas small" data-c="s:locked_bgcolor s:editing_bgcolor">
        <div class="pbox" data-c="s:bgcolor s:textcolor_inverse" style="left:20px;top:22px;width:80px;height:22px;background:${S("bgcolor")};color:${S("textcolor_inverse")}">${syntaxSpans([["o", "noise~"]])}</div>
        <div class="sel-frame" data-c="o:patcher_box_selection" style="left:18px;top:20px;width:80px;height:22px;border-color:${O("patcher_box_selection")}"></div>
        <div class="pbox bogus" data-c="object_bogus_color o:object_bogus_color" style="left:120px;top:22px;width:80px;height:22px;background:${C("object_bogus_color")};color:${S("textcolor_inverse")};border-color:${O("object_bogus_color")}">foo.bar</div>
        ${anno("inactive window (offcolor)", 20, 60)}
      </div>
      <div class="tb tb-bottom" data-c="toolbar_background_inactive" style="background:${C("toolbar_background_inactive")}">
        ${ico("power", C("toolbar_enabled_off"), "toolbar_enabled_off", "")}
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Max for Live                                                       */

  function liveDial(label, value, opts = {}) {
    const z = opts.zombie;
    const arc = z ? C("live_value_arc_zombie") : opts.auto ? C("live_active_automation") : C("live_value_arc");
    const track = z ? C("live_control_fg_zombie") : C("live_dial_fg");
    const needle = z ? C("live_dial_needle_zombie") : C("live_dial_needle");
    const tok = z
      ? "live_value_arc_zombie live_dial_fg_zombie live_dial_needle_zombie live_control_text_zombie live_control_fg_zombie"
      : `${opts.auto ? "live_active_automation" : "live_value_arc"} live_dial_fg live_dial_needle live_control_fg live_dial_triangle`;
    const a0 = 135, a1 = 405, av = a0 + (a1 - a0) * value;
    const P = (a, r = 13) => [20 + r * Math.cos((a * Math.PI) / 180), 22 + r * Math.sin((a * Math.PI) / 180)];
    const arcPath = (from, to) => {
      const [x0, y0] = P(from), [x1, y1] = P(to);
      return `M${x0} ${y0}A13 13 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
    };
    const [nx, ny] = P(av, 10);
    const tcol = z ? C("live_control_text_zombie") : C("live_control_fg");
    return `<div class="lv-item" data-c="${tok}"><div class="lv-lab" style="color:${tcol}">${esc(label)}</div>
      <svg width="40" height="40"><path d="${arcPath(a0, a1)}" stroke="${track}" stroke-width="2.6" fill="none"/>
      <path d="${arcPath(a0, av)}" stroke="${arc}" stroke-width="2.6" fill="none"/>
      <line x1="20" y1="22" x2="${nx}" y2="${ny}" stroke="${needle}" stroke-width="2"/>
      ${opts.bip ? `<path d="M17 4h6l-3 4z" fill="${C("live_dial_triangle")}"/>` : ""}</svg>
      <div class="lv-val" style="color:${tcol}">${esc(opts.text || Math.round(value * 100) + " %")}</div></div>`;
  }

  function liveDevice() {
    const lcd = `<div class="lcd" data-c="live_lcd_bg live_lcd_frame" style="background:${C("live_lcd_bg")};border-color:${C("live_lcd_frame")}">
      <div class="lcd-title" data-c="live_lcd_title" style="color:${C("live_lcd_title")}">ENVELOPE</div>
      <svg width="210" height="74">
        <path d="M0 37H210M52 0V74M104 0V74M156 0V74" stroke="${C("live_lcd_frame")}"/>
        <text x="4" y="70" font-size="8" fill="${C("live_display_scale_text")}" data-c="live_display_scale_text">0 ms</text><text x="170" y="70" font-size="8" fill="${C("live_display_scale_text")}">2 s</text>
        <path d="M2 70L30 8L80 30L150 34L206 70" fill="none" stroke="${C("live_display_line_one")}" stroke-width="2" data-c="live_display_line_one"/>
        <path d="M2 60L50 52L110 20L206 64" fill="none" stroke="${C("live_display_line_two")}" stroke-width="1.6" data-c="live_display_line_two"/>
        <circle cx="30" cy="8" r="4" fill="${C("live_display_handle_one")}" data-c="live_display_handle_one"/><circle cx="80" cy="30" r="4" fill="${C("live_display_handle_one")}" data-c="live_display_handle_one"/>
        <circle cx="110" cy="20" r="4" fill="${C("live_display_handle_two")}" data-c="live_display_handle_two"/>
        <text x="120" y="12" font-size="9" fill="${C("live_lcd_control_fg")}" data-c="live_lcd_control_fg">Att 42 ms</text>
        <text x="120" y="24" font-size="9" fill="${C("live_lcd_control_fg_alt")}" data-c="live_lcd_control_fg_alt">Rel 1.2 s</text>
        <text x="4" y="12" font-size="9" fill="${C("live_lcd_control_fg_zombie")}" data-c="live_lcd_control_fg_zombie">inactive</text>
      </svg></div>`;

    const comp = `<div class="lcd" data-c="live_lcd_bg" style="background:${C("live_lcd_bg")};border-color:${C("live_lcd_frame")}">
      <div class="lcd-title" style="color:${C("live_lcd_title")}">COMPRESSOR</div>
      <svg width="120" height="74">
        <path d="M0 74L120 0" stroke="${C("live_lcd_frame")}"/>
        <path d="M0 74L60 30L120 18V74z" fill="${C("live_input_curve_color")}" stroke="${C("live_input_curve_outline_color")}" data-c="live_input_curve_color live_input_curve_outline_color"/>
        <path d="M0 74L60 36L120 28" fill="none" stroke="${C("live_output_curve_outline_color")}" stroke-width="1.5" data-c="live_output_curve_outline_color live_output_curve_color"/>
        <path d="M0 74L60 36L120 28V74z" fill="${C("live_output_curve_color")}" data-c="live_output_curve_color"/>
        <line x1="60" y1="0" x2="60" y2="74" stroke="${C("live_threshold_line_color")}" stroke-dasharray="3 2" data-c="live_threshold_line_color"/>
        <line x1="0" y1="12" x2="120" y2="12" stroke="${C("live_gain_reduction_line_color")}" stroke-width="2" data-c="live_gain_reduction_line_color"/>
      </svg></div>`;

    const spec = `<div class="lcd" style="background:${C("live_lcd_bg")};border-color:${C("live_lcd_frame")}" data-c="live_lcd_bg">
      <div class="lcd-title" style="color:${C("live_lcd_title")}">SPECTRUM</div>
      <svg width="150" height="74">
        ${[30, 60, 90, 120].map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="74" stroke="${C("live_spectrum_grid_lines")}" data-c="live_spectrum_grid_lines"/>`).join("")}
        <path d="M0 74 ${[...Array(31)].map((_, i) => `L${i * 5} ${74 - (Math.sin(i / 3) * 0.5 + 0.6) * 50 * Math.exp(-i / 30)}`).join(" ")} L150 74z" fill="${C("live_spectrum_default_color")}" data-c="live_spectrum_default_color"/>
        <path d="M0 60 ${[...Array(31)].map((_, i) => `L${i * 5} ${70 - (Math.cos(i / 4) * 0.4 + 0.5) * 44 * Math.exp(-i / 25)}`).join(" ")}" fill="none" stroke="${C("live_spectrum_alternative_color")}" stroke-width="1.4" data-c="live_spectrum_alternative_color"/>
      </svg></div>`;

    const meter = (lvl) => `<svg width="7" height="80"><rect width="7" height="80" fill="${C("live_meter_bg")}"/>${[...Array(16)].map((_, i) => `<rect x="1" y="${78 - i * 5}" width="5" height="3.5" fill="${i < lvl ? C("live_value_arc") : C("live_led_bg")}"/>`).join("")}</svg>`;
    const slider = `<div class="lv-item" data-c="live_meter_bg live_led_bg live_control_fill_handle live_contrast_frame live_control_fg"><div class="lv-lab" style="color:${C("live_control_fg")}">Gain</div>
      <div style="display:flex;gap:2px;align-items:flex-end">${meter(11)}${meter(9)}<svg width="12" height="80"><path d="M0 40l10-5v10z" fill="${C("live_control_fill_handle")}" stroke="${C("live_contrast_frame")}"/></svg></div>
      <div class="lv-val" style="color:${C("live_control_fg")}">-6.0 dB</div></div>`;

    const hslider = (col, tok, lab) => `<div class="lv-hs" data-c="${tok} live_control_bg live_control_fg"><span style="color:${C("live_control_fg")}">${lab}</span><div class="lv-bar" style="background:${C("live_control_bg")}"><i style="background:${C(col)};width:${lab.length * 9}%"></i></div></div>`;

    const text = (on, lab) => `<span class="lv-btn" data-c="${on ? "live_control_selection live_control_fg_on" : "live_control_bg live_control_fg_off"} live_contrast_frame" style="background:${on ? C("live_control_selection") : C("live_control_bg")};color:${on ? C("live_control_fg_on") : C("live_control_fg_off")};border-color:${C("live_contrast_frame")}">${lab}</span>`;
    const textZ = (on, lab) => `<span class="lv-btn" data-c="${on ? "live_control_zombie live_control_fg_on_zombie" : "live_control_bg live_control_fg_off_zombie"}" style="background:${on ? C("live_control_zombie") : C("live_control_bg")};color:${on ? C("live_control_fg_on_zombie") : C("live_control_fg_off_zombie")};border-color:${C("live_contrast_frame")}">${lab}</span>`;

    const tabsL = `<div class="lv-tab" data-c="live_control_bg live_control_selection live_control_fg_on live_control_fg_off">${["Sin", "Saw", "Sqr", "Noi"].map((t, i) => `<span style="background:${i === 1 ? C("live_control_selection") : C("live_control_bg")};color:${i === 1 ? C("live_control_fg_on") : C("live_control_fg_off")};border-color:${C("live_contrast_frame")}">${t}</span>`).join("")}</div>`;

    const numbox = `<span class="lv-num" data-c="live_control_text_bg live_control_fg live_value_bar live_numbox_triangle" style="background:${C("live_control_text_bg")};color:${C("live_control_fg")};border-color:${C("live_contrast_frame")}"><i style="background:${C("live_value_bar")}"></i><b style="border-left-color:${C("live_numbox_triangle")}"></b>440 Hz</span>`;

    const menuL = `<div class="lv-menu-wrap"><span class="lv-num" data-c="live_control_text_bg live_control_fg" style="background:${C("live_control_text_bg")};color:${C("live_control_fg")};border-color:${C("live_contrast_frame")}">Filter ▾</span>
      <div class="lv-pop" data-c="live_control_text_bg live_selection live_control_text_selection" style="background:${C("live_control_text_bg")};color:${C("live_control_fg")}"><div>Low-pass</div><div style="background:${C("live_selection")};color:${C("live_control_text_selection")}">High-pass</div><div style="background:${C("live_selection_standby")};color:${C("live_control_text_selection_standby")}" data-c="live_selection_standby live_control_text_selection_standby">Band-pass</div></div></div>`;

    const transport = `<div class="lv-row">
      <span class="lv-sq" data-c="live_play" style="background:${C("live_play")}">${ICON.play}</span>
      <span class="lv-sq" data-c="live_record" style="background:${C("live_record")}"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="#000" fill-opacity=".55"/></svg></span>
      <span class="lv-sq" data-c="live_prelisten" style="background:${C("live_prelisten")}">${ICON.solo}</span>
      <span class="lv-sq" data-c="live_freeze_color" style="background:${C("live_freeze_color")}">${ICON.snow}</span>
      <span class="lv-sq" data-c="live_alert" style="background:${C("live_alert")}">${ICON.warn}</span>
      <span class="lv-sq" data-c="live_scale_awareness" style="background:${C("live_scale_awareness")}"><svg viewBox="0 0 16 16"><text x="3" y="12" font-size="9" font-weight="700" fill="#000" fill-opacity=".6">♯</text></svg></span>
      <span class="lv-sq ring" data-c="live_control_selection_alt live_control_selection_variant" style="background:${C("live_control_selection_alt")};box-shadow:inset 0 -5px 0 ${C("live_control_selection_variant")}"></span>
    </div>`;

    const mapping = `<div class="lv-row">
      <span class="lv-map" data-c="live_midi_assignment live_assignment_text_bg" style="background:${C("live_midi_assignment")}"><b style="background:${C("live_assignment_text_bg")}">CC 74</b></span>
      <span class="lv-map" data-c="live_key_assignment live_assignment_text_bg" style="background:${C("live_key_assignment")}"><b style="background:${C("live_assignment_text_bg")}">Q</b></span>
      <span class="lv-map" data-c="live_macro_assignment live_macro_assigned" style="background:${C("live_macro_assignment")};box-shadow:inset 0 0 0 2px ${C("live_macro_assigned")}"><b style="background:${C("live_assignment_text_bg")}">Macro 1</b></span>
      <span class="lv-map" data-c="live_modulation" style="background:${C("live_modulation")}"><b style="background:${C("live_assignment_text_bg")}">Mod</b></span>
    </div>`;

    const grid = `<div class="lv-grid" data-c="live_contrast_frame live_surface_bg live_value_arc live_arranger_grid_tiles" style="background:${C("live_surface_bg")};border-color:${C("live_contrast_frame")}">${[...Array(32)].map((_, i) => `<i style="background:${[2, 5, 9, 14, 19, 24, 28].includes(i) ? C("live_value_arc") : i % 8 < 4 ? C("live_arranger_grid_tiles") : "transparent"};border-color:${C("live_contrast_frame")}"></i>`).join("")}</div>`;

    const bars = `<div class="lv-col">${hslider("live_value_bar", "live_value_bar", "Mix")}${hslider("live_value_bar_two", "live_value_bar_two", "Pan")}${hslider("live_value_bar_three", "live_value_bar_three", "Drive")}${hslider("live_value_bar2", "live_value_bar2", "Var 2")}${hslider("live_value_bar3", "live_value_bar3", "Var 3")}</div>`;

    const btns = `<div class="lv-col">
      <div class="lv-row">${text(true, "On")}${text(false, "Off")}${textZ(true, "On")}${textZ(false, "Off")}</div>
      <div class="lv-row"><span class="lv-led" data-c="live_led_bg live_contrast_frame" style="background:${C("live_led_bg")};border-color:${C("live_contrast_frame")}"></span><span class="lv-led" data-c="live_value_arc" style="background:${C("live_value_arc")};border-color:${C("live_contrast_frame")}"></span>
        <span class="lv-btn" data-c="live_control_bg live_lcd_control_fg" style="background:${C("live_control_bg")};color:${C("live_lcd_control_fg")};border-color:${C("live_contrast_frame")}">⏻</span>
        <span class="lv-btn focus" data-c="live_focus_frame" style="background:${C("live_control_bg")};color:${C("live_control_fg_off")};outline-color:${C("live_focus_frame")}">focus</span></div>
      ${tabsL}
      <div class="lv-row">${numbox}${menuL}</div>
    </div>`;

    return `<div class="live-desk" data-c="live_desktop" style="background:${C("live_desktop")}">
      <div class="device" data-c="live_surface_bg live_surface_frame" style="background:${C("live_surface_bg")};border-color:${C("live_surface_frame")}">
        <div class="dev-title" data-c="live_macro_title live_control_fg" style="background:${C("live_macro_title")};color:${C("live_control_fg")}">Max for Live device</div>
        <div class="dev-body">
          <div class="lv-col">
            <div class="lv-row">${liveDial("Freq", 0.62)}${liveDial("Res", 0.3, { auto: true, text: "auto" })}${liveDial("Pan", 0.5, { bip: true, text: "C" })}${liveDial("Off", 0.4, { zombie: true })}</div>
            <div class="lv-row" style="gap:4px"><span class="lv-auto" data-c="live_inactive_automation" style="background:${C("live_inactive_automation")}"></span><span class="lv-small" style="color:${C("live_control_fg")}">automation override</span></div>
            <div class="lv-row" style="gap:6px;align-items:center" data-c="live_surface_frame" title="live.line: linecolor = live_surface_frame"><span class="lv-small" style="color:${C("live_control_fg")}">live.line</span><span style="flex:1;min-width:90px;height:2px;background:${C("live_surface_frame")}"></span></div>
          </div>
          ${slider}
          ${bars}
          ${btns}
          <div class="lv-col">${lcd}<div class="lv-row">${comp}${spec}</div></div>
          <div class="lv-col">${transport}${mapping}${grid}
            <div class="focusbox" data-c="live_surface_frame_focus" style="border-color:${C("live_surface_frame_focus")};color:${C("live_control_fg")}">surface frame on focus</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Panels: console, inspector, reference, browser                     */

  function consolePanel() {
    const rows = [
      ["", "print", "click: bang", "maxwindow_posttext", "maxwindow_postobject"],
      ["hi", "print", "freq: 440.", "maxwindow_posttext", "maxwindow_postobject_hilite"],
      ["warn1", "dict", "warning: key not found", "maxwindow_warningtext"],
      ["warn2", "coll", "warning: empty file", "maxwindow_warningtext"],
      ["err1", "nonexistent.obj", "No such object", "maxwindow_errortext"],
      ["err2", "js", "SyntaxError line 12", "maxwindow_errortext"],
      ["", "dsp", "Audio on: success", "maxwindow_successtext"],
      ["", "max", "bug: report generated", "maxwindow_bugtext"],
      ["sel", "print", "selected line", "maxwindow_posttext"],
    ];
    const bgOf = { warn1: "maxwindow_warningbackground1", warn2: "maxwindow_warningbackground2", err1: "maxwindow_errorbackground", err2: "maxwindow_errorbackground2", sel: "maxwindow_selection_background" };
    return panel("Max Console", "inspector_background", rows
      .map(([k, obj, msg, txt, objc], i) => {
        // measured: plain rows alternate inspector_background and refbar_stripe2
        const bg = bgOf[k] || (i % 2 ? "refbar_stripe2" : "");
        const oc = objc || txt;
        return `<div class="row" data-c="${[bg, txt, oc].filter(Boolean).join(" ")}" style="${bg ? `background:${C(bg)};` : ""}"><span class="r-obj" style="color:${C(oc)}">${esc(obj)}</span><span style="color:${C(txt)}">${esc(msg)}</span></div>`;
      })
      .join(""));
  }

  // Preferences window, as measured in Max 9.2: category list on
  // browser_background, settings on inspector_background striped with refbar_stripe2.
  function preferencesPanel() {
    const cats = ["Audio", "Color and Theme", "Console", "Debugging", "File Browser", "Patching"];
    const rows = [["Color Theme", "lime_skin"], ["Follow Live Theme", "☑"], ["Syntax Color Theme", "Theme Default"], ["Syntax Coloring", "☑"], ["Persist (disabled)", "—"]];
    return `<div class="side prefs"><div class="side-head" data-c="toolbar_background_active toolbar_enabled_off" style="background:${C("toolbar_background_active")};border-bottom-color:${C("inspector_headerline")};color:${C("toolbar_enabled_off")}">Preferences</div>
      <div class="prefs-body"><div class="prefs-cats" data-c="browser_background patcherbrowser_results_textcolor" style="background:${C("browser_background")};color:${C("patcherbrowser_results_textcolor")}">${cats.map((c, i) => `<div ${i === 1 ? `data-c="toolbar_active_unique" style="color:${C("toolbar_active_unique")}"` : ""}>${c}</div>`).join("")}</div>
      <div class="prefs-main" data-c="inspector_background" style="background:${C("inspector_background")}">
        <div class="imenu" data-c="inspector_header_background maxwindow_posttext" style="background:${C("inspector_header_background")};color:${C("maxwindow_posttext")};border-bottom:1px solid ${C("inspector_headerline")}">Color and Theme</div>
        ${rows.map(([k, v], i) => `<div class="irow" data-c="${i % 2 ? "refbar_stripe2" : "inspector_background"} ${i === 4 ? "inspector_disabled_text" : "maxwindow_posttext"}" style="${i % 2 ? `background:${C("refbar_stripe2")};` : ""}color:${C(i === 4 ? "inspector_disabled_text" : "maxwindow_posttext")}"><span>${k}</span><span>${v}</span></div>`).join("")}
      </div></div></div>`;
  }

  function panel(title, bgId, body, w = "") {
    return `<div class="side" style="${w}"><div class="side-head" data-c="inspector_header_background inspector_headerline toolbar_enabled_off" style="background:${C("inspector_header_background")};border-bottom-color:${C("inspector_headerline")};color:${C("toolbar_enabled_off")}">${title}</div><div class="side-body" data-c="${bgId}" style="background:${C(bgId)}">${body}</div></div>`;
  }

  function inspectorPanel() {
    const row = (k, v, cls = "", tok = "") =>
      `<div class="irow ${cls}" data-c="refbar_stripe2 inspector_background ${tok}">${k}${v}</div>`;
    const stripe = (i) => (i % 2 ? `background:${C("refbar_stripe2")}` : "");
    const attrs = [
      ["Interval", "250 ms"], ["Active", "☑"], ["Quantize", "4n"], ["Autostart", "☐"],
    ];
    let b = `<div class="itabs">${["Basic", "Color", "Behavior", "All"].map((t, i) => `<span data-c="${i === 0 ? "inspector_tab" : ""}" style="${i === 0 ? `background:${C("inspector_tab")};color:#111` : `color:${C("toolbar_enabled_off")}`}">${t}</span>`).join("")}</div>`;
    b += `<div class="imenu" data-c="inspector_menuheader" style="color:${C("inspector_menuheader")}">▾ Behavior</div>`;
    attrs.forEach(([k, v], i) => {
      b += `<div class="irow" data-c="refbar_stripe2" style="${stripe(i)};color:${C("maxwindow_posttext")}"><span>${k}</span><span>${v}</span></div>`;
    });
    b += `<div class="irow" data-c="inspector_selectedrow" style="background:${C("inspector_selectedrow")};color:${C("maxwindow_posttext")}"><span>Text</span><span class="ite" data-c="inspector_texteditor_background inspector_selection" style="background:${C("inspector_texteditor_background")};color:#111"><span style="background:${C("inspector_selection")}">metro</span> 250</span></div>`;
    b += `<div class="irow" data-c="inspector_disabled_text" style="color:${C("inspector_disabled_text")}"><span>Hint (disabled)</span><span>—</span></div>`;
    b += `<div class="irow" data-c="iceice" style="color:${C("maxwindow_posttext")}"><span>Fontsize <i class="frz" style="background:${C("iceice")}"></i></span><span>12 (frozen)</span></div>`;
    void row;
    return panel("Inspector", "inspector_background", b);
  }

  function referencePanel() {
    let b = `<div class="ref-title" style="color:${C("maxwindow_posttext")}">metro</div><div class="ref-sub" style="color:${C("maxwindow_posttext")}">Sends a bang at regular intervals.</div>`;
    ["bang", "int", "float", "stop"].forEach((m, i) => {
      b += `<div class="irow" data-c="refbar_stripe2" style="${i % 2 ? `background:${C("refbar_stripe2")};` : ""}color:${C("maxwindow_posttext")}"><span>${m}</span><span>message</span></div>`;
    });
    b += `<div class="ref-det" data-c="refbar_details_background refbar_details_linkcolor" style="background:${C("refbar_details_background")};color:${C("maxwindow_posttext")}">See also: <u style="color:${C("refbar_details_linkcolor")}">qmetro</u>, <u style="color:${C("refbar_details_linkcolor")}">transport</u></div>`;
    return panel("Reference", "inspector_background", b);
  }

  function browserPanel() {
    const files = ["synth.maxpat", "drums.wav", "lfo.js", "reverb.gendsp", "notes.txt", "kick.aif"];
    let b = files
      .map((f, i) => {
        const sel = i === 2;
        const bg = sel ? "patcherbrowser_results_selected" : i % 2 ? "patcherbrowser_results_lightrowbg" : "patcherbrowser_results_darkrowbg";
        return `<div class="irow" data-c="${bg} patcherbrowser_results_textcolor" style="background:${C(bg)};color:${C("patcherbrowser_results_textcolor")}"><span>${f}</span><span>${(i * 13 + 4) % 90} KB</span></div>`;
      })
      .join("");
    return panel("File Browser", "browser_background", `<div style="padding:6px">${b}</div>`);
  }

  function projectPanel() {
    const b = `<div class="proj" data-c="projectwindow_background" style="color:${C("toolbar_enabled_off")}">
      <div>▾ patchers</div><div class="ind">synth.maxpat</div><div class="ind">sequencer.maxpat</div>
      <div class="proj-div" data-c="projectwindow_divider" style="background:${C("projectwindow_divider")}"></div>
      <div>▾ code</div><div class="ind">lfo.js</div></div>`;
    return panel("Project", "projectwindow_background", b);
  }

  function formatPanel() {
    const b = `<div class="fmt" style="color:${C("toolbar_enabled_off")}">
      <div class="fmt-row"><span>Style:</span><span class="fmt-name" data-c="dirtygreen" style="color:${C("dirtygreen")}">mystyle*</span></div>
      <div class="fmt-row"><span class="inh" data-c="formatpalette_inherited_background formatpalette_inherited" style="background:${C("formatpalette_inherited_background")}"><i style="background:${C("formatpalette_inherited")}"></i></span><span>Inherited font</span></div>
      <div class="fmt-row"><span class="inh" data-c="formatpalette_inherited_background formatpalette_inherited_on" style="background:${C("formatpalette_inherited_background")}"><i style="background:${C("formatpalette_inherited_on")}"></i></span><span>Color (inheritance on)</span></div>
      <div class="fmt-ren" data-c="formatpalette_renamer_background" style="background:${C("formatpalette_renamer_background")}">Rename style…</div>
    </div>`;
    return `<div class="side"><div class="side-head" style="background:${C("inspector_header_background")};border-bottom-color:${C("inspector_headerline")};color:${C("toolbar_enabled_off")}">Format palette</div><div class="side-body" data-c="formatpalette_background o:formatpalette_background" style="background:${C("formatpalette_background")}">${b}</div></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Text editor (js, expr / codebox)                                   */

  function codeEditor() {
    const J = (k, t) => `<span data-c="jed_js_${k}" style="color:${C("jed_js_" + k)}">${esc(t)}</span>`;
    const E = (k, t) => `<span data-c="jed_expr_${k}" style="color:${C("jed_expr_" + k)}">${esc(t)}</span>`;
    const P = (t) => J("punctuation", t), B = (t) => J("bracket", t), Op = (t) => J("operator", t);
    const js = [
      J("comment", "// lfo.js: a low-frequency oscillator"),
      `${J("keyword", "var")} ${J("identifier", "phase")} ${Op("=")} ${J("float", "0.25")}${P(";")}`,
      `${J("keyword", "function")} ${J("identifier", "bang")}${B("()")} ${B("{")}`,
      `  ${J("identifier", "phase")} ${Op("+=")} ${J("integer", "1")} ${Op("/")} ${J("integer", "64")}${P(";")}`,
      `  ${J("maxfunction", "outlet")}${B("(")}${J("integer", "0")}${P(",")} ${J("corefunction", "Math.sin")}${B("(")}${J("identifier", "phase")}${B(")")}${B(")")}${P(";")}`,
      `  ${J("maxfunction", "post")}${B("(")}${J("string", '"phase "')}${P(",")} ${J("identifier", "phase")}${B(")")}${P(";")} ${J("error", "oops(")}`,
      `${B("}")}`,
    ];
    const ex = [
      `${E("preprocessor", "#define")} ${E("identifier", "GAIN")} ${E("float", "0.5")}`,
      E("comment", "// genexpr / codebox"),
      `${E("keyword", "Param")} ${E("identifier", "cutoff")}${E("bracket", "(")}${E("integer", "1000")}${E("bracket", ")")}${E("punctuation", ";")}`,
      `${E("identifier", "y")} ${E("operator", "=")} ${E("corefunction", "mix")}${E("bracket", "(")}${E("identifier", "in1")}${E("punctuation", ",")} ${E("userfunction", "lowpass")}${E("bracket", "(")}${E("identifier", "in1")}${E("bracket", ")")}${E("punctuation", ",")} ${E("namedconstant", "PI")}${E("bracket", ")")}${E("punctuation", ";")}`,
      `${E("identifier", "s")} ${E("operator", "=")} ${E("string", '"text"')}${E("punctuation", ";")} ${E("error", "unknown()")}`,
      `<span data-c="jed_cpp_preprocessor" style="color:${C("jed_cpp_preprocessor")}">#include &lt;math.h&gt;</span>  ${E("comment", "// C++ preprocessor")}`,
    ];
    const block = (title, lines, hi) =>
      `<div class="jed" data-c="jed_background jed_defaulttext" style="background:${C("jed_background")};color:${C("jed_defaulttext")}"><div class="jed-t" style="color:${C("jed_defaulttext")}">${title}</div>${lines
        .map((l, i) => `<div class="jl" ${i === hi ? `data-c="jed_hilite" style="background:${C("jed_hilite")}"` : ""}><span class="ln" data-c="jed_linenumber_text" style="color:${C("jed_linenumber_text")}">${i + 1}</span>${l}</div>`)
        .join("")}<div class="jl"><span class="ln" style="color:${C("jed_linenumber_text")}">${lines.length + 1}</span><span data-c="jed_defaulttext">default text</span></div></div>`;
    return `<div class="jed-wrap">${block("lfo.js", js, 3)}${block("codebox / expr", ex, 2)}</div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Menus, palettes and miscellaneous windows                         */

  function menus() {
    const ctx = `<div class="menu" data-c="menu_background menu_text" style="background:${C("menu_background")};color:${C("menu_text")}">
      <div class="mh" data-c="menu_headertext" style="color:${C("menu_headertext")}">EDIT</div>
      <div>Cut</div><div data-c="menu_highlighted_background menu_highlighted_text" style="background:${C("menu_highlighted_background")};color:${C("menu_highlighted_text")}">Copy</div>
      <div>Paste</div><div data-c="menu_disabled_text" style="color:${C("menu_disabled_text")}">Paste Replace</div>
      <div class="mh" style="color:${C("menu_headertext")}">OBJECT</div><div>Open Help</div></div>`;
    const hdr = (id, t) => `<div class="bm-h" data-c="${id}" style="color:${C(id)}">${t}</div>`;
    const boxm = `<div class="menu" data-c="menu_background menu_text" style="background:${C("menu_background")};color:${C("menu_text")}">
      ${hdr("quickref_message_header", "MESSAGES")}<div>bang</div><div>stop</div>
      ${hdr("quickref_attribute_header", "ATTRIBUTES")}<div>interval</div>
      ${hdr("objectfiles_header", "FILES")}<div>metro.maxhelp</div>
      ${hdr("objectprototypes_header", "PROTOTYPES")}<div>fast</div>
      ${hdr("transform_header", "TRANSFORM")}<div>→ qmetro</div></div>`;
    const recent = `<div class="menu" data-c="toolbar_overlay_background" style="background:${C("toolbar_overlay_background")};color:${C("toolbar_enabled_off")}">
      <div class="bm-h" data-c="objectified" style="color:${C("objectified")}">RECENT OBJECTS</div><div>cycle~</div><div>metro</div>
      <div class="bm-h" data-c="urgentmessage" style="color:${C("urgentmessage")}">RECENT MESSAGES</div><div>set 3</div></div>`;
    const colorpop = `<div class="cpop" data-c="colorpopup_bright_background" style="background:${C("colorpopup_bright_background")}">${["#e94", "#4ae", "#5c5", "#c5c", "#ee5", "#888", "#fff", "#222"].map((c, i) => `<i style="background:${c};${i === 1 ? `outline:3px solid ${C("colorpopup_bright_selected")}` : ""}" ${i === 1 ? 'data-c="colorpopup_bright_selected"' : ""}></i>`).join("")}</div>`;
    const palette = `<div class="pal" data-c="toolbar_overlay_background" style="background:${C("toolbar_overlay_background")}">
      ${ico("box", C("basic"), "basic", "Basic objects")}${ico("btn", C("buttoned_up"), "buttoned_up", "Buttons")}${ico("num", C("number_one"), "number_one", "Numbers")}${ico("sld", C("sliderweb"), "sliderweb", "Sliders")}${ico("live", C("lively"), "lively", "Live")}${ico("star", C("favicolor"), "favicolor", "Snippet")}</div>`;
    const appleHi = `<div class="apple" data-c="standardappletexthilite" style="color:${C("toolbar_enabled_off")}">Field: <span style="background:${C("standardappletexthilite")};color:#111">highlighted text</span></div>`;
    return `<div class="misc-row">
      <div class="misc"><div class="misc-t">Context menu</div>${ctx}</div>
      <div class="misc"><div class="misc-t">Box menu</div>${boxm}</div>
      <div class="misc"><div class="misc-t">Recent menus</div>${recent}</div>
      <div class="misc"><div class="misc-t">Object palette</div>${palette}<div class="misc-t">Color picker</div>${colorpop}<div class="misc-t">Text field</div>${appleHi}</div>
    </div>`;
  }

  function extras() {
    const clue = `<div class="clue" data-c="clue_system_background clue_text" style="background:${C("clue_system_background")};color:${C("clue_text")}"><b>metro</b> — sends regular bangs.</div>
      <div class="clue" data-c="clue_user_background clue_text" style="background:${C("clue_user_background")};color:${C("clue_text")}">Annotation: “sequencer clock”</div>`;
    const pattr = `<div class="pattr" data-c="inspector_background" style="background:${C("inspector_background")};color:${C("maxwindow_posttext")}">
      ${["1 intro", "2 verse", "3 chorus", "4 bridge"].map((t, i) => `<div style="${i === 2 ? `background:${C("pattrstorage_active")};color:#111` : ""}" ${i === 2 ? 'data-c="pattrstorage_active"' : ""}>${t}</div>`).join("")}</div>`;
    const scroll = `<div class="scrolls">
      <div class="sc-track"><i data-c="scrollbar_fading_nonmouseover" style="background:${C("scrollbar_fading_nonmouseover")};height:40%"></i><span>fading</span></div>
      <div class="sc-track"><i data-c="scrollbar_fading_mouseover" style="background:${C("scrollbar_fading_mouseover")};height:40%"></i><span>fading (hover)</span></div>
      <div class="sc-track"><i data-c="scrollbar_nonfading_nonmouseover" style="background:${C("scrollbar_nonfading_nonmouseover")};height:40%"></i><span>fixed</span></div>
      <div class="sc-track"><i data-c="scrollbar_nonfading_mouseover" style="background:${C("scrollbar_nonfading_mouseover")};height:40%"></i><span>fixed (hover)</span></div></div>`;
    const lesson = `<div class="lesson" data-c="lesson_step_border" style="border-color:${C("lesson_step_border")}">
      <div class="ls-bar" data-c="lesson_step_titlebar" style="background:${C("lesson_step_titlebar")};color:${C("toolbar_enabled_off")}"><span class="ls-circ" data-c="lesson_step_circle" style="background:${C("lesson_step_circle")}">2</span> Step: connect the oscillator</div>
      <div class="ls-body" data-c="lesson_step_topgradient lesson_step_bottomgradient" style="background:linear-gradient(${C("lesson_step_topgradient")}, ${C("lesson_step_bottomgradient")});color:${C("toolbar_enabled_off")}">Connect <span data-c="lesson_text_hilite" style="background:${C("lesson_text_hilite")};color:#111">cycle~</span> to ezdac~.
        <div class="ls-range" data-c="lesson_range" style="background:${C("lesson_range")}"></div>
        <span class="ls-btn" data-c="lesson_button_background lesson_play" style="background:${C("lesson_button_background")};color:${C("lesson_play")}">▶ Play</span></div>
      ${["lesson_todo:Not started", "lesson_started:Started", "lesson_inprogress:In progress", "lesson_downloading:Downloading", "lesson_remote:Downloadable"]
        .map((p) => p.split(":"))
        .map(([id, t], i) => `<div class="ls-row" data-c="${id} ${i % 2 ? "lessonbrowser_row2_background" : "lessonbrowser_row1_background"}" style="background:${C(i % 2 ? "lessonbrowser_row2_background" : "lessonbrowser_row1_background")};color:${C("toolbar_enabled_off")}"><i style="background:${C(id)}"></i>${t}</div>`)
        .join("")}</div>`;
    const cal = `<div class="cal" style="color:${C("toolbar_enabled_off")}"><div class="cal-h" data-c="calendar_menu_header" style="color:${C("calendar_menu_header")}">CALENDAR</div>
      ${[0, 1, 2, 3].map((r) => `<div class="cal-r" data-c="${r % 2 ? "calendar_stripe2" : ""}" style="${r % 2 ? `background:${C("calendar_stripe2")}` : ""}">${[...Array(7)].map((_, d) => { const k = (r * 7 + d) % 5; const id = k === 0 ? "calendar_success" : k === 2 ? "calendar_activity" : ""; return `<i ${id ? `data-c="${id}" style="background:${C(id)}"` : `style="background:${C("inspector_background")}"`}></i>`; }).join("")}</div>`).join("")}</div>`;
    return `<div class="misc-row">
      <div class="misc"><div class="misc-t">Clue window</div>${clue}</div>
      <div class="misc"><div class="misc-t">pattrstorage</div>${pattr}</div>
      <div class="misc"><div class="misc-t">Scrollbars</div>${scroll}</div>
      <div class="misc"><div class="misc-t">Lessons</div>${lesson}</div>
      <div class="misc"><div class="misc-t">Activity</div>${cal}</div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */

  function section(id, title, body, note = "") {
    return `<section class="pv-sec" data-sec="${id}"><h3>${esc(title)}${note ? ` <small>${esc(note)}</small>` : ""}</h3>${body}</section>`;
  }

  window.buildPreview = function () {
    return [
      section("window", "Patch window", `<div class="win-row">${patchWindow()}<div class="win-side">${inactiveWindow()}${consolePanel()}</div></div>`, "click an element to edit its colors"),
      section("objects", "UI objects", `<div class="ui-canvas" data-c="s:locked_bgcolor" style="background:${S("locked_bgcolor")}">${uiObjects()}</div>`, "style colors (styledefaults)"),
      section("live", "Max for Live", liveDevice(), "live.* objects and Live theme colors"),
      section("sidebar", "Sidebar", `<div class="side-row">${inspectorPanel()}${referencePanel()}${browserPanel()}${projectPanel()}${formatPanel()}${preferencesPanel()}</div>`),
      section("editor", "Text editor", codeEditor()),
      section("menus", "Menus and palettes", menus()),
      section("extras", "Miscellaneous windows", extras()),
      section("unused", "Not used by Max", `<div class="unused" id="pv-unused"></div>`, "“Unused” category: kept in the file"),
    ].join("");
  };
})();
