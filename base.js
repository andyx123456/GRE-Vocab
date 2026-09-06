const BASE = "/GRE-Vocab";

function asset(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return BASE + "/" + clean;
}
