/*
 * Mock backend shared by the store and admin apps.
 * Simulates the REST API (/api/v1), Google Identity Services, Razorpay and Cloudflare R2
 * using localStorage, so both apps see the same data.
 */
(function (global) {
  "use strict";

  const DB_KEY = "pp_mock_db_v1";
  const GOOGLE_CLIENT_ID = "1043-pageandpine.apps.googleusercontent.com";
  const RAZORPAY_KEY_ID = "rzp_test_Pp8x2LmQa91Kd";
  const RAZORPAY_KEY_SECRET = "mock_key_secret";
  const RAZORPAY_WEBHOOK_SECRET = "mock_webhook_secret";
  const JWT_SECRET = "mock_jwt_secret";
  const ACCESS_TTL = 15 * 60 * 1000;
  const REFRESH_TTL = 30 * 24 * 60 * 60 * 1000;
  const DOWNLOAD_URL_TTL_SECONDS = 300;
  const UPLOAD_URL_TTL_SECONDS = 600;
  const PENDING_ORDER_TTL = 30 * 60 * 1000;
  const MB = 1024 * 1024;
  const DAY = 24 * 60 * 60 * 1000;

  const FILE_LIMITS = {
    pdf: { label: "Full PDF", types: ["application/pdf"], accept: "application/pdf", max: 200 * MB, bucket: "books-private" },
    sample: { label: "Sample PDF", types: ["application/pdf"], accept: "application/pdf", max: 20 * MB, bucket: "books-public" },
    cover: { label: "Cover image", types: ["image/jpeg", "image/png", "image/webp"], accept: "image/jpeg,image/png,image/webp", max: 5 * MB, bucket: "books-public" },
    logo: { label: "Store logo", types: ["image/jpeg", "image/png", "image/webp"], accept: "image/jpeg,image/png,image/webp", max: 2 * MB, bucket: "books-public" },
  };

  const TAX_CATEGORIES = {
    standard: "E-book (store GST rate)",
    exempt: "Exempt (0% GST)",
  };

  const LANGUAGES = ["English", "Hindi", "Tamil", "Malayalam", "Bengali", "Marathi", "Kannada", "Telugu"];

  const EMAIL_TEMPLATE_META = {
    welcome: { label: "Welcome", placeholders: ["name", "storeName"] },
    orderConfirmation: { label: "Order confirmation", placeholders: ["name", "orderId", "total", "libraryUrl", "storeName"] },
    paymentFailed: { label: "Payment failed", placeholders: ["name", "orderId", "retryUrl", "storeName"] },
    refundProcessed: { label: "Refund processed", placeholders: ["name", "orderId", "amount", "storeName"] },
  };

  const COVER_PALETTES = [
    ["#1f3a2d", "#f3e6c8"],
    ["#14213d", "#f4d58d"],
    ["#7a2e1f", "#f7e3c3"],
    ["#e9dcc4", "#2b2a26"],
    ["#3b4a3f", "#e9d8a6"],
    ["#5b1f2e", "#f2d4c2"],
    ["#0f4c5c", "#f6e7cb"],
    ["#c96f2d", "#fff4e0"],
    ["#2d2a4a", "#e8d9b5"],
    ["#f0e2c8", "#5b3a1a"],
    ["#264653", "#e9c46a"],
    ["#6b4226", "#f5e6ca"],
    ["#a3b18a", "#1f2d1f"],
    ["#1b263b", "#e0e1dd"],
    ["#8c5e58", "#fbeee6"],
  ];

  const SIMULATE = (function () {
    try {
      return new URLSearchParams(global.location.search).get("simulate");
    } catch (e) {
      return null;
    }
  })();

  // ---------- Utilities ----------
  const now = () => Date.now();
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

  function rid(prefix, len) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < (len || 14); i++) s += chars[Math.floor(Math.random() * chars.length)];
    return (prefix || "") + s;
  }

  function uuid() {
    const h = "0123456789abcdef";
    let s = "";
    for (let i = 0; i < 32; i++) s += h[Math.floor(Math.random() * 16)];
    return s.slice(0, 8) + "-" + s.slice(8, 12) + "-4" + s.slice(13, 16) + "-a" + s.slice(17, 20) + "-" + s.slice(20, 32);
  }

  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Deterministic stand-in for HMAC-SHA256 (hex, 64 chars).
  function mockHmac(message, secret) {
    const input = secret + "|" + message;
    let out = "";
    for (let round = 0; round < 8; round++) {
      let h = 0x811c9dc5 ^ (round * 0x9e3779b1);
      for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      out += (h >>> 0).toString(16).padStart(8, "0");
    }
    return out;
  }

  function b64(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }

  function unb64(str) {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  }

  class ApiError extends Error {
    constructor(status, code, message, details) {
      super(message);
      this.status = status;
      this.code = code;
      this.details = details || null;
    }
    toJSON() {
      return { error: { code: this.code, message: this.message, details: this.details } };
    }
  }

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

  function paginate(list, page, pageSize) {
    const size = Math.min(Math.max(parseInt(pageSize, 10) || 12, 1), 50);
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const p = Math.min(Math.max(parseInt(page, 10) || 1, 1), pages);
    return { items: list.slice((p - 1) * size, p * size), page: p, pageSize: size, total };
  }

  // ---------- Seed data ----------
  function seed() {
    const t = now();
    const ago = (days, hours) => t - days * DAY - (hours || 0) * 3600 * 1000;

    const users = [
      { id: "u_admin", email: "meera@pageandpine.in", name: "Meera Nair", avatarColor: "#1f3a2d", googleId: "g-100-meera", role: "admin", isBlocked: false, createdAt: ago(120) },
      { id: "u_priya", email: "priya.sharma@gmail.com", name: "Priya Sharma", avatarColor: "#a87a3d", googleId: "g-200-priya", role: "buyer", isBlocked: false, createdAt: ago(60) },
      { id: "u_neha", email: "neha.iyer@gmail.com", name: "Neha Iyer", avatarColor: "#7a2e1f", googleId: "g-300-neha", role: "buyer", isBlocked: false, createdAt: ago(45) },
      { id: "u_karthik", email: "karthik.rao@gmail.com", name: "Karthik Rao", avatarColor: "#0f4c5c", googleId: "g-400-karthik", role: "buyer", isBlocked: false, createdAt: ago(30) },
      { id: "u_rahul", email: "rahul.verma@gmail.com", name: "Rahul Verma", avatarColor: "#5b1f2e", googleId: "g-500-rahul", role: "buyer", isBlocked: true, createdAt: ago(40) },
    ];
    users.forEach((u) => (u.tokenVersion = 1));

    const categories = [
      { id: "c_fiction", name: "Fiction", slug: "fiction", icon: "book-open" },
      { id: "c_nonfiction", name: "Non-Fiction", slug: "non-fiction", icon: "compass" },
      { id: "c_selfhelp", name: "Self-Help", slug: "self-help", icon: "sprout" },
      { id: "c_mystery", name: "Mystery & Thriller", slug: "mystery-and-thriller", icon: "search" },
      { id: "c_children", name: "Children", slug: "children", icon: "smile" },
      { id: "c_tech", name: "Technology", slug: "technology", icon: "code" },
      { id: "c_poetry", name: "Poetry", slug: "poetry", icon: "feather" },
    ];

    const authors = [
      { id: "a_leela", name: "Leela Menon", slug: "leela-menon", bio: "Leela Menon writes quiet, character-driven novels set along the Kerala coast." },
      { id: "a_vikram", name: "Vikram Sethi", slug: "vikram-sethi", bio: "A naturalist and travel writer who has spent two decades walking the Western Ghats." },
      { id: "a_kavya", name: "Kavya Iyer", slug: "kavya-iyer", bio: "Kavya Iyer is a coach and author focused on small, sustainable daily routines." },
      { id: "a_farhan", name: "Farhan Qureshi", slug: "farhan-qureshi", bio: "Former journalist turned crime novelist, known for twisty hill-station mysteries." },
      { id: "a_rohan", name: "Rohan Das", slug: "rohan-das", bio: "Software engineer and teacher who explains technical ideas in plain language." },
      { id: "a_ishita", name: "Ishita Bose", slug: "ishita-bose", bio: "Children's author and illustrator from Kolkata." },
      { id: "a_ananya", name: "Ananya Rao", slug: "ananya-rao", bio: "Ananya Rao writes literary fiction about memory, family and cities." },
      { id: "a_sameer", name: "Sameer Kulkarni", slug: "sameer-kulkarni", bio: "Poet and translator based in Pune." },
    ];

    const B = (o) =>
      Object.assign(
        {
          language: "English",
          taxCategory: "standard",
          featured: false,
          status: "published",
          ratingAvg: 0,
          ratingCount: 0,
          coverImage: null,
        },
        o,
        {
          coverKey: o.coverKey === undefined ? "covers/" + o.id + "/" + uuid() + ".webp" : o.coverKey,
          sampleKey: o.sampleKey === undefined ? "samples/" + o.id + "/" + uuid() + ".pdf" : o.sampleKey,
          pdfKey: o.pdfKey === undefined ? "books/" + o.id + "/" + uuid() + ".pdf" : o.pdfKey,
          sampleSize: o.sampleKey === null ? null : o.sampleSize || Math.round((0.6 + Math.random()) * MB),
          updatedAt: o.updatedAt || o.createdAt,
        }
      );

    const books = [
      B({ id: "b_orchard", title: "The Quiet Orchard", slug: "the-quiet-orchard", authorIds: ["a_leela"], categoryId: "c_fiction", pages: 312, price: 34900, featured: true, palette: 0, fileSize: 4.2 * MB, createdAt: ago(90), publishedAt: ago(88), description: "When Anjali inherits her grandmother's failing mango orchard in Thrissur, she expects to sell it within a month. Instead, a box of unsent letters pulls her into three generations of family secrets, and a season that changes everything she thought she knew about home." }),
      B({ id: "b_ghats", title: "Letters from the Western Ghats", slug: "letters-from-the-western-ghats", authorIds: ["a_vikram"], categoryId: "c_nonfiction", pages: 248, price: 29900, featured: true, palette: 4, fileSize: 6.8 * MB, createdAt: ago(80), publishedAt: ago(79), description: "A year of walking, written as letters to a friend. Vikram Sethi records monsoon forests, hidden waterfalls, shola grasslands and the people who protect them, in one of the richest landscapes on Earth." }),
      B({ id: "b_habits", title: "Small Habits, Bright Days", slug: "small-habits-bright-days", authorIds: ["a_kavya"], categoryId: "c_selfhelp", pages: 196, price: 24900, featured: true, palette: 3, fileSize: 2.9 * MB, createdAt: ago(75), publishedAt: ago(74), description: "A practical, gentle guide to building routines that last. Each chapter ends with a two-minute exercise you can start today, whether you want to read more, sleep better or simply feel calmer." }),
      B({ id: "b_tea", title: "The Tea Estate Mystery", slug: "the-tea-estate-mystery", authorIds: ["a_farhan"], categoryId: "c_mystery", pages: 384, price: 39900, featured: true, palette: 2, fileSize: 5.1 * MB, createdAt: ago(70), publishedAt: ago(69), description: "Fog rolls over a Darjeeling tea estate on the night its owner disappears. Inspector Tenzing has three days, eleven suspects and one torn ledger page to find the truth before the monsoon washes the evidence away." }),
      B({ id: "b_monsoon", title: "Monsoon Mathematics", slug: "monsoon-mathematics", authorIds: ["a_rohan"], categoryId: "c_nonfiction", pages: 220, price: 27900, palette: 6, fileSize: 3.4 * MB, createdAt: ago(60), publishedAt: ago(58), description: "Why do rain clouds form where they do? How do forecasters predict the monsoon? This friendly book explains the maths behind India's most important season, with no equations you can't follow." }),
      B({ id: "b_clock", title: "The Clockmaker of Kochi", slug: "the-clockmaker-of-kochi", authorIds: ["a_leela", "a_ananya"], categoryId: "c_fiction", pages: 356, price: 37900, palette: 8, fileSize: 4.7 * MB, createdAt: ago(12), publishedAt: ago(10), description: "In Fort Kochi, an old clockmaker repairs a pocket watch that runs backwards. Each time it ticks, his apprentice remembers a life she has never lived. A spellbinding story from two acclaimed writers." }),
      B({ id: "b_tigers", title: "Tales for Little Tigers", slug: "tales-for-little-tigers", authorIds: ["a_ishita"], categoryId: "c_children", pages: 64, price: 14900, taxCategory: "exempt", featured: true, palette: 7, fileSize: 9.6 * MB, createdAt: ago(55), publishedAt: ago(54), description: "Twelve bedtime stories about a brave little tiger cub and her forest friends, with full-colour illustrations on every page. Perfect for reading aloud to children aged three to seven." }),
      B({ id: "b_js", title: "Clean JavaScript, Calm Mind", slug: "clean-javascript-calm-mind", authorIds: ["a_rohan"], categoryId: "c_tech", pages: 290, price: 49900, palette: 13, fileSize: 7.3 * MB, createdAt: ago(40), publishedAt: ago(38), description: "Write JavaScript you can still understand next year. Covers naming, small functions, testing, error handling and refactoring, with before-and-after examples from real projects." }),
      B({ id: "b_mornings", title: "Mindful Mornings", slug: "mindful-mornings", authorIds: ["a_kavya"], categoryId: "c_selfhelp", pages: 150, price: 19900, palette: 12, fileSize: 2.1 * MB, createdAt: ago(35), publishedAt: ago(33), description: "Thirty short morning practices for a calmer day: breathing, journaling, stretching and planning. Each takes less than ten minutes and needs nothing but a quiet corner." }),
      B({ id: "b_harbour", title: "The Silent Harbour", slug: "the-silent-harbour", authorIds: ["a_farhan"], categoryId: "c_mystery", pages: 330, price: 34900, palette: 10, fileSize: 4.4 * MB, createdAt: ago(25), publishedAt: ago(24), description: "A fishing trawler returns to Mangaluru harbour with no crew on board. Journalist Sara D'Souza follows a trail of coded radio messages that leads straight back to her own family." }),
      B({ id: "b_ink", title: "Rivers of Ink", slug: "rivers-of-ink", authorIds: ["a_ananya"], categoryId: "c_fiction", pages: 280, price: 32900, palette: 5, fileSize: 3.9 * MB, createdAt: ago(7), publishedAt: ago(6), description: "Three sisters, one printing press and the city of Varanasi across fifty years. A moving novel about the stories families tell, and the ones they never do." }),
      B({ id: "b_stars", title: "Stargazing from Your Balcony", slug: "stargazing-from-your-balcony", authorIds: ["a_vikram"], categoryId: "c_nonfiction", pages: 176, price: 22900, palette: 1, fileSize: 8.2 * MB, createdAt: ago(3), publishedAt: ago(2), description: "You don't need a telescope or a dark desert sky. This illustrated guide shows you which planets, stars and constellations you can see from an Indian city, month by month." }),
      B({ id: "b_kites", title: "The Paper Kites", slug: "the-paper-kites", authorIds: ["a_ishita"], categoryId: "c_children", pages: 48, price: 12900, taxCategory: "exempt", status: "archived", palette: 9, fileSize: 6.1 * MB, createdAt: ago(100), publishedAt: ago(99), updatedAt: ago(15), description: "On the day of the kite festival, Mitu's kite flies away over the rooftops of Ahmedabad, and she follows it on a big adventure across the old city." }),
      B({ id: "b_ledger", title: "The Ledger of Lost Things", slug: "the-ledger-of-lost-things", authorIds: ["a_farhan"], categoryId: "c_mystery", pages: 300, price: 36900, status: "draft", palette: 11, coverKey: null, sampleKey: null, pdfKey: null, fileSize: null, createdAt: ago(2), publishedAt: null, description: "An antique dealer in Shimla keeps a ledger of every lost object ever brought to her shop. When a stranger asks for an item that was never written down, the past comes knocking." }),
      B({ id: "b_garden", title: "A Beginner's Terrace Garden", slug: "a-beginners-terrace-garden", authorIds: ["a_vikram"], categoryId: "c_nonfiction", pages: 164, price: 21900, status: "draft", palette: 14, fileSize: 5.5 * MB, createdAt: ago(5), publishedAt: null, description: "Grow herbs, vegetables and flowers on a city terrace. Step-by-step plans for containers, soil, watering and pest control, written for complete beginners." }),
    ];

    const settings = {
      storeName: "Page & Pine",
      supportEmail: "support@pageandpine.in",
      logoKey: null,
      logoImage: null,
      gst: { enabled: true, gstin: "29ABCDE1234F1Z5", rate: 18 },
      defaultDownloadLimit: 5,
      emailTemplates: {
        welcome: {
          subject: "Welcome to {{storeName}}, {{name}}!",
          body: "Hi {{name}},\n\nThanks for joining {{storeName}}. Browse our collection, read free samples and build your digital library.\n\nHappy reading,\nThe {{storeName}} team",
        },
        orderConfirmation: {
          subject: "Your order {{orderId}} is confirmed",
          body: "Hi {{name}},\n\nThank you for your purchase. We received your payment of {{total}}.\n\nYour books are ready in your library: {{libraryUrl}}\n\nHappy reading,\nThe {{storeName}} team",
        },
        paymentFailed: {
          subject: "Payment for order {{orderId}} did not go through",
          body: "Hi {{name}},\n\nYour payment for order {{orderId}} failed and you have not been charged.\n\nYou can try again here: {{retryUrl}}\n\nThe {{storeName}} team",
        },
        refundProcessed: {
          subject: "Refund processed for order {{orderId}}",
          body: "Hi {{name}},\n\nWe have refunded {{amount}} for order {{orderId}}. It may take 5 to 7 working days to appear in your account.\n\nThe books from this order have been removed from your library.\n\nThe {{storeName}} team",
        },
      },
    };

    const db = {
      version: 1,
      settings,
      adminAllowlist: ["meera@pageandpine.in"],
      users,
      refreshTokens: [],
      categories,
      authors,
      books,
      carts: { u_priya: ["b_monsoon"] },
      wishlists: { u_priya: ["b_clock", "b_ink"] },
      orders: [],
      entitlements: [],
      downloads: [],
      reviews: [],
      webhookEvents: [],
      auditLogs: [],
      emails: [],
      queue: [],
      pendingUploads: [],
      deletionRequests: [],
      counters: { order: 1000, invoice: 0 },
    };

    const book = (id) => db.books.find((b) => b.id === id);
    const tax = (b) => (b.taxCategory === "exempt" ? 0 : Math.round((b.price * 18) / 100));

    function seedOrder(userId, bookIds, status, createdAt, extra) {
      db.counters.order += 1;
      const items = bookIds.map((id) => ({ bookId: id, title: book(id).title, price: book(id).price, tax: tax(book(id)) }));
      const subtotal = items.reduce((s, i) => s + i.price, 0);
      const taxTotal = items.reduce((s, i) => s + i.tax, 0);
      const o = Object.assign(
        {
          id: "ORD-" + db.counters.order,
          userId,
          items,
          subtotal,
          tax: taxTotal,
          total: subtotal + taxTotal,
          currency: "INR",
          status,
          razorpayOrderId: rid("order_", 14),
          razorpayPaymentId: null,
          invoiceNumber: null,
          refundId: null,
          refundStatus: null,
          failureReason: null,
          createdAt,
          paidAt: null,
          refundedAt: null,
        },
        extra || {}
      );
      if (status === "paid" || status === "refunded") {
        o.razorpayPaymentId = rid("pay_", 14);
        o.paidAt = createdAt + 90 * 1000;
        db.counters.invoice += 1;
        o.invoiceNumber = "INV-2026-" + String(db.counters.invoice).padStart(4, "0");
        const evId = rid("evt_", 14);
        db.webhookEvents.push({
          eventId: evId,
          type: "payment.captured",
          orderId: o.id,
          payload: { payment: { id: o.razorpayPaymentId, order_id: o.razorpayOrderId, amount: o.total, currency: "INR", status: "captured" } },
          processedAt: o.paidAt + 800,
          deliveries: [{ receivedAt: o.paidAt, result: "processed", signatureValid: true }],
        });
        bookIds.forEach((bid) => {
          db.entitlements.push({ id: rid("ent_", 10), userId, bookId: bid, orderId: o.id, downloadCount: 0, downloadLimit: 5, revokedAt: null, createdAt: o.paidAt });
        });
      }
      if (status === "failed") {
        o.failureReason = "Payment was declined by the bank.";
        db.webhookEvents.push({
          eventId: rid("evt_", 14),
          type: "payment.failed",
          orderId: o.id,
          payload: { payment: { id: rid("pay_", 14), order_id: o.razorpayOrderId, amount: o.total, currency: "INR", status: "failed", error_description: o.failureReason } },
          processedAt: createdAt + 60 * 1000,
          deliveries: [{ receivedAt: createdAt + 59 * 1000, result: "processed", signatureValid: true }],
        });
      }
      if (status === "expired") o.expiredAt = createdAt + PENDING_ORDER_TTL;
      db.orders.push(o);
      return o;
    }

    seedOrder("u_rahul", ["b_orchard"], "paid", ago(35));
    const o1 = seedOrder("u_priya", ["b_orchard", "b_kites"], "paid", ago(20));
    const o2 = seedOrder("u_neha", ["b_ghats"], "refunded", ago(18));
    seedOrder("u_neha", ["b_tigers"], "paid", ago(16));
    const o4 = seedOrder("u_priya", ["b_habits"], "paid", ago(6));
    seedOrder("u_karthik", ["b_tea", "b_harbour"], "paid", ago(5));
    seedOrder("u_priya", ["b_tea"], "failed", ago(3));
    seedOrder("u_priya", ["b_js"], "expired", ago(2));

    // Refunded order: refund webhook and revoked entitlements
    o2.refundId = rid("rfnd_", 14);
    o2.refundStatus = "processed";
    o2.refundedAt = ago(17);
    db.webhookEvents.push({
      eventId: rid("evt_", 14),
      type: "refund.processed",
      orderId: o2.id,
      payload: { refund: { id: o2.refundId, payment_id: o2.razorpayPaymentId, amount: o2.total, currency: "INR", status: "processed" } },
      processedAt: o2.refundedAt + 500,
      deliveries: [{ receivedAt: o2.refundedAt, result: "processed", signatureValid: true }],
    });
    db.entitlements.filter((e) => e.orderId === o2.id).forEach((e) => (e.revokedAt = o2.refundedAt));

    // Download history
    function seedDownloads(userId, bookId, count, startDaysAgo) {
      const ent = db.entitlements.find((e) => e.userId === userId && e.bookId === bookId);
      for (let i = 0; i < count; i++) {
        ent.downloadCount += 1;
        db.downloads.push({ id: rid("dl_", 10), entitlementId: ent.id, userId, bookId, ip: "103.21.58." + (10 + i), userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0", createdAt: ago(startDaysAgo - i * 0.5) });
      }
    }
    seedDownloads("u_priya", "b_orchard", 2, 19);
    seedDownloads("u_priya", "b_kites", 1, 18);
    seedDownloads("u_priya", "b_habits", 5, 5.5);
    seedDownloads("u_neha", "b_tigers", 3, 15);
    seedDownloads("u_karthik", "b_tea", 1, 4);
    seedDownloads("u_rahul", "b_orchard", 1, 34);
    void o1;
    void o4;

    db.reviews = [
      { id: "r_1", userId: "u_priya", bookId: "b_orchard", rating: 5, comment: "Beautifully written. I could almost smell the mango blossoms. The letters subplot had me in tears.", isHidden: false, createdAt: ago(15), updatedAt: ago(15) },
      { id: "r_2", userId: "u_rahul", bookId: "b_orchard", rating: 1, comment: "Download this free on my website instead!!! link in profile", isHidden: true, createdAt: ago(33), updatedAt: ago(33) },
      { id: "r_3", userId: "u_neha", bookId: "b_tigers", rating: 4, comment: "My daughter asks for the monsoon story every single night. Lovely illustrations.", isHidden: false, createdAt: ago(14), updatedAt: ago(14) },
      { id: "r_4", userId: "u_karthik", bookId: "b_tea", rating: 5, comment: "Couldn't put it down. The ending caught me completely by surprise.", isHidden: false, createdAt: ago(4), updatedAt: ago(4) },
      { id: "r_5", userId: "u_karthik", bookId: "b_harbour", rating: 3, comment: "Great atmosphere, but the middle section felt slow.", isHidden: false, createdAt: ago(3), updatedAt: ago(3) },
    ];
    db.books.forEach((b) => recalcRating(db, b.id));

    db.auditLogs = [
      { id: rid("al_", 10), adminId: "u_admin", action: "book.archive", entity: "book", entityId: "b_kites", before: { status: "published" }, after: { status: "archived" }, createdAt: ago(15) },
      { id: rid("al_", 10), adminId: "u_admin", action: "order.refund", entity: "order", entityId: o2.id, before: { status: "paid" }, after: { refundId: o2.refundId, amount: o2.total }, createdAt: ago(17, 1) },
      { id: rid("al_", 10), adminId: "u_admin", action: "review.hide", entity: "review", entityId: "r_2", before: { isHidden: false }, after: { isHidden: true }, createdAt: ago(32) },
      { id: rid("al_", 10), adminId: "u_admin", action: "customer.block", entity: "user", entityId: "u_rahul", before: { isBlocked: false }, after: { isBlocked: true }, createdAt: ago(32, 1) },
      { id: rid("al_", 10), adminId: "u_admin", action: "book.create", entity: "book", entityId: "b_ledger", before: null, after: { title: "The Ledger of Lost Things", status: "draft" }, createdAt: ago(2) },
    ];
    return db;
  }

  // ---------- Persistence ----------
  function load() {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const db = seed();
      save(db);
      return db;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      const db = seed();
      save(db);
      return db;
    }
  }

  function save(db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
      throw new ApiError(507, "STORAGE_FULL", "Browser storage is full. Reset the mock data from the start page.");
    }
  }

  function reset() {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem("pp_refresh_cookie_store");
    localStorage.removeItem("pp_refresh_cookie_admin");
    localStorage.removeItem("pp_guest_cart");
    sessionStorage.clear();
    save(seed());
  }

  function tx(fn) {
    const db = load();
    runWorker(db);
    const result = fn(db);
    save(db);
    return result;
  }

  // ---------- Background worker (BullMQ stand-in) ----------
  function enqueue(db, job, delayMs) {
    db.queue.push(Object.assign({ id: rid("job_", 10), runAt: now() + (delayMs || 0), attempts: 0 }, job));
  }

  function runWorker(db) {
    const t = now();
    // Expire pending orders with no payment after 30 minutes (PAY-12)
    db.orders.forEach((o) => {
      if (o.status === "pending" && t - o.createdAt > PENDING_ORDER_TTL) {
        o.status = "expired";
        o.expiredAt = t;
      }
    });
    const due = db.queue.filter((j) => j.runAt <= t).sort((a, b) => a.runAt - b.runAt);
    db.queue = db.queue.filter((j) => j.runAt > t);
    due.forEach((job) => {
      try {
        if (job.type === "webhook") receiveWebhook(db, job.rawBody, job.signature);
        if (job.type === "email") sendEmail(db, job);
      } catch (e) {
        job.attempts += 1;
        if (job.attempts < 5) {
          job.runAt = t + Math.pow(2, job.attempts) * 1000;
          db.queue.push(job);
        }
      }
    });
  }

  function renderTemplate(str, vars) {
    return String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  }

  function queueEmail(db, template, user, vars, dedupeKey) {
    if (db.emails.some((e) => e.dedupeKey === dedupeKey) || db.queue.some((j) => j.dedupeKey === dedupeKey)) return;
    enqueue(db, { type: "email", template, to: user.email, vars: Object.assign({ name: user.name, storeName: db.settings.storeName }, vars), dedupeKey }, 0);
  }

  function sendEmail(db, job) {
    if (db.emails.some((e) => e.dedupeKey === job.dedupeKey)) return;
    const tpl = db.settings.emailTemplates[job.template];
    db.emails.push({ id: rid("em_", 10), template: job.template, to: job.to, subject: renderTemplate(tpl.subject, job.vars), body: renderTemplate(tpl.body, job.vars), dedupeKey: job.dedupeKey, sentAt: now() });
  }

  const inr = (paise) => "INR " + (paise / 100).toFixed(2);

  // ---------- Webhooks (POST /webhooks/razorpay) ----------
  function deliverWebhook(db, event, delayMs) {
    const rawBody = JSON.stringify(event);
    const signature = mockHmac(rawBody, RAZORPAY_WEBHOOK_SECRET);
    enqueue(db, { type: "webhook", rawBody, signature }, delayMs);
  }

  function receiveWebhook(db, rawBody, signature) {
    const expected = mockHmac(rawBody, RAZORPAY_WEBHOOK_SECRET);
    if (signature !== expected) return { status: 400 };
    const event = JSON.parse(rawBody);
    const existing = db.webhookEvents.find((e) => e.eventId === event.id);
    if (existing) {
      existing.deliveries.push({ receivedAt: now(), result: "duplicate_ignored", signatureValid: true });
      return { status: 200, duplicate: true };
    }
    const order = findOrderForEvent(db, event);
    const rec = {
      eventId: event.id,
      type: event.event,
      orderId: order ? order.id : null,
      payload: event.payload,
      processedAt: null,
      deliveries: [{ receivedAt: now(), result: "accepted", signatureValid: true }],
    };
    db.webhookEvents.push(rec);
    applyWebhookEvent(db, event, order);
    rec.processedAt = now();
    rec.deliveries[0].result = "processed";
    return { status: 200 };
  }

  function findOrderForEvent(db, event) {
    const p = event.payload || {};
    if (p.payment) return db.orders.find((o) => o.razorpayOrderId === p.payment.entity.order_id);
    if (p.refund) return db.orders.find((o) => o.razorpayPaymentId === p.refund.entity.payment_id);
    return null;
  }

  function applyWebhookEvent(db, event, order) {
    if (!order) return;
    const user = db.users.find((u) => u.id === order.userId);
    if (event.event === "payment.captured") {
      if (order.status === "paid" || order.status === "refunded") return;
      order.status = "paid";
      order.razorpayPaymentId = event.payload.payment.entity.id;
      order.paidAt = now();
      db.counters.invoice += 1;
      order.invoiceNumber = "INV-" + new Date().getFullYear() + "-" + String(db.counters.invoice).padStart(4, "0");
      order.items.forEach((item) => {
        const ent = db.entitlements.find((e) => e.userId === order.userId && e.bookId === item.bookId);
        if (ent) {
          if (ent.revokedAt) {
            ent.revokedAt = null;
            ent.orderId = order.id;
            ent.downloadCount = 0;
            ent.downloadLimit = db.settings.defaultDownloadLimit;
            ent.createdAt = now();
          }
        } else {
          db.entitlements.push({ id: rid("ent_", 10), userId: order.userId, bookId: item.bookId, orderId: order.id, downloadCount: 0, downloadLimit: db.settings.defaultDownloadLimit, revokedAt: null, createdAt: now() });
        }
      });
      const bought = order.items.map((i) => i.bookId);
      db.carts[order.userId] = (db.carts[order.userId] || []).filter((id) => !bought.includes(id));
      db.wishlists[order.userId] = (db.wishlists[order.userId] || []).filter((id) => !bought.includes(id));
      if (user) queueEmail(db, "orderConfirmation", user, { orderId: order.id, total: inr(order.total), libraryUrl: "https://pageandpine.in/library" }, "order-confirmed:" + order.id);
    }
    if (event.event === "payment.failed") {
      if (order.status !== "pending") return;
      order.status = "failed";
      order.failureReason = event.payload.payment.entity.error_description || "Payment failed.";
      if (user) queueEmail(db, "paymentFailed", user, { orderId: order.id, retryUrl: "https://pageandpine.in/cart" }, "payment-failed:" + order.id);
    }
    if (event.event === "refund.processed") {
      if (order.status !== "paid") return;
      order.status = "refunded";
      order.refundStatus = "processed";
      order.refundedAt = now();
      db.entitlements.filter((e) => e.orderId === order.id && !e.revokedAt).forEach((e) => (e.revokedAt = now()));
      if (user) queueEmail(db, "refundProcessed", user, { orderId: order.id, amount: inr(order.total) }, "refund-processed:" + order.id);
    }
  }

  // ---------- Pricing (server-side) ----------
  function taxFor(db, book) {
    const g = db.settings.gst;
    if (!g.enabled || book.taxCategory === "exempt") return 0;
    return Math.round((book.price * g.rate) / 100);
  }

  function priceBooks(db, books) {
    const items = books.map((b) => ({ bookId: b.id, title: b.title, price: b.price, tax: taxFor(db, b) }));
    const subtotal = items.reduce((s, i) => s + i.price, 0);
    const tax = items.reduce((s, i) => s + i.tax, 0);
    return { items, subtotal, tax, total: subtotal + tax, currency: "INR", gstEnabled: db.settings.gst.enabled, gstRate: db.settings.gst.rate };
  }

  // ---------- Shapes ----------
  function recalcRating(db, bookId) {
    const b = db.books.find((x) => x.id === bookId);
    if (!b) return;
    const visible = db.reviews.filter((r) => r.bookId === bookId && !r.isHidden);
    b.ratingCount = visible.length;
    b.ratingAvg = visible.length ? Math.round((visible.reduce((s, r) => s + r.rating, 0) / visible.length) * 10) / 10 : 0;
  }

  function coverOf(b) {
    if (!b.coverKey) return null;
    return { image: b.coverImage || null, palette: COVER_PALETTES[(b.palette || 0) % COVER_PALETTES.length] };
  }

  function publicBook(db, b) {
    const authors = b.authorIds.map((id) => db.authors.find((a) => a.id === id)).filter(Boolean);
    const cat = db.categories.find((c) => c.id === b.categoryId);
    return {
      id: b.id,
      title: b.title,
      slug: b.slug,
      authors: authors.map((a) => ({ id: a.id, name: a.name, slug: a.slug })),
      category: cat ? { id: cat.id, name: cat.name, slug: cat.slug } : null,
      description: b.description,
      language: b.language,
      pages: b.pages,
      price: b.price,
      fileSize: b.fileSize,
      ratingAvg: b.ratingAvg,
      ratingCount: b.ratingCount,
      featured: b.featured,
      cover: coverOf(b),
      hasSample: !!b.sampleKey,
      publishedAt: b.publishedAt,
    };
  }

  function publicUser(u) {
    return { id: u.id, email: u.email, name: u.name, avatarColor: u.avatarColor, role: u.role, createdAt: u.createdAt };
  }

  // ---------- Tokens ----------
  function issueAccessToken(user) {
    const payload = { sub: user.id, role: user.role, v: user.tokenVersion, exp: now() + ACCESS_TTL };
    const body = b64(payload);
    return "eyJhbGciOiJIUzI1NiJ9." + body + "." + mockHmac(body, JWT_SECRET).slice(0, 43);
  }

  function readAccessToken(token) {
    if (!token || typeof token !== "string") throw new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    const parts = token.split(".");
    if (parts.length !== 3 || mockHmac(parts[1], JWT_SECRET).slice(0, 43) !== parts[2]) throw new ApiError(401, "INVALID_TOKEN", "Your session is not valid.");
    const payload = unb64(parts[1]);
    if (payload.exp < now()) throw new ApiError(401, "TOKEN_EXPIRED", "Your session has expired.");
    return payload;
  }

  function authUser(db, token, opts) {
    const payload = readAccessToken(token);
    const user = db.users.find((u) => u.id === payload.sub);
    if (!user) throw new ApiError(401, "INVALID_TOKEN", "Your session is not valid.");
    if (user.isBlocked) throw new ApiError(403, "USER_BLOCKED", "This account has been blocked. Please contact support.");
    if (opts && opts.admin && user.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Admin access is required.");
    return user;
  }

  // Refresh token lives in an httpOnly cookie in production; mocked here per app.
  const cookieKey = (app) => "pp_refresh_cookie_" + app;

  function issueRefreshToken(db, user, app, family) {
    const token = rid("rt_", 40);
    db.refreshTokens.push({ id: rid("rtk_", 10), userId: user.id, tokenHash: mockHmac(token, "rt"), family: family || rid("fam_", 8), app, expiresAt: now() + REFRESH_TTL, revokedAt: null, tokenVersion: user.tokenVersion });
    localStorage.setItem(cookieKey(app), token);
  }

  function revokeAllForUser(db, userId) {
    db.refreshTokens.filter((r) => r.userId === userId && !r.revokedAt).forEach((r) => (r.revokedAt = now()));
  }

  function verifyGoogleCredential(credential) {
    let payload;
    try {
      const parts = credential.split(".");
      payload = unb64(parts[1]);
      if (mockHmac(parts[1], "google").slice(0, 43) !== parts[2]) throw new Error("bad signature");
    } catch (e) {
      throw new ApiError(401, "INVALID_GOOGLE_TOKEN", "Google sign-in could not be verified.");
    }
    if (payload.iss !== "https://accounts.google.com") throw new ApiError(401, "INVALID_GOOGLE_TOKEN", "Invalid token issuer.");
    if (payload.aud !== GOOGLE_CLIENT_ID) throw new ApiError(401, "INVALID_GOOGLE_TOKEN", "Invalid token audience.");
    if (payload.exp < now()) throw new ApiError(401, "INVALID_GOOGLE_TOKEN", "Google token expired.");
    if (!payload.email_verified) throw new ApiError(401, "INVALID_GOOGLE_TOKEN", "Google email is not verified.");
    return payload;
  }

  function googleSignIn(db, credential, app) {
    const g = verifyGoogleCredential(credential);
    let user = db.users.find((u) => u.googleId === g.sub) || db.users.find((u) => u.email === g.email.toLowerCase());
    const isAllowlisted = db.adminAllowlist.includes(g.email.toLowerCase());
    if (!user) {
      user = { id: rid("u_", 10), email: g.email.toLowerCase(), name: g.name, avatarColor: g.picture, googleId: g.sub, role: isAllowlisted ? "admin" : "buyer", isBlocked: false, tokenVersion: 1, createdAt: now() };
      db.users.push(user);
      if (user.role === "buyer") queueEmail(db, "welcome", user, {}, "welcome:" + user.id);
    } else {
      user.googleId = g.sub;
      user.role = isAllowlisted ? "admin" : "buyer";
    }
    if (user.isBlocked) throw new ApiError(403, "USER_BLOCKED", "This account has been blocked. Please contact support.");
    issueRefreshToken(db, user, app);
    return { accessToken: issueAccessToken(user), user: publicUser(user) };
  }

  function refreshSession(db, app) {
    const token = localStorage.getItem(cookieKey(app));
    if (!token) throw new ApiError(401, "NO_SESSION", "No active session.");
    const rec = db.refreshTokens.find((r) => r.tokenHash === mockHmac(token, "rt") && r.app === app);
    if (!rec || rec.expiresAt < now()) {
      localStorage.removeItem(cookieKey(app));
      throw new ApiError(401, "NO_SESSION", "Your session has ended. Please sign in again.");
    }
    if (rec.revokedAt) {
      // Reuse of a rotated token: revoke the whole family
      db.refreshTokens.filter((r) => r.family === rec.family).forEach((r) => (r.revokedAt = r.revokedAt || now()));
      localStorage.removeItem(cookieKey(app));
      throw new ApiError(401, "NO_SESSION", "Your session has ended. Please sign in again.");
    }
    const user = db.users.find((u) => u.id === rec.userId);
    if (!user || user.isBlocked) {
      rec.revokedAt = now();
      localStorage.removeItem(cookieKey(app));
      throw new ApiError(403, "USER_BLOCKED", "This account has been blocked. Please contact support.");
    }
    rec.revokedAt = now();
    issueRefreshToken(db, user, app, rec.family);
    return { accessToken: issueAccessToken(user), user: publicUser(user) };
  }

  function logout(db, app) {
    const token = localStorage.getItem(cookieKey(app));
    if (token) {
      const rec = db.refreshTokens.find((r) => r.tokenHash === mockHmac(token, "rt"));
      if (rec) rec.revokedAt = now();
    }
    localStorage.removeItem(cookieKey(app));
    return { ok: true };
  }

  // ---------- Request wrapper (network latency + error simulation) ----------
  function call(fn, opts) {
    const read = opts && opts.read;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (read && SIMULATE === "error") throw new ApiError(503, "SERVICE_UNAVAILABLE", "We couldn't reach the server. Please try again.");
          resolve(clone(fn()));
        } catch (e) {
          reject(e instanceof ApiError ? e : new ApiError(500, "INTERNAL_ERROR", e.message || "Something went wrong."));
        }
      }, 180 + Math.random() * 260);
    });
  }

  function ownedSet(db, userId) {
    return new Set(db.entitlements.filter((e) => e.userId === userId && !e.revokedAt).map((e) => e.bookId));
  }

  function publishedBook(db, id) {
    const b = db.books.find((x) => x.id === id);
    return b && b.status === "published" ? b : null;
  }

  function cartView(db, user) {
    const owned = ownedSet(db, user.id);
    const ids = (db.carts[user.id] || []).filter((id, i, arr) => arr.indexOf(id) === i && publishedBook(db, id) && !owned.has(id));
    db.carts[user.id] = ids;
    const books = ids.map((id) => db.books.find((b) => b.id === id));
    const pricing = priceBooks(db, books);
    return Object.assign(pricing, { books: books.map((b) => publicBook(db, b)) });
  }

  // =====================================================================
  // Store API (buyer app)
  // =====================================================================
  const StoreAPI = {
    // Auth
    signInWithGoogle: (credential) => call(() => tx((db) => googleSignIn(db, credential, "store"))),
    refresh: () => call(() => tx((db) => refreshSession(db, "store"))),
    logout: () => call(() => tx((db) => logout(db, "store"))),
    me: (t) => call(() => tx((db) => publicUser(authUser(db, t))), { read: true }),

    publicSettings: () =>
      call(() =>
        tx((db) => ({ storeName: db.settings.storeName, supportEmail: db.settings.supportEmail, logoImage: db.settings.logoKey ? db.settings.logoImage : null }))
      ),

    // Catalog
    home: () =>
      call(
        () =>
          tx((db) => {
            const pub = db.books.filter((b) => b.status === "published");
            return {
              featured: pub.filter((b) => b.featured).slice(0, 6).map((b) => publicBook(db, b)),
              newReleases: pub.slice().sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 6).map((b) => publicBook(db, b)),
              categories: db.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon || "book", count: pub.filter((b) => b.categoryId === c.id).length })),
            };
          }),
        { read: true }
      ),

    categories: () =>
      call(
        () =>
          tx((db) => {
            const pub = db.books.filter((b) => b.status === "published");
            return db.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon || "book", count: pub.filter((b) => b.categoryId === c.id).length }));
          }),
        { read: true }
      ),

    authors: () =>
      call(() => tx((db) => db.authors.map((a) => ({ id: a.id, name: a.name, slug: a.slug }))), { read: true }),

    books: (params) =>
      call(
        () =>
          tx((db) => {
            const p = params || {};
            const q = String(p.q || "").trim().toLowerCase();
            const min = p.minPrice !== undefined && p.minPrice !== "" ? Math.round(Number(p.minPrice) * 100) : null;
            const max = p.maxPrice !== undefined && p.maxPrice !== "" ? Math.round(Number(p.maxPrice) * 100) : null;
            if ((min !== null && (isNaN(min) || min < 0)) || (max !== null && (isNaN(max) || max < 0))) throw new ApiError(400, "VALIDATION_ERROR", "Price range must be a positive number.");
            let list = db.books.filter((b) => b.status === "published");
            if (q) {
              list = list.filter((b) => {
                const authorNames = b.authorIds.map((id) => (db.authors.find((a) => a.id === id) || {}).name || "").join(" ");
                return (b.title + " " + authorNames + " " + b.description).toLowerCase().includes(q);
              });
            }
            if (p.category) list = list.filter((b) => (db.categories.find((c) => c.id === b.categoryId) || {}).slug === p.category);
            if (p.author) list = list.filter((b) => b.authorIds.some((id) => (db.authors.find((a) => a.id === id) || {}).slug === p.author));
            if (min !== null) list = list.filter((b) => b.price >= min);
            if (max !== null) list = list.filter((b) => b.price <= max);
            const sort = p.sort || "newest";
            const sorters = {
              newest: (a, b) => b.publishedAt - a.publishedAt,
              price_asc: (a, b) => a.price - b.price,
              price_desc: (a, b) => b.price - a.price,
              rating: (a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount,
            };
            list.sort(sorters[sort] || sorters.newest);
            const page = paginate(list, p.page, 8);
            page.items = page.items.map((b) => publicBook(db, b));
            return page;
          }),
        { read: true }
      ),

    book: (slug) =>
      call(
        () =>
          tx((db) => {
            const b = db.books.find((x) => x.slug === slug && x.status === "published");
            if (!b) throw new ApiError(404, "NOT_FOUND", "This book is not available.");
            const reviews = db.reviews
              .filter((r) => r.bookId === b.id && !r.isHidden)
              .sort((a, c) => c.createdAt - a.createdAt)
              .map((r) => {
                const u = db.users.find((x) => x.id === r.userId) || {};
                return { id: r.id, userId: r.userId, userName: u.name || "Reader", avatarColor: u.avatarColor, rating: r.rating, comment: r.comment, createdAt: r.createdAt, updatedAt: r.updatedAt };
              });
            return Object.assign(publicBook(db, b), { reviews });
          }),
        { read: true }
      ),

    sample: (slug) =>
      call(
        () =>
          tx((db) => {
            const b = db.books.find((x) => x.slug === slug && x.status === "published");
            if (!b || !b.sampleKey) throw new ApiError(404, "NOT_FOUND", "Sample not available.");
            const authors = b.authorIds.map((id) => (db.authors.find((a) => a.id === id) || {}).name).join(" & ");
            return { title: b.title, authors, url: "https://cdn.pageandpine.in/" + b.sampleKey, description: b.description };
          }),
        { read: true }
      ),

    // Price quote for the guest cart (prices always from the database)
    quote: (bookIds) =>
      call(
        () =>
          tx((db) => {
            const ids = (bookIds || []).filter((id, i, arr) => arr.indexOf(id) === i);
            const valid = ids.filter((id) => publishedBook(db, id));
            const books = valid.map((id) => db.books.find((b) => b.id === id));
            return Object.assign(priceBooks(db, books), { books: books.map((b) => publicBook(db, b)), removed: ids.filter((id) => !valid.includes(id)) });
          }),
        { read: true }
      ),

    // Cart
    cart: (t) => call(() => tx((db) => cartView(db, authUser(db, t))), { read: true }),
    addToCart: (t, bookId) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          if (!publishedBook(db, bookId)) throw new ApiError(422, "BOOK_UNAVAILABLE", "This book is not available.");
          if (ownedSet(db, u.id).has(bookId)) throw new ApiError(409, "ALREADY_OWNED", "This book is already in your library.");
          const cart = db.carts[u.id] || [];
          if (!cart.includes(bookId)) cart.push(bookId);
          db.carts[u.id] = cart;
          return cartView(db, u);
        })
      ),
    removeFromCart: (t, bookId) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          db.carts[u.id] = (db.carts[u.id] || []).filter((id) => id !== bookId);
          return cartView(db, u);
        })
      ),
    mergeCart: (t, guestIds) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          const owned = ownedSet(db, u.id);
          const cart = db.carts[u.id] || [];
          let added = 0;
          let skippedOwned = 0;
          (guestIds || []).forEach((id) => {
            if (!publishedBook(db, id)) return;
            if (owned.has(id)) {
              skippedOwned++;
              return;
            }
            if (!cart.includes(id)) {
              cart.push(id);
              added++;
            }
          });
          db.carts[u.id] = cart;
          return Object.assign(cartView(db, u), { added, skippedOwned });
        })
      ),

    // Wishlist
    wishlist: (t) =>
      call(
        () =>
          tx((db) => {
            const u = authUser(db, t);
            const ids = (db.wishlists[u.id] || []).filter((id) => publishedBook(db, id));
            return ids.map((id) => publicBook(db, db.books.find((b) => b.id === id)));
          }),
        { read: true }
      ),
    wishlistIds: (t) => call(() => tx((db) => (db.wishlists[authUser(db, t).id] || []).slice())),
    addToWishlist: (t, bookId) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          if (!publishedBook(db, bookId)) throw new ApiError(422, "BOOK_UNAVAILABLE", "This book is not available.");
          const list = db.wishlists[u.id] || [];
          if (!list.includes(bookId)) list.push(bookId);
          db.wishlists[u.id] = list;
          return list.slice();
        })
      ),
    removeFromWishlist: (t, bookId) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          db.wishlists[u.id] = (db.wishlists[u.id] || []).filter((id) => id !== bookId);
          return db.wishlists[u.id].slice();
        })
      ),
    moveWishlistToCart: (t, bookId) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          if (!publishedBook(db, bookId)) throw new ApiError(422, "BOOK_UNAVAILABLE", "This book is not available.");
          if (ownedSet(db, u.id).has(bookId)) throw new ApiError(409, "ALREADY_OWNED", "This book is already in your library.");
          const cart = db.carts[u.id] || [];
          if (!cart.includes(bookId)) cart.push(bookId);
          db.carts[u.id] = cart;
          db.wishlists[u.id] = (db.wishlists[u.id] || []).filter((id) => id !== bookId);
          return { cart: cartView(db, u), wishlist: db.wishlists[u.id].slice() };
        })
      ),

    // Checkout (POST /checkout/orders)
    createOrder: (t) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          const view = cartView(db, u);
          if (!view.items.length) throw new ApiError(422, "CART_EMPTY", "Your cart is empty.");
          db.counters.order += 1;
          const order = {
            id: "ORD-" + db.counters.order,
            userId: u.id,
            items: view.items,
            subtotal: view.subtotal,
            tax: view.tax,
            total: view.total,
            currency: "INR",
            status: "pending",
            razorpayOrderId: rid("order_", 14),
            razorpayPaymentId: null,
            invoiceNumber: null,
            refundId: null,
            refundStatus: null,
            failureReason: null,
            createdAt: now(),
            paidAt: null,
            refundedAt: null,
          };
          db.orders.push(order);
          return {
            orderId: order.id,
            razorpayOrderId: order.razorpayOrderId,
            amount: order.total,
            currency: "INR",
            keyId: RAZORPAY_KEY_ID,
            storeName: db.settings.storeName,
            logoImage: db.settings.logoKey ? db.settings.logoImage : null,
            prefill: { name: u.name, email: u.email },
          };
        })
      ),

    // POST /checkout/verify
    verifyPayment: (t, body) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          const order = db.orders.find((o) => o.razorpayOrderId === body.razorpay_order_id);
          if (!order || order.userId !== u.id) throw new ApiError(404, "NOT_FOUND", "Order not found.");
          const expected = mockHmac(body.razorpay_order_id + "|" + body.razorpay_payment_id, RAZORPAY_KEY_SECRET);
          if (expected !== body.razorpay_signature) throw new ApiError(400, "INVALID_SIGNATURE", "Payment signature could not be verified.");
          if (!order.razorpayPaymentId) order.razorpayPaymentId = body.razorpay_payment_id;
          return { orderId: order.id, status: order.status === "paid" ? "paid" : "pending_confirmation" };
        })
      ),

    order: (t, id) =>
      call(
        () =>
          tx((db) => {
            const u = authUser(db, t);
            const o = db.orders.find((x) => x.id === id && x.userId === u.id);
            if (!o) throw new ApiError(404, "NOT_FOUND", "Order not found.");
            return Object.assign(clone(o), { email: u.email });
          }),
        { read: true }
      ),

    orders: (t) =>
      call(
        () =>
          tx((db) => {
            const u = authUser(db, t);
            return db.orders.filter((o) => o.userId === u.id).sort((a, b) => b.createdAt - a.createdAt);
          }),
        { read: true }
      ),

    // GET /me/orders/:id/invoice
    invoice: (t, id) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          const o = db.orders.find((x) => x.id === id && x.userId === u.id);
          if (!o) throw new ApiError(404, "NOT_FOUND", "Order not found.");
          if (o.status !== "paid" || !o.invoiceNumber) throw new ApiError(422, "INVOICE_UNAVAILABLE", "Invoices are available for paid orders only.");
          return {
            url: "https://books-private.r2.cloudflarestorage.com/invoices/" + o.id + ".pdf?X-Amz-Expires=300&X-Amz-Signature=" + mockHmac(o.id, "inv").slice(0, 32),
            fileName: o.invoiceNumber + ".pdf",
            order: o,
            buyer: { name: u.name, email: u.email },
            store: { name: db.settings.storeName, supportEmail: db.settings.supportEmail, gstEnabled: db.settings.gst.enabled, gstin: db.settings.gst.gstin, gstRate: db.settings.gst.rate },
          };
        })
      ),

    // Library
    library: (t) =>
      call(
        () =>
          tx((db) => {
            const u = authUser(db, t);
            return db.entitlements
              .filter((e) => e.userId === u.id && !e.revokedAt)
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((e) => {
                const b = db.books.find((x) => x.id === e.bookId);
                const shape = publicBook(db, b);
                return { entitlementId: e.id, orderId: e.orderId, purchasedAt: e.createdAt, downloadCount: e.downloadCount, downloadLimit: e.downloadLimit, book: shape };
              });
          }),
        { read: true }
      ),
    ownedIds: (t) => call(() => tx((db) => Array.from(ownedSet(db, authUser(db, t).id)))),

    // GET /me/library/:bookId/download
    requestDownload: (t, bookId, meta) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          const ent = db.entitlements.find((e) => e.userId === u.id && e.bookId === bookId && !e.revokedAt);
          if (!ent) throw new ApiError(403, "NOT_OWNED", "You don't own this book.");
          if (ent.downloadCount >= ent.downloadLimit) throw new ApiError(403, "DOWNLOAD_LIMIT_REACHED", "You have reached the download limit for this book.");
          const b = db.books.find((x) => x.id === bookId);
          ent.downloadCount += 1;
          db.downloads.push({ id: rid("dl_", 10), entitlementId: ent.id, userId: u.id, bookId, ip: "203.0.113." + Math.floor(Math.random() * 200 + 20), userAgent: (meta && meta.userAgent) || "unknown", createdAt: now() });
          const expiresAt = now() + DOWNLOAD_URL_TTL_SECONDS * 1000;
          return {
            url: "https://books-private.r2.cloudflarestorage.com/" + b.pdfKey + "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=" + DOWNLOAD_URL_TTL_SECONDS + "&response-content-disposition=attachment%3B%20filename%3D%22" + b.slug + ".pdf%22&X-Amz-Signature=" + mockHmac(b.pdfKey + expiresAt, "r2").slice(0, 32),
            expiresIn: DOWNLOAD_URL_TTL_SECONDS,
            expiresAt,
            fileName: b.slug + ".pdf",
            title: b.title,
            authors: b.authorIds.map((id) => (db.authors.find((a) => a.id === id) || {}).name).join(" & "),
            licensedTo: u.email,
            downloadCount: ent.downloadCount,
            downloadLimit: ent.downloadLimit,
          };
        })
      ),

    // Reviews
    myBookState: (t, bookId) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          const r = db.reviews.find((x) => x.userId === u.id && x.bookId === bookId);
          return { owned: ownedSet(db, u.id).has(bookId), review: r ? clone(r) : null, inWishlist: (db.wishlists[u.id] || []).includes(bookId) };
        })
      ),
    createReview: (t, bookId, data) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          if (!ownedSet(db, u.id).has(bookId)) throw new ApiError(403, "NOT_OWNED", "Only buyers who own this book can review it.");
          if (db.reviews.some((r) => r.userId === u.id && r.bookId === bookId)) throw new ApiError(409, "REVIEW_EXISTS", "You have already reviewed this book.");
          validateReview(data);
          const r = { id: rid("r_", 10), userId: u.id, bookId, rating: data.rating, comment: data.comment.trim(), isHidden: false, createdAt: now(), updatedAt: now() };
          db.reviews.push(r);
          recalcRating(db, bookId);
          return r;
        })
      ),
    updateReview: (t, reviewId, data) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          const r = db.reviews.find((x) => x.id === reviewId);
          if (!r || r.userId !== u.id) throw new ApiError(404, "NOT_FOUND", "Review not found.");
          validateReview(data);
          r.rating = data.rating;
          r.comment = data.comment.trim();
          r.updatedAt = now();
          recalcRating(db, r.bookId);
          return r;
        })
      ),
    deleteReview: (t, reviewId) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          const r = db.reviews.find((x) => x.id === reviewId);
          if (!r || r.userId !== u.id) throw new ApiError(404, "NOT_FOUND", "Review not found.");
          db.reviews = db.reviews.filter((x) => x.id !== reviewId);
          recalcRating(db, r.bookId);
          return { ok: true };
        })
      ),

    // Profile
    updateProfile: (t, data) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          const name = String((data && data.name) || "").trim();
          if (name.length < 2 || name.length > 60) throw new ApiError(400, "VALIDATION_ERROR", "Invalid input.", { name: "Display name must be 2 to 60 characters." });
          u.name = name;
          return publicUser(u);
        })
      ),
    deletionRequest: (t) =>
      call(
        () =>
          tx((db) => {
            const u = authUser(db, t);
            return db.deletionRequests.find((d) => d.userId === u.id) || null;
          }),
        { read: true }
      ),
    requestDeletion: (t) =>
      call(() =>
        tx((db) => {
          const u = authUser(db, t);
          let d = db.deletionRequests.find((x) => x.userId === u.id);
          if (!d) {
            d = { id: rid("del_", 10), userId: u.id, createdAt: now(), status: "requested" };
            db.deletionRequests.push(d);
          }
          return d;
        })
      ),
  };

  function validateReview(data) {
    const details = {};
    const rating = Number(data && data.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) details.rating = "Choose a rating from 1 to 5 stars.";
    const comment = String((data && data.comment) || "").trim();
    if (comment.length < 3) details.comment = "Write at least a few words.";
    if (comment.length > 1000) details.comment = "Reviews can be up to 1000 characters.";
    if (Object.keys(details).length) throw new ApiError(400, "VALIDATION_ERROR", "Please check your review.", details);
    data.rating = rating;
  }

  // =====================================================================
  // Third-party mocks: Google Identity Services and Razorpay Checkout
  // =====================================================================
  const MockGoogle = {
    clientId: GOOGLE_CLIENT_ID,
    storeAccounts: [
      { sub: "g-200-priya", email: "priya.sharma@gmail.com", name: "Priya Sharma", picture: "#a87a3d", note: "Returning buyer" },
      { sub: "g-600-arjun", email: "arjun.mehta@gmail.com", name: "Arjun Mehta", picture: "#264653", note: "First-time sign-in" },
      { sub: "g-500-rahul", email: "rahul.verma@gmail.com", name: "Rahul Verma", picture: "#5b1f2e", note: "Blocked account" },
    ],
    adminAccounts: [
      { sub: "g-100-meera", email: "meera@pageandpine.in", name: "Meera Nair", picture: "#1f3a2d", note: "On admin allowlist" },
      { sub: "g-200-priya", email: "priya.sharma@gmail.com", name: "Priya Sharma", picture: "#a87a3d", note: "Not on allowlist" },
    ],
    credentialFor(account) {
      const payload = { iss: "https://accounts.google.com", aud: GOOGLE_CLIENT_ID, sub: account.sub, email: account.email, email_verified: true, name: account.name, picture: account.picture, iat: now(), exp: now() + 5 * 60 * 1000 };
      const body = b64(payload);
      return "eyJhbGciOiJSUzI1NiJ9." + body + "." + mockHmac(body, "google").slice(0, 43);
    },
  };

  const MockRazorpay = {
    keyId: RAZORPAY_KEY_ID,
    // Simulates the buyer completing (or failing) payment inside Razorpay Checkout.
    pay(razorpayOrderId, outcome, method) {
      return call(() =>
        tx((db) => {
          const order = db.orders.find((o) => o.razorpayOrderId === razorpayOrderId);
          if (!order) throw new ApiError(404, "BAD_REQUEST_ERROR", "Order not found.");
          const paymentId = rid("pay_", 14);
          if (outcome === "success") {
            const event = { id: rid("evt_", 14), entity: "event", event: "payment.captured", payload: { payment: { entity: { id: paymentId, order_id: razorpayOrderId, amount: order.total, currency: "INR", status: "captured", method } } }, created_at: Math.floor(now() / 1000) };
            deliverWebhook(db, event, 1600);
            deliverWebhook(db, event, 5000); // Razorpay may deliver the same event again
            return { razorpay_order_id: razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: mockHmac(razorpayOrderId + "|" + paymentId, RAZORPAY_KEY_SECRET) };
          }
          const description = "Your payment was declined by the bank. No money was deducted.";
          const event = { id: rid("evt_", 14), entity: "event", event: "payment.failed", payload: { payment: { entity: { id: paymentId, order_id: razorpayOrderId, amount: order.total, currency: "INR", status: "failed", method, error_description: description } } }, created_at: Math.floor(now() / 1000) };
          deliverWebhook(db, event, 1200);
          return { error: { code: "BAD_REQUEST_ERROR", description, source: "bank", step: "payment_authorization", reason: "payment_failed", metadata: { order_id: razorpayOrderId, payment_id: paymentId } } };
        })
      );
    },
  };

  // =====================================================================
  // Admin API (/api/v1/admin/*, admin role checked on every request)
  // =====================================================================
  function audit(db, admin, action, entity, entityId, before, after) {
    db.auditLogs.push({ id: rid("al_", 10), adminId: admin.id, action, entity, entityId, before: before === undefined ? null : clone(before), after: after === undefined ? null : clone(after), createdAt: now() });
  }

  function adminBook(db, b) {
    return Object.assign(clone(b), {
      authors: b.authorIds.map((id) => db.authors.find((a) => a.id === id)).filter(Boolean).map((a) => ({ id: a.id, name: a.name })),
      category: (db.categories.find((c) => c.id === b.categoryId) || { name: "—" }).name,
      cover: coverOf(b),
      filesComplete: !!(b.coverKey && b.sampleKey && b.pdfKey),
      ownersCount: db.entitlements.filter((e) => e.bookId === b.id && !e.revokedAt).length,
    });
  }

  function validateBook(db, data, id) {
    const d = {};
    const out = {};
    out.title = String(data.title || "").trim();
    if (out.title.length < 1) d.title = "Title is required.";
    else if (out.title.length > 150) d.title = "Title can be up to 150 characters.";
    out.slug = slugify(data.slug || data.title || "");
    if (!out.slug) d.slug = "Slug is required.";
    else if (db.books.some((b) => b.slug === out.slug && b.id !== id)) d.slug = "Another book already uses this slug.";
    out.authorIds = Array.isArray(data.authorIds) ? data.authorIds.filter((a) => db.authors.some((x) => x.id === a)) : [];
    if (!out.authorIds.length) d.authorIds = "Choose at least one author.";
    out.categoryId = data.categoryId;
    if (!db.categories.some((c) => c.id === data.categoryId)) d.categoryId = "Choose a category.";
    out.description = String(data.description || "").trim();
    if (out.description.length < 20) d.description = "Description must be at least 20 characters.";
    out.language = data.language;
    if (!LANGUAGES.includes(data.language)) d.language = "Choose a language.";
    out.pages = Number(data.pages);
    if (!Number.isInteger(out.pages) || out.pages < 1) d.pages = "Page count must be a whole number greater than 0.";
    const rupees = Number(data.price);
    out.price = Math.round(rupees * 100);
    if (data.price === "" || isNaN(rupees) || rupees < 1) d.price = "Price must be at least ₹1.";
    out.taxCategory = data.taxCategory;
    if (!TAX_CATEGORIES[data.taxCategory]) d.taxCategory = "Choose a tax category.";
    out.featured = !!data.featured;
    if (Object.keys(d).length) throw new ApiError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", d);
    return out;
  }

  const BOOK_FIELDS = ["title", "slug", "authorIds", "categoryId", "description", "language", "pages", "price", "taxCategory", "featured"];
  const pick = (o, keys) => keys.reduce((acc, k) => ((acc[k] = o[k]), acc), {});

  function validateNamed(db, collection, data, id) {
    const d = {};
    const name = String(data.name || "").trim();
    if (name.length < 2) d.name = "Name must be at least 2 characters.";
    const slug = slugify(data.slug || name);
    if (!slug) d.slug = "Slug is required.";
    else if (db[collection].some((x) => x.slug === slug && x.id !== id)) d.slug = "This slug is already used.";
    const out = { name, slug };
    if (collection === "authors") {
      out.bio = String(data.bio || "").trim();
      if (out.bio.length > 600) d.bio = "Bio can be up to 600 characters.";
    }
    if (Object.keys(d).length) throw new ApiError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", d);
    return out;
  }

  function namedCrud(collection, entity, usageField) {
    const usage = (db, id) => db.books.filter((b) => (usageField === "authorIds" ? b.authorIds.includes(id) : b.categoryId === id)).length;
    return {
      list: (t, params) =>
        call(
          () =>
            tx((db) => {
              authUser(db, t, { admin: true });
              const q = String((params && params.q) || "").toLowerCase().trim();
              const list = db[collection]
                .filter((x) => !q || x.name.toLowerCase().includes(q))
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((x) => Object.assign(clone(x), { bookCount: usage(db, x.id) }));
              return paginate(list, params && params.page, 10);
            }),
          { read: true }
        ),
      all: (t) => call(() => tx((db) => (authUser(db, t, { admin: true }), db[collection].slice().sort((a, b) => a.name.localeCompare(b.name))))),
      create: (t, data) =>
        call(() =>
          tx((db) => {
            const admin = authUser(db, t, { admin: true });
            const v = validateNamed(db, collection, data);
            const rec = Object.assign({ id: rid(entity.charAt(0) + "_", 8) }, v);
            db[collection].push(rec);
            audit(db, admin, entity + ".create", entity, rec.id, null, v);
            return rec;
          })
        ),
      update: (t, id, data) =>
        call(() =>
          tx((db) => {
            const admin = authUser(db, t, { admin: true });
            const rec = db[collection].find((x) => x.id === id);
            if (!rec) throw new ApiError(404, "NOT_FOUND", "Not found.");
            const v = validateNamed(db, collection, data, id);
            const before = pick(rec, Object.keys(v));
            Object.assign(rec, v);
            audit(db, admin, entity + ".update", entity, id, before, v);
            return rec;
          })
        ),
      remove: (t, id) =>
        call(() =>
          tx((db) => {
            const admin = authUser(db, t, { admin: true });
            const rec = db[collection].find((x) => x.id === id);
            if (!rec) throw new ApiError(404, "NOT_FOUND", "Not found.");
            const n = usage(db, id);
            if (n > 0) throw new ApiError(409, "IN_USE", "This " + entity + " is used by " + n + " book" + (n > 1 ? "s" : "") + " and cannot be deleted.");
            db[collection] = db[collection].filter((x) => x.id !== id);
            audit(db, admin, entity + ".delete", entity, id, rec, null);
            return { ok: true };
          })
        ),
    };
  }

  const AdminAPI = {
    signInWithGoogle: (credential) => call(() => tx((db) => googleSignIn(db, credential, "admin"))),
    refresh: () => call(() => tx((db) => refreshSession(db, "admin"))),
    logout: () => call(() => tx((db) => logout(db, "admin"))),

    // Books
    books: (t, params) =>
      call(
        () =>
          tx((db) => {
            authUser(db, t, { admin: true });
            const p = params || {};
            const q = String(p.q || "").toLowerCase().trim();
            let list = db.books.slice();
            if (p.status) list = list.filter((b) => b.status === p.status);
            if (q) list = list.filter((b) => (b.title + " " + b.slug + " " + b.authorIds.map((id) => (db.authors.find((a) => a.id === id) || {}).name).join(" ")).toLowerCase().includes(q));
            list.sort((a, b) => b.updatedAt - a.updatedAt);
            const page = paginate(list, p.page, 10);
            page.items = page.items.map((b) => adminBook(db, b));
            return page;
          }),
        { read: true }
      ),
    book: (t, id) =>
      call(
        () =>
          tx((db) => {
            authUser(db, t, { admin: true });
            const b = db.books.find((x) => x.id === id);
            if (!b) throw new ApiError(404, "NOT_FOUND", "Book not found.");
            return adminBook(db, b);
          }),
        { read: true }
      ),
    createBook: (t, data) =>
      call(() =>
        tx((db) => {
          const admin = authUser(db, t, { admin: true });
          const v = validateBook(db, data);
          const b = Object.assign({ id: rid("b_", 8), status: "draft", coverKey: null, sampleKey: null, pdfKey: null, coverImage: null, fileSize: null, sampleSize: null, ratingAvg: 0, ratingCount: 0, palette: Math.floor(Math.random() * COVER_PALETTES.length), createdAt: now(), updatedAt: now(), publishedAt: null }, v);
          db.books.push(b);
          audit(db, admin, "book.create", "book", b.id, null, Object.assign({ status: "draft" }, v));
          return adminBook(db, b);
        })
      ),
    updateBook: (t, id, data) =>
      call(() =>
        tx((db) => {
          const admin = authUser(db, t, { admin: true });
          const b = db.books.find((x) => x.id === id);
          if (!b) throw new ApiError(404, "NOT_FOUND", "Book not found.");
          const v = validateBook(db, data, id);
          const before = pick(b, BOOK_FIELDS);
          const changed = BOOK_FIELDS.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(v[k]));
          if (!changed.length) return adminBook(db, b);
          Object.assign(b, v, { updatedAt: now() });
          audit(db, admin, "book.update", "book", id, pick(before, changed), pick(v, changed));
          return adminBook(db, b);
        })
      ),
    setBookStatus: (t, id, action) =>
      call(() =>
        tx((db) => {
          const admin = authUser(db, t, { admin: true });
          const b = db.books.find((x) => x.id === id);
          if (!b) throw new ApiError(404, "NOT_FOUND", "Book not found.");
          const before = b.status;
          if (action === "publish") {
            if (b.status === "published") throw new ApiError(422, "INVALID_STATUS", "This book is already published.");
            const missing = [];
            if (!b.pdfKey) missing.push("full PDF");
            if (!b.sampleKey) missing.push("sample PDF");
            if (!b.coverKey) missing.push("cover image");
            if (missing.length) throw new ApiError(422, "BOOK_INCOMPLETE", "Upload the " + missing.join(", ") + " before publishing.", { missing });
            b.status = "published";
            if (!b.publishedAt) b.publishedAt = now();
          } else if (action === "unpublish") {
            if (b.status !== "published") throw new ApiError(422, "INVALID_STATUS", "Only published books can be unpublished.");
            b.status = "draft";
          } else if (action === "archive") {
            if (b.status === "archived") throw new ApiError(422, "INVALID_STATUS", "This book is already archived.");
            b.status = "archived";
          } else throw new ApiError(400, "VALIDATION_ERROR", "Unknown action.");
          b.updatedAt = now();
          audit(db, admin, "book." + action, "book", id, { status: before }, { status: b.status });
          return adminBook(db, b);
        })
      ),

    // POST /admin/uploads/sign
    signUpload: (t, body) =>
      call(() =>
        tx((db) => {
          authUser(db, t, { admin: true });
          const limit = FILE_LIMITS[body.kind];
          if (!limit) throw new ApiError(400, "VALIDATION_ERROR", "Unknown file kind.");
          if (body.kind !== "logo" && !db.books.some((b) => b.id === body.bookId)) throw new ApiError(404, "NOT_FOUND", "Book not found.");
          if (!limit.types.includes(body.contentType)) throw new ApiError(422, "INVALID_FILE_TYPE", limit.label + " must be " + (body.kind === "pdf" || body.kind === "sample" ? "a PDF file (application/pdf)." : "a JPEG, PNG or WebP image."));
          if (!(body.size > 0)) throw new ApiError(422, "INVALID_FILE", "The file is empty.");
          if (body.size > limit.max) throw new ApiError(422, "FILE_TOO_LARGE", limit.label + " must be " + Math.round(limit.max / MB) + " MB or smaller.");
          const ext = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[body.contentType];
          const prefix = { pdf: "books", sample: "samples", cover: "covers", logo: "branding" }[body.kind];
          const key = body.kind === "logo" ? prefix + "/" + uuid() + "." + ext : prefix + "/" + body.bookId + "/" + uuid() + "." + ext;
          const expiresAt = now() + UPLOAD_URL_TTL_SECONDS * 1000;
          db.pendingUploads.push({ key, bookId: body.bookId || null, kind: body.kind, contentType: body.contentType, size: body.size, expiresAt, uploaded: false });
          return {
            key,
            bucket: limit.bucket,
            method: "PUT",
            headers: { "Content-Type": body.contentType },
            expiresIn: UPLOAD_URL_TTL_SECONDS,
            uploadUrl: "https://acc1234.r2.cloudflarestorage.com/" + limit.bucket + "/" + key + "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=" + UPLOAD_URL_TTL_SECONDS + "&X-Amz-SignedHeaders=content-type%3Bhost&X-Amz-Signature=" + mockHmac(key, "put").slice(0, 32),
          };
        })
      ),
    // Simulates the browser PUT straight to R2 (not through the API)
    putToR2: (key) =>
      call(() =>
        tx((db) => {
          const p = db.pendingUploads.find((x) => x.key === key);
          if (!p || p.expiresAt < now()) throw new ApiError(403, "SIGNATURE_EXPIRED", "Upload URL expired. Please try again.");
          p.uploaded = true;
          return { ok: true };
        })
      ),
    confirmUpload: (t, body) =>
      call(() =>
        tx((db) => {
          const admin = authUser(db, t, { admin: true });
          const p = db.pendingUploads.find((x) => x.key === body.key && x.kind === body.kind);
          if (!p || !p.uploaded) throw new ApiError(422, "UPLOAD_NOT_FOUND", "The uploaded file was not found in storage.");
          db.pendingUploads = db.pendingUploads.filter((x) => x.key !== body.key);
          if (body.kind === "logo") {
            const before = { logoKey: db.settings.logoKey };
            db.settings.logoKey = p.key;
            db.settings.logoImage = body.preview || null;
            audit(db, admin, "settings.update", "settings", "store", before, { logoKey: p.key });
            return { logoKey: p.key, logoImage: db.settings.logoImage };
          }
          const b = db.books.find((x) => x.id === p.bookId);
          const field = body.kind + "Key";
          const before = { [field]: b[field] };
          b[field] = p.key;
          if (body.kind === "pdf") b.fileSize = p.size;
          if (body.kind === "sample") b.sampleSize = p.size;
          if (body.kind === "cover") b.coverImage = body.preview || null;
          b.updatedAt = now();
          audit(db, admin, before[field] ? "book.file_replace" : "book.file_upload", "book", b.id, before, { [field]: p.key, size: p.size });
          return adminBook(db, b);
        })
      ),

    categories: namedCrud("categories", "category", "categoryId"),
    authors: namedCrud("authors", "author", "authorIds"),

    // Orders
    orders: (t, params) =>
      call(
        () =>
          tx((db) => {
            authUser(db, t, { admin: true });
            const p = params || {};
            const q = String(p.q || "").toLowerCase().trim();
            let list = db.orders.map((o) => {
              const u = db.users.find((x) => x.id === o.userId) || {};
              return Object.assign(clone(o), { buyerName: u.name, buyerEmail: u.email });
            });
            if (p.status) list = list.filter((o) => o.status === p.status);
            if (p.from) {
              const f = new Date(p.from + "T00:00:00").getTime();
              list = list.filter((o) => o.createdAt >= f);
            }
            if (p.to) {
              const to = new Date(p.to + "T23:59:59").getTime();
              list = list.filter((o) => o.createdAt <= to);
            }
            if (q) list = list.filter((o) => o.id.toLowerCase().includes(q) || o.razorpayOrderId.toLowerCase().includes(q) || (o.buyerEmail || "").toLowerCase().includes(q));
            list.sort((a, b) => b.createdAt - a.createdAt);
            return paginate(list, p.page, 10);
          }),
        { read: true }
      ),
    order: (t, id) =>
      call(
        () =>
          tx((db) => {
            authUser(db, t, { admin: true });
            const o = db.orders.find((x) => x.id === id);
            if (!o) throw new ApiError(404, "NOT_FOUND", "Order not found.");
            const u = db.users.find((x) => x.id === o.userId) || {};
            const webhooks = db.webhookEvents.filter((e) => e.orderId === o.id).sort((a, b) => a.deliveries[0].receivedAt - b.deliveries[0].receivedAt);
            const entitlements = db.entitlements.filter((e) => e.orderId === o.id).map((e) => ({ bookId: e.bookId, revokedAt: e.revokedAt, downloadCount: e.downloadCount, downloadLimit: e.downloadLimit }));
            return Object.assign(clone(o), { buyer: { id: u.id, name: u.name, email: u.email, isBlocked: u.isBlocked }, webhooks, entitlements });
          }),
        { read: true }
      ),
    // POST /admin/orders/:id/refund (Razorpay Refunds API)
    refund: (t, id) =>
      call(() =>
        tx((db) => {
          const admin = authUser(db, t, { admin: true });
          const o = db.orders.find((x) => x.id === id);
          if (!o) throw new ApiError(404, "NOT_FOUND", "Order not found.");
          if (o.status !== "paid") throw new ApiError(422, "NOT_REFUNDABLE", "Only paid orders can be refunded.");
          if (o.refundStatus === "processing") throw new ApiError(409, "REFUND_IN_PROGRESS", "A refund is already in progress for this order.");
          o.refundId = rid("rfnd_", 14);
          o.refundStatus = "processing";
          o.refundRequestedAt = now();
          audit(db, admin, "order.refund", "order", o.id, { status: "paid" }, { refundId: o.refundId, amount: o.total, refundStatus: "processing" });
          const event = { id: rid("evt_", 14), entity: "event", event: "refund.processed", payload: { refund: { entity: { id: o.refundId, payment_id: o.razorpayPaymentId, amount: o.total, currency: "INR", status: "processed" } } }, created_at: Math.floor(now() / 1000) };
          deliverWebhook(db, event, 3500);
          return clone(o);
        })
      ),

    // Customers
    customers: (t, params) =>
      call(
        () =>
          tx((db) => {
            authUser(db, t, { admin: true });
            const p = params || {};
            const q = String(p.q || "").toLowerCase().trim();
            let list = db.users.filter((u) => u.role === "buyer");
            if (q) list = list.filter((u) => (u.name + " " + u.email).toLowerCase().includes(q));
            if (p.status === "blocked") list = list.filter((u) => u.isBlocked);
            if (p.status === "active") list = list.filter((u) => !u.isBlocked);
            list = list
              .map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                avatarColor: u.avatarColor,
                isBlocked: u.isBlocked,
                createdAt: u.createdAt,
                paidOrders: db.orders.filter((o) => o.userId === u.id && o.status === "paid").length,
                booksOwned: db.entitlements.filter((e) => e.userId === u.id && !e.revokedAt).length,
                downloads: db.downloads.filter((d) => d.userId === u.id).length,
                deletionRequested: db.deletionRequests.some((d) => d.userId === u.id),
              }))
              .sort((a, b) => b.createdAt - a.createdAt);
            return paginate(list, p.page, 10);
          }),
        { read: true }
      ),
    customer: (t, id) =>
      call(
        () =>
          tx((db) => {
            authUser(db, t, { admin: true });
            const u = db.users.find((x) => x.id === id && x.role === "buyer");
            if (!u) throw new ApiError(404, "NOT_FOUND", "Customer not found.");
            const purchases = db.entitlements
              .filter((e) => e.userId === id)
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((e) => {
                const b = db.books.find((x) => x.id === e.bookId) || {};
                return { bookId: e.bookId, title: b.title, orderId: e.orderId, purchasedAt: e.createdAt, downloadCount: e.downloadCount, downloadLimit: e.downloadLimit, revokedAt: e.revokedAt };
              });
            const downloads = db.downloads
              .filter((d) => d.userId === id)
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((d) => Object.assign(clone(d), { title: (db.books.find((b) => b.id === d.bookId) || {}).title }));
            return { id: u.id, name: u.name, email: u.email, avatarColor: u.avatarColor, isBlocked: u.isBlocked, createdAt: u.createdAt, purchases, downloads, orders: db.orders.filter((o) => o.userId === id).length, deletionRequest: db.deletionRequests.find((d) => d.userId === id) || null };
          }),
        { read: true }
      ),
    setCustomerBlocked: (t, id, blocked) =>
      call(() =>
        tx((db) => {
          const admin = authUser(db, t, { admin: true });
          const u = db.users.find((x) => x.id === id);
          if (!u || u.role !== "buyer") throw new ApiError(404, "NOT_FOUND", "Customer not found.");
          if (u.id === admin.id) throw new ApiError(422, "INVALID_ACTION", "You cannot block your own account.");
          if (u.isBlocked === !!blocked) return { id: u.id, isBlocked: u.isBlocked };
          u.isBlocked = !!blocked;
          if (blocked) {
            u.tokenVersion += 1;
            revokeAllForUser(db, u.id);
          }
          audit(db, admin, blocked ? "customer.block" : "customer.unblock", "user", u.id, { isBlocked: !blocked }, { isBlocked: !!blocked });
          return { id: u.id, isBlocked: u.isBlocked };
        })
      ),

    // Reviews
    reviews: (t, params) =>
      call(
        () =>
          tx((db) => {
            authUser(db, t, { admin: true });
            const p = params || {};
            const q = String(p.q || "").toLowerCase().trim();
            let list = db.reviews.map((r) => {
              const u = db.users.find((x) => x.id === r.userId) || {};
              const b = db.books.find((x) => x.id === r.bookId) || {};
              return Object.assign(clone(r), { userName: u.name, userEmail: u.email, bookTitle: b.title });
            });
            if (p.visibility === "visible") list = list.filter((r) => !r.isHidden);
            if (p.visibility === "hidden") list = list.filter((r) => r.isHidden);
            if (q) list = list.filter((r) => (r.bookTitle + " " + r.userName + " " + r.userEmail + " " + r.comment).toLowerCase().includes(q));
            list.sort((a, b) => b.createdAt - a.createdAt);
            return paginate(list, p.page, 10);
          }),
        { read: true }
      ),
    setReviewHidden: (t, id, hidden) =>
      call(() =>
        tx((db) => {
          const admin = authUser(db, t, { admin: true });
          const r = db.reviews.find((x) => x.id === id);
          if (!r) throw new ApiError(404, "NOT_FOUND", "Review not found.");
          const before = { isHidden: r.isHidden };
          r.isHidden = !!hidden;
          recalcRating(db, r.bookId);
          audit(db, admin, hidden ? "review.hide" : "review.unhide", "review", id, before, { isHidden: r.isHidden });
          return r;
        })
      ),
    deleteReview: (t, id) =>
      call(() =>
        tx((db) => {
          const admin = authUser(db, t, { admin: true });
          const r = db.reviews.find((x) => x.id === id);
          if (!r) throw new ApiError(404, "NOT_FOUND", "Review not found.");
          db.reviews = db.reviews.filter((x) => x.id !== id);
          recalcRating(db, r.bookId);
          audit(db, admin, "review.delete", "review", id, { rating: r.rating, comment: r.comment, bookId: r.bookId, userId: r.userId }, null);
          return { ok: true };
        })
      ),

    // Settings
    settings: (t) =>
      call(
        () =>
          tx((db) => {
            authUser(db, t, { admin: true });
            return Object.assign(clone(db.settings), { templateMeta: EMAIL_TEMPLATE_META });
          }),
        { read: true }
      ),
    updateSettings: (t, data) =>
      call(() =>
        tx((db) => {
          const admin = authUser(db, t, { admin: true });
          const d = {};
          const storeName = String(data.storeName || "").trim();
          if (storeName.length < 2 || storeName.length > 60) d.storeName = "Store name must be 2 to 60 characters.";
          const supportEmail = String(data.supportEmail || "").trim();
          if (!isEmail(supportEmail)) d.supportEmail = "Enter a valid email address.";
          const enabled = !!data.gstEnabled;
          const gstin = String(data.gstin || "").trim().toUpperCase();
          const rate = Number(data.gstRate);
          if (enabled && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) d.gstin = "Enter a valid 15-character GSTIN.";
          if (enabled && (isNaN(rate) || rate <= 0 || rate > 28)) d.gstRate = "GST rate must be between 0.01 and 28%.";
          const limit = Number(data.defaultDownloadLimit);
          if (!Number.isInteger(limit) || limit < 1 || limit > 100) d.defaultDownloadLimit = "Download limit must be a whole number from 1 to 100.";
          if (Object.keys(d).length) throw new ApiError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", d);
          const before = { storeName: db.settings.storeName, supportEmail: db.settings.supportEmail, gst: clone(db.settings.gst), defaultDownloadLimit: db.settings.defaultDownloadLimit };
          db.settings.storeName = storeName;
          db.settings.supportEmail = supportEmail;
          db.settings.gst = { enabled, gstin: gstin || db.settings.gst.gstin, rate: enabled ? rate : db.settings.gst.rate };
          db.settings.defaultDownloadLimit = limit;
          const after = { storeName, supportEmail, gst: clone(db.settings.gst), defaultDownloadLimit: limit };
          if (JSON.stringify(before) !== JSON.stringify(after)) audit(db, admin, "settings.update", "settings", "store", before, after);
          return Object.assign(clone(db.settings), { templateMeta: EMAIL_TEMPLATE_META });
        })
      ),
    removeLogo: (t) =>
      call(() =>
        tx((db) => {
          const admin = authUser(db, t, { admin: true });
          const before = { logoKey: db.settings.logoKey };
          db.settings.logoKey = null;
          db.settings.logoImage = null;
          audit(db, admin, "settings.update", "settings", "store", before, { logoKey: null });
          return { ok: true };
        })
      ),
    updateEmailTemplate: (t, key, data) =>
      call(() =>
        tx((db) => {
          const admin = authUser(db, t, { admin: true });
          const meta = EMAIL_TEMPLATE_META[key];
          if (!meta) throw new ApiError(404, "NOT_FOUND", "Template not found.");
          const d = {};
          const subject = String(data.subject || "").trim();
          const body = String(data.body || "").trim();
          if (subject.length < 3 || subject.length > 150) d.subject = "Subject must be 3 to 150 characters.";
          if (body.length < 10) d.body = "Body must be at least 10 characters.";
          const used = (subject + " " + body).match(/\{\{\s*(\w+)\s*\}\}/g) || [];
          const unknown = used.map((m) => m.replace(/[{}\s]/g, "")).filter((k) => !meta.placeholders.includes(k));
          if (unknown.length) d.body = "Unknown placeholder: " + unknown.map((k) => "{{" + k + "}}").join(", ");
          if (Object.keys(d).length) throw new ApiError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", d);
          const before = clone(db.settings.emailTemplates[key]);
          db.settings.emailTemplates[key] = { subject, body };
          audit(db, admin, "email_template.update", "email_template", key, before, { subject, body });
          return db.settings.emailTemplates[key];
        })
      ),

    // Audit log
    auditLog: (t, params) =>
      call(
        () =>
          tx((db) => {
            authUser(db, t, { admin: true });
            const p = params || {};
            let list = db.auditLogs.slice();
            if (p.entity) list = list.filter((a) => a.entity === p.entity);
            if (p.action) list = list.filter((a) => a.action === p.action);
            list.sort((a, b) => b.createdAt - a.createdAt);
            const page = paginate(list, p.page, 15);
            page.items = page.items.map((a) => Object.assign(clone(a), { adminName: (db.users.find((u) => u.id === a.adminId) || {}).name || a.adminId, adminEmail: (db.users.find((u) => u.id === a.adminId) || {}).email }));
            page.actions = Array.from(new Set(db.auditLogs.map((a) => a.action))).sort();
            page.entities = Array.from(new Set(db.auditLogs.map((a) => a.entity))).sort();
            return page;
          }),
        { read: true }
      ),
  };

  global.Mock = {
    StoreAPI,
    AdminAPI,
    MockGoogle,
    MockRazorpay,
    ApiError,
    FILE_LIMITS,
    TAX_CATEGORIES,
    LANGUAGES,
    EMAIL_TEMPLATE_META,
    COVER_PALETTES,
    slugify,
    reset,
    tick: () => tx(() => null),
  };
})(window);
