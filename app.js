const els = {
  setup: document.getElementById("setup"),
  quiz: document.getElementById("quiz"),
  result: document.getElementById("result"),
  progress: document.getElementById("progress"),
  mode: document.getElementById("mode"),
  start: document.getElementById("start"),
  kind: document.getElementById("kind"),
  stem: document.getElementById("stem"),
  ipa: document.getElementById("ipa"),
  choices: document.getElementById("choices"),
  feedback: document.getElementById("feedback"),
  next: document.getElementById("next"),
  mark: document.getElementById("mark"),
  score: document.getElementById("score"),
  missSummary: document.getElementById("miss-summary"),
  retryMiss: document.getElementById("retry-miss"),
  retryAll: document.getElementById("retry-all"),
  missCount: document.getElementById("miss-count"),
  missList: document.getElementById("miss-list"),
  tally: document.getElementById("tally"),
  tallyLegend: document.getElementById("tally-legend"),
  tallyBar: document.getElementById("tally-bar"),
  exit: document.getElementById("exit"),
};

let deck = [];
let queue = [];
let index = 0;
let misses = [];
let ticks = [];
let answered = false;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueMisses() {
  const out = [];
  const seen = new Set();
  for (const item of misses) {
    if (seen.has(item.word)) continue;
    seen.add(item.word);
    out.push(item);
  }
  return out;
}

function pickDistractors(item, key, count = 3) {
  const pool = deck.filter((d) => d.word !== item.word && d[key]);
  return shuffle(pool).slice(0, count);
}

function questionType() {
  const mode = els.mode.value;
  if (mode === "mix") return Math.random() < 0.5 ? "word" : "def";
  return mode;
}

function tallyCounts() {
  let ok = 0;
  let bad = 0;
  for (const t of ticks) {
    if (t === "ok") ok += 1;
    if (t === "bad") bad += 1;
  }
  return { ok, bad, left: Math.max(0, ticks.length - ok - bad) };
}

function renderTally() {
  const { ok, bad, left } = tallyCounts();
  els.tallyLegend.textContent = `正确 ${ok} · 错误 ${bad} · 未答 ${left}`;
  els.tally.innerHTML = "";
  ticks.forEach((state, i) => {
    const box = document.createElement("span");
    box.className = "tick" + (state ? ` ${state}` : "") + (i === index && !els.quiz.classList.contains("hidden") ? " now" : "");
    box.title = queue[i] ? queue[i].word : "";
    els.tally.appendChild(box);
  });
}

function renderMisses() {
  const unique = uniqueMisses();
  els.missCount.textContent = unique.length
    ? `共 ${unique.length} 词`
    : "尚未标记或答错";
  els.missList.innerHTML = "";
  for (const item of unique) {
    const li = document.createElement("li");
    const tag = item.marked && item.wrong ? "错+标" : item.marked ? "标记" : "错题";
    li.innerHTML = `<span class="w">${item.word}</span> <span class="p">${item.ipa || ""}</span><div class="d">${tag} · ${item.definition}</div>`;
    els.missList.appendChild(li);
  }
}

function addToMisses(item, flags) {
  const found = misses.find((m) => m.word === item.word);
  if (found) {
    if (flags.wrong) found.wrong = true;
    if (flags.marked) found.marked = true;
  } else {
    misses.push({
      ...item,
      wrong: !!flags.wrong,
      marked: !!flags.marked,
    });
  }
  renderMisses();
}

function renderQuestion() {
  answered = false;
  els.feedback.classList.add("hidden");
  els.next.classList.add("hidden");
  const item = queue[index];
  const type = questionType();
  item._type = type;
  els.progress.textContent = `${index + 1} / ${queue.length}`;
  els.mark.textContent = misses.some((m) => m.word === item.word && m.marked)
    ? "已标记"
    : "加入错题&标记";

  if (type === "word") {
    els.kind.textContent = "选出正确中文释义";
    els.stem.textContent = item.word;
    els.ipa.textContent = item.ipa || "";
    const opts = shuffle([item, ...pickDistractors(item, "definition")]);
    drawChoices(opts.map((o) => ({ label: o.definition, word: o.word })));
  } else {
    els.kind.textContent = "选出对应的英文单词";
    els.stem.textContent = item.definition;
    els.ipa.textContent = "";
    const opts = shuffle([item, ...pickDistractors(item, "word")]);
    drawChoices(
      opts.map((o) => ({
        label: `${o.word}  ${o.ipa || ""}`,
        word: o.word,
      }))
    );
  }
  renderTally();
}

function drawChoices(opts) {
  els.choices.innerHTML = "";
  const item = queue[index];
  for (const opt of opts) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = opt.label;
    btn.dataset.word = opt.word;
    btn.addEventListener("click", () => onPick(btn, opt.word === item.word));
    els.choices.appendChild(btn);
  }
}

