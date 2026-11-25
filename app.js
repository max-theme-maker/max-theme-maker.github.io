/* Max Theme Maker — the editor (static web version).
 *
 * A Max theme (.maxtheme) is JSON with two keys:
 *   colors        : [{id, oncolor:[r,g,b,a], offcolor?, category, label}]  — ~277 application colors
 *   styledefaults : {bgcolor:[…], color:[…], …, bgfillcolor_type:"gradient", bgfillcolor_angle:270, …}
 *                   — default colors of patcher objects
 * (+ optional defaultsyntaxcolorset: name of a shipped .maxstx that provides the syntax_* colors).
 * RGBA values are floats 0–1.
 *
 * Nothing from Cycling '74 is bundled: the shipped themes and theme_constructor.js are read
 * from the user's own Max installation (the "interfaces" folder) and cached in IndexedDB.
 */
(function () {
  "use strict";

  /* ================================================================== */
  /* Utilitaires                                                         */
  /* ================================================================== */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const r6 = (x) => Math.round(x * 1e6) / 1e6;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const norm = (c) => {
    const a = (c || [0, 0, 0, 1]).map(Number);
    return [clamp(a[0] || 0), clamp(a[1] || 0), clamp(a[2] || 0), a.length > 3 ? clamp(a[3]) : 1];
  };
  const css = (c) => {
    c = norm(c);
    return `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${Math.round(c[3] * 1000) / 1000})`;
  };
  const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, "0")).join("");
  const fromHex = (h, a = 1) => {
    h = h.trim().replace(/^#/, "");
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) return null;
    const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    v.push(h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : a);
    return v;
  };
  const same = (a, b) => a && b && a.every((v, i) => Math.abs(v - (b[i] ?? 1)) < 0.0015);
  function rgb2hsl([r, g, b]) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hsl2rgb([h, s, l]) {
    h = ((h % 360) + 360) % 360 / 360;
    if (!s) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => {
      t = (t + 1) % 1;
      return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem("mtm." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mts." + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  let toastTimer;
  function toast(html, kind = "", ms = 4500) {
    const t = $("#toast");
    t.innerHTML = html;
    t.className = "toast " + kind;
    t.hidden = false;
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => (t.hidden = true), ms);
    return t;
  }

  /* ================================================================== */
  /* Labels                                                              */
  /* ================================================================== */
  const CAT_ORDER = [
    "Patching", "Inlets + Outlets", "Patcher Tabs", "Toolbar", "Menubar", "Menus", "Box Menu",
    "Max Console", "Inspector", "Reference Sidebar", "Browser", "Text Editor", "Format Palette",
    "Project Window", "Clues", "Color Popup", "Calendar", "Lessons", "Pattrstorage", "Scrollbar",
    "Live Theme Colors", "Unused",
  ];
  // The areas of Max, used to group colors (Swatches) and as tabs (Areas).
  // secs: the preview sections that show the area.
  const AREAS = [
    { key: "patch", label: "Patch and objects", cats: ["styledefaults", "Patching", "Inlets + Outlets"], secs: ["window", "objects"] },
    { key: "window", label: "Window and toolbars", cats: ["Patcher Tabs", "Toolbar", "Menubar", "Scrollbar"], secs: ["window"] },
    { key: "console", label: "Console", cats: ["Max Console", "Max Window"], secs: ["window"] },
    { key: "sidebar", label: "Sidebar", cats: ["Inspector", "Reference Sidebar", "Browser", "Project Window", "Format Palette"], secs: ["sidebar"] },
    { key: "editor", label: "Code editor", cats: ["Text Editor"], secs: ["editor"] },
    { key: "menus", label: "Menus and popups", cats: ["Menus", "Box Menu", "Color Popup", "Clues", "Calendar", "Lessons", "Pattrstorage"], secs: ["menus", "extras"] },
    { key: "live", label: "Max for Live", cats: ["Live Theme Colors", "Live"], secs: ["live"] },
    { key: "unused", label: "Unused", cats: ["Unused"], secs: ["unused"] },
  ];
  const CAT_AREA = Object.fromEntries(AREAS.flatMap((a) => a.cats.map((c) => [c, a.key])));
  const areaOfCat = (cat) => CAT_AREA[cat] || "menus";
  const SD_KEYS = [
    ["locked_bgcolor", "Patch background (locked)"],
    ["editing_bgcolor", "Patch background (edit mode)"],
    ["bgfillcolor_color", "Message / umenu / panel fill: solid color (Max 9 shows color 2)"],
    ["bgfillcolor_color1", "Message / umenu / panel fill: gradient color 1"],
    ["bgfillcolor_color2", "Message / umenu / panel fill: color 2 (the one you see)"],
    ["textcolor_inverse", "Text of boxes and UI objects"],
    ["textcolor", "Comment text"],
    ["patchlinecolor", "Patch cords"],
    ["bgcolor", "Object box and UI object background (button, number…)"],
    ["color", "Active color (toggle on, knob, needle…)"],
    ["elementcolor", "Elements (outlines, tracks, toggle off)"],
    ["accentcolor", "Accent (object box bands, number triangle)"],
    ["selectioncolor", "Selection (number while dragging, kslider)"],
    ["stripecolor", "Stripes (chooser)"],
    ["bubble_bgcolor", "Bubble comment: background"],
    ["bubble_outlinecolor", "Bubble comment: outline"],
    ["darkcolor", "Dark color (kslider black keys)"],
    ["lightcolor", "Light color (kslider white keys)"],
    ["clearcolor", "Transparent (alpha 0)"],
    ["syntax_objectcolor", "Syntax: object name"],
    ["syntax_objargcolor", "Syntax: arguments"],
    ["syntax_attributecolor", "Syntax: @attribute"],
    ["syntax_attrargcolor", "Syntax: attribute value"],
  ];
  const SD_LABEL = Object.fromEntries(SD_KEYS);
  const SYNTAX = ["syntax_objectcolor", "syntax_objargcolor", "syntax_attributecolor", "syntax_attrargcolor"];
  const BGFILL = ["bgfillcolor_color", "bgfillcolor_color1", "bgfillcolor_color2"];

  /* ================================================================== */
  /* State                                                               */
  /* ================================================================== */
  const S = {
    env: null,
    ref: null,          // full reference theme (default.maxtheme of the connected Max)
    refIndex: {},       // id -> {category,label,oncolor,offcolor}
    order: [],          // ids in reference order
    theme: null,        // {colors:{id:{oncolor,offcolor?,category,label,added?}}, sd:{}, extra:{}}
    base: null,         // copy at load time (for "revert" and the "edited" marks)
    baseName: "",
    syntaxSets: {},
    undo: [], redo: [],
    covered: new Set(),
    dest: "",
  };

  function snapshot() {
    return JSON.stringify({ colors: S.theme.colors, sd: S.theme.sd, extra: S.theme.extra, locks: S.theme.locks });
  }
  function restore(snap) {
    const o = JSON.parse(snap);
    S.theme.colors = o.colors; S.theme.sd = o.sd; S.theme.extra = o.extra; S.theme.locks = o.locks || {};
    applyAll(); refreshRows(); saveSession();
  }
  let editStart = null;
  function beginEdit() { if (editStart === null) editStart = snapshot(); }
  function endEdit() {
    if (editStart === null) return;
    const now = snapshot();
    if (now !== editStart) { S.undo.push(editStart); if (S.undo.length > 150) S.undo.shift(); S.redo = []; }
    editStart = null;
    updateUndo(); saveSession();
  }
  function commit(fn) { beginEdit(); fn(); endEdit(); }
  function undo() { endEdit(); if (!S.undo.length) return; S.redo.push(snapshot()); restore(S.undo.pop()); updateUndo(); }
  function redo() { endEdit(); if (!S.redo.length) return; S.undo.push(snapshot()); restore(S.redo.pop()); updateUndo(); }
  function updateUndo() { $("#undoBtn").disabled = !S.undo.length; $("#redoBtn").disabled = !S.redo.length; }

  /* ---------- chargement / normalisation ---------- */
  function parseThemeText(txt) {
    try { return JSON.parse(txt); } catch (e) {
      // tolerate comments and trailing commas in hand-written files
      const t = txt.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[\]}])/g, "$1");
      return JSON.parse(t);
    }
  }

  function normalize(raw) {
    const colors = {};
    for (const c of raw.colors || []) {
      if (!c || !c.id) continue;
      colors[c.id] = { oncolor: norm(c.oncolor), category: c.category, label: c.label };
      if (c.offcolor) colors[c.id].offcolor = norm(c.offcolor);
    }
    for (const id of S.order) {
      const r = S.refIndex[id];
      if (!colors[id]) {
        colors[id] = { oncolor: norm(r.oncolor), category: r.category, label: r.label, added: true };
        if (r.offcolor) colors[id].offcolor = norm(r.offcolor);
      }
      // categories and labels from the reference: some old themes have none
      if (!colors[id].category) colors[id].category = r.category;
      if (!colors[id].label && r.label) colors[id].label = r.label;
    }
    const sd = {};
    const rs = S.ref.styledefaults;
    const rsd = raw.styledefaults || {};
    for (const k in rsd) sd[k] = Array.isArray(rsd[k]) ? norm(rsd[k]) : rsd[k];
    const extra = {};
    for (const k in raw) if (k !== "colors" && k !== "styledefaults") extra[k] = raw[k];
    for (const k in rs) {
      if (k in sd) continue;
      if (SYNTAX.includes(k) && extra.defaultsyntaxcolorset) continue; // fournies par le jeu de syntaxe
      sd[k] = Array.isArray(rs[k]) ? norm(rs[k]) : rs[k];
    }
    if (sd.clearcolor) sd.clearcolor[3] = 0;
    // locks: tokens edited by hand, which the generator must not overwrite
    return { colors, sd, extra, locks: {} };
  }

  function loadTheme(raw, name) {
    endEdit();
    if (S.theme) { S.undo.push(snapshot()); S.redo = []; }
    S.theme = normalize(raw);
    S.base = clone(S.theme);
    S.baseName = name;
    if (!$("#themeName").value || $("#themeName").dataset.auto === "1") {
      $("#themeName").value = suggestName(name);
      $("#themeName").dataset.auto = "1"; // suggested name: follows the next starting theme
    }
    applyAll(); renderList(); updateUndo(); saveSession();
    if (S.gen) S.gen.syncPreset(name);
  }
  function suggestName(base) {
    return (base || "theme").replace(/\.maxtheme$/, "") + "-custom";
  }

  function exportTheme() {
    const t = S.theme;
    const ids = [...S.order, ...Object.keys(t.colors).filter((id) => !S.refIndex[id])];
    const colors = ids.map((id) => {
      const c = t.colors[id];
      const o = { id, oncolor: c.oncolor.map(r6) };
      if (c.offcolor) o.offcolor = c.offcolor.map(r6);
      if (c.category) o.category = c.category;
      if (c.label) o.label = c.label;
      return o;
    });
    const styledefaults = {};
    for (const k in t.sd) styledefaults[k] = Array.isArray(t.sd[k]) ? t.sd[k].map(r6) : t.sd[k];
    if (styledefaults.clearcolor) styledefaults.clearcolor[3] = 0;
    const out = { colors, styledefaults };
    for (const k in t.extra) if (t.extra[k] !== undefined && t.extra[k] !== "") out[k] = t.extra[k];
    return out;
  }

  function saveSession() {
    store.set("session", { theme: S.theme, base: S.base, baseName: S.baseName, name: $("#themeName").value });
  }

  /* ================================================================== */
  /* Preview CSS variables                                               */
  /* ================================================================== */
  function sdValue(k) {
    const t = S.theme;
    if (k in t.sd) return t.sd[k];
    const set = S.syntaxSets[t.extra.defaultsyntaxcolorset];
    if (SYNTAX.includes(k) && set && set.styledefaults && set.styledefaults[k]) return norm(set.styledefaults[k]);
    return norm(S.ref.styledefaults[k]);
  }
  function bgfillCSS() {
    const sd = S.theme.sd;
    const c1 = css(sdValue("bgfillcolor_color1")), c2 = css(sdValue("bgfillcolor_color2"));
    if (sd.bgfillcolor_type === "gradient") {
      const ang = Number(sd.bgfillcolor_angle ?? 270), prop = Number(sd.bgfillcolor_proportion ?? 0.39);
      // angle Max (270 = de haut en bas) → angle CSS
      const cssAng = ((450 - ang) % 360 + 360) % 360;
      return `linear-gradient(${cssAng}deg, ${c1}, ${Math.round(prop * 100)}%, ${c2})`;
    }
    // measured in Max 9.2: with type "color", bgfillcolor_color2 is still what is drawn
    return c2;
  }
  function applyColor(id) {
    const pv = $("#pv"), c = S.theme.colors[id];
    pv.style.setProperty("--c-" + id, css(c.oncolor));
    if (c.offcolor) pv.style.setProperty("--o-" + id, css(c.offcolor));
    else pv.style.removeProperty("--o-" + id);
  }
  function applySD(k) {
    const pv = $("#pv");
    if (k) {
      const v = sdValue(k);
      if (Array.isArray(v)) pv.style.setProperty("--s-" + k, css(v));
    }
    pv.style.setProperty("--s-bgfill", bgfillCSS());
  }
  function applyAll() {
    for (const id in S.theme.colors) applyColor(id);
    for (const [k] of SD_KEYS) applySD(k);
    applySD();
    renderUnused();
  }

  /* ================================================================== */
  /* Editable targets (theme colors, styledefaults, core)               */
  /* ================================================================== */
  // A token: "id" | "o:id" | "s:key" | "k:core"
  function target(tok) {
    if (tok.startsWith("s:")) {
      const k = tok.slice(2);
      return {
        tok, label: SD_LABEL[k] || k, sub: `styledefaults · ${k}`,
        get: () => sdValue(k),
        set: (v) => { lockTok("s:" + k); setSD(k, v); },
        base: () => (S.base.sd[k] ? S.base.sd[k] : null),
        alphaLocked: k === "clearcolor",
      };
    }
    if (tok.startsWith("k:")) return S.gen.kernelTarget(tok.slice(2));
    const off = tok.startsWith("o:");
    const id = off ? tok.slice(2) : tok;
    const c = S.theme.colors[id];
    if (!c) return null;
    const key = off ? "offcolor" : "oncolor";
    return {
      tok, id, off,
      label: (c.label || id) + (off ? " — offcolor" : ""),
      sub: `${id} · ${c.category || ""}${off ? " · inactive window / off state" : ""}`,
      get: () => (off ? c.offcolor || c.oncolor : c.oncolor),
      set: (v) => { lockTok(id); c[key] = norm(v); applyColor(id); updateRow(tok); },
      base: () => (S.base.colors[id] ? S.base.colors[id][key] : null),
      hasOff: !!c.offcolor,
    };
  }
  // Editing a color by hand pins it: the generator will not rewrite it.
  function lockTok(tok) {
    const L = (S.theme.locks = S.theme.locks || {});
    if (BGFILL.includes(tok.slice(2)) && tok.startsWith("s:")) BGFILL.forEach((b) => (L["s:" + b] = true));
    else L[tok] = true;
  }
  function setSD(k, v) {
    const t = S.theme;
    if (SYNTAX.includes(k) && !(k in t.sd)) {
      // first edit of a syntax color provided by a .maxstx: make it explicit
      for (const s of SYNTAX) t.sd[s] = clone(sdValue(s));
    }
    t.sd[k] = norm(v);
    if (k === "clearcolor") t.sd[k][3] = 0;
    if (BGFILL.includes(k) && $("#bgUni") && $("#bgUni").checked) {
      for (const b of BGFILL) { t.sd[b] = norm(v); applySD(b); updateRow("s:" + b); }
    }
    applySD(k);
    updateRow("s:" + k);
  }

  /* ================================================================== */
  /* Color list                                                          */
  /* ================================================================== */
  const rowEls = {}; // token -> [swatch elements]

  function swatch(tok, cls = "") {
    const t = target(tok);
    return `<span class="sw ${cls}" data-tok="${tok}" title="${esc(t ? t.label : tok)}"><i style="background:${css(t.get())}"></i></span>`;
  }
  function flagsFor(tok) {
    let f = "";
    if (S.theme.locks && S.theme.locks[tok]) f += `<span class="flag lock" data-unlock="${esc(tok)}" title="Edited by hand: the generator and Adjust all leave it alone. Click to unpin.">pinned</span>`;
    if (tok.startsWith("s:")) {
      const k = tok.slice(2);
      if (SYNTAX.includes(k) && !(k in S.theme.sd) && S.theme.extra.defaultsyntaxcolorset) f += `<span class="flag" title="Provided by the syntax color set">via ${esc(S.theme.extra.defaultsyntaxcolorset)}</span>`;
      const b = S.base.sd[k];
      if (Array.isArray(S.theme.sd[k]) && b && !same(S.theme.sd[k], b)) f += `<span class="flag mod">edited</span>`;
    } else {
      const c = S.theme.colors[tok], b = S.base.colors[tok];
      if (c.added) f += `<span class="flag add" title="Missing from the loaded theme: value taken from default">added</span>`;
      const since = S.refIndex[tok] && S.refIndex[tok].since;
      if (since) f += `<span class="flag" title="Read by ${esc(since)}; ignored by newer versions">${esc(since.replace(/^Max /, ""))}</span>`;
      if (b && (!same(c.oncolor, b.oncolor) || (c.offcolor && !same(c.offcolor, b.offcolor)))) f += `<span class="flag mod">edited</span>`;
      if (S.covered.size && !S.covered.has(tok) && c.category !== "Unused") f += `<span class="flag hid" title="Nothing in the preview shows it">not in preview</span>`;
    }
    return f;
  }
  function rowHTML(tok, label, sub) {
    const isSD = tok.startsWith("s:");
    const c = isSD ? null : S.theme.colors[tok];
    const sws = swatch(tok) + (c && c.offcolor ? swatch("o:" + tok, "off") : "");
    return `<div class="row" data-row="${tok}"><span class="sws">${sws}</span><span class="lab"><b>${esc(label)}</b><code>${esc(sub)}</code></span><span class="flags">${flagsFor(tok)}</span></div>`;
  }

  // Layout: "a" Preview (list in a drawer), "b" Swatches (chips by area), "c" Areas (tabs)
  const layout = () => S.layout || "a";

  function sdControls(q) {
    if (q) return "";
    const t = S.theme.sd;
    const uni = BGFILL.every((b) => same(sdValue(b), sdValue("bgfillcolor_color")));
    const ctl = `<div class="row ctl"><span></span><span class="lab" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <label class="chk" title="Color, color 1 and color 2 move together"><input id="bgUni" type="checkbox" ${uni ? "checked" : ""}> solid fill</label>
          <label>type <select id="bgType"><option value="gradient">gradient</option><option value="color">color</option></select></label>
          <label>angle <input id="bgAngle" type="number" step="1" style="width:56px" value="${t.bgfillcolor_angle ?? 270}"></label>
          <label>prop. <input id="bgProp" type="number" step="0.01" min="0" max="1" style="width:56px" value="${t.bgfillcolor_proportion ?? 0.39}"></label>
        </span><span></span></div>`;
    const syn = `<div class="row ctl"><span></span><span class="lab"><label>syntax color set <select id="synSet"><option value="">(none)</option>${Object.keys(S.syntaxSets).map((n) => `<option ${S.theme.extra.defaultsyntaxcolorset === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label></span><span></span></div>`;
    return ctl + syn;
  }

  // The colors to show, grouped by category, after search / "unused" / area filters.
  function visibleGroups(q, area) {
    const showUnused = $("#showUnused").checked || area === "unused";
    const match = (...s) => !q || s.some((x) => x && String(x).toLowerCase().includes(q));
    const groups = {};
    if (!area || area === "patch") {
      const sd = SD_KEYS.filter(([k, lab]) => match(lab, k, "style", "patch", "object")).map(([k]) => "s:" + k);
      if (sd.length) groups.styledefaults = sd;
    }
    for (const id in S.theme.colors) {
      const c = S.theme.colors[id];
      const k = c.category || "Other";
      if (k === "Unused" && !showUnused) continue;
      if (area && areaOfCat(k) !== area) continue;
      if (!match(c.label, id, k)) continue;
      (groups[k] = groups[k] || []).push(id);
    }
    for (const k in groups) if (k !== "styledefaults") groups[k].sort((a, b) => S.order.indexOf(a) - S.order.indexOf(b));
    const rank = (k) => (k === "styledefaults" ? -1 : CAT_ORDER.indexOf(k) < 0 ? 99 : CAT_ORDER.indexOf(k));
    return Object.keys(groups).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((k) => [k, groups[k]]);
  }
  const catTitle = (k) => (k === "styledefaults" ? "Patch and objects (styledefaults)" : k);
  const tokLabel = (tok) => (tok.startsWith("s:") ? SD_LABEL[tok.slice(2)] || tok.slice(2) : S.theme.colors[tok].label || tok);

  function renderList() {
    const q = $("#search").value.trim().toLowerCase();
    const L = layout();
    const area = L === "c" ? S.area || "patch" : null;
    if (area && isToolTab(area)) {
      $("#list").innerHTML = "";
      indexRows();
      renderAreaTabs();
      return;
    }
    const groups = visibleGroups(q, area);
    let h = "";
    if (L === "b") {
      h = renderWall(groups, q);
    } else {
      const closed = store.get("closed", {});
      for (const [k, toks] of groups) {
        const rows = toks.map((t) => rowHTML(t, tokLabel(t), t.startsWith("s:") ? t.slice(2) : t)).join("");
        h += cat(k, esc(catTitle(k)), toks.length, rows + (k === "styledefaults" ? sdControls(q) : ""), closed, !!q);
      }
    }
    $("#list").innerHTML = h || `<p class="muted" style="padding:12px">No color matches.</p>`;
    indexRows();
    wireSDControls();
    if (S.gen) S.gen.countLocks();
    renderAreaTabs();
  }

  // B. Swatches: one chip per color (and per offcolor), grouped by area then category.
  function isMod(tok) {
    if (tok.startsWith("s:")) { const k = tok.slice(2), b = S.base.sd[k]; return !!(Array.isArray(S.theme.sd[k]) && b && !same(S.theme.sd[k], b)); }
    const c = S.theme.colors[tok], b = S.base.colors[tok];
    return !!(b && (!same(c.oncolor, b.oncolor) || (c.offcolor && !same(c.offcolor, b.offcolor))));
  }
  function chip(tok) {
    const t = target(tok);
    const base = tok.startsWith("o:") ? tok.slice(2) : tok;
    const cls = ["chip", "sw", tok.startsWith("o:") ? "off" : "", S.theme.locks && S.theme.locks[base] ? "pinned" : "", isMod(base) ? "mod" : ""].join(" ");
    return `<button class="${cls}" data-tok="${esc(tok)}" aria-label="${esc(t.label)}"><i style="background:${css(t.get())}"></i></button>`;
  }
  function renderWall(groups, q) {
    const byArea = {};
    for (const [k, toks] of groups) {
      const a = k === "styledefaults" ? "patch" : areaOfCat(k);
      (byArea[a] = byArea[a] || []).push([k, toks]);
    }
    let h = `<div class="wall-legend"><span><i style="background:var(--accent)"></i>edited</span><span><i style="background:var(--warn)"></i>pinned</span><span>Hover a swatch for its name, click to edit</span></div><div class="wall">`;
    for (const a of AREAS) {
      const gs = byArea[a.key];
      if (!gs) continue;
      const n = gs.reduce((s, [, t]) => s + t.length, 0);
      h += `<div class="wall-group"><h4>${esc(a.label)} <span class="n">${n}</span></h4>`;
      for (const [k, toks] of gs) {
        h += `<div class="sub">${esc(k === "styledefaults" ? "Style colors (styledefaults)" : k)}</div><div class="chips">${toks.map((t) => chip(t) + (!t.startsWith("s:") && S.theme.colors[t].offcolor ? chip("o:" + t) : "")).join("")}</div>`;
        if (k === "styledefaults") h += `<details class="wall-opts"><summary class="sub" style="cursor:pointer">Fill and syntax options…</summary>${sdControls(q)}</details>`;
      }
      h += `</div>`;
    }
    return h + `</div><div class="hovername" id="hoverName">&nbsp;</div>`;
  }

  // C. Areas: tabs above everything; the list and the preview show one area.
  // Two tool tabs come first in the Areas layout: they act on the whole theme, so the
  // preview shows everything while they are open.
  const TOOL_TABS = [{ key: "gen", label: "Generator", panel: "#genPanel" }, { key: "adjust", label: "Adjust all", panel: "#globalPanel" }];
  const isToolTab = (k) => TOOL_TABS.some((t) => t.key === k);
  function renderAreaTabs() {
    const bar = $("#areaTabs");
    if (!S.theme || layout() !== "c") { bar.innerHTML = ""; return; }
    const cur = S.area || "patch";
    bar.innerHTML = TOOL_TABS.map((t) => `<button data-area="${t.key}" class="tool ${t.key === cur ? "on" : ""}">${esc(t.label)}</button>`).join("")
      + `<span class="sep"></span>`
      + AREAS.map((a) => {
        const n = visibleGroups("", a.key).reduce((s, [, t]) => s + t.length, 0);
        return `<button data-area="${a.key}" class="${a.key === cur ? "on" : ""}">${esc(a.label)}<span class="n">${n}</span></button>`;
      }).join("");
  }
  function applyArea() {
    const on = layout() === "c";
    const cur = S.area || "patch";
    const tool = on && isToolTab(cur);
    document.body.classList.toggle("area-tool", tool);
    for (const t of TOOL_TABS) {
      const p = $(t.panel);
      p.classList.toggle("area-shown", on && cur === t.key);
      if (on && cur === t.key) p.open = true;
    }
    const a = AREAS.find((x) => x.key === cur);
    $$("#pv .pv-sec").forEach((s) => (s.hidden = on && !tool && !!a && !a.secs.includes(s.dataset.sec)));
  }
  function applyLayout() {
    const L = layout();
    for (const x of ["a", "b", "c"]) document.body.classList.toggle("layout-" + x, x === L);
    $$("#layoutSeg button").forEach((b) => b.classList.toggle("on", b.dataset.l === L));
    if (L !== "a") document.body.classList.toggle("drawer-open", false);
    $("#drawerBtn").classList.toggle("on", document.body.classList.contains("drawer-open"));
    if (S.theme) { renderList(); applyArea(); }
  }
  function cat(key, title, n, rows, closed, forceOpen) {
    return `<div class="cat ${closed[key] && !forceOpen ? "closed" : ""}" data-cat="${esc(key)}"><h4><span>${title}</span><span class="n">${n}</span></h4><div class="rows">${rows}</div></div>`;
  }
  function indexRows() {
    for (const k in rowEls) delete rowEls[k];
    $$("#list .sw").forEach((sw) => (rowEls[sw.dataset.tok] = rowEls[sw.dataset.tok] || []).push(sw));
  }
  function updateRow(tok) {
    const t = target(tok);
    (rowEls[tok] || []).forEach((sw) => (sw.firstElementChild.style.background = css(t.get())));
    const base = tok.startsWith("o:") ? tok.slice(2) : tok;
    const row = $(`#list .row[data-row="${CSS.escape(base)}"] .flags`);
    if (row) row.innerHTML = flagsFor(base);
    $$(`#list .chip[data-tok="${CSS.escape(base)}"], #list .chip[data-tok="${CSS.escape("o:" + base)}"]`).forEach((c) => {
      c.classList.toggle("pinned", !!(S.theme.locks && S.theme.locks[base]));
      c.classList.toggle("mod", isMod(base));
    });
    if (base.startsWith("s:") || S.theme.colors[base]?.category === "Unused") renderUnused();
  }
  function refreshRows() { renderList(); }

  function wireSDControls() {
    const t = S.theme.sd;
    const ty = $("#bgType");
    if (!ty) return;
    ty.value = t.bgfillcolor_type === "color" ? "color" : "gradient";
    ty.onchange = () => commit(() => { t.bgfillcolor_type = ty.value; applySD(); });
    $("#bgAngle").onchange = (e) => commit(() => { t.bgfillcolor_angle = Number(e.target.value) || 0; applySD(); });
    $("#bgProp").onchange = (e) => commit(() => { t.bgfillcolor_proportion = clamp(Number(e.target.value) || 0); applySD(); });
    $("#bgUni").onchange = (e) => {
      if (e.target.checked) commit(() => { const v = sdValue("bgfillcolor_color"); for (const b of BGFILL) { t[b] = norm(v); applySD(b); } refreshRows(); });
    };
    $("#synSet").onchange = (e) => commit(() => {
      const v = e.target.value;
      if (v) {
        S.theme.extra.defaultsyntaxcolorset = v;
        if (confirm(`Use the syntax colors of the “${v}” set?\n\nOK: removes the theme\'s own syntax_* colors (Max reads the set\'s).\nCancel: keeps the current colors; the set is only referenced.`)) {
          for (const s of SYNTAX) delete S.theme.sd[s];
        }
      } else {
        for (const s of SYNTAX) S.theme.sd[s] = clone(sdValue(s));
        delete S.theme.extra.defaultsyntaxcolorset;
      }
      applyAll(); refreshRows();
    });
  }

  /* ================================================================== */
  /* Color picker                                                        */
  /* ================================================================== */
  const pop = $("#pop");
  let popTok = null;

  function placePop(anchor) {
    pop.hidden = false;
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.right + 10, y = r.top - 10;
    if (x + pw > innerWidth - 8) x = Math.max(8, r.left - pw - 10);
    if (y + ph > innerHeight - 8) y = innerHeight - ph - 8;
    pop.style.left = Math.max(8, x) + "px";
    pop.style.top = Math.max(8, y) + "px";
  }
  function closePop() { endEdit(); pop.hidden = true; popTok = null; }

  function openPicker(tok, anchor) {
    endEdit();
    flash(null);
    const t = target(tok);
    if (!t) return;
    popTok = tok;
    const cur = norm(t.get());
    const [h, s, l] = rgb2hsl(cur);
    const pair = t.id && t.hasOff ? `<div class="tabs2"><button data-pt="${t.id}" class="${t.off ? "" : "on"}">oncolor</button><button data-pt="o:${t.id}" class="${t.off ? "on" : ""}">offcolor</button></div>` : "";
    const ids = Object.keys(S.theme.colors).sort();
    pop.innerHTML = `<button class="x" title="Close">×</button>
      <h5>${esc(t.label)}</h5><div class="sub">${esc(t.sub)}</div>${pair}
      <div class="big"><i></i><input type="color" value="${hex(cur)}" title="Open the system color picker"></div>
      <div class="line"><span>#</span><input type="text" class="hx" value="${hex(cur).slice(1)}" spellcheck="false"><button class="eye" title="Eyedropper (pick a color on screen)" ${window.EyeDropper ? "" : "hidden"}>⌖</button></div>
      <div class="line"><span>H</span><input type="range" class="h" min="0" max="360" step="1" value="${Math.round(h)}"><input type="number" class="hn" min="0" max="360" value="${Math.round(h)}"></div>
      <div class="line"><span>S</span><input type="range" class="s" min="0" max="100" step="1" value="${Math.round(s * 100)}"><input type="number" class="sn" min="0" max="100" value="${Math.round(s * 100)}"></div>
      <div class="line"><span>L</span><input type="range" class="l" min="0" max="100" step="1" value="${Math.round(l * 100)}"><input type="number" class="ln" min="0" max="100" value="${Math.round(l * 100)}"></div>
      <div class="line"><span>α</span><input type="range" class="a" min="0" max="1" step="0.01" value="${cur[3]}" ${t.alphaLocked ? "disabled" : ""}><input type="number" class="an" min="0" max="1" step="0.01" value="${cur[3]}" ${t.alphaLocked ? "disabled" : ""}></div>
      <div class="line"><span>rgb</span><input type="text" class="fl" value="${cur.map((v) => +v.toFixed(4)).join(" ")}" spellcheck="false" title="Max values: r g b a between 0 and 1"></div>
      <div class="comp-from"><select class="cf"><option value="">Copy from another color…</option><optgroup label="styledefaults">${SD_KEYS.map(([k]) => `<option value="s:${k}">${k}</option>`).join("")}</optgroup><optgroup label="colors">${ids.map((i) => `<option value="${i}">${i}</option>`).join("")}</optgroup></select></div>
      <div class="acts"><button class="rv" ${t.base && t.base() ? "" : "disabled"}>Revert</button><button class="cp">Copy hex</button></div>`;
    const big = $(".big > i", pop);
    const paint = (c) => {
      big.style.background = css(c);
      const [hh, ss, ll] = rgb2hsl(c);
      $(".hx", pop).value = hex(c).slice(1);
      $("input[type=color]", pop).value = hex(c);
      for (const [cls, v] of [["h", Math.round(hh)], ["s", Math.round(ss * 100)], ["l", Math.round(ll * 100)]]) {
        if (document.activeElement !== $("." + cls, pop)) $("." + cls, pop).value = v;
        if (document.activeElement !== $("." + cls + "n", pop)) $("." + cls + "n", pop).value = v;
      }
      $(".a", pop).value = c[3]; if (document.activeElement !== $(".an", pop)) $(".an", pop).value = +c[3].toFixed(3);
      if (document.activeElement !== $(".fl", pop)) $(".fl", pop).value = c.map((v) => +v.toFixed(4)).join(" ");
    };
    const set = (c) => { beginEdit(); t.set(c); paint(norm(t.get())); };
    paint(cur);
    const fromHSL = () => {
      const rgb = hsl2rgb([+$(".hn", pop).value, +$(".sn", pop).value / 100, +$(".ln", pop).value / 100]);
      set([...rgb, norm(t.get())[3]]);
    };
    for (const k of ["h", "s", "l"]) {
      $("." + k, pop).oninput = (e) => { $("." + k + "n", pop).value = e.target.value; fromHSL(); };
      $("." + k + "n", pop).oninput = () => fromHSL();
    }
    $(".a", pop).oninput = (e) => { const c = norm(t.get()); c[3] = +e.target.value; set(c); };
    $(".an", pop).oninput = (e) => { const c = norm(t.get()); c[3] = clamp(+e.target.value); set(c); };
    $("input[type=color]", pop).oninput = (e) => set(fromHex(e.target.value, norm(t.get())[3]));
    $(".hx", pop).onchange = (e) => { const c = fromHex(e.target.value, norm(t.get())[3]); if (c) set(c); };
    $(".fl", pop).onchange = (e) => {
      const v = e.target.value.trim().split(/[\s,;]+/).map(Number).filter((x) => !isNaN(x));
      if (v.length >= 3) set(norm([...v.slice(0, 3), v[3] ?? norm(t.get())[3]]));
    };
    $(".cf", pop).onchange = (e) => { const src = target(e.target.value); if (src) set(norm(src.get())); e.target.value = ""; };
    $(".rv", pop).onclick = () => { const b = t.base && t.base(); if (b) set(norm(b)); };
    $(".cp", pop).onclick = () => navigator.clipboard && navigator.clipboard.writeText(hex(norm(t.get())));
    $(".eye", pop).onclick = async () => {
      try { const r = await new EyeDropper().open(); set(fromHex(r.sRGBHex, norm(t.get())[3])); } catch (e) { /* cancelled */ }
    };
    $(".x", pop).onclick = closePop;
    $$("[data-pt]", pop).forEach((b) => (b.onclick = () => openPicker(b.dataset.pt, anchor)));
    $$("input", pop).forEach((i) => i.addEventListener("change", () => endEdit()));
    placePop(anchor);
  }

  function openTokenList(tokens, anchor) {
    endEdit();
    tokens = [...new Set(tokens)].filter((t) => target(t));
    if (!tokens.length) return;
    if (tokens.length === 1) return openPicker(tokens[0], anchor);
    popTok = null;
    pop.innerHTML = `<button class="x" title="Close">×</button><h5>Colors of this element</h5><div class="sub">${tokens.length} colors — click one to edit</div>
      <div class="list">${tokens.map((tok) => { const t = target(tok); return `<div class="row" data-open="${tok}"><span class="sws">${swatch(tok)}</span><span class="lab"><b>${esc(t.label)}</b><code>${esc(t.sub)}</code></span><span></span></div>`; }).join("")}</div>`;
    $(".x", pop).onclick = closePop;
    $$("[data-open]", pop).forEach((r) => (r.onclick = () => openPicker(r.dataset.open, anchor)));
    flash(null);
    placePop(anchor);
    // also mark them in the list (rows, or swatches in the Swatches layout)
    $$("#list .row.hit, #list .chip.hit").forEach((r) => r.classList.toggle("hit", false));
    let first = null;
    for (const tok of tokens) {
      const base = tok.startsWith("o:") ? tok.slice(2) : tok;
      const r = $(`#list .row[data-row="${CSS.escape(base)}"]`);
      if (r) { r.classList.add("hit"); r.closest(".cat").classList.toggle("closed", false); first = first || r; }
      const c = $(`#list .chip[data-tok="${CSS.escape(tok)}"]`);
      if (c) { c.classList.add("hit"); first = first || c; }
    }
    if (first) first.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  /* ================================================================== */
  /* Preview: hover and click                                            */
  /* ================================================================== */
  // Highlight on hovering a row. Never while a color picker is open: an outline around the
  // element skews judging the color by contrast. It
  // clears itself after one second.
  let flashed = [], flashTimer = null;
  function flash(tok, on) {
    flashed.forEach((e) => e.classList.remove("pv-flash"));
    flashed = [];
    clearTimeout(flashTimer);
    if (!tok || !on || !$("#flashChk").checked || !pop.hidden) return;
    flashTimer = setTimeout(() => flash(null), 1000);
    const toks = tok.startsWith("o:") ? [tok] : [tok, "o:" + tok];
    for (const t of toks) flashed.push(...$$(`#pv [data-c~="${CSS.escape(t)}"]`));
    flashed.forEach((e) => e.classList.add("pv-flash"));
  }

  function buildPV() {
    const pv = $("#pv");
    pv.innerHTML = window.buildPreview();
    S.covered = new Set();
    $$("#pv [data-c]").forEach((e) => e.dataset.c.split(/\s+/).forEach((t) => t && S.covered.add(t.replace(/^o:/, ""))));
    const ids = Object.keys(S.refIndex).filter((id) => S.refIndex[id].category !== "Unused");
    const n = ids.filter((id) => S.covered.has(id)).length;
    $("#coverage").textContent = `Preview shows ${n}/${ids.length} colors + ${SD_KEYS.length} style colors`;
  }
  function renderUnused() {
    const box = $("#pv-unused");
    if (!box || !S.theme) return;
    box.innerHTML = Object.keys(S.theme.colors)
      .filter((id) => S.theme.colors[id].category === "Unused")
      .map((id) => `<span class="u" data-c="${id}"><i style="background:${C(id)}"></i>${esc(id)}</span>`)
      .join("");
  }
  const C = (id) => `var(--c-${id})`;

  /* ================================================================== */
  /* Generator: Max's theme_constructor.js, run as is                    */
  /* ================================================================== */
  const KERNEL_FR = {
    fg: "Foreground (chrome)", bg: "Background (chrome)", void: "Void (patch background)", void_anti: "Anti-void (comments)",
    neutral: "Neutral", hot: "Hot (errors)", warm: "Warm (accents)", cool: "Cool (selection)", success: "Success",
    color1: "Color 1", color2: "Color 2", color3: "Color 3", color4: "Color 4",
  };
  const KERNEL_KEYS = Object.keys(KERNEL_FR);

  function makeEngine(src) {
    let out = null;
    const max = {
      setcolor: (k, v) => { out.colors[k] = Array.from(v); },
      setdefaultstylecolor: (k, a, b, c) => {
        if (k === "bgfillcolor") out.styledefaults.bgfillcolor_color = Array.from(b);
        else out.styledefaults[k] = Array.from(a);
      },
      refresh() {}, getcolor() { return [0, 0, 0, 1]; },
    };
    const factory = new Function("max", "post", "Dict", "outlet", "autowatch",
      src + `
;return {
  theme_kernels: theme_kernels, theme_map: theme_map, generate: generate, quickcalc: quickcalc,
  rgb2hcl: rgb2hcl, hcl2rgb: hcl2rgb,
  setAlternates: function (a, b, c) { alternate_a = a; alternate_b = b; alternate_c = c; },
  setEditor: function (auto, hue, sat) { _editor_automagic = auto; _editor_hue_rotation = hue; _editor_saturation = sat; },
  setIgnore: function (live, patch) { _ignorelive = live; _ignorepatcher = patch; }
};`);
    const eng = factory.call({}, max, () => {}, function () { this.parse = () => {}; this.name = "d"; }, () => {}, 0);
    const sidebarDefault = clone(eng.theme_map.sidebar.meta);
    eng.run = (kernel, opts) => {
      out = { colors: {}, styledefaults: {} };
      eng.theme_kernels.__mts = clone(kernel);
      eng.setAlternates(opts.a, opts.b, opts.c);
      eng.setEditor(opts.auto, opts.hue, opts.sat);
      // Max 9 "default" = max9 core + two softened sidebar rows
      Object.assign(eng.theme_map.sidebar.meta, sidebarDefault);
      if (opts.sidebarSoft) { eng.theme_map.sidebar.meta.dataview_row1 = "bg_soften_c"; eng.theme_map.sidebar.meta.dataview_row2 = "bg_soften_a"; }
      eng.generate("__mts");
      return out;
    };
    eng.quick = (kernel, bg, contrast, neutral, vshift) => {
      out = { colors: {}, styledefaults: {} };
      eng.theme_kernels.__mts = clone(kernel);
      eng.quickcalc("__mts", bg[0], bg[1], bg[2], contrast, neutral, vshift);
      const k = eng.theme_kernels.__mts;
      return Object.fromEntries(KERNEL_KEYS.map((n) => [n, k[n].slice(0, 3)]));
    };
    return eng;
  }

  function setupGenerator(src) {
    let eng;
    try { eng = makeEngine(src); } catch (e) {
      $("#genBody").innerHTML = `<p class="note">Max's theme engine could not be loaded: ${esc(e.message)}</p>`;
      return;
    }
    const presets = Object.keys(eng.theme_kernels).filter((n) => n !== "__mts");
    const G = {
      kernel: null, preset: "max9-default",
      opts: { a: 0.15, b: 0.25, c: 0.4, auto: true, hue: 0, sat: 1, sidebarSoft: true },
      scope: store.get("genScope", { patch: true, app: true, jed: true, live: true }),
      live: true,
    };
    const loadPreset = (name) => {
      G.preset = name;
      const k = eng.theme_kernels[name] || eng.theme_kernels.max9;
      G.kernel = Object.fromEntries(KERNEL_KEYS.map((n) => [n, k[n].slice(0, 3)]));
      G.opts.sidebarSoft = name === "max9-default";
    };
    loadPreset("max9-default");

    const domainOf = (key) => {
      if (key.startsWith("jed_")) return "jed";
      if (key.startsWith("live_")) return "live";
      if (key in eng.theme_map.content) return "patch";
      return "app";
    };
    const apply = () => {
      const out = eng.run(G.kernel, G.opts);
      beginEdit();
      const L = S.theme.locks || {};
      for (const id in out.colors) {
        if (!G.scope[domainOf(id)] || !S.theme.colors[id] || L[id]) continue;
        const v = norm(out.colors[id]);
        S.theme.colors[id].oncolor = v;
        applyColor(id);
      }
      if (G.scope.patch) {
        for (const k in out.styledefaults) {
          const v = norm(out.styledefaults[k]);
          if (L["s:" + k]) continue;
          if (k === "bgfillcolor_color") for (const b of BGFILL) S.theme.sd[b] = clone(v);
          else S.theme.sd[k] = v;
        }
        for (const [k] of SD_KEYS) applySD(k);
        applySD();
      }
      refreshRows();
    };
    G.apply = apply;
    G.countLocks = () => {
      const el = $("#genBody .glocks");
      const n = Object.keys((S.theme && S.theme.locks) || {}).length;
      if (el) el.textContent = n ? `${n} pinned right now.` : "";
    };

    const kernelTarget = (n) => ({
      tok: "k:" + n, label: KERNEL_FR[n], sub: `core · ${n}`, alphaLocked: true,
      get: () => [...G.kernel[n], 1],
      set: (v) => { G.kernel[n] = norm(v).slice(0, 3); paintKernel(); if (G.live) apply(); },
      base: () => { const k = eng.theme_kernels[G.preset]; return k ? [...k[n], 1] : null; },
    });
    G.kernelTarget = kernelTarget;
    G.syncPreset = (themeName) => {
      const n = String(themeName || "").replace(/\.maxtheme$/, "");
      const name = n === "default" ? "max9-default" : n;
      if (eng.theme_kernels[name]) { loadPreset(name); render(); }
    };

    const paintKernel = () => {
      $$("#genBody .krow").forEach((r) => (r.querySelector(".sw i").style.background = css([...G.kernel[r.dataset.k], 1])));
    };
    const slider = (cls, label, min, max, step, val, title = "") =>
      `<div class="gen-row" title="${esc(title)}"><label style="flex:none;width:118px">${label}</label><input type="range" class="${cls}" min="${min}" max="${max}" step="${step}" value="${val}"><span class="val ${cls}-v">${val}</span></div>`;

    function render() {
      $("#genBody").innerHTML = `
        <p class="note">Cycling '74's engine (<code>theme_constructor.js</code>, read from your Max) derives ${"≈"}180 colors and the style colors from 13 core colors. Colors it doesn't compute (hot inlets, badges, fixed Live colors…) keep their value.</p>
        <div class="gen-row"><label>Starting core <select class="gp">${presets.map((p) => `<option ${p === G.preset ? "selected" : ""}>${p}</option>`).join("")}</select></label></div>
        <div class="kgrid">${KERNEL_KEYS.map((n) => `<div class="krow" data-k="${n}"><span class="sw"><i style="background:${css([...G.kernel[n], 1])}"></i></span>${KERNEL_FR[n]}</div>`).join("")}</div>
        <details><summary class="note" style="cursor:pointer">Quick calc from the background…</summary>
          ${slider("qc", "Contrast", 0, 1, 0.01, 0.6, "luminance gap between background and foreground")}
          ${slider("qn", "Neutral", 0, 1, 0.01, 0.3, "where neutral sits between background and foreground")}
          ${slider("qv", "Void offset", -0.3, 0.3, 0.01, -0.05, "patch background luminance relative to the chrome background")}
          <div class="gen-row"><button class="qgo">Recompute fg, void, anti-void and neutral from the background</button></div>
        </details>
        ${slider("ga", "Soften a", 0, 1, 0.01, G.opts.a)}${slider("gb", "Soften b", 0, 1, 0.01, G.opts.b)}${slider("gc", "Soften c", 0, 1, 0.01, G.opts.c)}
        <div class="gen-row"><label class="chk" style="flex:none"><input type="checkbox" class="gauto" ${G.opts.auto ? "checked" : ""}> auto syntax</label>
          <label class="chk" style="flex:none" title="Sidebar rows as in Max 9's default theme"><input type="checkbox" class="gside" ${G.opts.sidebarSoft ? "checked" : ""}> soft sidebar</label></div>
        ${slider("ghue", "Editor hue", -180, 180, 1, G.opts.hue)}${slider("gsat", "Editor saturation", 0, 4, 0.05, G.opts.sat)}
        <div class="gen-row note">Apply to:
          ${["patch:patch and styles", "app:application", "jed:code editor", "live:Live"].map((p) => { const [k, l] = p.split(":"); return `<label class="chk"><input type="checkbox" data-scope="${k}" ${G.scope[k] ? "checked" : ""}> ${l}</label>`; }).join("")}</div>
        <div class="gen-row note"><span style="flex:1">Colors you edited by hand (marked “pinned”) are never overwritten by the generator. <span class="glocks"></span></span><button class="gunlock" title="Let the generator rewrite everything again">Unpin all</button></div>
        <div class="gen-row"><label class="chk" style="flex:none"><input type="checkbox" class="glive" ${G.live ? "checked" : ""}> live</label><span style="flex:1"></span><button class="primary gapply">Generate theme</button></div>`;
      const B = $("#genBody");
      $(".gp", B).onchange = (e) => { loadPreset(e.target.value); render(); if (G.live) commit(apply); };
      $$(".krow", B).forEach((r) => (r.onclick = () => openPicker("k:" + r.dataset.k, r)));
      const bindSlider = (cls, fn) => {
        const el = $("." + cls, B);
        el.oninput = () => { $("." + cls + "-v", B).textContent = el.value; fn(+el.value); if (G.live && !cls.startsWith("q")) { beginEdit(); apply(); } };
        el.onchange = () => endEdit();
      };
      bindSlider("ga", (v) => (G.opts.a = v));
      bindSlider("gb", (v) => (G.opts.b = v));
      bindSlider("gc", (v) => (G.opts.c = v));
      bindSlider("ghue", (v) => { G.opts.hue = v; G.opts.auto = false; $(".gauto", B).checked = false; });
      bindSlider("gsat", (v) => { G.opts.sat = v; G.opts.auto = false; $(".gauto", B).checked = false; });
      bindSlider("qc", () => {}); bindSlider("qn", () => {}); bindSlider("qv", () => {});
      $(".gauto", B).onchange = (e) => { G.opts.auto = e.target.checked; if (G.live) commit(apply); };
      $(".gside", B).onchange = (e) => { G.opts.sidebarSoft = e.target.checked; if (G.live) commit(apply); };
      $$("[data-scope]", B).forEach((c) => (c.onchange = () => { G.scope[c.dataset.scope] = c.checked; store.set("genScope", G.scope); }));
      $(".glive", B).onchange = (e) => (G.live = e.target.checked);
      $(".gapply", B).onclick = () => commit(apply);
      $(".gunlock", B).onclick = () => {
        const n = Object.keys(S.theme.locks || {}).length;
        if (n && !confirm(`Unpin ${n} colors? The next generator run will overwrite them.`)) return;
        commit(() => { S.theme.locks = {}; refreshRows(); });
      };
      G.countLocks();
      $(".qgo", B).onclick = () => {
        const k = eng.quick(G.kernel, G.kernel.bg, +$(".qc", B).value, +$(".qn", B).value, +$(".qv", B).value);
        Object.assign(G.kernel, k);
        paintKernel();
        commit(apply);
      };
    }
    render();
    S.gen = G;
    if (S.baseName) G.syncPreset(S.baseName);
  }

  /* ================================================================== */
  /* Adjust all                                                          */
  /* ================================================================== */
  function setupGlobal() {
    let start = null;
    const scope = { patch: true, app: true, jed: true, live: true };
    const domain = (id) => {
      if (id.startsWith("jed_")) return "jed";
      if (id.startsWith("live_")) return "live";
      const c = S.theme.colors[id].category;
      return c === "Patching" || c === "Inlets + Outlets" ? "patch" : "app";
    };
    $("#globalBody").innerHTML = `
      <div class="gen-row"><label style="flex:none;width:90px">Hue</label><input type="range" id="gH" min="-180" max="180" value="0"><span class="val" id="gHv">0</span></div>
      <div class="gen-row"><label style="flex:none;width:90px">Saturation</label><input type="range" id="gS" min="0" max="200" value="100"><span class="val" id="gSv">100</span></div>
      <div class="gen-row"><label style="flex:none;width:90px">Lightness</label><input type="range" id="gL" min="-50" max="50" value="0"><span class="val" id="gLv">0</span></div>
      <div class="gen-row"><label style="flex:none;width:90px">Contrast</label><input type="range" id="gC" min="50" max="150" value="100"><span class="val" id="gCv">100</span></div>
      <div class="gen-row note">Scope: ${["patch:patch and styles", "app:application", "jed:code editor", "live:Live"].map((p) => { const [k, l] = p.split(":"); return `<label class="chk"><input type="checkbox" data-gs="${k}" checked> ${l}</label>`; }).join("")}</div>
      <div class="gen-row note"><label class="chk"><input type="checkbox" id="gLocked"> include pinned colors</label></div>
      <p class="note">Each move is applied when you release the slider, which then returns to neutral. ⌘Z undoes it.</p>`;
    const tf = (c) => {
      const H = +$("#gH").value, Sa = +$("#gS").value / 100, L = +$("#gL").value / 100, Co = +$("#gC").value / 100;
      let [h, s, l] = rgb2hsl(c);
      h += H; s = clamp(s * Sa); l = clamp((l - 0.5) * Co + 0.5 + L);
      return [...hsl2rgb([h, s, l]), c[3]];
    };
    const run = () => {
      ["H", "S", "L", "C"].forEach((k) => ($("#g" + k + "v").textContent = $("#g" + k).value));
      if (!start) { beginEdit(); start = clone({ colors: S.theme.colors, sd: S.theme.sd }); }
      const L = $("#gLocked").checked ? {} : S.theme.locks || {};
      for (const id in S.theme.colors) {
        if (!scope[domain(id)] || L[id]) continue;
        const o = start.colors[id], c = S.theme.colors[id];
        c.oncolor = tf(o.oncolor);
        if (o.offcolor) c.offcolor = tf(o.offcolor);
        applyColor(id);
      }
      if (scope.patch) {
        for (const k in start.sd) if (Array.isArray(start.sd[k]) && k !== "clearcolor" && !L["s:" + k]) S.theme.sd[k] = tf(start.sd[k]);
        for (const [k] of SD_KEYS) applySD(k);
        applySD();
      }
    };
    const reset = () => { ["H", "L"].forEach((k) => ($("#g" + k).value = 0)); ["S", "C"].forEach((k) => ($("#g" + k).value = 100)); ["H", "S", "L", "C"].forEach((k) => ($("#g" + k + "v").textContent = $("#g" + k).value)); };
    // Un geste = une retouche : au relâcher, on l'acte et le curseur revient au neutre.
    // (Before, the starting snapshot stayed alive and a later move overwrote the edits
    // made in between.)
    const settle = () => { if (!start) return; start = null; reset(); endEdit(); refreshRows(); };
    ["H", "S", "L", "C"].forEach((k) => { $("#g" + k).oninput = run; $("#g" + k).onchange = settle; });
    $$("[data-gs]").forEach((c) => (c.onchange = () => (scope[c.dataset.gs] = c.checked)));
  }

  /* ================================================================== */
  /* Your Max installation (read in the browser, cached in IndexedDB)    */
  /* ================================================================== */
  const idb = (() => {
    let dbp;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open("max-theme-maker", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const tx = async (mode, fn) => {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction("kv", mode);
        const q = fn(t.objectStore("kv"));
        t.oncomplete = () => res(q && q.result);
        t.onerror = () => rej(t.error);
      });
    };
    return {
      get: (k) => tx("readonly", (s) => s.get(k)).catch(() => undefined),
      set: (k, v) => tx("readwrite", (s) => s.put(v, k)).catch(() => undefined),
      del: (k) => tx("readwrite", (s) => s.delete(k)).catch(() => undefined),
    };
  })();

  // A "source" is one connected Max: {name, themes:{name:text}, sets:{name:text}, constructor:text}
  async function sourceFromFiles(files) {
    const src = { name: "", themes: {}, sets: {}, constructor: "" };
    for (const f of files) {
      const p = (f.webkitRelativePath || f.name).replace(/\\/g, "/");
      let m;
      if ((m = p.match(/(?:^|\/)themes\/([^/]+)\.maxtheme$/))) src.themes[m[1]] = await f.text();
      else if ((m = p.match(/(?:^|\/)themes\/([^/]+)\.maxstx$/))) src.sets[m[1]] = await f.text();
      else if (/(?:^|\/)theme_constructor\.js$/.test(p) && !/\/themes\//.test(p)) src.constructor = await f.text();
    }
    if (!src.themes.default) return null;
    // Which Max is it? Max 8 ships 21 themes; Max 9 ships 29, and up to 9.2 its default
    // theme still has the Windows menubar_* colors (later 9.x versions dropped them).
    try {
      const d = parseThemeText(src.themes.default);
      const ids = new Set(d.colors.map((c) => c.id));
      const n = Object.keys(src.themes).length;
      src.name = n <= 22 ? "Max 8" : ids.has("menubar_background") ? "Max 9" : "Max 9 (recent)";
    } catch (e) { src.name = "Max"; }
    return src;
  }
  async function devSource() {
    // local testing only: dev/max is a copy of an interfaces folder, never published
    const list = (await (await fetch("dev/files.txt")).text()).split("\n").filter(Boolean);
    const files = await Promise.all(list.map(async (p) => {
      const t = await (await fetch("dev/max/" + p)).text();
      return { webkitRelativePath: "interfaces/" + p, name: p.split("/").pop(), text: async () => t };
    }));
    return sourceFromFiles(files);
  }
  function showConnect(msg = "") {
    $("#connect").hidden = false;
    $("#connectMsg").textContent = msg;
  }
  async function connectFrom(files, replace) {
    const src = await sourceFromFiles([...files]);
    if (!src) return showConnect("That folder has no themes/default.maxtheme. Choose the “interfaces” folder inside the Max app, or drag the Max app onto this page.");
    return addSources([src], replace);
  }
  async function addSources(list, replace) {
    let sources = replace ? [] : ((await idb.get("sources")) || []);
    for (const src of list) sources = [src, ...sources.filter((s) => s.name !== src.name)];
    await idb.set("sources", sources);
    location.reload();
  }

  // Drag and drop: the Max app itself (macOS file dialogs will not open an app bundle,
  // but a dropped bundle is an ordinary folder), its interfaces folder, or a Max folder on Windows.
  const INTERFACES_IN = ["", "interfaces", "Contents/Resources/C74/interfaces", "resources/interfaces", "C74/interfaces"];
  const entryDir = (dir, name) => new Promise((ok) => dir.getDirectory(name, {}, ok, () => ok(null)));
  const entryFile = (dir, name) => new Promise((ok) => dir.getFile(name, {}, (e) => e.file(ok, () => ok(null)), () => ok(null)));
  async function entryChildren(dir) {
    const r = dir.createReader(), out = [];
    for (;;) {
      const batch = await new Promise((ok) => r.readEntries(ok, () => ok([])));
      if (!batch.length) return out;
      out.push(...batch);
    }
  }
  async function walkTo(dir, path) {
    for (const seg of path.split("/").filter(Boolean)) { dir = await entryDir(dir, seg); if (!dir) return null; }
    return dir;
  }
  async function sourceFromEntry(root) {
    for (const rel of INTERFACES_IN) {
      const dir = await walkTo(root, rel);
      const themes = dir && (await entryDir(dir, "themes"));
      if (!themes) continue;
      const files = [];
      for (const e of await entryChildren(themes)) {
        if (!e.isFile || !/\.(maxtheme|maxstx)$/.test(e.name)) continue;
        const f = await new Promise((ok) => e.file(ok, () => ok(null)));
        if (f) files.push({ webkitRelativePath: "interfaces/themes/" + e.name, name: e.name, text: () => f.text() });
      }
      const c = await entryFile(dir, "theme_constructor.js");
      if (c) files.push({ webkitRelativePath: "interfaces/theme_constructor.js", name: c.name, text: () => c.text() });
      const src = await sourceFromFiles(files);
      if (src) return src;
    }
    return null;
  }
  async function connectFromDrop(items, replace) {
    const roots = [...items].map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter((e) => e && e.isDirectory);
    if (!roots.length) return showConnect("Drop a folder: the Max app, or its interfaces folder.");
    showConnect("Reading…");
    const found = (await Promise.all(roots.map(sourceFromEntry))).filter(Boolean);
    if (!found.length) return showConnect("No Max themes found there. Drop the Max app itself (from Applications), or its interfaces folder.");
    return addSources(found, replace);
  }

  /* ================================================================== */
  /* Open / save                                                         */
  /* ================================================================== */
  // The folder themes are saved to (File System Access API: Chrome, Edge, Opera).
  const canSaveToFolder = typeof window.showDirectoryPicker === "function";
  async function savedFolder(interactive) {
    let h = S.saveHandle || (await idb.get("saveDir"));
    if (h) {
      let p = await h.queryPermission({ mode: "readwrite" });
      if (p !== "granted" && interactive) p = await h.requestPermission({ mode: "readwrite" });
      if (p === "granted") { S.saveHandle = h; return themesIn(h); }
      if (!interactive) return null;
    }
    if (!interactive) return null;
    return chooseFolder();
  }
  async function chooseFolder() {
    toast("Choose your <b>Documents/Max 9/Packages</b> folder (or any package's <code>interfaces/themes</code> folder).", "", 0);
    let h;
    try { h = await window.showDirectoryPicker({ id: "max-packages", mode: "readwrite", startIn: "documents" }); }
    catch (e) { $("#toast").hidden = true; return null; }
    $("#toast").hidden = true;
    const t = await themesIn(h, true);
    if (!t) return null;
    await idb.set("saveDir", h);
    S.saveHandle = h;
    return t;
  }
  // Accepts Documents/Max N, Packages, a package, its interfaces folder, or a themes folder.
  async function themesIn(h, asking) {
    const sub = async (d, ...names) => { for (const x of names) d = await d.getDirectoryHandle(x, { create: true }); return d; };
    const n = h.name;
    if (n === "themes") return { dir: h, label: "…/themes" };
    if (n === "interfaces") return { dir: await sub(h, "themes"), label: "…/interfaces/themes" };
    if (n === "Packages") return { dir: await sub(h, "Custom Themes", "interfaces", "themes"), label: "Packages/Custom Themes/interfaces/themes" };
    if (/^Max \d+$/.test(n)) return { dir: await sub(h, "Packages", "Custom Themes", "interfaces", "themes"), label: `${n}/Packages/Custom Themes/interfaces/themes` };
    if (asking && !confirm(`“${n}” doesn't look like a Max folder.\n\nUse it as a Max package? Themes will be saved in ${n}/interfaces/themes, and Max only finds them if “${n}” is inside Documents/Max 9/Packages.`)) return null;
    return { dir: await sub(h, "interfaces", "themes"), label: `${n}/interfaces/themes` };
  }
  async function myThemes() {
    const t = await savedFolder(false).catch(() => null);
    if (!t) return null;
    const names = [];
    for await (const [name, e] of t.dir.entries()) if (e.kind === "file" && name.endsWith(".maxtheme")) names.push(name.replace(/\.maxtheme$/, ""));
    return { label: t.label, names: names.sort((a, b) => a.localeCompare(b)), dir: t.dir };
  }

  async function fillBaseSelect() {
    const sel = $("#baseSelect");
    const keep = sel.value;
    let h = `<option value="">Open a theme…</option>`;
    // your themes first: they are the ones you come back to
    const mine = await myThemes();
    if (mine && mine.names.length) {
      S.mine = mine;
      h += `<optgroup label="Your themes">${mine.names.map((n) => `<option value="mine:${esc(n)}">${esc(n)}</option>`).join("")}</optgroup>`;
    } else if (canSaveToFolder && (await idb.get("saveDir"))) {
      h += `<optgroup label="Your themes"><option value="reconnect">Allow access to your themes folder…</option></optgroup>`;
    }
    S.sources.forEach((s, i) => {
      h += `<optgroup label="Shipped with ${esc(s.name)}">${Object.keys(s.themes).sort().map((n) => `<option value="src:${i}:${esc(n)}">${esc(n)}</option>`).join("")}</optgroup>`;
    });
    sel.innerHTML = h;
    if (keep && [...sel.options].some((o) => o.value === keep)) sel.value = keep;
  }
  async function readChoice(v) {
    if (v.startsWith("src:")) {
      const [, i, name] = v.match(/^src:(\d+):(.*)$/);
      return { raw: parseThemeText(S.sources[+i].themes[name]), name, mine: false };
    }
    if (v.startsWith("mine:")) {
      const name = v.slice(5);
      const f = await (await S.mine.dir.getFileHandle(name + ".maxtheme")).getFile();
      return { raw: parseThemeText(await f.text()), name, mine: true };
    }
    return null;
  }

  function shippedNames() { return new Set(S.sources.flatMap((s) => Object.keys(s.themes))); }

  async function save() {
    endEdit();
    const name = $("#themeName").value.trim().replace(/\.maxtheme$/, "");
    if (!name) return toast("Give the theme a name.", "err");
    if (/[\/\\:*?"<>|]/.test(name)) return toast("A theme name can't contain / \\ : * ? \" < > |", "err");
    if (!canSaveToFolder) {
      download();
      return toast(`Downloaded <b>${esc(name)}.maxtheme</b>. Move it to <code>Documents/Max 9/Packages/Custom Themes/interfaces/themes</code>, restart Max, then pick it in Preferences › Interface Color Theme.`, "ok", 15000);
    }
    let t;
    try { t = await savedFolder(true); } catch (e) { return toast("No access to the folder: " + esc(e.message), "err"); }
    if (!t) return;
    if (shippedNames().has(name) && !confirm(`“${name}” is also the name of a theme that ships with Max: both will show up under the same name. Continue?`)) return;
    let exists = true;
    try { await t.dir.getFileHandle(name + ".maxtheme"); } catch (e) { exists = false; }
    if (exists && !confirm(`${name}.maxtheme already exists in ${t.label}.\n\nReplace it?`)) return;
    try {
      const fh = await t.dir.getFileHandle(name + ".maxtheme", { create: true });
      const w = await fh.createWritable();
      await w.write(formatTheme(exportTheme()));
      await w.close();
    } catch (e) { return toast("Save failed: " + esc(e.message), "err", 8000); }
    $("#themeName").dataset.auto = "0";
    toast(`Saved <b>${esc(name)}.maxtheme</b> in <code>${esc(t.label)}</code>.<br><span class="muted">Restart Max, then choose it in Preferences › Interface Color Theme.</span>`, "ok", 12000);
    await fillBaseSelect();
    $("#baseSelect").value = "mine:" + name;
  }

  // Every number is written as a float ("1.0", never "1"): with integers Max misreads the colors
  // (the Preferences window turned into a flat color).
  function formatTheme(t) {
    const num = (v) => { const s = Number(v).toFixed(6).replace(/0+$/, ""); return s.endsWith(".") ? s + "0" : s; };
    const val = (v) => (Array.isArray(v) ? "[ " + v.map(num).join(", ") + " ]" : typeof v === "number" ? num(v) : JSON.stringify(v));
    const L = ["{", '    "colors": ['];
    t.colors.forEach((c, i) => {
      const ks = Object.keys(c);
      L.push("        {", ...ks.map((k, j) => `            "${k}": ${val(c[k])}${j < ks.length - 1 ? "," : ""}`), "        }" + (i < t.colors.length - 1 ? "," : ""));
    });
    L.push("    ],", '    "styledefaults": {');
    const sk = Object.keys(t.styledefaults), extra = Object.keys(t).filter((k) => k !== "colors" && k !== "styledefaults");
    sk.forEach((k, j) => L.push(`        "${k}": ${val(t.styledefaults[k])}${j < sk.length - 1 ? "," : ""}`));
    L.push("    }" + (extra.length ? "," : ""));
    extra.forEach((k, j) => L.push(`    "${k}": ${val(t[k])}${j < extra.length - 1 ? "," : ""}`));
    L.push("}");
    return L.join("\n") + "\n";
  }

  function download() {
    endEdit();
    const name = ($("#themeName").value.trim() || "theme").replace(/\.maxtheme$/, "").replace(/[\/\\:]/g, "-");
    const blob = new Blob([formatTheme(exportTheme())], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name + ".maxtheme";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ================================================================== */
  /* Startup                                                             */
  /* ================================================================== */
  async function init() {
    applyLayout();
    let sources = (await idb.get("sources")) || [];
    if (/[?&]dev\b/.test(location.search)) sources = [await devSource()];
    if (!sources.length) return showConnect();
    S.sources = sources;
    const first = sources[0];
    S.ref = parseThemeText(first.themes.default);
    // Max versions don't all have the same colors (9.2 has the menubar_*, newer ones don't):
    // the reference is the union of the connected "default" themes, the first one wins.
    for (const other of sources.slice(1)) {
      try {
        const o = parseThemeText(other.themes.default);
        const have = new Set(S.ref.colors.map((c) => c.id));
        for (const c of o.colors) if (!have.has(c.id)) { c.since = other.name; S.ref.colors.push(c); }
        for (const k in o.styledefaults) if (!(k in S.ref.styledefaults)) S.ref.styledefaults[k] = o.styledefaults[k];
      } catch (e) { /* no usable default theme */ }
    }
    S.ref.colors.sort((a, b) => a.id.localeCompare(b.id));
    S.order = S.ref.colors.map((c) => c.id);
    S.refIndex = Object.fromEntries(S.ref.colors.map((c) => [c.id, c]));
    S.syntaxSets = {};
    for (const n in first.sets) { try { S.syntaxSets[n] = parseThemeText(first.sets[n]); } catch (e) { /* skip */ } }

    buildPV();
    await fillBaseSelect();

    const sess = store.get("session", null);
    if (sess && sess.theme && sess.base) {
      S.theme = sess.theme; S.base = sess.base; S.baseName = sess.baseName || "";
      S.theme.locks = S.theme.locks || {};
      // a session from an earlier version may lack colors: fill them in
      const n = normalize(exportTheme());
      for (const id in n.colors) if (!S.theme.colors[id]) S.theme.colors[id] = n.colors[id];
      $("#themeName").value = sess.name || suggestName(S.baseName);
      applyAll(); renderList();
      toast(`Picked up where you left off (“${esc(sess.name || S.baseName)}”).`, "", 3500);
    } else {
      loadTheme(S.ref, "default");
      $("#baseSelect").value = "src:0:default";
    }
    updateUndo();

    if (first.constructor) setupGenerator(first.constructor);
    else $("#genBody").innerHTML = `<p class="note">This Max has no theme_constructor.js: the generator is unavailable.</p>`;
    setupGlobal();
    renderAreaTabs();
    applyArea();
  }

  /* ---------- events ---------- */
  $("#baseSelect").onchange = async (e) => {
    const v = e.target.value;
    if (!v) return;
    if (v === "reconnect") {
      try { await savedFolder(true); } catch (err) { /* refused */ }
      await fillBaseSelect();
      return;
    }
    try {
      const { raw, name, mine } = await readChoice(v);
      if (mine) {
        // reopening one of YOUR themes: keep its name, so Save updates it (after confirming)
        $("#themeName").value = name;
        $("#themeName").dataset.auto = "0";
      }
      loadTheme(raw, name);
      toast(mine
        ? `“${esc(name)}” reopened: Save will update it.`
        : `“${esc(name)}” loaded: ${raw.colors.length} colors, ${Object.keys(raw.styledefaults || {}).length} style colors.`, "", 4000);
    } catch (err) { toast("Couldn't read it: " + esc(err.message), "err"); }
  };
  window.addEventListener("focus", () => { if (S.sources) fillBaseSelect(); });
  $("#importBtn").onclick = () => $("#importFile").click();
  $("#importFile").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const raw = parseThemeText(await f.text());
      if (!Array.isArray(raw.colors)) throw new Error("no “colors” key");
      loadTheme(raw, f.name.replace(/\.(maxtheme|json)$/, ""));
      $("#baseSelect").value = "";
    } catch (err) { toast("Unreadable file: " + esc(err.message), "err"); }
    e.target.value = "";
  };
  $("#themeName").oninput = (e) => { e.target.dataset.auto = "0"; saveSession(); };
  $("#saveBtn").onclick = () => save();
  $("#saveBtn").title = canSaveToFolder ? "Save into your Max Packages folder (⌘S)" : "Your browser can't write to folders: the theme is downloaded (⌘S)";
  $("#downloadBtn").onclick = download;

  $("#connectBtn").onclick = () => $("#connectInput").click();
  $("#connectInput").onchange = (e) => { if (e.target.files.length) connectFrom(e.target.files, S.replaceSources); };
  // dropping the Max app (or its interfaces folder) anywhere while the connect screen is open
  document.addEventListener("dragover", (e) => {
    if ($("#connect").hidden) return;
    e.preventDefault(); e.dataTransfer.dropEffect = "copy";
    $("#connect").classList.add("dropping");
  });
  document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) $("#connect").classList.toggle("dropping", false); });
  document.addEventListener("drop", (e) => {
    if ($("#connect").hidden) return;
    e.preventDefault();
    $("#connect").classList.toggle("dropping", false);
    connectFromDrop(e.dataTransfer.items, S.replaceSources);
  });
  $("#copyPath").onclick = () => { if (navigator.clipboard) navigator.clipboard.writeText($("#maxPath").textContent); $("#copyPath").textContent = "Copied"; };
  $("#helpBtn").onclick = () => ($("#help").hidden = false);
  $("#helpClose").onclick = () => ($("#help").hidden = true);
  $("#help").onclick = (e) => { if (e.target.id === "help") $("#help").hidden = true; };
  $("#saveFolderBtn").hidden = !canSaveToFolder;
  $("#saveFolderBtn").onclick = async () => {
    $("#help").hidden = true;
    const t = await chooseFolder();
    if (t) { toast(`Themes will be saved in <code>${esc(t.label)}</code>.`, "ok"); fillBaseSelect(); }
  };
  $("#reconnectBtn").onclick =() => { $("#help").hidden = true; S.replaceSources = false; showConnect(); };
  $("#forgetBtn").onclick = async () => {
    if (!confirm("Forget the connected Max installation(s)? Your themes and the current session are kept.")) return;
    await idb.del("sources");
    location.reload();
  };
  $("#undoBtn").onclick = undo;
  $("#redoBtn").onclick = redo;
  $("#search").oninput = renderList;
  $("#showUnused").onchange = renderList;

  $("#list").addEventListener("click", (e) => {
    const un = e.target.closest("[data-unlock]");
    if (un) {
      commit(() => { delete S.theme.locks[un.dataset.unlock]; if (un.dataset.unlock.startsWith("s:bgfillcolor")) BGFILL.forEach((b) => delete S.theme.locks["s:" + b]); });
      refreshRows();
      return;
    }
    const sw = e.target.closest(".sw");
    if (sw) return openPicker(sw.dataset.tok, sw);
    const h = e.target.closest(".cat > h4");
    if (h) {
      const c = h.parentElement;
      c.classList.toggle("closed");
      const closed = store.get("closed", {});
      closed[c.dataset.cat] = c.classList.contains("closed");
      store.set("closed", closed);
      return;
    }
    const row = e.target.closest(".row[data-row]");
    if (row && !e.target.closest("input,select,label")) openPicker(row.dataset.row, row.querySelector(".sw"));
  });
  $("#list").addEventListener("mouseover", (e) => {
    const chipEl = e.target.closest(".chip");
    if (chipEl) {
      const tok = chipEl.dataset.tok, t = target(tok), base = tok.replace(/^o:/, "");
      const hn = $("#hoverName");
      if (hn) hn.innerHTML = `<b>${esc(t.label)}</b> · <code>${esc(base.replace(/^s:/, ""))}</code>`;
      return flash(base, true);
    }
    const row = e.target.closest(".row[data-row]");
    flash(row ? row.dataset.row : null, !!row);
  });

  // layouts
  $("#layoutSeg").onclick = (e) => {
    const b = e.target.closest("button[data-l]");
    if (!b) return;
    S.layout = b.dataset.l;
    store.set("layout", S.layout);
    history.replaceState(null, "", location.pathname + location.search.replace(/([?&])layout=[abc]&?/, "$1").replace(/[?&]$/, "") + location.hash);
    applyLayout();
  };
  $("#drawerBtn").onclick = () => {
    document.body.classList.toggle("drawer-open");
    $("#drawerBtn").classList.toggle("on", document.body.classList.contains("drawer-open"));
  };
  $("#areaTabs").onclick = (e) => {
    const b = e.target.closest("button[data-area]");
    if (!b) return;
    S.area = b.dataset.area;
    store.set("area", S.area);
    renderList(); applyArea();
    $("#pvScroll").scrollTop = 0;
  };
  {
    const m = location.search.match(/[?&]layout=([abc])/);
    S.layout = m ? m[1] : store.get("layout", "a");
    S.area = store.get("area", "patch");
  }
  $("#list").addEventListener("mouseleave", () => flash(null));

  $("#pv").addEventListener("click", (e) => {
    const el = e.target.closest("[data-c]");
    if (!el) return;
    e.stopPropagation();
    // the clicked element first, then its painted parents (box text → the box),
    // sans remonter jusqu'aux grands fonds (patch, appareil, panneau)
    let toks = [];
    const CONTAINERS = ".canvas, .ui-canvas, .live-desk, .device, .side-body, .jed, .menu, .tb, .win";
    for (let n = el; n && n.id !== "pv"; n = n.parentElement && n.parentElement.closest("[data-c]")) {
      if (n !== el && n.matches(CONTAINERS)) break;
      toks.push(...n.dataset.c.split(/\s+/).filter(Boolean));
    }
    // the box fill is a group of three colors
    if (toks.includes("s:bgfillcolor_color")) toks.push("s:bgfillcolor_color1", "s:bgfillcolor_color2");
    openTokenList(toks, { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY });
  });
  $("#lockSeg").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    $$("#lockSeg button").forEach((x) => x.classList.toggle("on", x === b));
    $("#pv").classList.toggle("locked", b.dataset.v === "locked");
    $("#pv").classList.toggle("unlocked", b.dataset.v !== "locked");
  };
  $("#annoChk").onchange = (e) => $("#pv").classList.toggle("no-anno", !e.target.checked);
  $("#zoom").oninput = (e) => {
    const z = +e.target.value / 100;
    $("#pv").style.transform = `scale(${z})`;
    $("#pv").style.marginBottom = `${($("#pv").offsetHeight * (z - 1))}px`;
    store.set("zoom", e.target.value);
  };
  document.addEventListener("mousedown", (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !e.target.closest(".sw, #pv, .krow, .row[data-row]")) closePop();
  });
  document.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === "Escape" && !pop.hidden) closePop();
    if (mod && e.key.toLowerCase() === "z" && !/INPUT|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
  });
  window.addEventListener("beforeunload", saveSession);

  const z = store.get("zoom", null);
  if (z) { $("#zoom").value = z; setTimeout(() => $("#zoom").oninput({ target: $("#zoom") }), 0); }

  init().catch((e) => toast("Startup error: " + esc(e.message), "err", 0));
})();
