const LIST_COUNT = 46;
const root = document.getElementById("lists");
const resultsEl = document.getElementById("all-words");
const metaEl = document.getElementById("all-meta");
const chipsEl = document.getElementById("cat-chips");
const searchEl = document.getElementById("all-search");
const showAllBtn = document.getElementById("show-all");
const backListsBtn = document.getElementById("back-lists");
const pageTitle = document.getElementById("page-title");
const pageMeta = document.getElementById("page-meta");

const POS_ORDER = ["n.", "v.", "adj.", "adv.", "prep.", "conj.", "pron.", "num.", "int.", "其他"];
const POS_RE = /^(adj|adv|n|v|vt|vi|prep|conj|pron|num|int|aux)\./i;

let ready = {};
let catalog = [];
let showAll = false;
let catKind = "list";
let catValue = "all";

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function letterOf(item) {
  const ch = (item.word || "").trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "#";
}

function posesOf(item) {
  const found = [];
  const seen = new Set();
  for (const line of String(item.definition || "").split(/\n+/)) {
    const m = line.trim().match(POS_RE);
    if (!m) continue;
    let pos = m[1].toLowerCase();
    if (pos === "vt" || pos === "vi" || pos === "aux") pos = "v";
    const key = pos + ".";
    if (!seen.has(key)) {
      seen.add(key);
      found.push(key);
    }
  }
  return found.length ? found : ["其他"];
}

function keysOf(item) {
  if (catKind === "letter") return [letterOf(item)];
  if (catKind === "pos") return posesOf(item);
  return [String(item.list)];
}

function allKeys() {
  if (catKind === "letter") {
    const letters = [];
    for (let i = 65; i <= 90; i++) letters.push(String.fromCharCode(i));
    letters.push("#");
    return letters;
  }
  if (catKind === "pos") return POS_ORDER.slice();
  return Array.from({ length: LIST_COUNT }, (_, i) => String(i + 1));
}

function keyLabel(key) {
  if (catKind === "list") return "List " + key;
  if (catKind === "pos") return key === "其他" ? "其他" : key;
  return key;
}

function sectionTitle(key, count) {
  if (catKind === "list") return `Word List ${key} · ${count} 词`;
  if (catKind === "pos") return `${key === "其他" ? "其他" : key} · ${count} 词`;
  return `${key} · ${count} 词`;
}

function scoreHit(item, q, needle) {
  const word = item.word.toLowerCase();
  if (word === needle) return 0;
  if (word.startsWith(needle)) return 1;
  if (word.includes(needle)) return 2;
  if ((item.ipa || "").toLowerCase().includes(needle)) return 3;
  if ((item.definition || "").includes(q)) return 4;
  return 9;
}

function matchesQuery(item, q) {
  if (!q) return true;
  return scoreHit(item, q, q.toLowerCase()) < 9;
}

function inCategory(item, key) {
  return key === "all" || keysOf(item).includes(key);
}

function filteredItems(key, q) {
  let items = catalog.filter((item) => inCategory(item, key) && matchesQuery(item, q));
  if (q) {
    const needle = q.toLowerCase();
    items = items.slice().sort((a, b) => {
      const d = scoreHit(a, q, needle) - scoreHit(b, q, needle);
      return d || a.list - b.list || a.word.localeCompare(b.word);
    });
  }
  return items;
}

function countsByKey(q) {
  const counts = { all: 0 };
  for (const key of allKeys()) counts[key] = 0;
  for (const item of catalog) {
    if (!matchesQuery(item, q)) continue;
    counts.all += 1;
    for (const key of keysOf(item)) {
      if (counts[key] != null) counts[key] += 1;
    }
  }
  return counts;
}

const REVIEWED_FROM = 6;
const REVIEWED_TO = 28;

function isReviewed(n) {
  return n === 1 || (n >= REVIEWED_FROM && n <= REVIEWED_TO);
}

function appendListHead(title, note) {
  const head = document.createElement("h2");
  head.className = "list-head";
  head.textContent = title;
  if (note) {
    const span = document.createElement("span");
    span.className = "list-head-note";
    span.textContent = note;
    head.appendChild(span);
  }
  root.appendChild(head);
}

function appendListCard(n) {
  const count = ready[n] || ready[String(n)];
  const reviewed = isReviewed(n);
  const card = document.createElement(count ? "a" : "div");
  card.className = "list-card" + (count ? "" : " empty") + (reviewed ? "" : " pending");
  if (count) card.href = asset("quiz.html?list=" + n);
  const stat = count
    ? count + " 词 · " + (reviewed ? "可抽查" : "尚未修改")
    : "尚未收录";
  card.innerHTML = `
    <p class="num">Word List ${n}</p>
    <p class="stat">${stat}</p>
  `;
  root.appendChild(card);
}

function renderLists() {
  root.innerHTML = "";
  const pending = [];
  const reviewed = [];
  for (let n = 1; n <= LIST_COUNT; n++) {
    (isReviewed(n) ? reviewed : pending).push(n);
  }
  appendListHead("尚未修改", `${pending.length} 表`);
  pending.forEach(appendListCard);
  appendListHead("已修改", `${reviewed.length} 表`);
  reviewed.forEach(appendListCard);
}

