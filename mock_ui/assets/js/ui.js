/* Shared UI helpers for the store and admin mock apps */
(function (global) {
  "use strict";

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bag: '<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    heart: '<path d="M12 20s-7-4.5-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.5 12 20 12 20z"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
    "book-open": '<path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z"/><path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z"/>',
    library: '<path d="M4 4v16M8 4v16"/><path d="m12 5 4-1 4 15-4 1z"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    "arrow-left": '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    "x-circle": '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "eye-off": '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
    logout: '<path d="M15 4h4v16h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a7 7 0 0 1 4 6.5"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    message: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.5L3 10"/><path d="M3 4v6h6"/><path d="M4 13a8 8 0 0 0 14.9 3.5L21 14"/><path d="M21 20v-6h-6"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    sprout: '<path d="M12 21v-9"/><path d="M12 12C12 7 8 5 4 5c0 4 3 7 8 7z"/><path d="M12 14c0-4 3-6 8-6 0 4-3 6-8 6z"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
    code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5"/>',
    feather: '<path d="M20 4c-8 0-14 6-14 14v2"/><path d="M20 4c0 8-6 12-12 12"/><path d="M4 20 14 10"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>',
    send: '<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  };

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || ICONS.info) + "</svg>";
  }

  const GOOGLE_G =
    '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  const esc = (s) =>
    String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
  const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function formatINR(paise) {
    const v = (paise || 0) / 100;
    return paise % 100 === 0 ? inrWhole.format(v) : inrFmt.format(v);
  }

  const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const formatDate = (ts) => (ts ? dateFmt.format(new Date(ts)) : "—");
  const formatDateTime = (ts) => (ts ? dateTimeFmt.format(new Date(ts)) : "—");

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("");
  }

  function avatar(user, cls) {
    return '<span class="avatar ' + (cls || "") + '" style="background:' + esc(user.avatarColor || user.picture || "#1f3a2d") + '" aria-hidden="true">' + esc(initials(user.name)) + "</span>";
  }

  function stars(rating, label) {
    const r = Math.round((rating || 0) * 2) / 2;
    let html = '<span class="stars" role="img" aria-label="' + esc(label || "Rated " + (rating || 0) + " out of 5") + '">';
    for (let i = 1; i <= 5; i++) html += icon("star", i <= Math.round(r) ? "filled" : "empty");
    return html + "</span>";
  }

  function cover(book, opts) {
    const o = opts || {};
    const c = book.cover;
    if (!c) return '<div class="cover-missing" role="img" aria-label="No cover uploaded">' + icon("image") + "</div>";
    if (c.image) return '<img class="cover-img" src="' + c.image + '" alt="' + esc(o.alt === undefined ? "Cover of " + book.title : o.alt) + '" loading="lazy">';
    const authorNames = (book.authors || []).map((a) => a.name).join(" & ");
    const surname = authorNames
      .split(" & ")
      .map((n) => n.split(" ").slice(-1)[0])
      .join(" & ");
    return (
      '<div class="cover" role="img" aria-label="' + esc(o.alt === undefined ? "Cover of " + book.title : o.alt) + '" style="--cover-bg:' + c.palette[0] + ";--cover-fg:" + c.palette[1] + '">' +
      '<span class="cover-title">' + esc(book.title) + "</span>" +
      '<span class="cover-orn"></span>' +
      '<span class="cover-author">' + esc(surname) + "</span>" +
      "</div>"
    );
  }

  // Toasts
  let toastRegion;
  function toast(message, type) {
    if (!toastRegion) {
      toastRegion = document.createElement("div");
      toastRegion.className = "toast-region";
      toastRegion.setAttribute("role", "status");
      toastRegion.setAttribute("aria-live", "polite");
      document.body.appendChild(toastRegion);
    }
    const el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " toast-error" : "");
    el.innerHTML = icon(type === "error" ? "alert" : "check-circle") + "<span>" + esc(message) + "</span>";
    toastRegion.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity .3s";
      setTimeout(() => el.remove(), 300);
    }, 4200);
  }

  // Modals
  const openModals = [];
  function modal(opts) {
    const lastFocus = document.activeElement;
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop " + (opts.backdropClass || "");
    const titleId = "m-" + Math.random().toString(36).slice(2);
    backdrop.innerHTML =
      '<div class="modal ' + (opts.size === "lg" ? "modal-lg" : "") + " " + (opts.className || "") + '" role="dialog" aria-modal="true" aria-labelledby="' + titleId + '">' +
      (opts.title !== undefined
        ? '<div class="modal-header"><h2 id="' + titleId + '">' + esc(opts.title) + '</h2><button type="button" class="btn btn-ghost btn-icon btn-sm" data-modal-close aria-label="Close">' + icon("x") + "</button></div>"
        : '<span id="' + titleId + '" class="sr-only">' + esc(opts.label || "Dialog") + "</span>") +
      '<div class="modal-body">' + (opts.body || "") + "</div>" +
      (opts.footer ? '<div class="modal-footer">' + opts.footer + "</div>" : "") +
      "</div>";
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    const api = {
      el: backdrop.querySelector(".modal"),
      close(result) {
        if (!backdrop.isConnected) return;
        backdrop.remove();
        openModals.splice(openModals.indexOf(api), 1);
        if (!openModals.length) document.body.style.overflow = "";
        if (lastFocus && lastFocus.focus) lastFocus.focus();
        if (opts.onClose) opts.onClose(result);
      },
    };
    openModals.push(api);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop && opts.dismissible !== false) api.close();
      if (e.target.closest("[data-modal-close]")) api.close();
    });
    backdrop.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && opts.dismissible !== false) {
        e.stopPropagation();
        api.close();
      }
      if (e.key === "Tab") {
        const f = Array.from(api.el.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    });
    setTimeout(() => {
      const target = api.el.querySelector("[autofocus]") || api.el.querySelector("input, select, textarea, .modal-footer .btn-primary, .modal-footer .btn-danger, button");
      if (target) target.focus();
    }, 20);
    return api;
  }

  function confirmDialog(opts) {
    return new Promise((resolve) => {
      let resolved = false;
      const m = modal({
        title: opts.title,
        body: '<p style="margin:0">' + opts.message + "</p>",
        footer:
          '<button type="button" class="btn btn-ghost" data-modal-close>' + esc(opts.cancelText || "Cancel") + "</button>" +
          '<button type="button" class="btn ' + (opts.danger ? "btn-danger" : "btn-primary") + '" data-confirm>' + esc(opts.confirmText || "Confirm") + "</button>",
        onClose: () => {
          if (!resolved) resolve(false);
        },
      });
      m.el.querySelector("[data-confirm]").addEventListener("click", () => {
        resolved = true;
        resolve(true);
        m.close();
      });
    });
  }

  // State views
  function emptyState(o) {
    return (
      '<div class="state">' +
      '<span class="state-icon">' + icon(o.icon || "book") + "</span>" +
      "<h2>" + esc(o.title) + "</h2>" +
      (o.text ? "<p>" + esc(o.text) + "</p>" : "") +
      (o.action || "") +
      "</div>"
    );
  }

  function errorState(err, retryAttr) {
    return (
      '<div class="state state-error" role="alert">' +
      '<span class="state-icon">' + icon("alert") + "</span>" +
      "<h2>Something went wrong</h2>" +
      "<p>" + esc((err && err.message) || "We couldn't load this page.") + "</p>" +
      '<button type="button" class="btn btn-primary" ' + (retryAttr || "data-retry") + ">" + icon("refresh") + "Try again</button>" +
      "</div>"
    );
  }

  function loadingState(text) {
    return '<div class="state" aria-busy="true"><span class="spinner spinner-lg" aria-hidden="true"></span><p style="margin-top:14px">' + esc(text || "Loading…") + "</p></div>";
  }

  // Form helpers
  function showFieldErrors(form, details) {
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    form.querySelectorAll(".field-error").forEach((el) => el.remove());
    if (!details) return;
    let first = null;
    Object.keys(details).forEach((name) => {
      const input = form.querySelector('[name="' + name + '"]');
      const field = input ? input.closest(".field") : form.querySelector('[data-field="' + name + '"]');
      if (input) {
        input.setAttribute("aria-invalid", "true");
        first = first || input;
      }
      if (field) {
        const msg = document.createElement("span");
        msg.className = "field-error";
        msg.id = "err-" + name;
        msg.textContent = details[name];
        field.appendChild(msg);
        if (input) input.setAttribute("aria-describedby", msg.id);
      }
    });
    if (first) first.focus();
  }

  function setBusy(btn, busy, text) {
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + esc(text || "Please wait…");
    } else {
      btn.disabled = false;
      if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
  }

  // Hash router helpers
  function parseHash() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, query] = raw.split("?");
    const params = {};
    new URLSearchParams(query || "").forEach((v, k) => (params[k] = v));
    return { path: path || "/", parts: (path || "/").split("/").filter(Boolean), query: params };
  }

  function qs(obj) {
    const p = new URLSearchParams();
    Object.keys(obj).forEach((k) => {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") p.set(k, obj[k]);
    });
    const s = p.toString();
    return s ? "?" + s : "";
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  // Theme (light / dark)
  const THEME_KEY = "pp_theme";
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    return theme;
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    return next;
  }

  function themeButton() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    return '<button type="button" class="btn btn-ghost btn-icon" data-action="toggle-theme" aria-label="Switch to ' + (dark ? "light" : "dark") + ' theme" title="Switch to ' + (dark ? "light" : "dark") + ' theme">' + icon(dark ? "sun" : "moon") + "</button>";
  }

  // Minimal PDF writer (used for downloaded books and invoices)
  function buildPdf(pages) {
    const enc = (s) => String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?");
    const objects = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
    const kids = [];
    let n = 5;
    pages.forEach((lines) => {
      const pageId = n++;
      const contentId = n++;
      kids.push(pageId + " 0 R");
      let stream = "BT 56 780 Td ";
      lines.forEach((line) => {
        const l = typeof line === "string" ? { text: line } : line;
        const size = l.size || 11;
        stream += "/" + (l.bold ? "F2" : "F1") + " " + size + " Tf (" + enc(l.text) + ") Tj 0 -" + (l.gap || Math.round(size * 1.6)) + " Td ";
      });
      stream += "ET";
      objects[pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + contentId + " 0 R >>";
      objects[contentId] = "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream";
    });
    objects[2] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + kids.length + " >>";
    let out = "%PDF-1.4\n";
    const offsets = [];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = out.length;
      out += i + " 0 obj\n" + objects[i] + "\nendobj\n";
    }
    const xref = out.length;
    out += "xref\n0 " + objects.length + "\n0000000000 65535 f \n";
    for (let i = 1; i < objects.length; i++) out += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    out += "trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
    return new Blob([out], { type: "application/pdf" });
  }

  function wrapText(text, width) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = "";
    words.forEach((w) => {
      if ((cur + " " + w).trim().length > width) {
        lines.push(cur.trim());
        cur = w;
      } else cur += " " + w;
    });
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // Resize an uploaded image to a small data URL for preview/persistence in the mock
  function imageToDataUrl(file, maxWidth) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, (maxWidth || 360) / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = () => resolve(null);
        img.src = reader.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  global.UI = {
    icon,
    GOOGLE_G,
    esc,
    formatINR,
    formatDate,
    formatDateTime,
    formatBytes,
    initials,
    avatar,
    stars,
    cover,
    toast,
    modal,
    confirmDialog,
    emptyState,
    errorState,
    loadingState,
    showFieldErrors,
    setBusy,
    parseHash,
    qs,
    debounce,
    initTheme,
    toggleTheme,
    themeButton,
    buildPdf,
    wrapText,
    downloadBlob,
    imageToDataUrl,
  };
})(window);
