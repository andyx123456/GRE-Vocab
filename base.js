const BASE = "/GRE-Vocab";
const DATA_VER = "20261106b";

function asset(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return BASE + "/" + clean;
}

function data(path) {
  const url = asset(path);
  return url + (url.includes("?") ? "&" : "?") + "v=" + DATA_VER;
}