function renderRow(item) {
  const row = document.createElement("article");
  row.className = "word-row";
  row.innerHTML = `
    <span class="idx">${item.list}</span>
    <div>
      <div class="head">
        <span class="w">${escapeHtml(item.word)}</span>
        <span class="p">${escapeHtml(item.ipa || "")}</span>
        <span class="list-tag">List ${item.list}</span>
      </div>
      <div class="d">${escapeHtml(item.definition)}</div>
    </div>`;
  return row;
}

function renderChips() {
  if (!chipsEl) return;
  const q = (searchEl && searchEl.value ? searchEl.value : "").trim();
  const counts = countsByKey(q);
  chipsEl.innerHTML = "";
  const keys = ["all", ...allKeys()];
  for (const key of keys) {
    const count = counts[key] || 0;
    if (key !== "all" && !count && q) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cat-chip" + (catValue === key ? " on" : "");
    btn.textContent = (key === "all" ? "全部" : keyLabel(key)) + " " + count;
    btn.addEventListener("click", () => {
      catValue = key;
      refresh();
    });
    chipsEl.appendChild(btn);
  }
}

function renderAll() {
  const q = (searchEl && searchEl.value ? searchEl.value : "").trim();
  if (!catalog.length) {
    metaEl.textContent = "正在载入词库…";
    resultsEl.innerHTML = "";
    return;
  }
  renderChips();
  resultsEl.innerHTML = "";
  const frag = document.createDocumentFragment();
  let shown = 0;
  const groups = catValue === "all" ? allKeys() : [catValue];
  for (const key of groups) {
    const items = filteredItems(key, q);
    if (!items.length) continue;
    const head = document.createElement("div");
    head.className = "word-section";
    head.id = "cat-" + key;
    head.textContent = sectionTitle(key, items.length);
    frag.appendChild(head);
    for (const item of items) {
      frag.appendChild(renderRow(item));
      shown += 1;
    }
  }
  if (!shown) {
    resultsEl.innerHTML = `<p class="search-empty">没有找到${q ? ` “${escapeHtml(q)}”` : "单词"}</p>`;
    metaEl.textContent = q ? `当前分类中没有匹配` : `当前分类没有单词`;
    return;
  }
  resultsEl.appendChild(frag);
  const scope = catValue === "all" ? "全部单词" : keyLabel(catValue);
  metaEl.textContent = q ? `${scope}中找到 ${shown} 词` : `${scope} · ${shown} 词`;
}

function syncChrome() {
  document.body.classList.toggle("showing-all", showAll);
  const chrome = document.getElementById("all-chrome");
  const homeActions = document.getElementById("home-actions");
  if (chrome) chrome.classList.toggle("hidden", !showAll);
  if (resultsEl) resultsEl.classList.toggle("hidden", !showAll);
  if (homeActions) homeActions.classList.toggle("hidden", showAll);
  if (pageTitle) pageTitle.textContent = showAll ? "全部单词" : "选择词表";
  if (pageMeta) {
    let reviewedCount = 0;
    for (let n = 1; n <= LIST_COUNT; n++) {
      if (isReviewed(n)) reviewedCount += 1;
    }
    const pendingCount = LIST_COUNT - reviewedCount;
    pageMeta.textContent = showAll
      ? "按分类浏览，可在分类内搜索"
      : `尚未修改 ${pendingCount} 表 · 已修改 ${reviewedCount} 表`;
  }
}

function refresh() {
  syncChrome();
  if (showAll) renderAll();
}

async function loadCatalog() {
  try {
    const rows = await fetch(data("decks/catalog.json")).then((r) => {
      if (!r.ok) throw new Error("missing");
      return r.json();
    });
    catalog = rows.filter((d) => d.word && d.definition);
  } catch (err) {
    catalog = [];
  }
  refresh();
}

document.querySelectorAll("#cat-modes .mode-opt").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#cat-modes .mode-opt").forEach((b) => b.classList.remove("on"));
    btn.classList.add("on");
    catKind = btn.dataset.kind;
    catValue = "all";
    refresh();
  });
});

if (searchEl) {
  const onSearch = () => refresh();
  searchEl.addEventListener("input", onSearch);
  searchEl.addEventListener("search", onSearch);
}

const start = new URLSearchParams(location.search);
if (start.get("all") === "1") showAll = true;
if (["list", "letter", "pos"].includes(start.get("kind"))) {
  catKind = start.get("kind");
  document.querySelectorAll("#cat-modes .mode-opt").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.kind === catKind);
  });
}
if (start.get("cat")) catValue = start.get("cat");
if (searchEl && start.get("q")) searchEl.value = start.get("q");

if (showAllBtn) {
  showAllBtn.addEventListener("click", () => {
    showAll = true;
    refresh();
  });
}

if (backListsBtn) {
  backListsBtn.addEventListener("click", () => {
    showAll = false;
    catKind = "list";
    catValue = "all";
    if (searchEl) searchEl.value = "";
    document.querySelectorAll("#cat-modes .mode-opt").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.kind === "list");
    });
    refresh();
  });
}

fetch(data("decks/manifest.json"))
  .then((r) => r.json())
  .then((data) => {
    ready = data.ready || {};
    renderLists();
    refresh();
    loadCatalog();
  })
  .catch(() => {
    ready = {};
    renderLists();
    refresh();
    loadCatalog();
  });