function onPick(btn, ok) {
  if (answered) return;
  answered = true;
  const item = queue[index];
  [...els.choices.querySelectorAll("button")].forEach((b) => {
    b.disabled = true;
    if (b.dataset.word === item.word) b.classList.add("correct");
  });
  if (ok) {
    ticks[index] = "ok";
    btn.classList.add("correct");
  } else {
    ticks[index] = "bad";
    btn.classList.add("wrong");
    addToMisses(item, { wrong: true });
  }
  renderTally();
  els.feedback.classList.remove("hidden");
  els.feedback.innerHTML = ok
    ? `正确。<br>${item.word} ${item.ipa || ""}<br>${item.definition}`
    : `正确答案：${item.word} ${item.ipa || ""}<br>${item.definition}`;
  els.next.classList.remove("hidden");
}

function finish() {
  els.quiz.classList.add("hidden");
  els.result.classList.remove("hidden");
  const { ok, bad } = tallyCounts();
  els.progress.textContent = "完成";
  els.score.textContent = `得分 ${ok} / ${queue.length}`;
  els.missSummary.textContent = uniqueMisses().length
    ? "左侧为错题与手动标记。"
    : "全部正确。";
  els.retryMiss.disabled = uniqueMisses().length === 0;
  renderTally();
}

function start(list, resetMisses) {
  queue = [...list];
  index = 0;
  ticks = Array(queue.length).fill(null);
  if (resetMisses) misses = [];
  renderMisses();
  els.setup.classList.add("hidden");
  els.result.classList.add("hidden");
  els.quiz.classList.remove("hidden");
  if (els.tallyBar) els.tallyBar.classList.remove("hidden");
  document.body.classList.add("testing");
  renderQuestion();
}

function startSpotCheck() {
  start(shuffle(deck), true);
}

function exitTest() {
  queue = [];
  index = 0;
  ticks = Array(deck.length).fill(null);
  misses = [];
  renderMisses();
  els.quiz.classList.add("hidden");
  els.result.classList.add("hidden");
  els.setup.classList.remove("hidden");
  els.progress.textContent = `共 ${deck.length} 词 · 随机顺序`;
  if (els.tallyBar) els.tallyBar.classList.add("hidden");
  document.body.classList.remove("testing");
  renderTally();
}

document.querySelectorAll(".mode-opt").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-opt").forEach((b) => b.classList.remove("on"));
    btn.classList.add("on");
    els.mode.value = btn.dataset.mode;
  });
});

els.start.addEventListener("click", startSpotCheck);
if (els.exit) els.exit.addEventListener("click", exitTest);
els.next.addEventListener("click", () => {
  index += 1;
  if (index >= queue.length) finish();
  else renderQuestion();
});
els.mark.addEventListener("click", () => {
  const item = queue[index];
  if (!item) return;
  addToMisses(item, { marked: true });
  els.mark.textContent = "已标记";
});
els.retryAll.addEventListener("click", startSpotCheck);
els.retryMiss.addEventListener("click", () => {
  const unique = uniqueMisses();
  if (!unique.length) return;
  start(shuffle(unique), false);
});

function currentList() {
  const list = Number(new URLSearchParams(location.search).get("list"));
  return Number.isInteger(list) && list >= 1 && list <= 46 ? list : 0;
}

function loadDeck() {
  const list = currentList();
  if (!list) {
    location.replace(asset("index.html"));
    return;
  }
  const pad = String(list).padStart(2, "0");
  const kicker = document.querySelector(".kicker");
  if (kicker) kicker.textContent = `Word List ${list} · 抽查`;
  document.title = `GRE Word List ${list} · 抽查`;
  const wordsLink = document.getElementById("words-link");
  if (wordsLink) wordsLink.href = asset("words.html?list=" + list);
  const apply = (rows) => {
    deck = rows.filter((d) => d.word && d.definition);
    ticks = Array(deck.length).fill(null);
    els.progress.textContent = `共 ${deck.length} 词 · 随机顺序`;
    const blurb = document.getElementById("setup-blurb");
    if (blurb) blurb.textContent = `${deck.length} 词全部作答，每轮随机打乱顺序。`;
    renderMisses();
    if (els.tallyBar) els.tallyBar.classList.add("hidden");
  };
  fetch(asset(`decks/list-${pad}.json`))
    .then((r) => {
      if (!r.ok) throw new Error("missing");
      return r.json();
    })
    .then(apply)
    .catch(() => {
      els.progress.textContent = `Word List ${list} 尚未收录`;
      els.setup.innerHTML = `<p>此词表暂无单词。请返回目录另选。</p><a class="btn ghost" href="${asset("index.html")}">返回目录</a>`;
    });
}

loadDeck();
