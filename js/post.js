import { API_BASE, authHeaders } from "./api.js";

function getAuth() {
  return {
    token: localStorage.getItem("token") || "",
    apiKey: localStorage.getItem("apiKey") || "",
    name: localStorage.getItem("name") || "",
  };
}
function isLogged() {
  const { token, apiKey } = getAuth();
  return Boolean(token && apiKey);
}

const errorEl = document.getElementById("postError");
const imgEl = document.getElementById("postImg");
const titleEl = document.getElementById("postTitle");
const metaEl = document.getElementById("postMeta");
const bodyEl = document.getElementById("postBody");
const tagsEl = document.getElementById("postTags");
const reactBtn = document.getElementById("reactBtn");
const editBtn = document.getElementById("editBtn");
const delBtn = document.getElementById("delBtn");
const commentForm = document.getElementById("commentForm");
const commentText = document.getElementById("commentText");
const commentsOut = document.getElementById("commentsOut");

(function renderHeaderAuth() {
  const slot = document.getElementById("authRight");
  if (!slot) return;
  slot.innerHTML = "";
  if (isLogged()) {
    slot.innerHTML = `
      <a class="ghost" href="./profile.html">My profile</a>
      <button class="ghost" id="logoutBtn">Logout</button>`;
    slot.querySelector("#logoutBtn").addEventListener("click", () => {
      ["token", "apiKey", "name"].forEach(k => localStorage.removeItem(k));
      window.location.href = "./index.html";
    });
  } else {
    slot.innerHTML = `
      <a class="ghost" href="./index.html">Login</a>
      <a class="ghost" href="./register.html">Register</a>`;
  }
})();

const id = new URLSearchParams(location.search).get("id");
let postData = null;

function fmtDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return iso || ""; } }
function countForSymbol(reactions = [], symbol = "👍") {
  const item = reactions.find(r => r.symbol === symbol);
  return item ? item.count : 0;
}

function renderPost(data) {
  const { name: myName } = getAuth();
  const mediaUrl = data?.media?.url || "";
  const mediaAlt = data?.media?.alt || data?.title || "post image";
  if (mediaUrl) { imgEl.src = mediaUrl; imgEl.alt = mediaAlt; } else { imgEl.remove(); }

  titleEl.textContent = data?.title || "(untitled)";
  bodyEl.textContent = data?.body || "";

  const authorName = data?.author?.name ? `@${data.author.name}` : "";
  const created = fmtDate(data?.created);
  const comCount = data?._count?.comments ?? 0;
  const likeCount = countForSymbol(data?.reactions, "👍");
  metaEl.textContent = `${authorName} · ${created} · 💬 ${comCount} · 👍 ${likeCount}`;

  tagsEl.innerHTML = "";
  (data?.tags || []).forEach(t => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `#${t}`;
    tagsEl.appendChild(chip);
  });

  if (data?.author?.name === myName) {
    editBtn.style.display = "inline-flex";
    editBtn.href = `./post-edit.html?id=${data.id}`;
    delBtn.style.display = "inline-flex";
    delBtn.onclick = onDeletePost;
  } else {
    editBtn.style.display = "none";
    delBtn.style.display = "none";
  }

  reactBtn.onclick = onToggleReaction;
  reactBtn.disabled = !isLogged();

  renderComments(data?.comments || []);
  commentForm.style.display = isLogged() ? "flex" : "none";
}

function renderComments(comments) {
  const { name: myName } = getAuth();
  commentsOut.innerHTML = "";
  comments.forEach(c => {
    const wrap = document.createElement("div");
    wrap.className = "comment";
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${c?.author?.name ? "@" + c.author.name : ""} · ${fmtDate(c?.created)}`;
    const body = document.createElement("div");
    body.textContent = c?.body || "";

    wrap.appendChild(meta);
    wrap.appendChild(body);

    if (c?.author?.name === myName) {
      const del = document.createElement("button");
      del.className = "ghost";
      del.style.marginTop = "6px";
      del.textContent = "Delete";
      del.addEventListener("click", async () => {
        if (!confirm("Delete this comment?")) return;
        try {
          const res = await fetch(`${API_BASE}/social/posts/${id}/comment/${c.id}`, {
            method: "DELETE",
            headers: authHeaders()
          });
          if (!res.ok) throw new Error("Failed to delete comment");
          await loadPost();
        } catch (err) { alert(err.message || "Could not delete comment."); }
      });
      wrap.appendChild(del);
    }

    commentsOut.appendChild(wrap);
  });
}

async function onToggleReaction() {
  try {
    if (!isLogged()) return alert("Please login first.");
    const url = `${API_BASE}/social/posts/${id}/react/${encodeURIComponent("👍")}`;
    const res = await fetch(url, { method: "PUT", headers: authHeaders(), body: JSON.stringify({}) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await loadPost();
  } catch (err) { alert(err.message || "Could not toggle reaction."); }
}

async function onDeletePost() {
  if (!confirm("Delete this post?")) return;
  try {
    const res = await fetch(`${API_BASE}/social/posts/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to delete post.");
    window.location.href = "./feed.html";
  } catch (err) { alert(err.message || "Could not delete post."); }
}

commentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    if (!isLogged()) return alert("Please login first.");
    const body = commentText.value.trim();
    if (!body) return;
    const res = await fetch(`${API_BASE}/social/posts/${id}/comment`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ body })
    });
    if (!res.ok) throw new Error("Failed to post comment.");
    commentText.value = "";
    await loadPost();
  } catch (err) { alert(err.message || "Could not add comment."); }
});

async function loadPost() {
  errorEl.textContent = "";
  if (!id) { errorEl.textContent = "Missing post id."; return; }
  if (!isLogged()) { errorEl.innerHTML = `You must be logged in. <a class="ghost" href="./index.html">Go to Login</a>`; return; }
  try {
    const res = await fetch(`${API_BASE}/social/posts/${id}?_author=true&_comments=true&_reactions=true`, {
      headers: authHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.errors?.[0]?.message || res.statusText);
    postData = json?.data;
    renderPost(postData);
  } catch (err) { errorEl.textContent = err.message || "Failed to load post"; }
}

loadPost();
