/* Admin (seller) app — hash-routed single-page mock */
(function () {
  "use strict";

  const { AdminAPI: API, MockGoogle, ApiError, FILE_LIMITS, TAX_CATEGORIES, LANGUAGES, EMAIL_TEMPLATE_META, slugify } = window.Mock;
  const U = window.UI;
  const { icon, esc, formatINR, formatDate, formatDateTime, formatBytes, cover, stars, toast, modal, confirmDialog, emptyState, errorState, loadingState, showFieldErrors, setBusy, parseHash, qs, avatar } = U;
  const MB = 1024 * 1024;

  const A = { token: null, user: null, storeName: "Page & Pine", logoImage: null };
  const $root = document.getElementById("root");

  // ---------------------------------------------------------------------
  // Session (access token in memory, refresh + retry once on 401)
  // ---------------------------------------------------------------------
  async function authed(fn) {
    if (!A.token) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in.");
    try {
      return await fn(A.token);
    } catch (e) {
      if (e.status === 401) {
        try {
          const r = await API.refresh();
          A.token = r.accessToken;
          A.user = r.user;
        } catch (err) {
          signedOut("Your session has ended. Please sign in again.");
          throw err;
        }
        return fn(A.token);
      }
      if (e.code === "FORBIDDEN") {
        A.user.role = "buyer";
        route();
      }
      throw e;
    }
  }

  function signedOut(message) {
    A.token = null;
    A.user = null;
    shellMounted = false;
    if (message) toast(message, "error");
    route();
  }

  // ---------------------------------------------------------------------
  // Shell: sidebar + top bar
  // ---------------------------------------------------------------------
  const NAV = [
    ["Catalog", [["books", "book", "Books"], ["categories", "tag", "Categories"], ["authors", "pen", "Authors"]]],
    ["Sales", [["orders", "receipt", "Orders"], ["customers", "users", "Customers"], ["reviews", "message", "Reviews"]]],
    ["Store", [["settings", "sliders", "Settings"], ["audit-log", "history", "Audit log"]]],
  ];

  let shellMounted = false;

  function brandBlock() {
    return (
      '<a class="sidebar-brand" href="#/books">' +
      (A.logoImage ? '<img src="' + A.logoImage + '" alt="">' : icon("book-open")) +
      "<div><strong>" + esc(A.storeName) + "</strong><span>Seller admin</span></div></a>"
    );
  }

  function ensureShell() {
    if (shellMounted) return;
    $root.innerHTML =
      '<div class="admin-shell">' +
      '<aside class="sidebar" id="sidebar" aria-label="Admin navigation"></aside>' +
      '<div class="admin-main"><header class="topbar" id="topbar"></header><main class="admin-content" id="content" tabindex="-1" style="outline:none"></main></div>' +
      "</div>";
    shellMounted = true;
    renderTopbar("");
  }

  function renderSidebar(active) {
    const el = document.getElementById("sidebar");
    el.innerHTML =
      brandBlock() +
      '<nav class="side-nav">' +
      NAV.map((g) => '<div class="side-label">' + g[0] + "</div>" + g[1].map((n) => '<a class="side-link" href="#/' + n[0] + '"' + (active === n[0] ? ' aria-current="page"' : "") + ">" + icon(n[1]) + n[2] + "</a>").join("")).join("") +
      "</nav>" +
      '<div class="sidebar-foot"><a href="../store/index.html" target="_blank" rel="noopener">View store ' + icon("external") + "</a></div>";
  }

  function renderTopbar(title) {
    const el = document.getElementById("topbar");
    el.innerHTML =
      '<button type="button" class="btn btn-ghost btn-icon menu-toggle" data-action="open-sidebar" aria-label="Open navigation">' + icon("menu") + "</button>" +
      '<p class="topbar-title">' + esc(title) + "</p>" +
      U.themeButton() +
      '<div class="dropdown"><button type="button" class="btn btn-ghost account-btn" data-action="toggle-dropdown" data-target="account-menu" aria-expanded="false" aria-controls="account-menu">' + avatar(A.user) + '<span class="account-name">' + esc(A.user.name) + "</span>" + icon("chevron-down") + "</button>" +
      '<div class="dropdown-menu" id="account-menu" hidden><div class="dropdown-head"><strong>' + esc(A.user.name) + "</strong><span>" + esc(A.user.email) + '</span></div><div class="dropdown-divider"></div>' +
      '<button type="button" class="dropdown-item" data-action="logout">' + icon("logout") + "Sign out</button></div></div>";
  }

  function setContent(html, title) {
    const c = document.getElementById("content");
    c.innerHTML = html;
    const t = document.querySelector(".topbar-title");
    if (t) t.textContent = title;
    document.title = title + " · Seller admin · " + A.storeName;
  }

  function closeSidebar() {
    const s = document.getElementById("sidebar");
    if (s) s.classList.remove("open");
    const b = document.querySelector(".sidebar-backdrop");
    if (b) b.remove();
  }

  function closeDropdowns() {
    document.querySelectorAll(".dropdown-menu").forEach((m) => {
      m.hidden = true;
      const b = document.querySelector('[data-target="' + m.id + '"]');
      if (b) b.setAttribute("aria-expanded", "false");
    });
  }

  // ---------------------------------------------------------------------
  // Auth screens
  // ---------------------------------------------------------------------
  function renderLogin() {
    shellMounted = false;
    document.title = "Sign in · Seller admin";
    $root.innerHTML =
      '<div class="auth-page"><div class="card auth-panel">' +
      '<div class="auth-brand"><div>' + icon("book-open") + '<h2 style="margin-top:14px">' + esc(A.storeName) + '</h2><p>Seller admin</p></div><p>Manage your books, orders, customers, reviews and store settings.</p></div>' +
      '<div class="auth-form"><h1>Sign in</h1><p class="muted">Use the store owner\'s Google account. Only emails on the admin allowlist can access this app.</p>' +
      '<div id="login-error"></div>' +
      '<button type="button" class="gsi-button" id="gsi-btn" data-action="google-signin">' + U.GOOGLE_G + "<span>Sign in with Google</span></button>" +
      "</div></div></div>";
  }

  function renderNotAuthorized() {
    shellMounted = false;
    document.title = "Not authorized · Seller admin";
    $root.innerHTML =
      '<div class="auth-page"><div class="card card-body" style="max-width:460px;text-align:center;padding:36px 28px">' +
      '<span class="state-icon" style="background:var(--error-soft);color:var(--error)">' + icon("ban") + "</span>" +
      "<h1 style=\"font-size:1.6rem\">Not authorized</h1>" +
      '<p class="muted">You are signed in as <strong>' + esc(A.user.email) + "</strong>. This account is not on the admin allowlist, so it can't use the seller admin.</p>" +
      '<div class="row" style="justify-content:center;margin-top:18px"><button type="button" class="btn btn-primary" data-action="logout">' + icon("logout") + 'Sign out</button><a class="btn btn-outline" href="../store/index.html">Go to the store</a></div>' +
      "</div></div>";
  }

  function openGoogleChooser() {
    const m = modal({
      label: "Sign in with Google",
      className: "g-chooser",
      body:
        '<div class="g-chooser-head"><button type="button" class="g-close" data-modal-close aria-label="Close">' + icon("x") + "</button>" +
        '<div style="display:flex;justify-content:center">' + U.GOOGLE_G.replace(/width="18" height="18"/, 'width="30" height="30"') + "</div>" +
        "<h2>Choose an account</h2><p>to continue to " + esc(A.storeName) + " Admin</p></div>" +
        MockGoogle.adminAccounts
          .map((a, i) => '<button type="button" class="g-account" data-g-account="' + i + '">' + avatar({ name: a.name, avatarColor: a.picture }) + '<span class="g-account-text"><strong>' + esc(a.name) + "</strong><span>" + esc(a.email) + '</span></span><span class="g-account-note">' + esc(a.note) + "</span></button>")
          .join("") +
        '<div class="g-chooser-foot">To continue, Google will share your name, email address and profile picture with ' + esc(A.storeName) + ".</div>",
    });
    m.el.addEventListener("click", (e) => {
      const acc = e.target.closest("[data-g-account]");
      if (acc) {
        m.close();
        signIn(MockGoogle.adminAccounts[Number(acc.dataset.gAccount)]);
      }
    });
  }

  async function signIn(account) {
    const btn = document.getElementById("gsi-btn");
    const box = document.getElementById("login-error");
    box.innerHTML = "";
    setBusy(btn, true, "Signing in…");
    try {
      const r = await API.signInWithGoogle(MockGoogle.credentialFor(account));
      A.token = r.accessToken;
      A.user = r.user;
      if (A.user.role === "admin") await loadBrand();
      if (!parseHash().parts[0] || parseHash().parts[0] === "login") location.hash = "#/books";
      route();
    } catch (e) {
      setBusy(btn, false);
      box.innerHTML = '<div class="alert alert-error" role="alert">' + icon("alert") + "<p>" + esc(e.message) + "</p></div>";
    }
  }

  async function logout() {
    try {
      await API.logout();
    } catch (e) {
      /* local sign-out regardless */
    }
    A.token = null;
    A.user = null;
    shellMounted = false;
    toast("You have been signed out.");
    route();
  }

  async function loadBrand() {
    try {
      const s = await authed(API.settings);
      A.storeName = s.storeName;
      A.logoImage = s.logoKey ? s.logoImage : null;
    } catch (e) {
      /* keep defaults */
    }
  }

  // ---------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------
  let routeSeq = 0;
  let listCtl = null;

  function route() {
    closeDropdowns();
    closeSidebar();
    if (!A.user) return renderLogin();
    if (A.user.role !== "admin") return renderNotAuthorized();
    const h = parseHash();
    const [a, b] = h.parts;
    if (!a || a === "login") {
      location.replace("#/books");
      return;
    }
    ensureShell();
    renderSidebar(a);
    if (listCtl && listCtl.section === a && !b) {
      listCtl.update(h.query);
      return;
    }
    listCtl = null;
    const seq = ++routeSeq;
    window.scrollTo(0, 0);
    if (a === "books" && !b) return listPage(BOOKS_LIST);
    if (a === "books" && b) return viewBookEditor(seq, b);
    if (a === "categories") return listPage(namedList("categories"));
    if (a === "authors") return listPage(namedList("authors"));
    if (a === "orders" && !b) return listPage(ORDERS_LIST);
    if (a === "orders" && b) return viewOrder(seq, b);
    if (a === "customers" && !b) return listPage(CUSTOMERS_LIST);
    if (a === "customers" && b) return viewCustomer(seq, b);
    if (a === "reviews") return listPage(REVIEWS_LIST);
    if (a === "settings") return viewSettings(seq);
    if (a === "audit-log") return listPage(AUDIT_LIST);
    setContent(emptyState({ icon: "compass", title: "Page not found", action: '<a class="btn btn-primary" href="#/books">Go to books</a>' }), "Not found");
  }
  const stale = (seq) => seq !== routeSeq;

  // ---------------------------------------------------------------------
  // Generic list page (filters live in the URL)
  // ---------------------------------------------------------------------
  let listSeq = 0;

  function listPage(cfg) {
    const q = parseHash().query;
    setContent(
      '<div class="page-header"><div><h1>' + esc(cfg.title) + "</h1><p>" + esc(cfg.subtitle) + "</p></div>" + (cfg.actions || "") + "</div>" +
        '<section class="card table-card"><form class="toolbar" data-list-filters novalidate>' + cfg.filters(q) + '</form><div id="list-body" aria-live="polite"></div></section>',
      cfg.title
    );
    listCtl = { section: cfg.section, update: (qq) => loadList(cfg, qq), cfg };
    loadList(cfg, q);
  }

  function syncListFilters(q) {
    document.querySelectorAll("[data-filter]").forEach((el) => {
      if (document.activeElement !== el) el.value = q[el.dataset.filter] || "";
    });
  }

  async function loadList(cfg, q) {
    const s = ++listSeq;
    const body = document.getElementById("list-body");
    if (!body) return;
    syncListFilters(q);
    body.innerHTML = loadingState();
    let page;
    try {
      page = await cfg.load(q);
    } catch (e) {
      if (s !== listSeq) return;
      body.innerHTML = errorState(e, 'data-action="retry"');
      return;
    }
    if (s !== listSeq) return;
    if (!page.total) {
      const filtered = Object.keys(q).some((k) => k !== "page" && q[k]);
      body.innerHTML = filtered ? emptyState({ icon: "search", title: "No results", text: "Nothing matches these filters.", action: '<a class="btn btn-outline" href="#/' + cfg.section + '">Clear filters</a>' }) : emptyState(cfg.empty);
      return;
    }
    const from = (page.page - 1) * page.pageSize + 1;
    const to = from + page.items.length - 1;
    body.innerHTML = '<div class="table-wrap">' + cfg.table(page) + '</div><div class="table-foot"><span>Showing ' + from + "–" + to + " of " + page.total + "</span>" + pagination(page, cfg.section, q) + "</div>";
  }

  function pagination(page, section, q) {
    const pages = Math.ceil(page.total / page.pageSize);
    if (pages <= 1) return "";
    const href = (n) => "#/" + section + qs(Object.assign({}, q, { page: n > 1 ? n : undefined }));
    let h = '<nav class="pagination" aria-label="Pagination">';
    h += page.page > 1 ? '<a class="btn btn-sm" href="' + href(page.page - 1) + '" aria-label="Previous page">' + icon("chevron-left") + "</a>" : "";
    for (let i = 1; i <= pages; i++) h += '<a class="btn btn-sm" href="' + href(i) + '"' + (i === page.page ? ' aria-current="page"' : "") + ">" + i + "</a>";
    h += page.page < pages ? '<a class="btn btn-sm" href="' + href(page.page + 1) + '" aria-label="Next page">' + icon("chevron-right") + "</a>" : "";
    return h + "</nav>";
  }

  function updateQuery(patch) {
    const h = parseHash();
    const q = Object.assign({}, h.query, patch);
    if (!("page" in patch)) delete q.page;
    location.hash = "#/" + h.parts[0] + qs(q);
  }

  const searchFilter = (label, placeholder, q) => '<div class="input-group">' + icon("search") + '<label class="sr-only" for="f-q">' + label + '</label><input class="input" id="f-q" type="search" data-filter="q" placeholder="' + placeholder + '" value="' + esc(q.q || "") + '" autocomplete="off"></div>';
  const selectFilter = (name, label, options, q) =>
    '<div class="toolbar-field"><label for="f-' + name + '">' + label + '</label><select class="select" id="f-' + name + '" data-filter="' + name + '">' + options.map((o) => '<option value="' + o[0] + '"' + ((q[name] || "") === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select></div>";

  const BOOK_STATUS = { draft: ["", "Draft"], published: ["badge-success", "Published"], archived: ["badge-warning", "Archived"] };
  const bookBadge = (s) => '<span class="badge ' + BOOK_STATUS[s][0] + '">' + BOOK_STATUS[s][1] + "</span>";
  const ORDER_STATUS = { paid: ["badge-success", "Paid"], pending: ["badge-warning", "Pending"], failed: ["badge-error", "Failed"], expired: ["", "Expired"], refunded: ["badge-info", "Refunded"] };
  const orderBadge = (o) => '<span class="badge ' + ORDER_STATUS[o.status][0] + '">' + ORDER_STATUS[o.status][1] + "</span>" + (o.refundStatus === "processing" ? ' <span class="badge badge-warning">' + icon("clock") + "Refund processing</span>" : "");

  // ---------------------------------------------------------------------
  // Books
  // ---------------------------------------------------------------------
  const BOOKS_LIST = {
    section: "books",
    title: "Books",
    subtitle: "Create, edit, publish and archive the books in your store.",
    actions: '<a class="btn btn-primary" href="#/books/new">' + icon("plus") + "New book</a>",
    filters: (q) => searchFilter("Search books", "Search by title, slug or author", q) + selectFilter("status", "Status", [["", "All statuses"], ["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]], q),
    load: (q) => authed((t) => API.books(t, q)),
    empty: { icon: "book", title: "No books yet", text: "Create your first book to start selling.", action: '<a class="btn btn-primary" href="#/books/new">' + icon("plus") + "New book</a>" },
    table: (page) =>
      '<table class="table responsive"><thead><tr><th>Book</th><th>Authors</th><th>Category</th><th class="num">Price</th><th>Status</th><th>Featured</th><th>Files</th><th>Updated</th></tr></thead><tbody>' +
      page.items
        .map(
          (b) =>
            '<tr class="clickable" data-href="#/books/' + b.id + '">' +
            '<td class="td-main"><div class="cell-book"><span class="thumb">' + cover(b, { alt: "" }) + '</span><div><a href="#/books/' + b.id + '">' + esc(b.title) + '</a><span class="cell-sub">/' + esc(b.slug) + "</span></div></div></td>" +
            '<td data-label="Authors">' + esc(b.authors.map((a) => a.name).join(", ")) + "</td>" +
            '<td data-label="Category">' + esc(b.category) + "</td>" +
            '<td class="num" data-label="Price">' + formatINR(b.price) + "</td>" +
            '<td data-label="Status">' + bookBadge(b.status) + "</td>" +
            '<td data-label="Featured">' + (b.featured ? '<span class="badge badge-accent">' + icon("star") + "Featured</span>" : '<span class="muted">—</span>') + "</td>" +
            '<td data-label="Files">' + fileFlags(b) + "</td>" +
            '<td data-label="Updated">' + formatDate(b.updatedAt) + "</td></tr>"
        )
        .join("") +
      "</tbody></table>",
  };

  function fileFlags(b) {
    const f = (ok, label, ic) => '<span class="file-flag' + (ok ? " ok" : "") + '" title="' + label + (ok ? " uploaded" : " missing") + '" aria-label="' + label + (ok ? " uploaded" : " missing") + '">' + icon(ic) + "</span>";
    return '<span class="file-flags">' + f(b.pdfKey, "Full PDF", "file") + f(b.sampleKey, "Sample PDF", "book-open") + f(b.coverKey, "Cover", "image") + "</span>";
  }

  let EDIT = null;

  async function viewBookEditor(seq, id) {
    setContent(loadingState("Loading…"), id === "new" ? "New book" : "Edit book");
    let book = null;
    let authors;
    let categories;
    try {
      [authors, categories] = await Promise.all([authed(API.authors.all), authed(API.categories.all)]);
      if (id !== "new") book = await authed((t) => API.book(t, id));
    } catch (e) {
      if (stale(seq)) return;
      setContent(e.status === 404 ? emptyState({ icon: "book", title: "Book not found", action: '<a class="btn btn-primary" href="#/books">Back to books</a>' }) : errorState(e, 'data-action="retry"'), "Book");
      return;
    }
    if (stale(seq)) return;
    EDIT = { book, authors, categories };
    const b = book || { title: "", slug: "", authorIds: [], categoryId: "", description: "", language: "English", pages: "", price: "", taxCategory: "standard", featured: false };
    setContent(
      '<a class="back-link" href="#/books">' + icon("chevron-left") + "Books</a>" +
        '<div class="page-header"><div><h1 id="ed-title">' + esc(book ? book.title : "New book") + "</h1><p>" + (book ? "/books/" + esc(book.slug) : "Fill in the details and save as a draft. You can upload files after saving.") + '</p></div><div id="ed-badge">' + (book ? bookBadge(book.status) : "") + "</div></div>" +
        '<div class="editor">' +
        '<form class="card card-body" data-form="book" novalidate>' +
        '<h2 class="card-title">Details</h2><div class="form-grid">' +
        '<div class="field span-2"><label class="label" for="bk-title">Title</label><input class="input" id="bk-title" name="title" maxlength="150" value="' + esc(b.title) + '" required></div>' +
        '<div class="field span-2"><label class="label" for="bk-slug">Slug</label><input class="input mono" id="bk-slug" name="slug" value="' + esc(b.slug) + '"' + (book ? ' data-touched="1"' : "") + '><span class="hint">Used in the store URL: /books/<span id="slug-preview">' + esc(b.slug || "your-book") + "</span></span></div>" +
        '<div class="field span-2" data-field="authorIds"><span class="label" id="bk-authors-label">Authors</span><div class="checklist" role="group" aria-labelledby="bk-authors-label">' +
        (authors.length ? authors.map((a) => '<label class="check"><input type="checkbox" name="authorIds" value="' + a.id + '"' + (b.authorIds.includes(a.id) ? " checked" : "") + ">" + esc(a.name) + "</label>").join("") : '<p class="muted small" style="margin:6px 0">No authors yet. <a href="#/authors">Add an author</a> first.</p>') +
        "</div></div>" +
        '<div class="field"><label class="label" for="bk-cat">Category</label><select class="select" id="bk-cat" name="categoryId"><option value="">Choose a category</option>' + categories.map((c) => '<option value="' + c.id + '"' + (b.categoryId === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>").join("") + "</select></div>" +
        '<div class="field"><label class="label" for="bk-lang">Language</label><select class="select" id="bk-lang" name="language">' + LANGUAGES.map((l) => "<option" + (b.language === l ? " selected" : "") + ">" + l + "</option>").join("") + "</select></div>" +
        '<div class="field span-2"><label class="label" for="bk-desc">Description</label><textarea class="textarea" id="bk-desc" name="description" rows="5">' + esc(b.description) + "</textarea></div>" +
        '<div class="field"><label class="label" for="bk-pages">Page count</label><input class="input" id="bk-pages" name="pages" type="number" min="1" step="1" inputmode="numeric" value="' + esc(b.pages) + '"></div>' +
        '<div class="field"><label class="label" for="bk-price">Price (₹)</label><input class="input" id="bk-price" name="price" type="number" min="1" step="0.01" inputmode="decimal" value="' + (b.price ? (b.price / 100).toFixed(2) : "") + '"' + (book ? ' aria-describedby="price-hint"' : "") + ">" + (book ? '<span class="hint" id="price-hint">Price changes apply to new orders only. Past orders keep the price that was paid.</span>' : "") + "</div>" +
        '<div class="field"><label class="label" for="bk-tax">Tax category</label><select class="select" id="bk-tax" name="taxCategory">' + Object.keys(TAX_CATEGORIES).map((k) => '<option value="' + k + '"' + (b.taxCategory === k ? " selected" : "") + ">" + esc(TAX_CATEGORIES[k]) + "</option>").join("") + "</select></div>" +
        '<div class="field" style="justify-content:flex-end"><label class="switch"><input type="checkbox" name="featured"' + (b.featured ? " checked" : "") + '><span>Featured on the home page</span></label></div>' +
        "</div>" +
        '<div class="form-actions">' + (book ? "" : '<a class="btn btn-ghost" href="#/books">Cancel</a>') + '<button type="submit" class="btn btn-primary">' + (book ? "Save changes" : "Save as draft") + "</button></div>" +
        "</form>" +
        '<div class="editor-side" id="editor-side"></div>' +
        "</div>",
      book ? "Edit book" : "New book"
    );
    renderEditorSide();
  }

  function renderEditorSide() {
    const side = document.getElementById("editor-side");
    if (!side) return;
    const b = EDIT.book;
    if (!b) {
      side.innerHTML = '<section class="card card-body"><h2 class="card-title">Files and publishing</h2><p class="muted" style="margin:0">Save the book as a draft first. Then you can upload the full PDF, the sample PDF and the cover image, and publish it to the store.</p></section>';
      return;
    }
    const desc = {
      draft: "Drafts are not visible in the store." + (b.filesComplete ? " All files are uploaded, so this book is ready to publish." : " Upload the full PDF, sample PDF and cover image before publishing."),
      published: "Visible in the store since " + formatDate(b.publishedAt) + ".",
      archived: "Hidden from the store. " + (b.ownersCount ? b.ownersCount + " buyer" + (b.ownersCount === 1 ? " who owns" : "s who own") + " this book can still download it." : "Buyers who own this book can still download it."),
    }[b.status];
    let actions = "";
    if (b.status === "draft")
      actions = '<button type="button" class="btn btn-primary" data-action="book-status" data-status="publish"' + (b.filesComplete ? "" : " disabled") + ">" + icon("send") + "Publish</button>" + '<button type="button" class="btn btn-outline" data-action="book-status" data-status="archive">' + icon("archive") + "Archive</button>";
    if (b.status === "published") actions = '<button type="button" class="btn btn-outline" data-action="book-status" data-status="unpublish">' + icon("undo") + "Unpublish</button>" + '<button type="button" class="btn btn-outline" data-action="book-status" data-status="archive">' + icon("archive") + "Archive</button>";
    if (b.status === "archived") actions = '<button type="button" class="btn btn-primary" data-action="book-status" data-status="publish"' + (b.filesComplete ? "" : " disabled") + ">" + icon("send") + "Publish again</button>";
    side.innerHTML =
      '<section class="card card-body" aria-labelledby="st-title"><h2 class="card-title" id="st-title">Status</h2><div class="status-line">' + bookBadge(b.status) + '<span class="muted small">Updated ' + formatDateTime(b.updatedAt) + '</span></div><p class="muted small" style="margin:0">' + esc(desc) + '</p><div class="status-actions">' + actions + "</div>" +
      (b.status === "published" ? '<a class="btn-link small" style="display:inline-block;margin-top:12px" href="../store/index.html#/books/' + b.slug + '" target="_blank" rel="noopener">View in store ↗</a>' : "") +
      "</section>" +
      '<section class="card card-body" aria-labelledby="files-title"><h2 class="card-title" id="files-title">Files</h2><p class="muted small">Files upload straight from your browser to Cloudflare R2 using a short-lived signed URL.</p>' +
      uploaderHTML(b, "pdf") + uploaderHTML(b, "sample") + uploaderHTML(b, "cover") +
      "</section>";
    const title = document.getElementById("ed-title");
    if (title) title.textContent = b.title;
    const badge = document.getElementById("ed-badge");
    if (badge) badge.innerHTML = bookBadge(b.status);
  }

  const KIND_META = {
    pdf: { icon: "file", hint: "PDF only · up to 200 MB · private, downloads use signed URLs" },
    sample: { icon: "book-open", hint: "PDF only · up to 20 MB · public CDN" },
    cover: { icon: "image", hint: "JPEG, PNG or WebP · up to 5 MB · public CDN" },
    logo: { icon: "image", hint: "JPEG, PNG or WebP · up to 2 MB" },
  };

  function uploaderHTML(b, kind) {
    const L = FILE_LIMITS[kind];
    const key = b[kind + "Key"];
    let current;
    if (!key) current = '<span class="muted">No file uploaded yet</span>';
    else if (kind === "cover") current = '<span class="thumb">' + cover(b, { alt: "Current cover" }) + '</span><span class="mono">' + esc(key) + "</span>";
    else current = icon("check-circle") + '<span><span class="mono">' + esc(key) + "</span><br><span class=\"muted\">" + formatBytes(kind === "pdf" ? b.fileSize : b.sampleSize) + "</span></span>";
    return (
      '<div class="uploader" data-uploader="' + kind + '">' +
      '<div class="uploader-head"><span class="uploader-icon">' + icon(KIND_META[kind].icon) + "</span><div><strong>" + L.label + '</strong><span class="hint">' + KIND_META[kind].hint + "</span></div></div>" +
      '<div class="uploader-current">' + current + "</div>" +
      '<div class="uploader-progress" hidden><div class="progress" role="progressbar" aria-label="Upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span style="width:0%"></span></div><p aria-live="polite"></p></div>' +
      '<div class="uploader-error" role="alert"></div>' +
      '<button type="button" class="btn btn-outline btn-sm" data-action="pick-file" data-kind="' + kind + '">' + icon("upload") + (key ? "Replace" : "Upload") + "</button>" +
      '<input type="file" hidden accept="' + L.accept + '" data-file-input="' + kind + '">' +
      "</div>"
    );
  }

  function simulatePut(size, onProgress) {
    const duration = Math.min(4000, Math.max(1000, 900 + (size / (5 * MB)) * 1000));
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = setInterval(() => {
        const pct = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
        onProgress(pct);
        if (pct >= 100) {
          clearInterval(tick);
          resolve();
        }
      }, 100);
    });
  }

  async function uploadFile(kind, file, box, onDone) {
    const L = FILE_LIMITS[kind];
    const err = box.querySelector(".uploader-error");
    const prog = box.querySelector(".uploader-progress");
    const bar = prog.querySelector(".progress > span");
    const barWrap = prog.querySelector(".progress");
    const text = prog.querySelector("p");
    const btn = box.querySelector('[data-action="pick-file"]');
    err.textContent = "";
    if (!L.types.includes(file.type)) {
      err.textContent = kind === "pdf" || kind === "sample" ? "Only PDF files (application/pdf) are allowed." : "Only JPEG, PNG or WebP images are allowed.";
      return;
    }
    if (file.size > L.max) {
      err.textContent = "This file is " + formatBytes(file.size) + ". The maximum size is " + L.max / MB + " MB.";
      return;
    }
    btn.disabled = true;
    prog.hidden = false;
    bar.style.width = "0%";
    text.textContent = "Requesting a signed upload URL…";
    try {
      const signed = await authed((t) => API.signUpload(t, { bookId: EDIT && EDIT.book ? EDIT.book.id : null, kind, contentType: file.type, size: file.size }));
      await simulatePut(file.size, (pct) => {
        bar.style.width = pct + "%";
        barWrap.setAttribute("aria-valuenow", String(pct));
        text.textContent = "Uploading directly to Cloudflare R2 (" + signed.bucket + ")… " + pct + "%";
      });
      await API.putToR2(signed.key);
      text.textContent = "Finishing upload…";
      const preview = kind === "cover" || kind === "logo" ? await U.imageToDataUrl(file, kind === "logo" ? 240 : 360) : null;
      const res = await authed((t) => API.confirmUpload(t, { kind, key: signed.key, preview }));
      toast(L.label + " uploaded.");
      onDone(res);
    } catch (e) {
      btn.disabled = false;
      prog.hidden = true;
      err.textContent = e.message;
    }
  }

  const field = (form, name) => form.elements.namedItem(name);

  async function saveBook(form) {
    const btn = form.querySelector('[type="submit"]');
    const v = (n) => field(form, n).value;
    const data = {
      title: v("title"),
      slug: v("slug"),
      authorIds: Array.from(form.querySelectorAll('input[name="authorIds"]:checked')).map((i) => i.value),
      categoryId: v("categoryId"),
      description: v("description"),
      language: v("language"),
      pages: v("pages") === "" ? "" : Number(v("pages")),
      price: v("price"),
      taxCategory: v("taxCategory"),
      featured: field(form, "featured").checked,
    };
    setBusy(btn, true, "Saving…");
    try {
      if (EDIT.book) {
        EDIT.book = await authed((t) => API.updateBook(t, EDIT.book.id, data));
        setBusy(btn, false);
        showFieldErrors(form, null);
        field(form, "slug").value = EDIT.book.slug;
        document.querySelector(".page-header p").textContent = "/books/" + EDIT.book.slug;
        renderEditorSide();
        toast("Changes saved.");
      } else {
        const created = await authed((t) => API.createBook(t, data));
        toast("Draft created. Now upload the files.");
        location.replace("#/books/" + created.id);
      }
    } catch (e) {
      setBusy(btn, false);
      if (e.details) showFieldErrors(form, e.details);
      else toast(e.message, "error");
    }
  }

  async function changeBookStatus(action, btn) {
    const b = EDIT.book;
    const confirmMsgs = {
      unpublish: ["Unpublish this book?", "“" + esc(b.title) + "” will be hidden from the store and saved as a draft. Buyers who own it keep access."],
      archive: ["Archive this book?", "“" + esc(b.title) + "” will be removed from the store. Buyers who already own it can still download it from their library."],
    };
    if (confirmMsgs[action]) {
      const ok = await confirmDialog({ title: confirmMsgs[action][0], message: confirmMsgs[action][1], confirmText: action === "archive" ? "Archive" : "Unpublish" });
      if (!ok) return;
    }
    setBusy(btn, true, "Updating…");
    try {
      EDIT.book = await authed((t) => API.setBookStatus(t, b.id, action));
      renderEditorSide();
      toast({ publish: "Book published. It's now visible in the store.", unpublish: "Book unpublished.", archive: "Book archived." }[action]);
    } catch (e) {
      setBusy(btn, false);
      toast(e.message, "error");
    }
  }

  // ---------------------------------------------------------------------
  // Categories & authors
  // ---------------------------------------------------------------------
  function namedList(kind) {
    const isAuthor = kind === "authors";
    const noun = isAuthor ? "author" : "category";
    return {
      section: kind,
      title: isAuthor ? "Authors" : "Categories",
      subtitle: isAuthor ? "Authors you can assign to books." : "Categories shown in the store for browsing and filtering.",
      actions: '<button type="button" class="btn btn-primary" data-action="named-new" data-kind="' + kind + '">' + icon("plus") + "New " + noun + "</button>",
      filters: (q) => searchFilter("Search " + kind, "Search by name", q),
      load: (q) => authed((t) => API[kind].list(t, q)),
      empty: { icon: isAuthor ? "pen" : "tag", title: "No " + kind + " yet", text: "Create one to use it on your books.", action: '<button type="button" class="btn btn-primary" data-action="named-new" data-kind="' + kind + '">' + icon("plus") + "New " + noun + "</button>" },
      table: (page) =>
        '<table class="table responsive"><thead><tr><th>Name</th><th>Slug</th>' + (isAuthor ? "<th>Bio</th>" : "") + '<th class="num">Books</th><th class="num"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
        page.items
          .map(
            (x) =>
              '<tr><td class="td-main"><strong>' + esc(x.name) + '</strong></td><td data-label="Slug"><span class="mono">' + esc(x.slug) + "</span></td>" +
              (isAuthor ? '<td data-label="Bio"><span class="muted small">' + esc((x.bio || "—").slice(0, 80)) + ((x.bio || "").length > 80 ? "…" : "") + "</span></td>" : "") +
              '<td class="num" data-label="Books">' + x.bookCount + "</td>" +
              '<td class="actions-cell"><button type="button" class="btn btn-ghost btn-sm" data-action="named-edit" data-kind="' + kind + '" data-id="' + x.id + '">' + icon("edit") + 'Edit</button><button type="button" class="btn btn-ghost btn-sm" data-action="named-delete" data-kind="' + kind + '" data-id="' + x.id + '" data-name="' + esc(x.name) + '" data-count="' + x.bookCount + '">' + icon("trash") + "Delete</button></td></tr>"
          )
          .join("") +
        "</tbody></table>",
    };
  }

  async function openNamedForm(kind, id) {
    const isAuthor = kind === "authors";
    const noun = isAuthor ? "author" : "category";
    let rec = { name: "", slug: "", bio: "" };
    if (id) {
      const all = await authed(API[kind].all);
      rec = all.find((x) => x.id === id) || rec;
    }
    const m = modal({
      title: (id ? "Edit " : "New ") + noun,
      body:
        '<form data-form="named" novalidate id="named-form">' +
        '<div class="field"><label class="label" for="nm-name">Name</label><input class="input" id="nm-name" name="name" value="' + esc(rec.name) + '" autofocus></div>' +
        '<div class="field"><label class="label" for="nm-slug">Slug</label><input class="input mono" id="nm-slug" name="slug" value="' + esc(rec.slug) + '"' + (id ? ' data-touched="1"' : "") + '><span class="hint">Used in store URLs and filters.</span></div>' +
        (isAuthor ? '<div class="field"><label class="label" for="nm-bio">Bio</label><textarea class="textarea" id="nm-bio" name="bio" maxlength="600">' + esc(rec.bio || "") + "</textarea></div>" : "") +
        "</form>",
      footer: '<button type="button" class="btn btn-ghost" data-modal-close>Cancel</button><button type="submit" form="named-form" class="btn btn-primary">' + (id ? "Save changes" : "Create " + noun) + "</button>",
    });
    const form = m.el.querySelector("form");
    const nameEl = field(form, "name");
    const slugEl = field(form, "slug");
    const bioEl = field(form, "bio");
    nameEl.addEventListener("input", () => {
      if (!slugEl.dataset.touched) slugEl.value = slugify(nameEl.value);
    });
    slugEl.addEventListener("input", () => (slugEl.dataset.touched = "1"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = m.el.querySelector('[type="submit"]');
      const data = { name: nameEl.value, slug: slugEl.value, bio: bioEl ? bioEl.value : undefined };
      setBusy(btn, true, "Saving…");
      try {
        if (id) await authed((t) => API[kind].update(t, id, data));
        else await authed((t) => API[kind].create(t, data));
        m.close();
        toast(noun.charAt(0).toUpperCase() + noun.slice(1) + (id ? " updated." : " created."));
        if (listCtl) listCtl.update(parseHash().query);
      } catch (err) {
        setBusy(btn, false);
        if (err.details) showFieldErrors(form, err.details);
        else toast(err.message, "error");
      }
    });
  }

  async function deleteNamed(kind, id, name, count) {
    const noun = kind === "authors" ? "author" : "category";
    if (Number(count) > 0) {
      modal({
        title: "Can't delete this " + noun,
        body: '<div class="alert alert-warning">' + icon("alert") + "<p><strong>“" + esc(name) + "” is used by " + count + " book" + (count > 1 ? "s" : "") + ".</strong>Change those books to a different " + noun + " before deleting it.</p></div>",
        footer: '<button type="button" class="btn btn-primary" data-modal-close>OK</button>',
      });
      return;
    }
    const ok = await confirmDialog({ title: "Delete " + noun + "?", message: "“" + esc(name) + "” will be permanently deleted.", confirmText: "Delete", danger: true });
    if (!ok) return;
    try {
      await authed((t) => API[kind].remove(t, id));
      toast(noun.charAt(0).toUpperCase() + noun.slice(1) + " deleted.");
      if (listCtl) listCtl.update(parseHash().query);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  // ---------------------------------------------------------------------
  // Orders & refunds
  // ---------------------------------------------------------------------
  const ORDERS_LIST = {
    section: "orders",
    title: "Orders",
    subtitle: "All orders with their payment status.",
    filters: (q) =>
      searchFilter("Search orders", "Order ID, Razorpay order ID or buyer email", q) +
      selectFilter("status", "Status", [["", "All statuses"], ["paid", "Paid"], ["pending", "Pending"], ["failed", "Failed"], ["expired", "Expired"], ["refunded", "Refunded"]], q) +
      '<div class="toolbar-field"><label for="f-from">From</label><input class="input" type="date" id="f-from" data-filter="from" value="' + esc(q.from || "") + '"></div>' +
      '<div class="toolbar-field"><label for="f-to">To</label><input class="input" type="date" id="f-to" data-filter="to" value="' + esc(q.to || "") + '"></div>',
    load: (q) => authed((t) => API.orders(t, q)),
    empty: { icon: "receipt", title: "No orders yet", text: "Orders appear here when buyers check out." },
    table: (page) =>
      '<table class="table responsive"><thead><tr><th>Order</th><th>Date</th><th>Buyer</th><th class="num">Items</th><th class="num">Total</th><th>Status</th></tr></thead><tbody>' +
      page.items
        .map(
          (o) =>
            '<tr class="clickable" data-href="#/orders/' + o.id + '"><td class="td-main"><a href="#/orders/' + o.id + '"><strong>' + esc(o.id) + '</strong></a><span class="cell-sub mono">' + esc(o.razorpayOrderId) + "</span></td>" +
            '<td data-label="Date">' + formatDateTime(o.createdAt) + "</td>" +
            '<td data-label="Buyer"><span>' + esc(o.buyerName) + '<span class="cell-sub">' + esc(o.buyerEmail) + "</span></span></td>" +
            '<td class="num" data-label="Items">' + o.items.length + "</td>" +
            '<td class="num" data-label="Total">' + formatINR(o.total) + "</td>" +
            '<td data-label="Status">' + orderBadge(o) + "</td></tr>"
        )
        .join("") +
      "</tbody></table>",
  };

  async function viewOrder(seq, id) {
    setContent(loadingState("Loading order…"), "Order " + id);
    let o;
    try {
      o = await authed((t) => API.order(t, id));
    } catch (e) {
      if (stale(seq)) return;
      setContent(e.status === 404 ? emptyState({ icon: "receipt", title: "Order not found", action: '<a class="btn btn-primary" href="#/orders">Back to orders</a>' }) : errorState(e, 'data-action="retry"'), "Order");
      return;
    }
    if (stale(seq)) return;
    renderOrder(o);
    if (o.refundStatus === "processing") pollRefund(seq, id);
  }

  async function pollRefund(seq, id) {
    while (!stale(seq)) {
      await new Promise((r) => setTimeout(r, 1500));
      if (stale(seq)) return;
      try {
        const o = await authed((t) => API.order(t, id));
        if (stale(seq)) return;
        if (o.status === "refunded") {
          renderOrder(o);
          toast("Razorpay confirmed the refund. Library access has been revoked.");
          return;
        }
      } catch (e) {
        return;
      }
    }
  }

  function renderOrder(o) {
    const title = (id) => (o.items.find((i) => i.bookId === id) || {}).title || id;
    const wh = o.webhooks.length
      ? '<ol class="timeline">' +
        o.webhooks
          .map(
            (w) =>
              '<li><span class="timeline-dot ' + (w.type === "payment.failed" ? "fail" : w.type === "refund.processed" ? "info" : "") + '">' + icon(w.type === "payment.failed" ? "x" : "check") + "</span>" +
              '<div class="row-between"><strong class="mono">' + esc(w.type) + '</strong><span class="muted small">Processed ' + formatDateTime(w.processedAt) + "</span></div>" +
              '<div class="small muted">Event ID <span class="mono">' + esc(w.eventId) + "</span></div>" +
              '<ul class="deliveries">' +
              w.deliveries.map((d) => "<li>" + icon("shield") + "Signature verified · received " + formatDateTime(d.receivedAt) + " · " + (d.result === "duplicate_ignored" ? '<span class="badge">Duplicate, ignored</span>' : '<span class="badge badge-success">Processed</span>') + "</li>").join("") +
              "</ul></li>"
          )
          .join("") +
        "</ol>"
      : '<p class="muted" style="margin:0">No webhook events received yet.</p>';
    const refundCard =
      o.status === "paid" && o.refundStatus !== "processing"
        ? '<section class="card card-body"><h2 class="card-title">Refund</h2><p class="muted small">Refund the full amount of <strong>' + formatINR(o.total) + "</strong> to the buyer's original payment method through Razorpay. When Razorpay confirms the refund, the books from this order are removed from the buyer's library.</p>" + '<button type="button" class="btn btn-danger-outline btn-block" data-action="refund" data-id="' + o.id + '">' + icon("undo") + "Issue full refund</button></section>"
        : o.refundStatus === "processing"
          ? '<section class="card card-body"><h2 class="card-title">Refund</h2><div class="alert alert-warning">' + '<span class="spinner" aria-hidden="true"></span>' + "<p><strong>Refund requested</strong>Waiting for Razorpay to confirm with a <span class=\"mono\">refund.processed</span> webhook. Library access stays active until then.</p></div></section>"
          : "";
    setContent(
      '<a class="back-link" href="#/orders">' + icon("chevron-left") + "Orders</a>" +
        '<div class="page-header"><div><h1>Order ' + esc(o.id) + "</h1><p>Created " + formatDateTime(o.createdAt) + "</p></div><div>" + orderBadge(o) + "</div></div>" +
        '<div class="detail-grid"><div>' +
        '<section class="card"><div class="card-body" style="padding-bottom:0"><h2 class="card-title">Items</h2></div><div class="table-wrap"><table class="table responsive"><thead><tr><th>Book</th><th class="num">Price paid</th><th class="num">GST</th></tr></thead><tbody>' +
        o.items.map((i) => '<tr><td class="td-main"><a href="#/books/' + i.bookId + '">' + esc(i.title) + '</a></td><td class="num" data-label="Price paid">' + formatINR(i.price) + '</td><td class="num" data-label="GST">' + formatINR(i.tax) + "</td></tr>").join("") +
        '</tbody></table></div><div class="totals"><div class="totals-row"><span>Subtotal</span><span>' + formatINR(o.subtotal) + '</span></div><div class="totals-row"><span>GST</span><span>' + formatINR(o.tax) + '</span></div><div class="totals-row total"><span>Total (' + o.currency + ")</span><span>" + formatINR(o.total) + "</span></div></div></section>" +
        '<section class="card card-body"><h2 class="card-title">Webhook history</h2>' + wh + "</section>" +
        "</div><div>" +
        refundCard +
        '<section class="card card-body"><h2 class="card-title">Payment</h2><dl class="kv">' +
        "<div><dt>Status</dt><dd>" + orderBadge(o) + "</dd></div>" +
        '<div><dt>Razorpay order ID</dt><dd class="mono">' + esc(o.razorpayOrderId) + "</dd></div>" +
        '<div><dt>Razorpay payment ID</dt><dd class="mono">' + esc(o.razorpayPaymentId || "—") + "</dd></div>" +
        (o.refundId ? '<div><dt>Razorpay refund ID</dt><dd class="mono">' + esc(o.refundId) + "</dd></div>" : "") +
        (o.invoiceNumber ? "<div><dt>Invoice</dt><dd>" + esc(o.invoiceNumber) + "</dd></div>" : "") +
        (o.paidAt ? "<div><dt>Paid</dt><dd>" + formatDateTime(o.paidAt) + "</dd></div>" : "") +
        (o.refundedAt ? "<div><dt>Refunded</dt><dd>" + formatDateTime(o.refundedAt) + "</dd></div>" : "") +
        (o.failureReason ? "<div><dt>Failure reason</dt><dd>" + esc(o.failureReason) + "</dd></div>" : "") +
        (o.status === "expired" ? "<div><dt>Expired</dt><dd>No payment within 30 minutes</dd></div>" : "") +
        "</dl></section>" +
        '<section class="card card-body"><h2 class="card-title">Buyer</h2><div class="cell-user">' + avatar({ name: o.buyer.name, avatarColor: "#1f3a2d" }) + "<div><strong>" + esc(o.buyer.name) + '</strong><span class="cell-sub">' + esc(o.buyer.email) + "</span></div></div>" + (o.buyer.isBlocked ? '<p style="margin:10px 0 0"><span class="badge badge-error">Blocked</span></p>' : "") + '<a class="btn-link small" style="display:inline-block;margin-top:12px" href="#/customers/' + o.buyer.id + '">View customer</a></section>' +
        (o.entitlements.length
          ? '<section class="card card-body"><h2 class="card-title">Library access</h2><ul class="order-items" style="list-style:none;padding:0;margin:0">' +
            o.entitlements.map((e) => '<li class="row-between" style="padding:6px 0;border-bottom:1px solid var(--border)"><span>' + esc(title(e.bookId)) + '<span class="cell-sub">' + e.downloadCount + " of " + e.downloadLimit + " downloads used</span></span>" + (e.revokedAt ? '<span class="badge badge-error">Revoked</span>' : '<span class="badge badge-success">Active</span>') + "</li>").join("") +
            "</ul></section>"
          : "") +
        "</div></div>",
      "Order " + o.id
    );
  }

  async function refundOrder(id, btn) {
    const ok = await confirmDialog({ title: "Issue a full refund?", message: "The full amount will be refunded to the buyer through Razorpay. When the refund is confirmed, the buyer will lose access to the books in this order. This can't be undone.", confirmText: "Refund in full", danger: true });
    if (!ok) return;
    setBusy(btn, true, "Requesting refund…");
    try {
      const o = await authed((t) => API.refund(t, id));
      toast("Refund " + o.refundId + " requested from Razorpay.");
      const seq = ++routeSeq;
      const full = await authed((t) => API.order(t, id));
      renderOrder(full);
      pollRefund(seq, id);
    } catch (e) {
      setBusy(btn, false);
      toast(e.message, "error");
    }
  }

  // ---------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------
  const CUSTOMERS_LIST = {
    section: "customers",
    title: "Customers",
    subtitle: "Buyers, their purchases and download counts.",
    filters: (q) => searchFilter("Search customers", "Search by name or email", q) + selectFilter("status", "Status", [["", "All customers"], ["active", "Active"], ["blocked", "Blocked"]], q),
    load: (q) => authed((t) => API.customers(t, q)),
    empty: { icon: "users", title: "No customers yet", text: "Buyers appear here after they sign in to the store for the first time." },
    table: (page) =>
      '<table class="table responsive"><thead><tr><th>Customer</th><th>Joined</th><th class="num">Paid orders</th><th class="num">Books owned</th><th class="num">Downloads</th><th>Status</th><th class="num"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      page.items
        .map(
          (c) =>
            '<tr class="clickable" data-href="#/customers/' + c.id + '"><td class="td-main"><div class="cell-user">' + avatar(c) + '<div><a href="#/customers/' + c.id + '"><strong>' + esc(c.name) + '</strong></a><span class="cell-sub">' + esc(c.email) + "</span></div></div></td>" +
            '<td data-label="Joined">' + formatDate(c.createdAt) + "</td>" +
            '<td class="num" data-label="Paid orders">' + c.paidOrders + "</td>" +
            '<td class="num" data-label="Books owned">' + c.booksOwned + "</td>" +
            '<td class="num" data-label="Downloads">' + c.downloads + "</td>" +
            '<td data-label="Status">' + (c.isBlocked ? '<span class="badge badge-error">Blocked</span>' : '<span class="badge badge-success">Active</span>') + (c.deletionRequested ? ' <span class="badge badge-warning">Deletion requested</span>' : "") + "</td>" +
            '<td class="actions-cell">' + blockButton(c) + "</td></tr>"
        )
        .join("") +
      "</tbody></table>",
  };

  function blockButton(c, full) {
    return c.isBlocked
      ? '<button type="button" class="btn ' + (full ? "btn-outline" : "btn-ghost") + ' btn-sm" data-action="block" data-id="' + c.id + '" data-block="0" data-name="' + esc(c.name) + '">' + icon("undo") + "Unblock</button>"
      : '<button type="button" class="btn ' + (full ? "btn-danger-outline" : "btn-ghost") + ' btn-sm" data-action="block" data-id="' + c.id + '" data-block="1" data-name="' + esc(c.name) + '">' + icon("ban") + "Block</button>";
  }

  async function setBlocked(id, block, name, btn) {
    const ok = await confirmDialog(
      block
        ? { title: "Block " + esc(name) + "?", message: "They will be signed out and won't be able to sign in, use their library or download books until you unblock them.", confirmText: "Block customer", danger: true }
        : { title: "Unblock " + esc(name) + "?", message: "They will be able to sign in and use their library again.", confirmText: "Unblock" }
    );
    if (!ok) return;
    setBusy(btn, true, block ? "Blocking…" : "Unblocking…");
    try {
      await authed((t) => API.setCustomerBlocked(t, id, block));
      toast(name + (block ? " has been blocked." : " has been unblocked."));
      if (listCtl) listCtl.update(parseHash().query);
      else route();
    } catch (e) {
      setBusy(btn, false);
      toast(e.message, "error");
    }
  }

  async function viewCustomer(seq, id) {
    setContent(loadingState("Loading customer…"), "Customer");
    let c;
    try {
      c = await authed((t) => API.customer(t, id));
    } catch (e) {
      if (stale(seq)) return;
      setContent(e.status === 404 ? emptyState({ icon: "users", title: "Customer not found", action: '<a class="btn btn-primary" href="#/customers">Back to customers</a>' }) : errorState(e, 'data-action="retry"'), "Customer");
      return;
    }
    if (stale(seq)) return;
    const purchases = c.purchases.length
      ? '<div class="table-wrap"><table class="table responsive"><thead><tr><th>Book</th><th>Order</th><th>Purchased</th><th class="num">Downloads</th><th>Access</th></tr></thead><tbody>' +
        c.purchases.map((p) => '<tr><td class="td-main"><a href="#/books/' + p.bookId + '">' + esc(p.title) + '</a></td><td data-label="Order"><a href="#/orders/' + p.orderId + '">' + esc(p.orderId) + '</a></td><td data-label="Purchased">' + formatDate(p.purchasedAt) + '</td><td class="num" data-label="Downloads">' + p.downloadCount + " / " + p.downloadLimit + '</td><td data-label="Access">' + (p.revokedAt ? '<span class="badge badge-error">Revoked</span>' : '<span class="badge badge-success">Active</span>') + "</td></tr>").join("") +
        "</tbody></table></div>"
      : '<div class="card-body"><p class="muted" style="margin:0">No purchases yet.</p></div>';
    const downloads = c.downloads.length
      ? '<div class="table-wrap"><table class="table responsive"><thead><tr><th>Book</th><th>Time</th><th>IP address</th></tr></thead><tbody>' +
        c.downloads.slice(0, 20).map((d) => '<tr><td class="td-main">' + esc(d.title) + '</td><td data-label="Time">' + formatDateTime(d.createdAt) + '</td><td data-label="IP"><span class="mono">' + esc(d.ip) + "</span></td></tr>").join("") +
        "</tbody></table></div>"
      : '<div class="card-body"><p class="muted" style="margin:0">No downloads yet.</p></div>';
    setContent(
      '<a class="back-link" href="#/customers">' + icon("chevron-left") + "Customers</a>" +
        '<div class="page-header"><div class="cell-user">' + avatar(c, "avatar-lg") + '<div><h1 style="margin:0">' + esc(c.name) + "</h1><p>" + esc(c.email) + " · joined " + formatDate(c.createdAt) + "</p></div></div>" +
        '<div class="row">' + (c.isBlocked ? '<span class="badge badge-error">Blocked</span>' : '<span class="badge badge-success">Active</span>') + blockButton(c, true) + "</div></div>" +
        (c.deletionRequest ? '<div class="alert alert-warning" style="margin-bottom:20px">' + icon("alert") + "<p><strong>Account deletion requested on " + formatDate(c.deletionRequest.createdAt) + ".</strong>Order records must be kept for tax purposes.</p></div>" : "") +
        '<div class="stack"><section class="card"><div class="card-body" style="padding-bottom:0"><h2 class="card-title">Purchases (' + c.purchases.length + ")</h2></div>" + purchases + "</section>" +
        '<section class="card"><div class="card-body" style="padding-bottom:0"><h2 class="card-title">Downloads (' + c.downloads.length + ")</h2></div>" + downloads + "</section></div>",
      c.name
    );
  }

  // ---------------------------------------------------------------------
  // Reviews
  // ---------------------------------------------------------------------
  const REVIEWS_LIST = {
    section: "reviews",
    title: "Reviews",
    subtitle: "Hide or delete buyer reviews.",
    filters: (q) => searchFilter("Search reviews", "Search by book, buyer or text", q) + selectFilter("visibility", "Visibility", [["", "All reviews"], ["visible", "Visible"], ["hidden", "Hidden"]], q),
    load: (q) => authed((t) => API.reviews(t, q)),
    empty: { icon: "message", title: "No reviews yet", text: "Reviews from buyers who own a book appear here." },
    table: (page) =>
      '<table class="table responsive"><thead><tr><th>Review</th><th>Book</th><th>Buyer</th><th>Rating</th><th>Date</th><th>Status</th><th class="num"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      page.items
        .map(
          (r) =>
            '<tr><td class="td-main" style="max-width:320px">' + esc(r.comment) + "</td>" +
            '<td data-label="Book"><a href="#/books/' + r.bookId + '">' + esc(r.bookTitle) + "</a></td>" +
            '<td data-label="Buyer"><span>' + esc(r.userName) + '<span class="cell-sub">' + esc(r.userEmail) + "</span></span></td>" +
            '<td data-label="Rating">' + stars(r.rating) + "</td>" +
            '<td data-label="Date">' + formatDate(r.createdAt) + "</td>" +
            '<td data-label="Status">' + (r.isHidden ? '<span class="badge">' + icon("eye-off") + "Hidden</span>" : '<span class="badge badge-success">' + icon("eye") + "Visible</span>") + "</td>" +
            '<td class="actions-cell"><button type="button" class="btn btn-ghost btn-sm" data-action="review-hide" data-id="' + r.id + '" data-hidden="' + (r.isHidden ? "0" : "1") + '">' + icon(r.isHidden ? "eye" : "eye-off") + (r.isHidden ? "Unhide" : "Hide") + '</button><button type="button" class="btn btn-ghost btn-sm" data-action="review-delete" data-id="' + r.id + '">' + icon("trash") + "Delete</button></td></tr>"
        )
        .join("") +
      "</tbody></table>",
  };

  // ---------------------------------------------------------------------
  // Settings & email templates
  // ---------------------------------------------------------------------
  let SETTINGS = null;
  let activeTemplate = "welcome";

  async function viewSettings(seq) {
    setContent(loadingState("Loading settings…"), "Settings");
    try {
      SETTINGS = await authed(API.settings);
    } catch (e) {
      if (stale(seq)) return;
      setContent(errorState(e, 'data-action="retry"'), "Settings");
      return;
    }
    if (stale(seq)) return;
    const s = SETTINGS;
    setContent(
      '<div class="page-header"><div><h1>Settings</h1><p>Store details, tax, downloads and email templates.</p></div></div>' +
        '<div class="detail-grid"><div>' +
        '<form class="stack" data-form="settings" novalidate>' +
        '<section class="card card-body"><h2 class="card-title">Store details</h2><div class="form-grid">' +
        '<div class="field"><label class="label" for="st-name">Store name</label><input class="input" id="st-name" name="storeName" value="' + esc(s.storeName) + '" maxlength="60"></div>' +
        '<div class="field"><label class="label" for="st-email">Support email</label><input class="input" id="st-email" name="supportEmail" type="email" value="' + esc(s.supportEmail) + '"></div>' +
        "</div></section>" +
        '<section class="card card-body"><h2 class="card-title">Tax and GST</h2>' +
        '<div class="field"><label class="switch"><input type="checkbox" name="gstEnabled"' + (s.gst.enabled ? " checked" : "") + "><span>Charge GST</span></label><span class=\"hint\">When on, GST is added to books in the “E-book” tax category at checkout, and invoices are issued as GST tax invoices.</span></div>" +
        '<div class="form-grid" id="gst-fields">' +
        '<div class="field"><label class="label" for="st-gstin">GSTIN</label><input class="input mono" id="st-gstin" name="gstin" value="' + esc(s.gst.gstin) + '" maxlength="15"' + (s.gst.enabled ? "" : " disabled") + "></div>" +
        '<div class="field"><label class="label" for="st-rate">GST rate (%)</label><input class="input" id="st-rate" name="gstRate" type="number" min="0" max="28" step="0.01" value="' + esc(s.gst.rate) + '"' + (s.gst.enabled ? "" : " disabled") + "></div>" +
        "</div></section>" +
        '<section class="card card-body"><h2 class="card-title">Downloads</h2><div class="field" style="max-width:260px"><label class="label" for="st-limit">Default download limit</label><input class="input" id="st-limit" name="defaultDownloadLimit" type="number" min="1" max="100" step="1" value="' + esc(s.defaultDownloadLimit) + '"><span class="hint">How many times a buyer can download each book. Applies to new purchases.</span></div></section>' +
        '<div class="form-actions"><button type="submit" class="btn btn-primary">Save settings</button></div>' +
        "</form>" +
        '<section class="card card-body" id="templates-card"></section>' +
        "</div><div>" +
        '<section class="card card-body"><h2 class="card-title">Logo</h2><div class="uploader" data-uploader="logo" style="background:none;border:0;padding:0">' +
        '<div class="uploader-current"><span class="logo-preview" id="logo-preview">' + (s.logoKey && s.logoImage ? '<img src="' + s.logoImage + '" alt="Current logo">' : icon("image")) + "</span>" + (s.logoKey ? '<span class="mono small">' + esc(s.logoKey) + "</span>" : '<span class="muted small">No logo uploaded</span>') + "</div>" +
        '<p class="hint">' + KIND_META.logo.hint + ". Shown in the store header and in Razorpay checkout.</p>" +
        '<div class="uploader-progress" hidden><div class="progress" role="progressbar" aria-label="Upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span style="width:0%"></span></div><p aria-live="polite"></p></div>' +
        '<div class="uploader-error" role="alert"></div>' +
        '<div class="row"><button type="button" class="btn btn-outline btn-sm" data-action="pick-file" data-kind="logo">' + icon("upload") + (s.logoKey ? "Replace" : "Upload") + "</button>" + (s.logoKey ? '<button type="button" class="btn btn-ghost btn-sm" data-action="remove-logo">' + icon("trash") + "Remove</button>" : "") + "</div>" +
        '<input type="file" hidden accept="' + FILE_LIMITS.logo.accept + '" data-file-input="logo"></div></section>' +
        "</div></div>",
      "Settings"
    );
    renderTemplates();
  }

  function renderTemplates() {
    const card = document.getElementById("templates-card");
    const meta = EMAIL_TEMPLATE_META;
    const tpl = SETTINGS.emailTemplates[activeTemplate];
    card.innerHTML =
      '<h2 class="card-title">Email templates</h2><p class="muted small">Edit the subject and body of the transactional emails sent to buyers.</p>' +
      '<div class="tabs" role="tablist">' + Object.keys(meta).map((k) => '<button type="button" role="tab" class="tab" id="tab-' + k + '" aria-controls="tpl-panel" aria-selected="' + (k === activeTemplate) + '" data-action="tpl-tab" data-key="' + k + '">' + esc(meta[k].label) + "</button>").join("") + "</div>" +
      '<form id="tpl-panel" role="tabpanel" aria-labelledby="tab-' + activeTemplate + '" data-form="template" novalidate>' +
      '<div class="field"><label class="label" for="tpl-subject">Subject</label><input class="input" id="tpl-subject" name="subject" value="' + esc(tpl.subject) + '" maxlength="150"></div>' +
      '<div class="field"><label class="label" for="tpl-body">Body</label><textarea class="textarea" id="tpl-body" name="body" rows="9">' + esc(tpl.body) + "</textarea>" +
      '<span class="hint">Placeholders you can use (click to insert):</span><div class="placeholder-chips">' + meta[activeTemplate].placeholders.map((p) => '<button type="button" data-action="insert-ph" data-ph="' + p + '">{{' + p + "}}</button>").join("") + "</div></div>" +
      '<div class="form-actions"><button type="submit" class="btn btn-primary">Save template</button></div></form>';
  }

  // ---------------------------------------------------------------------
  // Audit log
  // ---------------------------------------------------------------------
  const AUDIT_ACTIONS = ["book.create", "book.update", "book.publish", "book.unpublish", "book.archive", "book.file_upload", "book.file_replace", "category.create", "category.update", "category.delete", "author.create", "author.update", "author.delete", "order.refund", "customer.block", "customer.unblock", "review.hide", "review.unhide", "review.delete", "settings.update", "email_template.update"];
  const AUDIT_ENTITIES = ["book", "category", "author", "order", "user", "review", "settings", "email_template"];
  let auditItems = {};

  const AUDIT_LIST = {
    section: "audit-log",
    title: "Audit log",
    subtitle: "Every create, update, delete, refund and block action by an admin.",
    filters: (q) => selectFilter("action", "Action", [["", "All actions"]].concat(AUDIT_ACTIONS.map((a) => [a, a])), q) + selectFilter("entity", "Entity", [["", "All entities"]].concat(AUDIT_ENTITIES.map((a) => [a, a])), q),
    load: (q) =>
      authed((t) => API.auditLog(t, q)).then((p) => {
        p.items.forEach((a) => (auditItems[a.id] = a));
        return p;
      }),
    empty: { icon: "history", title: "No audit entries yet", text: "Admin actions will be recorded here." },
    table: (page) =>
      '<table class="table responsive"><thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Entity</th><th class="num"><span class="sr-only">Details</span></th></tr></thead><tbody>' +
      page.items
        .map((a) => {
          const link = { book: "#/books/", order: "#/orders/", user: "#/customers/" }[a.entity];
          return (
            '<tr><td class="td-main">' + formatDateTime(a.createdAt) + "</td>" +
            '<td data-label="Admin"><span>' + esc(a.adminName) + '<span class="cell-sub">' + esc(a.adminEmail || "") + "</span></span></td>" +
            '<td data-label="Action"><span class="badge badge-accent mono">' + esc(a.action) + "</span></td>" +
            '<td data-label="Entity"><span>' + esc(a.entity) + '<span class="cell-sub mono">' + (link ? '<a href="' + link + a.entityId + '">' + esc(a.entityId) + "</a>" : esc(a.entityId)) + "</span></span></td>" +
            '<td class="actions-cell"><button type="button" class="btn btn-ghost btn-sm" data-action="audit-details" data-id="' + a.id + '">Details</button></td></tr>'
          );
        })
        .join("") +
      "</tbody></table>",
  };

  function openAuditDetails(id) {
    const a = auditItems[id];
    if (!a) return;
    const fmt = (v) => esc(v === null || v === undefined ? "—" : JSON.stringify(v, null, 2));
    modal({
      title: a.action,
      size: "lg",
      body:
        '<dl class="kv" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:16px"><div><dt>Time</dt><dd>' + formatDateTime(a.createdAt) + "</dd></div><div><dt>Admin</dt><dd>" + esc(a.adminName) + "</dd></div><div><dt>Entity</dt><dd>" + esc(a.entity) + '</dd></div><div><dt>Entity ID</dt><dd class="mono">' + esc(a.entityId) + "</dd></div></dl>" +
        '<div class="diff"><div><p class="label">Before</p><pre>' + fmt(a.before) + '</pre></div><div><p class="label">After</p><pre>' + fmt(a.after) + "</pre></div></div>",
      footer: '<button type="button" class="btn btn-primary" data-modal-close>Close</button>',
    });
  }

  // ---------------------------------------------------------------------
  // Global events
  // ---------------------------------------------------------------------
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) {
      if (!e.target.closest(".dropdown")) closeDropdowns();
      const row = e.target.closest("tr.clickable");
      if (row && !e.target.closest("a, button")) location.hash = row.dataset.href;
      if (e.target.closest(".sidebar a")) closeSidebar();
      return;
    }
    const act = el.dataset.action;
    const id = el.dataset.id;
    switch (act) {
      case "toggle-theme":
        U.toggleTheme();
        renderTopbar(document.querySelector(".topbar-title").textContent);
        break;
      case "toggle-dropdown": {
        const menu = document.getElementById(el.dataset.target);
        const open = menu.hidden;
        closeDropdowns();
        menu.hidden = !open;
        el.setAttribute("aria-expanded", String(open));
        if (open) menu.querySelector("button, a").focus();
        break;
      }
      case "open-sidebar": {
        const s = document.getElementById("sidebar");
        s.classList.add("open");
        const b = document.createElement("div");
        b.className = "sidebar-backdrop";
        b.addEventListener("click", closeSidebar);
        document.body.appendChild(b);
        const first = s.querySelector("a");
        if (first) first.focus();
        break;
      }
      case "google-signin":
        openGoogleChooser();
        break;
      case "logout":
        closeDropdowns();
        logout();
        break;
      case "retry":
        if (listCtl) listCtl.update(parseHash().query);
        else route();
        break;
      case "book-status":
        changeBookStatus(el.dataset.status, el);
        break;
      case "pick-file": {
        const box = el.closest("[data-uploader]");
        box.querySelector("[data-file-input]").click();
        break;
      }
      case "remove-logo": {
        const ok = await confirmDialog({ title: "Remove logo?", message: "The store will show its name without a logo.", confirmText: "Remove", danger: true });
        if (!ok) return;
        try {
          await authed(API.removeLogo);
          A.logoImage = null;
          renderSidebar("settings");
          toast("Logo removed.");
          route();
        } catch (err) {
          toast(err.message, "error");
        }
        break;
      }
      case "named-new":
        openNamedForm(el.dataset.kind, null);
        break;
      case "named-edit":
        openNamedForm(el.dataset.kind, id);
        break;
      case "named-delete":
        deleteNamed(el.dataset.kind, id, el.dataset.name, el.dataset.count);
        break;
      case "refund":
        refundOrder(id, el);
        break;
      case "block":
        setBlocked(id, el.dataset.block === "1", el.dataset.name, el);
        break;
      case "review-hide": {
        const hide = el.dataset.hidden === "1";
        setBusy(el, true, "");
        try {
          await authed((t) => API.setReviewHidden(t, id, hide));
          toast(hide ? "Review hidden from the store." : "Review is visible again.");
          listCtl.update(parseHash().query);
        } catch (err) {
          setBusy(el, false);
          toast(err.message, "error");
        }
        break;
      }
      case "review-delete": {
        const ok = await confirmDialog({ title: "Delete this review?", message: "The review and its rating will be permanently removed.", confirmText: "Delete review", danger: true });
        if (!ok) return;
        try {
          await authed((t) => API.deleteReview(t, id));
          toast("Review deleted.");
          listCtl.update(parseHash().query);
        } catch (err) {
          toast(err.message, "error");
        }
        break;
      }
      case "tpl-tab":
        activeTemplate = el.dataset.key;
        renderTemplates();
        document.getElementById("tab-" + activeTemplate).focus();
        break;
      case "insert-ph": {
        const ta = document.getElementById("tpl-body");
        const token = "{{" + el.dataset.ph + "}}";
        const s = ta.selectionStart || ta.value.length;
        ta.value = ta.value.slice(0, s) + token + ta.value.slice(ta.selectionEnd || s);
        ta.focus();
        ta.selectionStart = ta.selectionEnd = s + token.length;
        break;
      }
      case "audit-details":
        openAuditDetails(id);
        break;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDropdowns();
      closeSidebar();
    }
    const tab = e.target.closest && e.target.closest('[role="tab"]');
    if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const keys = Object.keys(EMAIL_TEMPLATE_META);
      const i = keys.indexOf(activeTemplate);
      activeTemplate = keys[(i + (e.key === "ArrowRight" ? 1 : keys.length - 1)) % keys.length];
      renderTemplates();
      document.getElementById("tab-" + activeTemplate).focus();
    }
    const row = e.target.closest && e.target.closest("tr.clickable");
    if (row && e.key === "Enter" && e.target === row) location.hash = row.dataset.href;
  });

  document.addEventListener("submit", async (e) => {
    const f = e.target;
    if (f.matches("[data-list-filters]")) {
      e.preventDefault();
      return;
    }
    if (f.matches('[data-form="book"]')) {
      e.preventDefault();
      saveBook(f);
    }
    if (f.matches('[data-form="settings"]')) {
      e.preventDefault();
      const btn = f.querySelector('[type="submit"]');
      setBusy(btn, true, "Saving…");
      try {
        SETTINGS = await authed((t) =>
          API.updateSettings(t, {
            storeName: field(f, "storeName").value,
            supportEmail: field(f, "supportEmail").value,
            gstEnabled: field(f, "gstEnabled").checked,
            gstin: field(f, "gstin").value,
            gstRate: field(f, "gstRate").value,
            defaultDownloadLimit: Number(field(f, "defaultDownloadLimit").value),
          })
        );
        A.storeName = SETTINGS.storeName;
        renderSidebar("settings");
        setBusy(btn, false);
        showFieldErrors(f, null);
        toast("Settings saved.");
      } catch (err) {
        setBusy(btn, false);
        if (err.details) showFieldErrors(f, err.details);
        else toast(err.message, "error");
      }
    }
    if (f.matches('[data-form="template"]')) {
      e.preventDefault();
      const btn = f.querySelector('[type="submit"]');
      setBusy(btn, true, "Saving…");
      try {
        SETTINGS.emailTemplates[activeTemplate] = await authed((t) => API.updateEmailTemplate(t, activeTemplate, { subject: field(f, "subject").value, body: field(f, "body").value }));
        setBusy(btn, false);
        showFieldErrors(f, null);
        toast(EMAIL_TEMPLATE_META[activeTemplate].label + " template saved.");
      } catch (err) {
        setBusy(btn, false);
        if (err.details) showFieldErrors(f, err.details);
        else toast(err.message, "error");
      }
    }
  });

  const debouncedFilter = U.debounce((name, value) => updateQuery({ [name]: value || undefined }), 400);
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches('[data-filter="q"]')) debouncedFilter("q", t.value.trim());
    if (t.id === "bk-title") {
      const slug = document.getElementById("bk-slug");
      if (!slug.dataset.touched) slug.value = slugify(t.value);
      document.getElementById("slug-preview").textContent = slug.value || "your-book";
    }
    if (t.id === "bk-slug") {
      t.dataset.touched = "1";
      document.getElementById("slug-preview").textContent = slugify(t.value) || "your-book";
    }
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-filter]") && t.dataset.filter !== "q") updateQuery({ [t.dataset.filter]: t.value || undefined });
    if (t.name === "gstEnabled") {
      document.querySelectorAll("#gst-fields input").forEach((i) => (i.disabled = !t.checked));
    }
    if (t.matches("[data-file-input]") && t.files && t.files[0]) {
      const kind = t.dataset.fileInput;
      const box = t.closest("[data-uploader]");
      const file = t.files[0];
      t.value = "";
      uploadFile(kind, file, box, (res) => {
        if (kind === "logo") {
          A.logoImage = res.logoImage;
          renderSidebar("settings");
          route();
        } else {
          EDIT.book = res;
          renderEditorSide();
        }
      });
    }
  });

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------
  async function boot() {
    try {
      const r = await API.refresh();
      A.token = r.accessToken;
      A.user = r.user;
      if (A.user.role === "admin") await loadBrand();
    } catch (e) {
      /* not signed in */
    }
    window.addEventListener("hashchange", route);
    route();
  }

  boot();
})();
