const countEl = document.getElementById("count");
const listEl = document.getElementById("list");
const searchEl = document.getElementById("search");
const params = new URLSearchParams(location.search);

let deck = [];

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function currentList() {
  const list = Number(params.get("list"));
  return Number.isInteger(list) && list >= 1 && list <= 46 ? list : 0;
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

function render() {
  const focus = (params.get("word") || "").trim().toLowerCase();
  const q = (searchEl && searchEl.value ? searchEl.value : "").trim();
  const needle = q.toLowerCase();
  let items = deck.map((item, i) => ({ item, i }));
  if (q) {
    items = items
      .filter(({ item }) => scoreHit(item, q, needle) < 9)
      .sort((a, b) => {
        const d = scoreHit(a.item, q, needle) - scoreHit(b.item, q, needle);
        return d || a.i - b.i;
      });
  }
  countEl.textContent = q
    ? `找到 ${items.length} / ${deck.length} 词`
    : `共 ${deck.length} 词`;
  listEl.innerHTML = "";
  if (!items.length) {
    listEl.innerHTML = `<p class="search-empty">没有找到 “${escapeHtml(q)}”</p>`;
    return;
  }
  let focusEl = null;
  for (const { item, i } of items) {
    const row = document.createElement("article");
    const exact = focus && item.word.toLowerCase() === focus;
    row.className = "word-row" + (exact ? " focus" : "");
    row.id = "w-" + item.word.toLowerCase().replace(/[^a-z0-9\-]+/g, "-");
    row.innerHTML = `
      <span class="idx">${i + 1}</span>
      <div>
        <div class="head"><span class="w">${escapeHtml(item.word)}</span><span class="p">${escapeHtml(item.ipa || "")}</span></div>
        <div class="d">${escapeHtml(item.definition)}</div>
      </div>`;
    listEl.appendChild(row);
    if (exact && !focusEl) focusEl = row;
  }
  if (focusEl && !q) focusEl.scrollIntoView({ block: "center" });
}

function load() {
  const list = currentList();
  if (!list) {
    location.replace(asset("index.html"));
    return;
  }
  const pad = String(list).padStart(2, "0");
  const kicker = document.getElementById("kicker");
  if (kicker) kicker.textContent = `Word List ${list}`;
  document.title = `GRE Word List ${list} · 词表`;
  const back = document.getElementById("back-quiz");
  if (back) back.href = asset("quiz.html?list=" + list);
  fetch(data(`decks/list-${pad}.json`))
    .then((r) => {
      if (!r.ok) throw new Error("missing");
      return r.json();
    })
    .then((rowsIn) => {
      deck = rowsIn.filter((d) => d.word && d.definition);
      render();
    })
    .catch(() => {
      countEl.textContent = "无法加载词表";
    });
}

if (searchEl) {
  searchEl.addEventListener("input", render);
  searchEl.addEventListener("search", render);
}

load();
