import { API_BASE, authHeaders } from "./api.js";

function getToken() { return localStorage.getItem("accessToken") || localStorage.getItem("token"); }
function getApiKey() { return localStorage.getItem("apiKey"); }
function getUserName() { return localStorage.getItem("userName") || localStorage.getItem("name"); }

async function apiGet(path) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { headers: authHeaders() });
  let data = null;
  try { data = await res.json(); } catch { }
  if (!res.ok) {
    const msg = data?.errors?.[0]?.message || res.statusText || "Request failed";
    const e = new Error(msg);
    e.status = res.status;
    e.payload = data;
    throw e;
  }
  return data;
}

function excerptSentence(md = "", maxChars = 140) {
  if (!md) return "";
  let txt = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  txt = txt.replace(/[*_`>#-]/g, "");
  txt = txt.replace(/\s+/g, " ").trim();
  const m = txt.match(/(.+?[.!?])(\s|$)/);
  let sentence = m ? m[1] : txt;
  if (sentence.length > maxChars) {
    sentence = sentence.slice(0, maxChars - 1);
    const cut = sentence.lastIndexOf(" ");
    if (cut > 60) sentence = sentence.slice(0, cut);
  }
  return sentence + "…";
}

function renderHeader() {
  const token = getToken();
  const el = document.getElementById("authRight");
  if (!el) return;
  if (token) {
    el.innerHTML = `
      <a href="./profile.html" class="ghost">My profile</a>
      <a href="./post-new.html" class="btn">New post</a>
      <button id="logoutBtn" class="ghost">Logout</button>`;
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      ["token", "accessToken", "apiKey", "name", "userName"].forEach(k => localStorage.removeItem(k));
      window.location.href = "./index.html";
    });
  } else {
    el.innerHTML = `
      <a href="./index.html" class="ghost">Login</a>
      <a href="./register.html" class="ghost">Register</a>`;
  }
}

let currentPage = 1;
let currentQuery = "";
let onlyMine = false;

async function healthCheck() {
  const error = document.getElementById("feedError");
  error.textContent = "";
  if (!getToken()) { error.textContent = "You are not logged in. Go to Login."; return false; }
  if (!getApiKey()) { error.textContent = "Missing API Key. Log out and log in again."; return false; }
  try { await apiGet(`/social/posts?limit=1&page=1`); return true; }
  catch (e) { error.textContent = `${e.status || ""} ${e.message}`; return false; }
}

async function loadPosts() {
  const out = document.getElementById("postsOut");
  const error = document.getElementById("feedError");
  error.textContent = ""; out.innerHTML = "";
  try {
    let path;
    if (onlyMine) {
      const name = getUserName();
      if (!name) throw new Error("No username in storage. Log in again.");
      path = `/social/profiles/${encodeURIComponent(name)}/posts?limit=9&page=${currentPage}&_author=true&_comments=true&_reactions=true`;
    } else {
      const q = currentQuery ? `&q=${encodeURIComponent(currentQuery)}` : "";
      path = `/social/posts?limit=9&page=${currentPage}${q}&_author=true&_comments=true&_reactions=true`;
    }

    const json = await apiGet(path);
    const items = Array.isArray(json?.data) ? json.data : [];
    if (!items.length) {
      out.innerHTML = `<p class="muted center">No posts found.</p>`;
      document.getElementById("pageIndicator").textContent = `Page ${currentPage}`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "grid";
    items.forEach(p => grid.appendChild(renderCard(p)));
    out.appendChild(grid);

    document.getElementById("pageIndicator").textContent = `Page ${currentPage}`;
  } catch (e) {
    error.textContent = e.message || "Failed to load posts";
  }
}

function renderCard(p) {
  const id = encodeURIComponent(p?.id);
  const card = document.createElement("article");
  card.className = "post";
  const imgUrl = p?.media?.url || "https://picsum.photos/seed/ggsocial/800/450";
  const imgAlt = p?.media?.alt || p?.title || "post image";
  const safeTitle = esc(p?.title || "Untitled");
  const excerpt = esc(excerptSentence(p?.body || "", 140));
  const tags = (p?.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join("");
  const authorName = p?.author?.name || "unknown";
  const authorLink = `./profile.html?user=${encodeURIComponent(authorName)}`;

  card.innerHTML = `
    <a class="cardlink" href="./post.html?id=${id}">
      <img class="thumb" src="${imgUrl}" alt="${esc(imgAlt)}">
    </a>
    <div class="content">
      <h3 class="title">
        <a class="cardlink" href="./post.html?id=${id}">${safeTitle}</a>
      </h3>
      <div class="body">${excerpt}</div>
      <div class="tags">${tags}</div>
      <div class="meta">
        <a class="meta-user" href="${authorLink}">@${esc(authorName)}</a>
        <span>· 💬 ${p?._count?.comments ?? 0}</span>
        <span>· 👍 ${p?._count?.reactions ?? 0}</span>
      </div>
      <a class="btn" href="./post.html?id=${id}">Open</a>
    </div>`;
  return card;
}

function esc(s = "") { return s.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }

function wireUI() {
  document.getElementById("searchBtn")?.addEventListener("click", () => {
    currentQuery = document.getElementById("searchInput").value.trim();
    currentPage = 1; onlyMine = false; setSegment("all"); loadPosts();
  });
  document.getElementById("filterAll")?.addEventListener("click", () => {
    onlyMine = false; currentPage = 1; setSegment("all"); loadPosts();
  });
  document.getElementById("filterMine")?.addEventListener("click", () => {
    onlyMine = true; currentPage = 1; setSegment("mine"); loadPosts();
  });
  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; loadPosts(); }
  });
  document.getElementById("nextPage")?.addEventListener("click", () => {
    currentPage++; loadPosts();
  });
}
function setSegment(which) {
  document.getElementById("filterAll")?.classList.toggle("active", which === "all");
  document.getElementById("filterMine")?.classList.toggle("active", which === "mine");
}

(async function init() {
  renderHeader();
  wireUI();
  setSegment("all");
  const ok = await healthCheck();
  if (ok) loadPosts();
})();
