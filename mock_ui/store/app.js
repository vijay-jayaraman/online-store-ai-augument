/* Store (buyer) app — hash-routed single-page mock */
(function () {
  "use strict";

  const { StoreAPI: API, MockGoogle, MockRazorpay, ApiError } = window.Mock;
  const U = window.UI;
  const { icon, esc, formatINR, formatDate, formatDateTime, formatBytes, cover, stars, toast, modal, confirmDialog, emptyState, errorState, loadingState, showFieldErrors, setBusy, parseHash, qs, avatar } = U;

  const GUEST_CART_KEY = "pp_guest_cart";
  const PROTECTED = ["checkout", "library", "orders", "wishlist", "profile"];

  // Client state (auth user + in-memory access token, guest cart, UI flags)
  const S = {
    token: null,
    user: null,
    settings: { storeName: "Page & Pine", supportEmail: "support@pageandpine.in", logoImage: null },
    categories: [],
    owned: new Set(),
    wishlist: new Set(),
    cart: [],
    library: {},
  };

  const $main = document.getElementById("main");
  const $header = document.getElementById("site-header");
  const $footer = document.getElementById("site-footer");

  const guestCart = {
    get() {
      try {
        const v = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
        return Array.isArray(v) ? v : [];
      } catch (e) {
        return [];
      }
    },
    set(ids) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(Array.from(new Set(ids))));
    },
    clear() {
      localStorage.removeItem(GUEST_CART_KEY);
    },
  };

  // ---------------------------------------------------------------------
  // Session handling: access token in memory, refresh on 401 and retry once
  // ---------------------------------------------------------------------
  function setSession(res) {
    S.token = res.accessToken;
    S.user = res.user;
  }

  async function authed(fn) {
    if (!S.token) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    try {
      return await fn(S.token);
    } catch (e) {
      if (e.status === 401) {
        try {
          setSession(await API.refresh());
        } catch (err) {
          endSession(err.code === "USER_BLOCKED" ? "blocked" : "expired");
          throw err;
        }
        try {
          return await fn(S.token);
        } catch (e2) {
          if (e2.code === "USER_BLOCKED") endSession("blocked");
          throw e2;
        }
      }
      if (e.code === "USER_BLOCKED") endSession("blocked");
      throw e;
    }
  }

  function endSession(reason) {
    if (!S.user) return;
    S.token = null;
    S.user = null;
    S.owned = new Set();
    S.wishlist = new Set();
    S.cart = guestCart.get();
    localStorage.removeItem("pp_refresh_cookie_store");
    renderHeader();
    toast(reason === "blocked" ? "Your account has been blocked. Please contact support." : "Your session has ended. Please sign in again.", "error");
    location.hash = "#/";
  }

  async function loadUserState() {
    if (!S.user) {
      S.cart = guestCart.get();
      return;
    }
    const [owned, wish, cart] = await Promise.all([authed(API.ownedIds), authed(API.wishlistIds), authed(API.cart)]);
    S.owned = new Set(owned);
    S.wishlist = new Set(wish);
    S.cart = cart.books.map((b) => b.id);
  }

  function currentPath() {
    return location.hash.replace(/^#/, "") || "/";
  }

  function goLogin(next) {
    location.hash = "#/login" + qs({ next: next || currentPath() });
  }

  // ---------------------------------------------------------------------
  // Shared fragments
  // ---------------------------------------------------------------------
  const authorsText = (b) => (b.authors || []).map((a) => a.name).join(", ");

  function brandHTML() {
    const s = S.settings;
    const logo = s.logoImage ? '<img class="brand-logo" src="' + s.logoImage + '" alt="">' : '<span class="brand-mark">' + icon("book-open") + "</span>";
    return '<a class="brand" href="#/" aria-label="' + esc(s.storeName) + ' home">' + logo + '<span class="brand-text"><span class="brand-name">' + esc(s.storeName) + '</span><span class="brand-sub">Digital bookstore</span></span></a>';
  }

  function ratingLine(b) {
    if (!b.ratingCount) return '<span class="rating-line">No reviews yet</span>';
    return '<span class="rating-line">' + stars(b.ratingAvg) + "<span>" + b.ratingAvg.toFixed(1) + " (" + b.ratingCount + ")</span></span>";
  }

  function cardAction(id, title) {
    if (S.owned.has(id)) return '<a class="owned-chip" href="#/library">' + icon("check-circle") + "In your library</a>";
    if (S.cart.includes(id)) return '<a class="btn btn-sm btn-outline btn-icon" href="#/cart" aria-label="' + esc(title || "Book") + ' is in your cart. View cart" title="In cart">' + icon("check") + "</a>";
    return '<button type="button" class="btn btn-sm btn-primary btn-icon" data-action="add-to-cart" data-id="' + id + '" aria-label="Add ' + esc(title || "book") + ' to cart" title="Add to cart">' + icon("bag") + "</button>";
  }

  function detailAction(id) {
    if (S.owned.has(id)) return '<a class="btn btn-primary" href="#/library">' + icon("library") + "In your library</a>";
    if (S.cart.includes(id)) return '<a class="btn btn-primary" href="#/cart">' + icon("check") + "In cart · View cart</a>";
    return '<button type="button" class="btn btn-primary" data-action="add-to-cart" data-id="' + id + '">' + icon("bag") + "Add to cart</button>";
  }

  function wishButton(b, variant) {
    const on = S.wishlist.has(b.id);
    const label = on ? "Remove " + b.title + " from wishlist" : "Save " + b.title + " to wishlist";
    if (variant === "text")
      return '<button type="button" class="btn btn-ghost" data-action="wish-toggle" data-id="' + b.id + '" data-wish="' + b.id + '" data-variant="text" data-title="' + esc(b.title) + '" aria-pressed="' + on + '">' + icon("heart") + (on ? "Saved to wishlist" : "Save to wishlist") + "</button>";
    return '<button type="button" class="wish-btn" data-action="wish-toggle" data-id="' + b.id + '" data-wish="' + b.id + '" data-title="' + esc(b.title) + '" aria-pressed="' + on + '" aria-label="' + esc(label) + '" title="' + (on ? "Saved to wishlist" : "Save to wishlist") + '">' + icon("heart") + "</button>";
  }

  function bookCard(b, opts) {
    const o = opts || {};
    return (
      '<article class="book-card">' +
      '<a class="book-card-cover" href="#/books/' + b.slug + '" tabindex="-1" aria-hidden="true">' + cover(b, { alt: "" }) + "</a>" +
      (o.noWish ? "" : wishButton(b)) +
      '<div class="book-card-body">' +
      '<h3 class="book-card-title"><a href="#/books/' + b.slug + '">' + esc(b.title) + "</a></h3>" +
      '<p class="book-card-author">' + esc(authorsText(b)) + "</p>" +
      ratingLine(b) +
      '<div class="book-card-foot"><span class="price">' + formatINR(b.price) + "</span>" +
      (o.noAction ? "" : '<span data-card-action="' + b.id + '" data-title="' + esc(b.title) + '">' + cardAction(b.id, b.title) + "</span>") +
      "</div></div>" +
      (o.footer || "") +
      "</article>"
    );
  }

  function skeletonCards(n) {
    let h = "";
    for (let i = 0; i < n; i++) h += '<div class="skeleton-card" aria-hidden="true"><div class="skeleton sk-cover"></div><div class="skeleton sk-line" style="width:80%"></div><div class="skeleton sk-line" style="width:50%"></div><div class="skeleton sk-line" style="width:35%"></div></div>';
    return h;
  }

  function syncActions() {
    document.querySelectorAll("[data-card-action]").forEach((el) => (el.innerHTML = cardAction(el.dataset.cardAction, el.dataset.title)));
    document.querySelectorAll("[data-detail-action]").forEach((el) => (el.innerHTML = detailAction(el.dataset.detailAction)));
    document.querySelectorAll("[data-wish]").forEach((el) => {
      const on = S.wishlist.has(el.dataset.wish);
      el.setAttribute("aria-pressed", String(on));
      if (el.dataset.variant === "text") el.innerHTML = icon("heart") + (on ? "Saved to wishlist" : "Save to wishlist");
      else {
        el.setAttribute("aria-label", (on ? "Remove " : "Save ") + el.dataset.title + (on ? " from wishlist" : " to wishlist"));
        el.title = on ? "Saved to wishlist" : "Save to wishlist";
      }
    });
    renderHeader();
  }

  function statusBadge(status) {
    const map = {
      paid: ["badge-success", "Paid"],
      pending: ["badge-warning", "Awaiting payment"],
      failed: ["badge-error", "Payment failed"],
      expired: ["", "Expired"],
      refunded: ["badge-info", "Refunded"],
    };
    const m = map[status] || ["", status];
    return '<span class="badge ' + m[0] + '">' + m[1] + "</span>";
  }

  function pagination(page, pageSize, total, hrefFor) {
    const pages = Math.ceil(total / pageSize);
    if (pages <= 1) return "";
    let h = '<nav class="pagination" aria-label="Pagination">';
    h += page > 1 ? '<a class="btn btn-sm" href="' + hrefFor(page - 1) + '" aria-label="Previous page">' + icon("chevron-left") + "</a>" : '<span class="btn btn-sm" aria-disabled="true">' + icon("chevron-left") + "</span>";
    for (let i = 1; i <= pages; i++) h += '<a class="btn btn-sm" href="' + hrefFor(i) + '"' + (i === page ? ' aria-current="page"' : "") + ' aria-label="Page ' + i + '">' + i + "</a>";
    h += page < pages ? '<a class="btn btn-sm" href="' + hrefFor(page + 1) + '" aria-label="Next page">' + icon("chevron-right") + "</a>" : '<span class="btn btn-sm" aria-disabled="true">' + icon("chevron-right") + "</span>";
    return h + "</nav>";
  }

  function mount(html, title) {
    $main.innerHTML = html;
    document.title = (title ? title + " · " : "") + S.settings.storeName;
  }

  const TILE_COLORS = [
    ["#2b4a3a", "#14241b"],
    ["#5a3b24", "#27180c"],
    ["#3d4a2c", "#1b2413"],
    ["#4a2430", "#200e15"],
    ["#6a4a1f", "#2c1e07"],
    ["#1f3f4a", "#0c1d23"],
    ["#433a5a", "#1c1729"],
  ];

  // ---------------------------------------------------------------------
  // Header, mobile drawer and footer
  // ---------------------------------------------------------------------
  function renderHeader() {
    const a = parseHash().parts[0] || "";
    const q = parseHash().query;
    const cartCount = S.cart.length;
    const cats = S.categories.map((c) => '<a class="dropdown-item" href="#/books?category=' + c.slug + '">' + esc(c.name) + "</a>").join("");
    const account = S.user
      ? '<div class="dropdown">' +
        '<button type="button" class="btn btn-ghost account-btn" data-action="toggle-dropdown" data-target="account-menu" aria-expanded="false" aria-controls="account-menu" aria-label="Account menu for ' + esc(S.user.name) + '">' + avatar(S.user) + "</button>" +
        '<div class="dropdown-menu" id="account-menu" hidden>' +
        '<div class="dropdown-head"><strong>' + esc(S.user.name) + "</strong><span>" + esc(S.user.email) + "</span></div>" +
        '<div class="dropdown-divider"></div>' +
        '<a class="dropdown-item" href="#/library">' + icon("library") + "My Library</a>" +
        '<a class="dropdown-item" href="#/orders">' + icon("receipt") + "Orders</a>" +
        '<a class="dropdown-item" href="#/wishlist">' + icon("heart") + "Wishlist</a>" +
        '<a class="dropdown-item" href="#/profile">' + icon("user") + "Profile</a>" +
        '<div class="dropdown-divider"></div>' +
        '<button type="button" class="dropdown-item" data-action="logout">' + icon("logout") + "Sign out</button>" +
        "</div></div>"
      : '<a class="btn btn-ghost btn-icon" href="#/login" aria-label="Sign in" title="Sign in">' + icon("user") + "</a>";
    $header.innerHTML =
      '<div class="container header-inner">' +
      '<button type="button" class="btn btn-ghost btn-icon menu-toggle" data-action="open-menu" aria-label="Open menu">' + icon("menu") + "</button>" +
      brandHTML() +
      '<nav class="main-nav" aria-label="Main">' +
      '<a class="nav-link" href="#/"' + (a === "" ? ' aria-current="page"' : "") + ">Home</a>" +
      '<a class="nav-link" href="#/books"' + (a === "books" && !q.category && q.sort !== "newest" ? ' aria-current="page"' : "") + ">Books</a>" +
      '<div class="dropdown"><button type="button" class="nav-link" data-action="toggle-dropdown" data-target="cat-menu" aria-expanded="false" aria-controls="cat-menu"' + (a === "books" && q.category ? ' aria-current="page"' : "") + ">Categories" + icon("chevron-down") + "</button>" +
      '<div class="dropdown-menu" id="cat-menu" hidden style="left:0;right:auto">' + (cats || '<span class="dropdown-item muted">No categories</span>') + "</div></div>" +
      '<a class="nav-link" href="#/books?sort=newest"' + (a === "books" && q.sort === "newest" && !q.category ? ' aria-current="page"' : "") + ">New releases</a>" +
      "</nav>" +
      '<div class="header-actions">' +
      '<button type="button" class="btn btn-ghost btn-icon" data-action="toggle-search" aria-label="Search books" aria-expanded="false" aria-controls="search-panel" title="Search">' + icon("search") + "</button>" +
      '<span class="hide-xs">' + U.themeButton() + "</span>" +
      '<a class="btn btn-ghost btn-icon hide-xs" href="#/wishlist" aria-label="Wishlist" title="Wishlist">' + icon("heart") + "</a>" +
      account +
      '<a class="btn btn-ghost btn-icon icon-btn-wrap" href="#/cart" aria-label="Cart, ' + cartCount + " item" + (cartCount === 1 ? "" : "s") + '" title="Cart">' + icon("bag") + (cartCount ? '<span class="count-badge">' + cartCount + "</span>" : "") + "</a>" +
      "</div></div>" +
      '<div class="search-panel" id="search-panel" hidden><div class="container"><form role="search" data-form="header-search">' +
      '<div class="input-group">' + icon("search") + '<label class="sr-only" for="header-q">Search books</label><input class="input" id="header-q" type="search" name="q" placeholder="Search by title, author or keyword" autocomplete="off"></div>' +
      '<button class="btn btn-primary" type="submit">Search</button></form></div></div>';
  }

  function openMenu() {
    closeDrawers();
    const acc = S.user
      ? '<a class="drawer-link" href="#/library">' + icon("library") + "My Library</a>" +
        '<a class="drawer-link" href="#/orders">' + icon("receipt") + "Orders</a>" +
        '<a class="drawer-link" href="#/wishlist">' + icon("heart") + "Wishlist</a>" +
        '<a class="drawer-link" href="#/profile">' + icon("user") + "Profile</a>" +
        '<button type="button" class="drawer-link" data-action="logout">' + icon("logout") + "Sign out</button>"
      : '<a class="drawer-link" href="#/login">' + icon("user") + "Sign in</a>" + '<a class="drawer-link" href="#/wishlist">' + icon("heart") + "Wishlist</a>";
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    openDrawer(
      "Menu",
      '<div class="drawer-section"><p class="drawer-title">Browse</p>' +
        '<a class="drawer-link" href="#/">' + icon("home") + "Home</a>" +
        '<a class="drawer-link" href="#/books">' + icon("book") + "All books</a>" +
        '<a class="drawer-link" href="#/books?sort=newest">' + icon("zap") + "New releases</a></div>" +
        '<div class="drawer-section"><p class="drawer-title">Categories</p>' + S.categories.map((c) => '<a class="drawer-link" href="#/books?category=' + c.slug + '">' + icon(c.icon || "book") + esc(c.name) + "</a>").join("") + "</div>" +
        '<div class="drawer-section"><p class="drawer-title">' + (S.user ? esc(S.user.name) : "Account") + "</p>" + acc + "</div>" +
        '<div class="drawer-section"><button type="button" class="drawer-link" data-action="toggle-theme">' + icon(dark ? "sun" : "moon") + (dark ? "Light theme" : "Dark theme") + "</button></div>",
      "left"
    );
  }

  function openDrawer(title, body, side) {
    closeDrawers();
    const back = document.createElement("div");
    back.className = "drawer-backdrop";
    back.dataset.drawer = "1";
    const d = document.createElement("div");
    d.className = "drawer" + (side === "right" ? " drawer-right" : "");
    d.dataset.drawer = "1";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-modal", "true");
    d.setAttribute("aria-label", title);
    d.innerHTML = '<div class="drawer-head"><strong>' + esc(title) + '</strong><button type="button" class="btn btn-ghost btn-icon btn-sm" data-action="close-drawer" aria-label="Close">' + icon("x") + '</button></div><div class="drawer-body">' + body + "</div>";
    back.addEventListener("click", closeDrawers);
    document.body.appendChild(back);
    document.body.appendChild(d);
    document.body.style.overflow = "hidden";
    setTimeout(() => d.querySelector("button, a, input, select").focus(), 20);
    return d;
  }

  function closeDrawers() {
    const had = document.querySelector("[data-drawer]");
    document.querySelectorAll("[data-drawer]").forEach((el) => el.remove());
    if (had && !document.querySelector(".modal-backdrop")) document.body.style.overflow = "";
  }

  function closeDropdowns(except) {
    document.querySelectorAll(".dropdown-menu").forEach((m) => {
      if (m.id !== except) {
        m.hidden = true;
        const b = document.querySelector('[data-target="' + m.id + '"]');
        if (b) b.setAttribute("aria-expanded", "false");
      }
    });
  }

  function renderFooter() {
    const s = S.settings;
    $footer.innerHTML =
      '<div class="container footer-grid">' +
      "<div>" + brandHTML() + '<p class="footer-about">PDF e-books you can buy in minutes, read anywhere and download any time from your personal library.</p></div>' +
      '<nav aria-label="Shop"><h3>Shop</h3><ul><li><a href="#/books">All books</a></li><li><a href="#/books?sort=newest">New releases</a></li>' + S.categories.slice(0, 4).map((c) => '<li><a href="#/books?category=' + c.slug + '">' + esc(c.name) + "</a></li>").join("") + "</ul></nav>" +
      '<nav aria-label="Account"><h3>Account</h3><ul><li><a href="#/library">My Library</a></li><li><a href="#/orders">Orders</a></li><li><a href="#/wishlist">Wishlist</a></li><li><a href="#/profile">Profile</a></li></ul></nav>' +
      '<nav aria-label="Help"><h3>Help</h3><ul><li><a href="mailto:' + esc(s.supportEmail) + '">' + esc(s.supportEmail) + '</a></li><li><a href="#/terms">Terms of Service</a></li><li><a href="#/privacy">Privacy Policy</a></li><li><a href="#/refund-policy">Refund Policy</a></li></ul></nav>' +
      "</div>" +
      '<div class="container footer-bottom"><span>© ' + new Date().getFullYear() + " " + esc(s.storeName) + ". All rights reserved.</span><span>" + icon("lock") + "Payments secured by Razorpay</span></div>";
  }

  // ---------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------
  let routeSeq = 0;
  let currentView = null;

  function route() {
    const h = parseHash();
    const [a, b, c] = h.parts;
    closeDropdowns();
    const sp = document.getElementById("search-panel");
    if (sp) sp.hidden = true;
    if (a !== "login") removeOneTap();

    if (PROTECTED.includes(a) && !S.user) {
      location.replace("#/login" + qs({ next: currentPath() }));
      return;
    }

    let name = "notfound";
    let view = () => viewNotFound();
    if (!a) (name = "home"), (view = viewHome);
    else if (a === "books" && !b) (name = "catalog"), (view = viewCatalog);
    else if (a === "books" && b && !c) (name = "book"), (view = (seq) => viewBook(seq, decodeURIComponent(b)));
    else if (a === "cart" && !b) (name = "cart"), (view = viewCart);
    else if (a === "checkout" && !b) (name = "checkout"), (view = viewCheckout);
    else if (a === "checkout" && b === "success" && c) (name = "success"), (view = (seq) => viewPaymentSuccess(seq, c));
    else if (a === "checkout" && b === "failure" && c) (name = "failure"), (view = (seq) => viewPaymentFailure(seq, c, h.query.reason));
    else if (a === "login") (name = "login"), (view = () => viewLogin(h.query.next));
    else if (a === "library") (name = "library"), (view = viewLibrary);
    else if (a === "orders" && !b) (name = "orders"), (view = viewOrders);
    else if (a === "orders" && b) (name = "order"), (view = (seq) => viewOrder(seq, b));
    else if (a === "wishlist") (name = "wishlist"), (view = viewWishlist);
    else if (a === "profile") (name = "profile"), (view = viewProfile);
    else if (a === "terms" || a === "privacy" || a === "refund-policy") (name = "legal"), (view = () => viewLegal(a));

    renderHeader();
    if (name === "catalog" && currentView === "catalog") {
      catalogUpdate(h.query);
      return;
    }
    closeDrawers();
    currentView = name;
    const seq = ++routeSeq;
    window.scrollTo(0, 0);
    view(seq);
  }

  const stale = (seq) => seq !== routeSeq;

  // ---------------------------------------------------------------------
  // Home
  // ---------------------------------------------------------------------
  async function viewHome(seq) {
    mount(
      '<section class="hero"><div class="container hero-inner">' +
        '<div><p class="eyebrow">Discover. Read. Grow.</p>' +
        "<h1>Books for every<br>mind &amp; moment.</h1>" +
        '<p class="hero-lead">Buy PDF e-books in a few taps, read a free sample of any book, and download your purchases from your personal library.</p>' +
        '<div class="hero-actions"><a class="btn btn-primary" href="#/books">Browse books' + icon("arrow-right") + '</a><a class="btn btn-outline" href="#categories" data-action="scroll-categories">Explore categories</a></div></div>' +
        '<div class="hero-art" id="hero-art" aria-hidden="true"><div class="hero-shelf"></div></div>' +
        "</div></section>" +
        '<div class="container values"><div class="values-card">' +
        '<div class="value">' + icon("download") + "<div><strong>Instant PDF downloads</strong><span>Books appear in My Library after payment</span></div></div>" +
        '<div class="value">' + icon("shield") + "<div><strong>Secure payments</strong><span>UPI, cards and netbanking via Razorpay</span></div></div>" +
        '<div class="value">' + icon("book-open") + "<div><strong>Free samples</strong><span>Read a sample before you buy</span></div></div>" +
        '<div class="value">' + icon("user") + "<div><strong>One-tap sign-in</strong><span>Sign in with your Google account</span></div></div>" +
        "</div></div>" +
        '<div id="home-sections"><section class="section"><div class="container"><div class="book-grid cols-6">' + skeletonCards(6) + "</div></div></section></div>",
      "Home"
    );
    let d;
    try {
      d = await API.home();
    } catch (e) {
      if (stale(seq)) return;
      document.getElementById("home-sections").innerHTML = '<div class="container">' + errorState(e, 'data-action="retry"') + "</div>";
      return;
    }
    if (stale(seq)) return;
    const heroBooks = (d.featured.length >= 3 ? d.featured : d.newReleases).slice(0, 3);
    const art = document.getElementById("hero-art");
    art.innerHTML =
      '<div class="hero-shelf"></div>' +
      heroBooks.map((b) => '<a class="hero-book" href="#/books/' + b.slug + '" tabindex="-1">' + cover(b, { alt: "" }) + "</a>").join("") +
      '<div class="hero-seal">Free<br>samples<small>ON EVERY BOOK</small></div>';

    const catTiles = d.categories
      .map((c, i) => {
        const col = TILE_COLORS[i % TILE_COLORS.length];
        return '<a class="cat-tile" href="#/books?category=' + c.slug + '" style="--tile-a:' + col[0] + ";--tile-b:" + col[1] + '"><span class="cat-tile-icon">' + icon(c.icon || "book") + "</span><strong>" + esc(c.name) + "</strong><span>" + c.count + " book" + (c.count === 1 ? "" : "s") + "</span></a>";
      })
      .join("");

    const bookSection = (eyebrow, title, books, link, emptyText) =>
      '<section class="section"><div class="container"><div class="section-head"><div><p class="eyebrow">' + eyebrow + "</p><h2>" + title + "</h2></div>" +
      '<a class="link-arrow" href="' + link + '">View all books' + icon("arrow-right") + "</a></div>" +
      (books.length ? '<div class="book-grid cols-6">' + books.map((b) => bookCard(b)).join("") + "</div>" : '<p class="muted">' + emptyText + "</p>") +
      "</div></section>";

    document.getElementById("home-sections").innerHTML =
      '<section class="section" id="categories"><div class="container"><div class="section-head"><div><p class="eyebrow">Browse by category</p><h2>Find your next read</h2></div><a class="link-arrow" href="#/books">View all books' + icon("arrow-right") + "</a></div>" +
      (catTiles ? '<div class="cat-grid">' + catTiles + "</div>" : '<p class="muted">No categories yet.</p>') +
      "</div></section>" +
      bookSection("Featured", "Readers' favourites", d.featured, "#/books", "No featured books right now.") +
      bookSection("Just added", "New releases", d.newReleases, "#/books?sort=newest", "No new releases right now.");
  }

  // ---------------------------------------------------------------------
  // Catalog: search, filters, sort, pagination (state kept in the URL)
  // ---------------------------------------------------------------------
  let catalogSeq = 0;
  let catalogAuthors = [];

  function filtersForm(prefix) {
    const q = parseHash().query;
    return (
      '<form class="card-body" data-filters novalidate>' +
      '<fieldset class="filter-group"><legend class="filter-title">Category</legend>' +
      '<label class="check"><input type="radio" name="category" value=""' + (!q.category ? " checked" : "") + ">All categories</label>" +
      S.categories.map((c) => '<label class="check"><input type="radio" name="category" value="' + c.slug + '"' + (q.category === c.slug ? " checked" : "") + ">" + esc(c.name) + ' <span class="muted small">(' + c.count + ")</span></label>").join("") +
      "</fieldset>" +
      '<div class="filter-group"><label class="filter-title" for="' + prefix + '-author">Author</label><select class="select" id="' + prefix + '-author" name="author"><option value="">All authors</option>' +
      catalogAuthors.map((a) => '<option value="' + a.slug + '"' + (q.author === a.slug ? " selected" : "") + ">" + esc(a.name) + "</option>").join("") +
      "</select></div>" +
      '<fieldset class="filter-group"><legend class="filter-title">Price range (₹)</legend><div class="price-inputs">' +
      '<div class="field" style="margin:0"><label class="sr-only" for="' + prefix + '-min">Minimum price</label><input class="input" id="' + prefix + '-min" type="number" inputmode="numeric" min="0" step="1" name="minPrice" placeholder="Min" value="' + esc(q.minPrice || "") + '"></div>' +
      '<div class="field" style="margin:0"><label class="sr-only" for="' + prefix + '-max">Maximum price</label><input class="input" id="' + prefix + '-max" type="number" inputmode="numeric" min="0" step="1" name="maxPrice" placeholder="Max" value="' + esc(q.maxPrice || "") + '"></div>' +
      '</div><button type="submit" class="btn btn-outline btn-sm btn-block" style="margin-top:12px">Apply price</button></fieldset>' +
      '<button type="button" class="btn btn-ghost btn-sm btn-block" data-action="clear-filters">Clear all filters</button>' +
      "</form>"
    );
  }

  function applyFilters(patch) {
    const q = Object.assign({}, parseHash().query, patch);
    if (!("page" in patch)) delete q.page;
    location.hash = "#/books" + qs(q);
  }

  async function viewCatalog(seq) {
    const q = parseHash().query;
    mount('<div class="container page">' + loadingState("Loading books…") + "</div>", "Books");
    try {
      if (!S.categories.length) S.categories = await API.categories();
      catalogAuthors = await API.authors();
    } catch (e) {
      if (stale(seq)) return;
      mount('<div class="container page">' + errorState(e, 'data-action="retry"') + "</div>", "Books");
      currentView = null;
      return;
    }
    if (stale(seq)) return;
    mount(
      '<div class="container page">' +
        '<ol class="breadcrumb"><li><a href="#/">Home</a></li><li aria-current="page">Books</li></ol>' +
        '<div class="page-head"><h1 id="cat-title">All books</h1><p class="muted" id="cat-sub" style="margin:0">Browse our collection of PDF e-books.</p></div>' +
        '<div class="catalog-toolbar">' +
        '<form class="input-group" role="search" data-form="catalog-search">' + icon("search") + '<label class="sr-only" for="cat-q">Search books</label><input class="input" id="cat-q" type="search" name="q" placeholder="Search by title, author or keyword" value="' + esc(q.q || "") + '" autocomplete="off"></form>' +
        '<label class="sr-only" for="cat-sort">Sort by</label><select class="select" id="cat-sort" data-sort>' +
        [["newest", "Sort: Newest"], ["price_asc", "Price: Low to high"], ["price_desc", "Price: High to low"], ["rating", "Top rated"]].map((o) => '<option value="' + o[0] + '"' + ((q.sort || "newest") === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") +
        "</select>" +
        '<button type="button" class="btn btn-outline filters-toggle" data-action="open-filters">' + icon("filter") + "Filters</button>" +
        "</div>" +
        '<div class="catalog-layout"><aside class="filters card" aria-label="Filters">' + filtersForm("side") + '</aside><section id="cat-results" aria-live="polite" aria-busy="true"></section></div>' +
        "</div>",
      "Books"
    );
    catalogUpdate(q);
  }

  function syncFilterForms(q) {
    document.querySelectorAll("[data-filters]").forEach((f) => {
      f.querySelectorAll('input[name="category"]').forEach((r) => (r.checked = r.value === (q.category || "")));
      f.author.value = q.author || "";
      f.minPrice.value = q.minPrice || "";
      f.maxPrice.value = q.maxPrice || "";
    });
    const qi = document.getElementById("cat-q");
    if (qi && document.activeElement !== qi) qi.value = q.q || "";
    const s = document.getElementById("cat-sort");
    if (s) s.value = q.sort || "newest";
  }

  async function catalogUpdate(q) {
    const seq = ++catalogSeq;
    const results = document.getElementById("cat-results");
    if (!results) return;
    syncFilterForms(q);
    const cat = S.categories.find((c) => c.slug === q.category);
    const author = catalogAuthors.find((a) => a.slug === q.author);
    const title = q.q ? "Results for “" + q.q + "”" : cat ? cat.name : q.sort === "newest" && !author ? "New releases" : "All books";
    document.getElementById("cat-title").textContent = title;
    document.getElementById("cat-sub").textContent = author ? "Books by " + author.name : "Browse our collection of PDF e-books.";
    document.title = title + " · " + S.settings.storeName;

    const chips = [];
    if (q.q) chips.push(["q", "Search: " + q.q]);
    if (cat) chips.push(["category", cat.name]);
    if (author) chips.push(["author", author.name]);
    if (q.minPrice || q.maxPrice) chips.push(["price", "₹" + (q.minPrice || "0") + " – " + (q.maxPrice ? "₹" + q.maxPrice : "any")]);
    const chipsHTML = chips.length
      ? '<div class="active-filters">' + chips.map((c) => '<button type="button" class="chip" data-action="remove-filter" data-key="' + c[0] + '" aria-label="Remove filter ' + esc(c[1]) + '">' + esc(c[1]) + icon("x") + "</button>").join("") + '<button type="button" class="btn-link small" data-action="clear-filters">Clear all</button></div>'
      : "";

    results.setAttribute("aria-busy", "true");
    results.innerHTML = chipsHTML + '<div class="book-grid">' + skeletonCards(8) + "</div>";
    let page;
    try {
      page = await API.books(q);
    } catch (e) {
      if (seq !== catalogSeq) return;
      results.innerHTML = chipsHTML + errorState(e, 'data-action="retry"');
      results.setAttribute("aria-busy", "false");
      return;
    }
    if (seq !== catalogSeq) return;
    results.setAttribute("aria-busy", "false");
    if (!page.total) {
      results.innerHTML = chipsHTML + emptyState({ icon: "search", title: "No books match your search", text: "Try a different keyword or remove some filters.", action: '<button type="button" class="btn btn-primary" data-action="clear-filters">Clear all filters</button>' });
      return;
    }
    const from = (page.page - 1) * page.pageSize + 1;
    const to = from + page.items.length - 1;
    results.innerHTML =
      chipsHTML +
      '<p class="muted small" style="margin-bottom:14px">Showing ' + from + "–" + to + " of " + page.total + " book" + (page.total === 1 ? "" : "s") + "</p>" +
      '<div class="book-grid">' + page.items.map((b) => bookCard(b)).join("") + "</div>" +
      pagination(page.page, page.pageSize, page.total, (n) => "#/books" + qs(Object.assign({}, q, { page: n > 1 ? n : undefined })));
  }

  // ---------------------------------------------------------------------
  // Book detail, sample reader and reviews
  // ---------------------------------------------------------------------
  async function viewBook(seq, slug) {
    mount('<div class="container page">' + loadingState("Loading book…") + "</div>", "Book");
    let book;
    let mine = null;
    try {
      book = await API.book(slug);
      if (S.user) mine = await authed((t) => API.myBookState(t, book.id));
    } catch (e) {
      if (stale(seq)) return;
      if (e.status === 404) mount('<div class="container page">' + emptyState({ icon: "book", title: "This book isn't available", text: "It may have been removed from the store.", action: '<a class="btn btn-primary" href="#/books">Browse books</a>' }) + "</div>", "Not found");
      else mount('<div class="container page">' + errorState(e, 'data-action="retry"') + "</div>", "Book");
      return;
    }
    if (stale(seq)) return;
    if (mine) {
      if (mine.owned) S.owned.add(book.id);
      else S.owned.delete(book.id);
    }
    const authorLinks = book.authors.map((a) => '<a href="#/books?author=' + a.slug + '">' + esc(a.name) + "</a>").join(", ");
    mount(
      '<div class="container page">' +
        '<ol class="breadcrumb"><li><a href="#/">Home</a></li><li><a href="#/books">Books</a></li>' + (book.category ? '<li><a href="#/books?category=' + book.category.slug + '">' + esc(book.category.name) + "</a></li>" : "") + '<li aria-current="page">' + esc(book.title) + "</li></ol>" +
        '<div class="detail">' +
        '<div class="detail-cover">' + cover(book) + "</div>" +
        '<div class="detail-info">' +
        (book.category ? '<p class="eyebrow">' + esc(book.category.name) + "</p>" : "") +
        "<h1>" + esc(book.title) + "</h1>" +
        '<p class="detail-authors">by ' + authorLinks + "</p>" +
        '<div id="detail-rating">' + detailRating(book) + "</div>" +
        '<div class="detail-price"><span class="price price-lg">' + formatINR(book.price) + '</span><span class="muted small">PDF e-book · tax shown in cart</span></div>' +
        '<div class="detail-actions"><span data-detail-action="' + book.id + '" style="display:contents">' + detailAction(book.id) + "</span>" +
        (book.hasSample ? '<button type="button" class="btn btn-outline" data-action="read-sample" data-slug="' + book.slug + '">' + icon("book-open") + "Read free sample</button>" : "") +
        wishButton(book, "text") +
        "</div>" +
        '<dl class="meta-list">' +
        "<div><dt>Format</dt><dd>PDF</dd></div>" +
        "<div><dt>Pages</dt><dd>" + book.pages + "</dd></div>" +
        "<div><dt>File size</dt><dd>" + formatBytes(book.fileSize) + "</dd></div>" +
        "<div><dt>Language</dt><dd>" + esc(book.language) + "</dd></div>" +
        "</dl>" +
        '<h2 style="font-size:1.3rem">About this book</h2><p class="detail-desc">' + esc(book.description) + "</p>" +
        "</div></div>" +
        '<section class="reviews" id="reviews" aria-labelledby="reviews-title"></section>' +
        "</div>",
      book.title
    );
    renderReviews(book, mine);
  }

  function detailRating(book) {
    return book.ratingCount
      ? '<a class="rating-line" href="#reviews" data-action="scroll-reviews" style="text-decoration:none">' + stars(book.ratingAvg) + "<span>" + book.ratingAvg.toFixed(1) + " · " + book.ratingCount + " review" + (book.ratingCount === 1 ? "" : "s") + "</span></a>"
      : '<span class="rating-line">No reviews yet</span>';
  }

  function renderReviews(book, mine) {
    const el = document.getElementById("reviews");
    if (!el) return;
    const others = book.reviews.filter((r) => !(S.user && r.userId === S.user.id));
    let mineHTML = "";
    if (!S.user) {
      mineHTML = '<div class="alert alert-info">' + icon("info") + '<p>Only buyers who own this book can write a review. <a href="#/login?next=' + encodeURIComponent("/books/" + book.slug) + '">Sign in</a> if you have bought it.</p></div>';
    } else if (mine && mine.review) {
      const r = mine.review;
      mineHTML =
        '<div class="my-review" id="my-review"><div class="row-between" style="margin-bottom:8px"><strong>Your review</strong>' +
        (r.isHidden ? '<span class="badge">' + icon("eye-off") + "Hidden by the store</span>" : "") +
        "</div>" + stars(r.rating) + '<p style="margin:8px 0 12px;white-space:pre-line">' + esc(r.comment) + "</p>" +
        '<p class="muted small" style="margin:0 0 12px">' + (r.updatedAt > r.createdAt ? "Edited " + formatDate(r.updatedAt) : "Posted " + formatDate(r.createdAt)) + "</p>" +
        '<div class="row"><button type="button" class="btn btn-outline btn-sm" data-action="edit-review">' + icon("edit") + 'Edit</button><button type="button" class="btn btn-danger-outline btn-sm" data-action="delete-review" data-id="' + r.id + '">' + icon("trash") + "Delete</button></div></div>";
    } else if (mine && mine.owned) {
      mineHTML = reviewForm(null);
    } else {
      mineHTML = '<div class="alert alert-info">' + icon("info") + "<p>Only buyers who own this book can write a review.</p></div>";
    }
    el.innerHTML =
      '<h2 id="reviews-title">Reviews</h2>' +
      '<div class="reviews-layout">' +
      '<div class="card rating-summary"><div class="rating-big">' + (book.ratingCount ? book.ratingAvg.toFixed(1) : "–") + "</div>" + stars(book.ratingAvg) + '<p class="muted small" style="margin:8px 0 0">' + (book.ratingCount ? "Based on " + book.ratingCount + " review" + (book.ratingCount === 1 ? "" : "s") : "No reviews yet") + "</p></div>" +
      "<div>" + mineHTML +
      (others.length
        ? '<div class="card card-body" style="margin-top:16px">' + others.map((r) => '<article class="review"><div class="review-head">' + avatar({ name: r.userName, avatarColor: r.avatarColor }) + "<div><strong>" + esc(r.userName) + '</strong><span class="muted small">' + formatDate(r.createdAt) + (r.updatedAt > r.createdAt ? " · edited" : "") + "</span></div></div>" + stars(r.rating) + '<p style="margin-top:6px">' + esc(r.comment) + "</p></article>").join("") + "</div>"
        : !mine || !mine.review
          ? '<p class="muted" style="margin-top:16px">Be the first to review this book.</p>'
          : "") +
      "</div></div>";
    el._book = book;
    el._mine = mine;
  }

  function reviewForm(existing) {
    const rating = existing ? existing.rating : 0;
    let starsHTML = "";
    for (let i = 1; i <= 5; i++) starsHTML += '<button type="button" role="radio" aria-checked="' + (i === rating) + '" aria-label="' + i + " star" + (i > 1 ? "s" : "") + '" data-star="' + i + '" class="' + (i <= rating ? "on" : "") + '" tabindex="' + (i === (rating || 1) ? "0" : "-1") + '">' + icon("star") + "</button>";
    return (
      '<form class="card card-body" data-form="review" data-review-id="' + (existing ? existing.id : "") + '" novalidate>' +
      '<h3 style="margin-bottom:14px">' + (existing ? "Edit your review" : "Write a review") + "</h3>" +
      '<div class="field" data-field="rating"><span class="label" id="rating-label">Your rating</span><div class="star-input" role="radiogroup" aria-labelledby="rating-label">' + starsHTML + '</div><input type="hidden" name="rating" value="' + (rating || "") + '"></div>' +
      '<div class="field"><label class="label" for="review-comment">Your review</label><textarea class="textarea" id="review-comment" name="comment" maxlength="1000" placeholder="What did you think of this book?">' + esc(existing ? existing.comment : "") + '</textarea><span class="hint">Up to 1000 characters.</span></div>' +
      '<div class="row"><button type="submit" class="btn btn-primary">' + (existing ? "Save changes" : "Post review") + "</button>" + (existing ? '<button type="button" class="btn btn-ghost" data-action="cancel-edit-review">Cancel</button>' : "") + "</div>" +
      "</form>"
    );
  }

  function setStarValue(form, value) {
    form.rating.value = value;
    form.querySelectorAll("[data-star]").forEach((b) => {
      const n = Number(b.dataset.star);
      b.classList.toggle("on", n <= value);
      b.setAttribute("aria-checked", String(n === value));
      b.tabIndex = n === value ? 0 : -1;
    });
  }

  async function reloadReviews() {
    const el = document.getElementById("reviews");
    if (!el || !el._book) return;
    const book = await API.book(el._book.slug);
    const mine = S.user ? await authed((t) => API.myBookState(t, book.id)) : null;
    renderReviews(book, mine);
    const r = document.getElementById("detail-rating");
    if (r) r.innerHTML = detailRating(book);
  }

  async function submitReview(form) {
    const btn = form.querySelector('[type="submit"]');
    const data = { rating: Number(form.rating.value), comment: form.comment.value };
    const book = document.getElementById("reviews")._book;
    setBusy(btn, true, "Saving…");
    try {
      if (form.dataset.reviewId) await authed((t) => API.updateReview(t, form.dataset.reviewId, data));
      else await authed((t) => API.createReview(t, book.id, data));
      toast(form.dataset.reviewId ? "Your review has been updated." : "Thanks! Your review is now live.");
      await reloadReviews();
    } catch (e) {
      setBusy(btn, false);
      if (e.details) showFieldErrors(form, e.details);
      else toast(e.message, "error");
    }
  }

  const SAMPLE_PARAGRAPHS = [
    "The morning began the way most mornings did in that house: with the slow creak of the gate, the smell of wet earth, and the sound of someone humming an old film song in the kitchen.",
    "Nobody noticed the envelope at first. It lay on the hall table between the newspaper and a bunch of keys, its corners soft with age, the handwriting on the front faded to the colour of tea.",
    "By the time anyone thought to ask where it had come from, it was already too late to pretend that nothing had changed.",
  ];

  function samplePages(s) {
    return [
      { type: "title" },
      { heading: "About this book", paras: [s.description] },
      { heading: "Chapter One", paras: SAMPLE_PARAGRAPHS },
      { type: "end" },
    ];
  }

  async function openSample(slug) {
    const m = modal({ title: "Free sample", size: "lg", className: "reader", body: loadingState("Opening sample…") });
    let s;
    try {
      s = await API.sample(slug);
    } catch (e) {
      m.el.querySelector(".modal-body").innerHTML = errorState(e, "data-modal-close");
      return;
    }
    const pages = samplePages(s);
    let idx = 0;
    m.el.querySelector("h2").textContent = "Free sample · " + s.title;
    const body = m.el.querySelector(".modal-body");
    const renderPage = () => {
      const p = pages[idx];
      let inner;
      if (p.type === "title") inner = '<div class="reader-page title-page"><p style="letter-spacing:.2em;font-size:.75rem;margin-bottom:30px">FREE SAMPLE</p><h2 style="font-size:2rem">' + esc(s.title) + '</h2><p style="font-style:italic">by ' + esc(s.authors) + '</p><p style="margin-top:40px;font-size:.8rem">' + esc(S.settings.storeName) + "</p></div>";
      else if (p.type === "end") inner = '<div class="reader-page title-page"><h3>End of sample</h3><p>Enjoyed the sample? Buy the full PDF to keep reading.</p></div>';
      else inner = '<div class="reader-page"><h3>' + esc(p.heading) + "</h3>" + p.paras.map((t) => "<p>" + esc(t) + "</p>").join("") + "</div>";
      body.innerHTML =
        '<div class="reader-bar" style="margin-bottom:14px"><span class="muted small">Page ' + (idx + 1) + " of " + pages.length + '</span><button type="button" class="btn btn-ghost btn-sm" data-open-pdf>' + icon("external") + "Open PDF in new tab</button></div>" +
        inner +
        '<div class="reader-bar" style="margin-top:14px"><button type="button" class="btn btn-outline btn-sm" data-prev' + (idx === 0 ? " disabled" : "") + ">" + icon("chevron-left") + "Previous</button>" +
        '<button type="button" class="btn btn-outline btn-sm" data-next' + (idx === pages.length - 1 ? " disabled" : "") + ">Next" + icon("chevron-right") + "</button></div>";
    };
    body.addEventListener("click", (e) => {
      if (e.target.closest("[data-prev]") && idx > 0) idx--, renderPage();
      else if (e.target.closest("[data-next]") && idx < pages.length - 1) idx++, renderPage();
      else if (e.target.closest("[data-open-pdf]")) {
        const blob = U.buildPdf([
          [{ text: "FREE SAMPLE", size: 10, gap: 40 }, { text: s.title, size: 22, bold: true, gap: 32 }, { text: "by " + s.authors, size: 13, gap: 30 }, { text: S.settings.storeName, size: 10 }],
          [{ text: "About this book", size: 16, bold: true, gap: 26 }].concat(U.wrapText(s.description, 85)),
          [{ text: "Chapter One", size: 16, bold: true, gap: 26 }].concat(...SAMPLE_PARAGRAPHS.map((p) => U.wrapText(p, 85).concat([""]))),
        ]);
        window.open(URL.createObjectURL(blob), "_blank", "noopener");
      }
    });
    body.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" && idx < pages.length - 1) idx++, renderPage();
      if (e.key === "ArrowLeft" && idx > 0) idx--, renderPage();
    });
    renderPage();
  }

  // ---------------------------------------------------------------------
  // Cart
  // ---------------------------------------------------------------------
  async function addToCart(id, btn) {
    if (S.owned.has(id)) return toast("This book is already in your library.");
    if (S.cart.includes(id)) return (location.hash = "#/cart");
    if (!S.user) {
      const ids = guestCart.get();
      if (!ids.includes(id)) ids.push(id);
      guestCart.set(ids);
      S.cart = ids;
    } else {
      setBusy(btn, true, "");
      try {
        const c = await authed((t) => API.addToCart(t, id));
        S.cart = c.books.map((b) => b.id);
      } catch (e) {
        setBusy(btn, false);
        if (e.code === "ALREADY_OWNED") S.owned.add(id);
        syncActions();
        return toast(e.message, "error");
      }
    }
    syncActions();
    toast("Added to your cart.");
  }

  function summaryRows(d) {
    return (
      '<div class="summary-row"><span>Subtotal (' + d.items.length + " book" + (d.items.length === 1 ? "" : "s") + ")</span><span>" + formatINR(d.subtotal) + "</span></div>" +
      '<div class="summary-row"><span>' + (d.gstEnabled ? "GST (" + d.gstRate + "%)" : "Tax") + "</span><span>" + formatINR(d.tax) + "</span></div>" +
      '<div class="summary-row summary-total"><span>Total</span><span>' + formatINR(d.total) + "</span></div>"
    );
  }

  function lineItem(b, item, removable) {
    return (
      '<div class="line-item">' +
      '<a class="line-item-cover" href="#/books/' + b.slug + '" tabindex="-1" aria-hidden="true">' + cover(b, { alt: "" }) + "</a>" +
      '<div><h3><a href="#/books/' + b.slug + '">' + esc(b.title) + '</a></h3><p class="muted small" style="margin:0">' + esc(authorsText(b)) + " · PDF</p></div>" +
      '<div class="line-item-side"><span class="price">' + formatINR(item.price) + '</span><span class="muted small">' + (item.tax ? "+ " + formatINR(item.tax) + " GST" : "No GST") + "</span>" +
      (removable ? '<button type="button" class="btn-link small" data-action="remove-from-cart" data-id="' + b.id + '" aria-label="Remove ' + esc(b.title) + ' from cart">Remove</button>' : "") +
      "</div></div>"
    );
  }

  async function viewCart(seq) {
    mount('<div class="container page"><div class="page-head"><h1>Your cart</h1></div>' + loadingState("Loading your cart…") + "</div>", "Cart");
    let d;
    let removedNotice = false;
    try {
      if (S.user) d = await authed(API.cart);
      else {
        const ids = guestCart.get();
        d = await API.quote(ids);
        if (d.removed.length) {
          guestCart.set(ids.filter((id) => !d.removed.includes(id)));
          removedNotice = true;
        }
      }
    } catch (e) {
      if (stale(seq)) return;
      mount('<div class="container page"><div class="page-head"><h1>Your cart</h1></div>' + errorState(e, 'data-action="retry"') + "</div>", "Cart");
      return;
    }
    if (stale(seq)) return;
    S.cart = d.books.map((b) => b.id);
    renderHeader();
    if (!d.items.length) {
      mount('<div class="container page"><div class="page-head"><h1>Your cart</h1></div>' + emptyState({ icon: "bag", title: "Your cart is empty", text: "Find a book you'll love and add it to your cart.", action: '<a class="btn btn-primary" href="#/books">Browse books</a>' }) + "</div>", "Cart");
      return;
    }
    const byId = {};
    d.books.forEach((b) => (byId[b.id] = b));
    mount(
      '<div class="container page"><div class="page-head"><h1>Your cart</h1><p class="muted" style="margin:0">Each book is a PDF, so you can add it only once.</p></div>' +
        (removedNotice ? '<div class="alert alert-warning" style="margin-bottom:16px">' + icon("alert") + "<p>Some books were removed from your cart because they are no longer available.</p></div>" : "") +
        (!S.user ? '<div class="alert alert-info" style="margin-bottom:16px">' + icon("info") + "<p>You're shopping as a guest. Your cart is saved on this device and will be added to your account when you sign in.</p></div>" : "") +
        '<div class="cart-layout"><section class="card" aria-label="Cart items">' + d.items.map((i) => lineItem(byId[i.bookId], i, true)).join("") + "</section>" +
        '<aside class="card card-body summary" aria-label="Order summary"><h2 class="card-title">Order summary</h2>' + summaryRows(d) +
        (S.user ? '<a class="btn btn-primary btn-block" style="margin-top:16px" href="#/checkout">Proceed to checkout' + icon("arrow-right") + "</a>" : '<a class="btn btn-primary btn-block" style="margin-top:16px" href="#/login?next=%2Fcheckout">' + icon("lock") + "Sign in to checkout</a>") +
        '<p class="secure-note">' + icon("shield") + "<span>Prices and tax are calculated by our server. Your books will be added to My Library after payment.</span></p>" +
        "</aside></div></div>",
      "Cart"
    );
  }

  async function removeFromCart(id) {
    if (S.user) {
      try {
        const c = await authed((t) => API.removeFromCart(t, id));
        S.cart = c.books.map((b) => b.id);
      } catch (e) {
        return toast(e.message, "error");
      }
    } else {
      guestCart.set(guestCart.get().filter((x) => x !== id));
      S.cart = guestCart.get();
    }
    toast("Removed from your cart.");
    route();
  }

  // ---------------------------------------------------------------------
  // Checkout + Razorpay Standard Checkout
  // ---------------------------------------------------------------------
  async function viewCheckout(seq) {
    mount('<div class="container page"><div class="page-head"><h1>Checkout</h1></div>' + loadingState("Preparing checkout…") + "</div>", "Checkout");
    let d;
    try {
      d = await authed(API.cart);
    } catch (e) {
      if (stale(seq)) return;
      mount('<div class="container page"><div class="page-head"><h1>Checkout</h1></div>' + errorState(e, 'data-action="retry"') + "</div>", "Checkout");
      return;
    }
    if (stale(seq)) return;
    S.cart = d.books.map((b) => b.id);
    renderHeader();
    if (!d.items.length) {
      mount('<div class="container page"><div class="page-head"><h1>Checkout</h1></div>' + emptyState({ icon: "bag", title: "Your cart is empty", text: "Add a book to your cart before checking out.", action: '<a class="btn btn-primary" href="#/books">Browse books</a>' }) + "</div>", "Checkout");
      return;
    }
    const byId = {};
    d.books.forEach((b) => (byId[b.id] = b));
    mount(
      '<div class="container page">' +
        '<ol class="breadcrumb"><li><a href="#/cart">Cart</a></li><li aria-current="page">Checkout</li></ol>' +
        '<div class="page-head"><h1>Checkout</h1></div>' +
        '<div class="cart-layout"><div class="stack">' +
        '<section class="card" aria-labelledby="co-items"><div class="card-body row-between" style="padding-bottom:0"><h2 class="card-title" id="co-items" style="margin:0">Your books</h2><a class="btn-link small" href="#/cart">Edit cart</a></div>' + d.items.map((i) => lineItem(byId[i.bookId], i, false)).join("") + "</section>" +
        '<section class="card card-body" aria-labelledby="co-buyer"><h2 class="card-title" id="co-buyer">Your details</h2><dl class="details-grid"><div><dt>Name</dt><dd>' + esc(S.user.name) + "</dd></div><div><dt>Email</dt><dd>" + esc(S.user.email) + '</dd></div></dl><p class="muted small" style="margin:12px 0 0">These details from your Google account are shared with Razorpay for this payment. Your receipt and library link are sent to this email.</p></section>' +
        "</div>" +
        '<aside class="card card-body summary" aria-label="Payment summary"><h2 class="card-title">Payment</h2>' + summaryRows(d) +
        '<button type="button" class="btn btn-primary btn-block" style="margin-top:16px" data-action="pay">' + icon("lock") + "Pay " + formatINR(d.total) + "</button>" +
        '<p class="secure-note">' + icon("shield") + "<span>You'll complete payment securely in Razorpay (UPI, cards, netbanking, wallets). Your card and UPI details are never shared with " + esc(S.settings.storeName) + ".</span></p>" +
        "</aside></div></div>",
      "Checkout"
    );
  }

  async function startPayment(btn) {
    setBusy(btn, true, "Creating order…");
    let order;
    try {
      order = await authed(API.createOrder);
    } catch (e) {
      setBusy(btn, false);
      toast(e.message, "error");
      if (e.code === "CART_EMPTY") route();
      return;
    }
    setBusy(btn, false);
    openRazorpayCheckout({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: order.storeName,
      image: order.logoImage,
      order_id: order.razorpayOrderId,
      prefill: order.prefill,
      theme: { color: "#1f3a2d" },
      handler: async (response) => {
        try {
          await authed((t) => API.verifyPayment(t, response));
        } catch (e) {
          toast(e.message, "error");
        }
        location.hash = "#/checkout/success/" + order.orderId;
      },
      onFailure: (error) => {
        location.hash = "#/checkout/failure/" + order.orderId + qs({ reason: error.description });
      },
      onDismiss: () => toast("Payment cancelled. You can try again when you're ready."),
    });
  }

  // Mock of Razorpay Standard Checkout (checkout.js)
  function openRazorpayCheckout(opts) {
    const m = modal({ label: "Razorpay Checkout", className: "rzp", backdropClass: "rzp-backdrop", dismissible: false, body: "" });
    const body = m.el.querySelector(".modal-body");
    let screen = "methods";
    let method = null;
    const METHODS = [
      ["upi", "zap", "UPI", "Google Pay, PhonePe, Paytm and more"],
      ["card", "card", "Card", "Visa, Mastercard, RuPay"],
      ["netbanking", "home", "Netbanking", "All major Indian banks"],
      ["wallet", "bag", "Wallet", "Paytm, PhonePe, Amazon Pay"],
    ];
    const render = () => {
      let content = "";
      if (screen === "methods") {
        content = '<p class="rzp-label">Payment options</p>' + METHODS.map((x) => '<button type="button" class="rzp-method" data-method="' + x[0] + '">' + icon(x[1]) + "<div><strong>" + x[2] + "</strong><span>" + x[3] + "</span></div>" + icon("chevron-right") + "</button>").join("");
      } else if (screen === "simulate") {
        const mm = METHODS.find((x) => x[0] === method);
        content = '<button type="button" class="rzp-back" data-rzp-back>' + icon("chevron-left") + "Back</button>" + '<div class="rzp-sim"><p class="rzp-label">' + mm[2] + "</p><p>You are in <strong>test mode</strong>. Choose the result of this payment.</p>" + '<div class="rzp-sim-actions"><button type="button" class="rzp-btn rzp-btn-success" data-outcome="success">Success</button><button type="button" class="rzp-btn rzp-btn-fail" data-outcome="failure">Failure</button></div></div>';
      } else if (screen === "processing") {
        content = '<div class="rzp-processing" role="status"><span class="spinner"></span><p>Processing your payment…<br>Please don\'t close this window.</p></div>';
      } else if (screen === "cancel") {
        content = '<div class="rzp-sim"><p style="font-weight:600;color:#111">Are you sure you want to cancel this payment?</p><div class="rzp-sim-actions"><button type="button" class="rzp-btn rzp-btn-ghost" data-cancel="no">No, continue</button><button type="button" class="rzp-btn rzp-btn-fail" data-cancel="yes">Yes, cancel</button></div></div>';
      }
      body.innerHTML =
        '<div class="rzp-head"><div class="rzp-merchant"><span class="rzp-logo">' + (opts.image ? '<img src="' + opts.image + '" alt="">' : icon("book-open")) + "</span><div><strong>" + esc(opts.name) + '</strong><span class="rzp-test">TEST MODE</span></div></div>' +
        (screen !== "processing" ? '<button type="button" class="rzp-close" data-rzp-close aria-label="Close payment window">' + icon("x") + "</button>" : "") +
        '<div class="rzp-amount">' + formatINR(opts.amount) + "</div></div>" +
        '<div class="rzp-contact"><span>' + esc(opts.prefill.name) + "</span><span>" + esc(opts.prefill.email) + "</span></div>" +
        '<div class="rzp-body">' + content + "</div>" +
        '<div class="rzp-foot">' + icon("lock") + "Secured by Razorpay · Order " + esc(opts.order_id) + "</div>";
      const f = body.querySelector("button");
      if (f) f.focus();
    };
    body.addEventListener("click", async (e) => {
      const t = e.target;
      if (t.closest("[data-rzp-close]")) (screen = "cancel"), render();
      else if (t.closest("[data-cancel]")) {
        if (t.closest("[data-cancel]").dataset.cancel === "yes") {
          m.close();
          opts.onDismiss();
        } else (screen = method ? "simulate" : "methods"), render();
      } else if (t.closest("[data-rzp-back]")) (screen = "methods"), (method = null), render();
      else if (t.closest("[data-method]")) (method = t.closest("[data-method]").dataset.method), (screen = "simulate"), render();
      else if (t.closest("[data-outcome]")) {
        const outcome = t.closest("[data-outcome]").dataset.outcome;
        screen = "processing";
        render();
        const res = await MockRazorpay.pay(opts.order_id, outcome, method);
        setTimeout(() => {
          m.close();
          if (res.error) opts.onFailure(res.error);
          else opts.handler(res);
        }, 700);
      }
    });
    render();
  }

  async function viewPaymentSuccess(seq, orderId) {
    mount('<div class="container page"><div class="result">' + loadingState("Confirming your payment with Razorpay… This usually takes a few seconds.") + "</div></div>", "Confirming payment");
    const started = Date.now();
    let order;
    while (!stale(seq)) {
      try {
        order = await authed((t) => API.order(t, orderId));
      } catch (e) {
        if (stale(seq)) return;
        mount('<div class="container page">' + (e.status === 404 ? emptyState({ icon: "receipt", title: "Order not found", action: '<a class="btn btn-primary" href="#/orders">View orders</a>' }) : errorState(e, 'data-action="retry"')) + "</div>", "Payment");
        return;
      }
      if (order.status !== "pending" || Date.now() - started > 30000) break;
      await new Promise((r) => setTimeout(r, 1200));
    }
    if (stale(seq)) return;
    if (order.status === "failed") {
      location.replace("#/checkout/failure/" + orderId);
      return;
    }
    if (order.status === "paid") {
      await loadUserState().catch(() => {});
      renderHeader();
      mount(
        '<div class="container page"><div class="result result-success"><span class="result-icon">' + icon("check-circle") + "</span>" +
          "<h1>Payment successful</h1><p class=\"muted\">Thank you! Your order <strong>" + esc(order.id) + "</strong> is confirmed and your books are ready in My Library.</p>" +
          '<div class="card"><div class="card-body"><h2 class="card-title">Order summary</h2><ul class="order-items">' + order.items.map((i) => "<li>" + icon("book") + " " + esc(i.title) + "</li>").join("") + "</ul>" +
          '<div class="summary-row summary-total"><span>Total paid</span><span>' + formatINR(order.total) + "</span></div>" +
          '<p class="muted small" style="margin:10px 0 0">A confirmation email with a link to your library has been sent to ' + esc(order.email) + ".</p></div></div>" +
          '<div class="result-actions"><a class="btn btn-primary" href="#/library">' + icon("library") + 'Go to My Library</a><a class="btn btn-outline" href="#/orders/' + order.id + '">View order</a></div>' +
          "</div></div>",
        "Payment successful"
      );
      return;
    }
    mount(
      '<div class="container page"><div class="result"><span class="state-icon">' + icon("clock") + "</span><h1>We're still confirming your payment</h1>" +
        "<p class=\"muted\">Razorpay hasn't confirmed order <strong>" + esc(order.id) + "</strong> yet. Your books will appear in My Library as soon as the payment is confirmed. You won't be charged twice.</p>" +
        '<div class="result-actions"><button type="button" class="btn btn-primary" data-action="retry">' + icon("refresh") + 'Check again</button><a class="btn btn-outline" href="#/orders/' + order.id + '">View order</a></div></div></div>',
      "Confirming payment"
    );
  }

  async function viewPaymentFailure(seq, orderId, reason) {
    mount('<div class="container page">' + loadingState() + "</div>", "Payment failed");
    let order = null;
    try {
      order = await authed((t) => API.order(t, orderId));
    } catch (e) {
      /* show the page without order details */
    }
    if (stale(seq)) return;
    const why = reason || (order && order.failureReason) || "The payment could not be completed.";
    mount(
      '<div class="container page"><div class="result result-failure"><span class="result-icon">' + icon("x-circle") + "</span>" +
        "<h1>Payment failed</h1><p class=\"muted\">" + esc(why) + "</p>" +
        (order ? '<div class="card"><div class="card-body"><dl class="details-grid"><div><dt>Order</dt><dd>' + esc(order.id) + "</dd></div><div><dt>Amount</dt><dd>" + formatINR(order.total) + '</dd></div></dl><p class="muted small" style="margin:12px 0 0">You have not been charged. The books are still in your cart.</p></div></div>' : "") +
        '<div class="result-actions"><a class="btn btn-primary" href="#/checkout">' + icon("refresh") + 'Try again</a><a class="btn btn-outline" href="#/cart">Back to cart</a></div>' +
        "</div></div>",
      "Payment failed"
    );
  }

  // ---------------------------------------------------------------------
  // Library & downloads
  // ---------------------------------------------------------------------
  function libraryCard(item) {
    const b = item.book;
    const left = Math.max(0, item.downloadLimit - item.downloadCount);
    const pct = Math.min(100, (item.downloadCount / item.downloadLimit) * 100);
    return (
      '<article class="card library-card" data-lib-card="' + b.id + '">' +
      "<div>" + cover(b) + "</div>" +
      '<div><h3>' + esc(b.title) + '</h3><p class="muted small" style="margin:0">' + esc(authorsText(b)) + "</p>" +
      '<p class="small" style="margin:6px 0 0">Purchased on ' + formatDate(item.purchasedAt) + "</p>" +
      '<div class="progress" role="progressbar" aria-label="Downloads used" aria-valuemin="0" aria-valuemax="' + item.downloadLimit + '" aria-valuenow="' + item.downloadCount + '"><span style="width:' + pct + '%"></span></div>' +
      '<p class="muted small" style="margin:0">' + item.downloadCount + " of " + item.downloadLimit + " downloads used</p>" +
      (left > 0
        ? '<button type="button" class="btn btn-primary btn-sm" data-action="download" data-id="' + b.id + '">' + icon("download") + "Download PDF</button>"
        : '<button type="button" class="btn btn-sm" disabled>' + icon("ban") + 'Download limit reached</button><p class="muted small" style="margin:6px 0 0">Need help? Contact <a href="mailto:' + esc(S.settings.supportEmail) + '">' + esc(S.settings.supportEmail) + "</a></p>") +
      "</div></article>"
    );
  }

  async function viewLibrary(seq) {
    mount('<div class="container page"><div class="page-head"><h1>My Library</h1></div>' + loadingState("Loading your library…") + "</div>", "My Library");
    let items;
    try {
      items = await authed(API.library);
    } catch (e) {
      if (stale(seq)) return;
      mount('<div class="container page"><div class="page-head"><h1>My Library</h1></div>' + errorState(e, 'data-action="retry"') + "</div>", "My Library");
      return;
    }
    if (stale(seq)) return;
    S.owned = new Set(items.map((i) => i.book.id));
    S.library = {};
    items.forEach((i) => (S.library[i.book.id] = i));
    if (!items.length) {
      mount('<div class="container page"><div class="page-head"><h1>My Library</h1></div>' + emptyState({ icon: "library", title: "Your library is empty", text: "Books you buy will appear here, ready to download.", action: '<a class="btn btn-primary" href="#/books">Browse books</a>' }) + "</div>", "My Library");
      return;
    }
    mount(
      '<div class="container page"><div class="page-head"><h1>My Library</h1><p class="muted" style="margin:0">' + items.length + " book" + (items.length === 1 ? "" : "s") + ". Download links are created when you click Download and expire after 5 minutes.</p></div>" +
        '<div class="library-grid">' + items.map(libraryCard).join("") + "</div></div>",
      "My Library"
    );
  }

  async function download(bookId, btn) {
    setBusy(btn, true, "Preparing…");
    try {
      const r = await authed((t) => API.requestDownload(t, bookId, { userAgent: navigator.userAgent }));
      const footer = { text: "Licensed to " + r.licensedTo + " - " + S.settings.storeName, size: 8 };
      const chapter = [{ text: "Chapter One", size: 16, bold: true, gap: 26 }].concat(...SAMPLE_PARAGRAPHS.map((p) => U.wrapText(p, 85).concat([""])), [{ text: "", gap: 380 }, footer]);
      const blob = U.buildPdf([
        [{ text: r.title, size: 22, bold: true, gap: 34 }, { text: "by " + r.authors, size: 13, gap: 60 }, { text: "Licensed to " + r.licensedTo, size: 10 }, { text: S.settings.storeName + " - PDF edition", size: 10 }],
        chapter,
      ]);
      U.downloadBlob(blob, r.fileName);
      toast("Downloading " + r.fileName + ". The secure link expires in 5 minutes.");
      const item = S.library[bookId];
      if (item) {
        item.downloadCount = r.downloadCount;
        const card = document.querySelector('[data-lib-card="' + bookId + '"]');
        if (card) card.outerHTML = libraryCard(item);
      }
    } catch (e) {
      setBusy(btn, false);
      toast(e.message, "error");
      if (e.code === "DOWNLOAD_LIMIT_REACHED" || e.code === "NOT_OWNED") route();
    }
  }

  // ---------------------------------------------------------------------
  // Orders & invoices
  // ---------------------------------------------------------------------
  async function viewOrders(seq) {
    mount('<div class="container page"><div class="page-head"><h1>Orders</h1></div>' + loadingState("Loading your orders…") + "</div>", "Orders");
    let orders;
    try {
      orders = await authed(API.orders);
    } catch (e) {
      if (stale(seq)) return;
      mount('<div class="container page"><div class="page-head"><h1>Orders</h1></div>' + errorState(e, 'data-action="retry"') + "</div>", "Orders");
      return;
    }
    if (stale(seq)) return;
    if (!orders.length) {
      mount('<div class="container page"><div class="page-head"><h1>Orders</h1></div>' + emptyState({ icon: "receipt", title: "No orders yet", text: "When you buy a book, your order will appear here.", action: '<a class="btn btn-primary" href="#/books">Browse books</a>' }) + "</div>", "Orders");
      return;
    }
    mount(
      '<div class="container page"><div class="page-head"><h1>Orders</h1></div>' +
        orders
          .map(
            (o) =>
              '<article class="card order-card"><dl class="order-card-head">' +
              "<div><dt>Order</dt><dd>" + esc(o.id) + "</dd></div>" +
              "<div><dt>Date</dt><dd>" + formatDate(o.createdAt) + "</dd></div>" +
              "<div><dt>Amount</dt><dd>" + formatINR(o.total) + "</dd></div>" +
              statusBadge(o.status) +
              '</dl><div class="order-card-body"><ul class="order-items">' + o.items.map((i) => "<li>" + esc(i.title) + "</li>").join("") + "</ul>" +
              '<div class="row"><a class="btn btn-outline btn-sm" href="#/orders/' + o.id + '">View details</a>' +
              (o.status === "paid" ? '<button type="button" class="btn btn-ghost btn-sm" data-action="invoice" data-id="' + o.id + '">' + icon("download") + "Invoice</button>" : "") +
              "</div></div></article>"
          )
          .join("") +
        "</div>",
      "Orders"
    );
  }

  async function viewOrder(seq, id) {
    mount('<div class="container page">' + loadingState("Loading order…") + "</div>", "Order");
    let o;
    try {
      o = await authed((t) => API.order(t, id));
    } catch (e) {
      if (stale(seq)) return;
      mount('<div class="container page">' + (e.status === 404 ? emptyState({ icon: "receipt", title: "Order not found", action: '<a class="btn btn-primary" href="#/orders">Back to orders</a>' }) : errorState(e, 'data-action="retry"')) + "</div>", "Order");
      return;
    }
    if (stale(seq)) return;
    const notes = {
      pending: ["alert-warning", "clock", "This order is awaiting payment. Unpaid orders expire 30 minutes after they are created."],
      failed: ["alert-error", "x-circle", "Payment failed: " + (o.failureReason || "the payment could not be completed.") + " You have not been charged."],
      expired: ["alert-warning", "clock", "This order expired because payment was not completed within 30 minutes."],
      refunded: ["alert-info", "info", "This order was refunded on " + formatDate(o.refundedAt) + ". The books from this order have been removed from your library."],
    };
    const n = notes[o.status];
    const gstRow = o.tax ? "GST" : "Tax";
    mount(
      '<div class="container page">' +
        '<ol class="breadcrumb"><li><a href="#/orders">Orders</a></li><li aria-current="page">' + esc(o.id) + "</li></ol>" +
        '<div class="page-head row-between"><div><h1 style="margin-bottom:4px">Order ' + esc(o.id) + '</h1><p class="muted" style="margin:0">Placed on ' + formatDateTime(o.createdAt) + "</p></div>" + statusBadge(o.status) + "</div>" +
        (n ? '<div class="alert ' + n[0] + '" style="margin-bottom:16px">' + icon(n[1]) + "<p>" + esc(n[2]) + "</p></div>" : "") +
        '<div class="cart-layout"><section class="card" aria-label="Items"><div class="table-wrap"><table class="table responsive"><thead><tr><th>Book</th><th class="num">Price</th><th class="num">' + gstRow + "</th></tr></thead><tbody>" +
        o.items.map((i) => '<tr><td class="td-main">' + esc(i.title) + '</td><td class="num" data-label="Price">' + formatINR(i.price) + '</td><td class="num" data-label="' + gstRow + '">' + formatINR(i.tax) + "</td></tr>").join("") +
        "</tbody></table></div></section>" +
        '<aside class="card card-body summary"><h2 class="card-title">Summary</h2>' +
        '<div class="summary-row"><span>Subtotal</span><span>' + formatINR(o.subtotal) + '</span></div><div class="summary-row"><span>' + gstRow + "</span><span>" + formatINR(o.tax) + '</span></div><div class="summary-row summary-total"><span>Total</span><span>' + formatINR(o.total) + "</span></div>" +
        (o.razorpayPaymentId && o.status !== "failed" ? '<dl class="details-grid" style="margin-top:14px;grid-template-columns:1fr"><div><dt>Payment ID</dt><dd class="mono">' + esc(o.razorpayPaymentId) + "</dd></div>" + (o.paidAt ? "<div><dt>Paid on</dt><dd>" + formatDateTime(o.paidAt) + "</dd></div>" : "") + (o.invoiceNumber ? "<div><dt>Invoice</dt><dd>" + esc(o.invoiceNumber) + "</dd></div>" : "") + "</dl>" : "") +
        (o.status === "paid" ? '<button type="button" class="btn btn-outline btn-block" style="margin-top:14px" data-action="invoice" data-id="' + o.id + '">' + icon("download") + "Download invoice (PDF)</button>" + '<a class="btn btn-primary btn-block" style="margin-top:10px" href="#/library">' + icon("library") + "Go to My Library</a>" : "") +
        "</aside></div></div>",
      "Order " + o.id
    );
  }

  async function downloadInvoice(id, btn) {
    setBusy(btn, true, "Preparing…");
    try {
      const inv = await authed((t) => API.invoice(t, id));
      const o = inv.order;
      const st = inv.store;
      const money = (p) => "INR " + (p / 100).toFixed(2);
      const lines = [
        { text: st.gstEnabled ? "TAX INVOICE" : "INVOICE", size: 18, bold: true, gap: 30 },
        { text: st.name, size: 12, bold: true },
        { text: "Support: " + st.supportEmail },
        st.gstEnabled ? { text: "GSTIN: " + st.gstin } : null,
        { text: "", gap: 12 },
        { text: "Invoice number: " + o.invoiceNumber },
        { text: "Invoice date: " + formatDate(o.paidAt) },
        { text: "Order ID: " + o.id },
        { text: "Razorpay payment ID: " + o.razorpayPaymentId },
        { text: "", gap: 12 },
        { text: "Billed to", bold: true },
        { text: inv.buyer.name },
        { text: inv.buyer.email },
        { text: "", gap: 12 },
        { text: "Items (PDF e-books)", bold: true },
      ]
        .concat(o.items.map((i) => ({ text: i.title + "   " + money(i.price) + (st.gstEnabled ? "   GST " + money(i.tax) : "") })))
        .concat([
          { text: "", gap: 12 },
          { text: "Subtotal: " + money(o.subtotal) },
          { text: (st.gstEnabled ? "GST (" + st.gstRate + "%)" : "Tax") + ": " + money(o.tax) },
          { text: "Total paid: " + money(o.total), bold: true, size: 12 },
          { text: "", gap: 16 },
          { text: "Paid online via Razorpay. This is a computer-generated invoice.", size: 9 },
        ])
        .filter(Boolean);
      U.downloadBlob(U.buildPdf([lines]), inv.fileName);
      toast("Invoice " + inv.fileName + " downloaded.");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(btn, false);
    }
  }

  // ---------------------------------------------------------------------
  // Wishlist
  // ---------------------------------------------------------------------
  async function toggleWish(id) {
    if (!S.user) return goLogin();
    const on = S.wishlist.has(id);
    try {
      const list = await authed((t) => (on ? API.removeFromWishlist(t, id) : API.addToWishlist(t, id)));
      S.wishlist = new Set(list);
      toast(on ? "Removed from your wishlist." : "Saved to your wishlist.");
      syncActions();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function viewWishlist(seq) {
    mount('<div class="container page"><div class="page-head"><h1>Wishlist</h1></div><div class="book-grid">' + skeletonCards(4) + "</div></div>", "Wishlist");
    let books;
    try {
      books = await authed(API.wishlist);
    } catch (e) {
      if (stale(seq)) return;
      mount('<div class="container page"><div class="page-head"><h1>Wishlist</h1></div>' + errorState(e, 'data-action="retry"') + "</div>", "Wishlist");
      return;
    }
    if (stale(seq)) return;
    S.wishlist = new Set(books.map((b) => b.id));
    renderHeader();
    if (!books.length) {
      mount('<div class="container page"><div class="page-head"><h1>Wishlist</h1></div>' + emptyState({ icon: "heart", title: "Your wishlist is empty", text: "Tap the heart on any book to save it for later.", action: '<a class="btn btn-primary" href="#/books">Browse books</a>' }) + "</div>", "Wishlist");
      return;
    }
    mount(
      '<div class="container page"><div class="page-head"><h1>Wishlist</h1><p class="muted" style="margin:0">' + books.length + " saved book" + (books.length === 1 ? "" : "s") + "</p></div>" +
        '<div class="book-grid">' +
        books
          .map((b) =>
            bookCard(b, {
              noWish: true,
              noAction: true,
              footer:
                '<div class="book-card-actions">' +
                (S.owned.has(b.id) ? '<a class="owned-chip" href="#/library">' + icon("check-circle") + "In your library</a>" : S.cart.includes(b.id) ? '<a class="btn btn-sm btn-outline" href="#/cart">' + icon("check") + "In cart</a>" : '<button type="button" class="btn btn-sm btn-primary" data-action="move-to-cart" data-id="' + b.id + '">' + icon("bag") + "Move to cart</button>") +
                '<button type="button" class="btn btn-sm btn-ghost" data-action="remove-wish" data-id="' + b.id + '" aria-label="Remove ' + esc(b.title) + ' from wishlist">' + icon("trash") + "Remove</button></div>",
            })
          )
          .join("") +
        "</div></div>",
      "Wishlist"
    );
  }

  async function moveToCart(id, btn) {
    setBusy(btn, true, "Moving…");
    try {
      const r = await authed((t) => API.moveWishlistToCart(t, id));
      S.cart = r.cart.books.map((b) => b.id);
      S.wishlist = new Set(r.wishlist);
      toast("Moved to your cart.");
      route();
    } catch (e) {
      setBusy(btn, false);
      if (e.code === "ALREADY_OWNED") S.owned.add(id);
      toast(e.message, "error");
    }
  }

  async function removeWish(id) {
    try {
      const list = await authed((t) => API.removeFromWishlist(t, id));
      S.wishlist = new Set(list);
      toast("Removed from your wishlist.");
      route();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  // ---------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------
  async function viewProfile(seq) {
    mount('<div class="container page"><div class="page-head"><h1>Profile</h1></div>' + loadingState() + "</div>", "Profile");
    let me;
    let del;
    try {
      me = await authed(API.me);
      del = await authed(API.deletionRequest);
    } catch (e) {
      if (stale(seq)) return;
      mount('<div class="container page"><div class="page-head"><h1>Profile</h1></div>' + errorState(e, 'data-action="retry"') + "</div>", "Profile");
      return;
    }
    if (stale(seq)) return;
    S.user = me;
    renderHeader();
    mount(
      '<div class="container page"><div class="page-head"><h1>Profile</h1></div><div class="profile-grid">' +
        '<section class="card card-body" aria-labelledby="pf-title"><div class="profile-head">' + avatar(me, "avatar-lg") + '<div><h2 id="pf-title" style="margin:0">' + esc(me.name) + '</h2><p class="muted" style="margin:0">' + esc(me.email) + '</p><p class="muted small" style="margin:0">Member since ' + formatDate(me.createdAt) + "</p></div></div>" +
        '<form data-form="profile" novalidate><div class="field"><label class="label" for="pf-name">Display name</label><input class="input" id="pf-name" name="name" value="' + esc(me.name) + '" maxlength="60" autocomplete="name"></div>' +
        '<div class="field"><label class="label" for="pf-email">Email</label><input class="input" id="pf-email" value="' + esc(me.email) + '" readonly aria-describedby="pf-email-hint"><span class="hint" id="pf-email-hint">Your email comes from your Google account and can\'t be changed here.</span></div>' +
        '<button type="submit" class="btn btn-primary">Save changes</button></form></section>' +
        '<div class="stack"><section class="card card-body"><h2 class="card-title">Sign-in</h2><p class="muted" style="margin-bottom:14px">You sign in with Google (' + esc(me.email) + ').</p><button type="button" class="btn btn-outline" data-action="logout">' + icon("logout") + "Sign out</button></section>" +
        '<section class="card card-body" aria-labelledby="del-title"><h2 class="card-title" id="del-title">Delete account</h2>' +
        (del
          ? '<div class="alert alert-info">' + icon("info") + "<p><strong>Deletion requested on " + formatDate(del.createdAt) + ".</strong>We'll process your request and email you when it's done. Order records are kept as required for tax purposes.</p></div>"
          : '<p class="muted">You can ask us to delete your account and personal data. Order and invoice records are kept as required for tax purposes.</p><button type="button" class="btn btn-danger-outline" data-action="request-deletion">' + icon("trash") + "Request account deletion</button>") +
        "</section></div></div></div>",
      "Profile"
    );
  }

  // ---------------------------------------------------------------------
  // Login: Google One Tap (FedCM) + "Sign in with Google" fallback button
  // ---------------------------------------------------------------------
  function viewLogin(next) {
    if (S.user) {
      location.replace("#" + (next || "/"));
      return;
    }
    mount(
      '<div class="auth-wrap"><div class="card auth-card">' + brandHTML() +
        "<h1>Sign in</h1>" +
        '<p class="muted">Sign in with your Google account to check out, open your library and download your books.</p>' +
        (next && next !== "/" ? '<div class="alert alert-info">' + icon("lock") + "<p>Please sign in to continue.</p></div>" : "") +
        '<div id="login-error"></div>' +
        '<button type="button" class="gsi-button" data-action="google-signin" id="gsi-btn">' + U.GOOGLE_G + "<span>Sign in with Google</span></button>" +
        '<p class="auth-legal">By continuing, you agree to our <a href="#/terms">Terms of Service</a> and <a href="#/privacy">Privacy Policy</a>.</p>' +
        "</div></div>",
      "Sign in"
    );
    S.loginNext = next || "/";
    showOneTap();
  }

  function googleAccountRows() {
    return MockGoogle.storeAccounts
      .map((a, i) => '<button type="button" class="g-account" data-g-account="' + i + '">' + avatar({ name: a.name, avatarColor: a.picture }) + '<span class="g-account-text"><strong>' + esc(a.name) + "</strong><span>" + esc(a.email) + '</span></span><span class="g-account-note">' + esc(a.note) + "</span></button>")
      .join("");
  }

  function showOneTap() {
    if (S.user || sessionStorage.getItem("pp_onetap_dismissed")) return;
    removeOneTap();
    const el = document.createElement("div");
    el.className = "onetap";
    el.id = "onetap";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Sign in with Google");
    el.innerHTML =
      '<div class="onetap-head">' + U.GOOGLE_G + "<span>Sign in to pageandpine.in with google.com</span>" +
      '<button type="button" class="onetap-close" data-onetap-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="onetap-title">Choose an account</div>' +
      googleAccountRows() +
      '<div class="onetap-foot">To continue, google.com will share your name, email address and profile picture with this site.</div>';
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-onetap-close]")) {
        sessionStorage.setItem("pp_onetap_dismissed", "1");
        removeOneTap();
        const b = document.getElementById("gsi-btn");
        if (b) b.focus();
        return;
      }
      const acc = e.target.closest("[data-g-account]");
      if (acc) {
        removeOneTap();
        signIn(MockGoogle.storeAccounts[Number(acc.dataset.gAccount)]);
      }
    });
  }

  function removeOneTap() {
    const el = document.getElementById("onetap");
    if (el) el.remove();
  }

  function openGoogleChooser() {
    const m = modal({
      label: "Sign in with Google",
      className: "g-chooser",
      body:
        '<div class="g-chooser-head" style="position:relative"><button type="button" class="onetap-close" data-modal-close aria-label="Close" style="position:absolute;top:10px;right:10px">' + icon("x") + "</button>" +
        '<div style="display:flex;justify-content:center">' + U.GOOGLE_G.replace(/width="18" height="18"/, 'width="30" height="30"') + "</div>" +
        "<h2>Choose an account</h2><p>to continue to " + esc(S.settings.storeName) + "</p></div>" +
        googleAccountRows() +
        '<div class="g-chooser-foot">To continue, Google will share your name, email address and profile picture with ' + esc(S.settings.storeName) + ".</div>",
    });
    m.el.addEventListener("click", (e) => {
      const acc = e.target.closest("[data-g-account]");
      if (acc) {
        m.close();
        signIn(MockGoogle.storeAccounts[Number(acc.dataset.gAccount)]);
      }
    });
  }

  async function signIn(account) {
    const btn = document.getElementById("gsi-btn");
    const errBox = document.getElementById("login-error");
    if (errBox) errBox.innerHTML = "";
    setBusy(btn, true, "Signing in…");
    try {
      const credential = MockGoogle.credentialFor(account);
      setSession(await API.signInWithGoogle(credential));
      sessionStorage.removeItem("pp_g_logged_out");
      const guest = guestCart.get();
      let mergeMsg = "";
      if (guest.length) {
        const merged = await authed((t) => API.mergeCart(t, guest));
        guestCart.clear();
        if (merged.added) mergeMsg = " " + merged.added + " book" + (merged.added === 1 ? " was" : "s were") + " added to your cart.";
        if (merged.skippedOwned) mergeMsg += " " + merged.skippedOwned + " book" + (merged.skippedOwned === 1 ? " you already own was" : "s you already own were") + " left out.";
      }
      await loadUserState();
      const first = S.user.name.split(" ")[0];
      const isNew = Date.now() - S.user.createdAt < 15000;
      toast((isNew ? "Welcome, " + first + "! Your account has been created." : "Welcome back, " + first + "!") + mergeMsg);
      const next = S.loginNext || "/";
      S.loginNext = null;
      renderHeader();
      location.hash = "#" + (next.indexOf("/login") === 0 ? "/" : next);
    } catch (e) {
      setBusy(btn, false);
      S.token = null;
      S.user = null;
      const box = document.getElementById("login-error");
      const msg = e.code === "USER_BLOCKED" ? "<strong>This account has been blocked.</strong>Please contact " + esc(S.settings.supportEmail) + " for help." : esc(e.message);
      if (box) box.innerHTML = '<div class="alert alert-error" role="alert">' + icon("alert") + "<p>" + msg + "</p></div>";
      else toast(e.message, "error");
    }
  }

  async function logout() {
    try {
      await API.logout();
    } catch (e) {
      /* session is cleared locally either way */
    }
    // googleLogout(): disable automatic re-sign-in
    sessionStorage.setItem("pp_g_logged_out", "1");
    S.token = null;
    S.user = null;
    S.owned = new Set();
    S.wishlist = new Set();
    S.cart = guestCart.get();
    renderHeader();
    toast("You have been signed out.");
    if (location.hash === "#/" || location.hash === "") route();
    else location.hash = "#/";
  }

  // ---------------------------------------------------------------------
  // Legal pages & 404
  // ---------------------------------------------------------------------
  function viewLegal(which) {
    const s = S.settings;
    const pages = {
      terms: {
        title: "Terms of Service",
        body:
          "<p>These terms apply when you use " + esc(s.storeName) + " to browse, buy and download digital books in PDF format.</p>" +
          "<h2>Your account</h2><p>You sign in with your Google account. You are responsible for activity on your account. We may block accounts that break these terms.</p>" +
          "<h2>Purchases and licence</h2><p>When you buy a book you get a personal, non-transferable licence to download and read it. Each purchase has a download limit shown in My Library. Sharing or reselling files is not allowed.</p>" +
          "<h2>Prices and payment</h2><p>Prices are in Indian Rupees (INR). Applicable GST is shown in your cart before you pay. Payments are processed by Razorpay.</p>" +
          "<h2>Contact</h2><p>Questions? Email <a href=\"mailto:" + esc(s.supportEmail) + "\">" + esc(s.supportEmail) + "</a>.</p>",
      },
      privacy: {
        title: "Privacy Policy",
        body:
          "<p>This policy explains what personal data " + esc(s.storeName) + " collects and how we use it.</p>" +
          "<h2>What we collect</h2><p>From Google sign-in we receive your name, email address and profile picture. We store your orders, the books in your library, and a log of your downloads (time and IP address).</p>" +
          "<h2>Payments</h2><p>Card, UPI and bank details are entered in Razorpay's checkout and are never sent to or stored on our servers.</p>" +
          "<h2>Emails</h2><p>We send transactional emails only: a welcome email, order confirmations, payment failure notices and refund confirmations.</p>" +
          "<h2>Deleting your account</h2><p>You can request account deletion from your Profile page. Order and invoice records are kept as required for tax purposes.</p>",
      },
      "refund-policy": {
        title: "Refund Policy",
        body:
          "<p>Because books are delivered instantly as PDF downloads, refunds are reviewed case by case.</p>" +
          "<h2>How to request a refund</h2><p>Email <a href=\"mailto:" + esc(s.supportEmail) + "\">" + esc(s.supportEmail) + "</a> with your order ID. Refunds are issued in full to your original payment method through Razorpay.</p>" +
          "<h2>After a refund</h2><p>When a refund is processed, the books from that order are removed from your library and can no longer be downloaded. You'll receive an email confirming the refund.</p>" +
          "<h2>Failed payments</h2><p>If a payment fails you are not charged, and the books stay in your cart so you can try again.</p>",
      },
    };
    const p = pages[which];
    mount('<div class="container page"><article class="prose"><p class="eyebrow">Legal</p><h1>' + p.title + '</h1><p class="muted small">Last updated ' + formatDate(Date.now()) + "</p>" + p.body + "</article></div>", p.title);
  }

  function viewNotFound() {
    mount('<div class="container page">' + emptyState({ icon: "compass", title: "Page not found", text: "The page you're looking for doesn't exist.", action: '<a class="btn btn-primary" href="#/">Go to home</a>' }) + "</div>", "Not found");
  }

  // ---------------------------------------------------------------------
  // Global events
  // ---------------------------------------------------------------------
  document.addEventListener("click", async (e) => {
    const skip = e.target.closest("[data-skip]");
    if (skip) {
      e.preventDefault();
      $main.focus();
      return;
    }
    const el = e.target.closest("[data-action]");
    if (!el) {
      if (!e.target.closest(".dropdown")) closeDropdowns();
      if (e.target.closest("[data-drawer] a")) closeDrawers();
      return;
    }
    const act = el.dataset.action;
    const id = el.dataset.id;
    switch (act) {
      case "toggle-theme":
        U.toggleTheme();
        renderHeader();
        if (document.querySelector(".drawer")) openMenu();
        break;
      case "toggle-dropdown": {
        const menu = document.getElementById(el.dataset.target);
        const open = menu.hidden;
        closeDropdowns(el.dataset.target);
        menu.hidden = !open;
        el.setAttribute("aria-expanded", String(open));
        if (open) {
          const first = menu.querySelector("a, button");
          if (first) first.focus();
        }
        break;
      }
      case "toggle-search": {
        const p = document.getElementById("search-panel");
        p.hidden = !p.hidden;
        el.setAttribute("aria-expanded", String(!p.hidden));
        if (!p.hidden) p.querySelector("input").focus();
        break;
      }
      case "open-menu":
        openMenu();
        break;
      case "close-drawer":
        closeDrawers();
        break;
      case "logout":
        closeDrawers();
        closeDropdowns();
        logout();
        break;
      case "retry":
        if (currentView === "catalog") catalogUpdate(parseHash().query);
        else route();
        break;
      case "scroll-categories":
        e.preventDefault();
        document.getElementById("categories").scrollIntoView({ behavior: "smooth" });
        break;
      case "scroll-reviews":
        e.preventDefault();
        document.getElementById("reviews").scrollIntoView({ behavior: "smooth" });
        break;
      case "add-to-cart":
        addToCart(id, el);
        break;
      case "remove-from-cart":
        removeFromCart(id);
        break;
      case "wish-toggle":
        toggleWish(id);
        break;
      case "move-to-cart":
        moveToCart(id, el);
        break;
      case "remove-wish":
        removeWish(id);
        break;
      case "read-sample":
        openSample(el.dataset.slug);
        break;
      case "pay":
        startPayment(el);
        break;
      case "download":
        download(id, el);
        break;
      case "invoice":
        downloadInvoice(id, el);
        break;
      case "google-signin":
        removeOneTap();
        openGoogleChooser();
        break;
      case "open-filters": {
        const d = openDrawer("Filters", '<div class="card">' + filtersForm("drawer") + '</div><button type="button" class="btn btn-primary btn-block" style="margin-top:16px" data-action="close-drawer">Show results</button>', "right");
        void d;
        break;
      }
      case "clear-filters":
        closeDrawers();
        location.hash = "#/books";
        break;
      case "remove-filter": {
        const k = el.dataset.key;
        applyFilters(k === "price" ? { minPrice: undefined, maxPrice: undefined } : { [k]: undefined });
        break;
      }
      case "edit-review": {
        const box = document.getElementById("my-review");
        const r = document.getElementById("reviews")._mine.review;
        box.outerHTML = reviewForm(r);
        document.getElementById("review-comment").focus();
        break;
      }
      case "cancel-edit-review":
        reloadReviews();
        break;
      case "delete-review": {
        const ok = await confirmDialog({ title: "Delete your review?", message: "Your rating and review will be removed from this book.", confirmText: "Delete review", danger: true });
        if (!ok) return;
        try {
          await authed((t) => API.deleteReview(t, id));
          toast("Your review has been deleted.");
          reloadReviews();
        } catch (err) {
          toast(err.message, "error");
        }
        break;
      }
      case "request-deletion": {
        const ok = await confirmDialog({ title: "Request account deletion?", message: "We'll delete your account and personal data. Your order and invoice records will be kept as required for tax purposes.", confirmText: "Request deletion", danger: true });
        if (!ok) return;
        try {
          await authed(API.requestDeletion);
          toast("Your deletion request has been received.");
          route();
        } catch (err) {
          toast(err.message, "error");
        }
        break;
      }
    }
    // Star rating input
  });

  document.addEventListener("click", (e) => {
    const star = e.target.closest("[data-star]");
    if (star) setStarValue(star.closest("form"), Number(star.dataset.star));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDropdowns();
      closeDrawers();
      const sp = document.getElementById("search-panel");
      if (sp && !sp.hidden) sp.hidden = true;
    }
    const star = e.target.closest && e.target.closest("[data-star]");
    if (star && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      const form = star.closest("form");
      const v = Math.min(5, Math.max(1, Number(form.rating.value || 0) + (e.key === "ArrowRight" ? 1 : -1)));
      setStarValue(form, v);
      form.querySelector('[data-star="' + v + '"]').focus();
    }
  });

  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.matches('[data-form="header-search"]')) {
      e.preventDefault();
      const q = f.q.value.trim();
      location.hash = "#/books" + qs({ q });
    } else if (f.matches('[data-form="catalog-search"]')) {
      e.preventDefault();
      applyFilters({ q: f.q.value.trim() || undefined });
    } else if (f.matches("[data-filters]")) {
      e.preventDefault();
      const min = f.minPrice.value;
      const max = f.maxPrice.value;
      if (min !== "" && max !== "" && Number(min) > Number(max)) return showFieldErrors(f, { maxPrice: "Max must be more than min." });
      if ((min !== "" && Number(min) < 0) || (max !== "" && Number(max) < 0)) return showFieldErrors(f, { minPrice: "Prices can't be negative." });
      showFieldErrors(f, null);
      applyFilters({ minPrice: min || undefined, maxPrice: max || undefined });
    } else if (f.matches('[data-form="review"]')) {
      e.preventDefault();
      submitReview(f);
    } else if (f.matches('[data-form="profile"]')) {
      e.preventDefault();
      const btn = f.querySelector('[type="submit"]');
      setBusy(btn, true, "Saving…");
      authed((t) => API.updateProfile(t, { name: f.elements.namedItem("name").value }))
        .then((u) => {
          S.user = u;
          toast("Your profile has been updated.");
          route();
        })
        .catch((err) => {
          setBusy(btn, false);
          if (err.details) showFieldErrors(f, err.details);
          else toast(err.message, "error");
        });
    }
  });

  const debouncedSearch = U.debounce((v) => applyFilters({ q: v.trim() || undefined }), 450);
  document.addEventListener("input", (e) => {
    if (e.target.id === "cat-q") debouncedSearch(e.target.value);
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-sort]")) applyFilters({ sort: t.value === "newest" ? undefined : t.value });
    const f = t.closest("[data-filters]");
    if (f && (t.name === "category" || t.name === "author")) applyFilters({ [t.name]: t.value || undefined });
  });

  // ---------------------------------------------------------------------
  // Boot: restore session through the refresh cookie
  // ---------------------------------------------------------------------
  async function boot() {
    renderHeader();
    try {
      S.settings = await API.publicSettings();
    } catch (e) {
      /* defaults */
    }
    try {
      S.categories = await API.categories();
    } catch (e) {
      S.categories = [];
    }
    try {
      setSession(await API.refresh());
    } catch (e) {
      /* signed out */
    }
    await loadUserState().catch(() => {});
    renderHeader();
    renderFooter();
    window.addEventListener("hashchange", route);
    route();
  }

  boot();
})();
