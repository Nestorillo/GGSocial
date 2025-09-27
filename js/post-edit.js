import { API_BASE, authHeaders } from "./api.js";

function getAuth() {
  return {
    token: localStorage.getItem("token") || localStorage.getItem("accessToken") || "",
    apiKey: localStorage.getItem("apiKey") || "",
    name: localStorage.getItem("name") || localStorage.getItem("userName") || "",
  };
}
function isLogged() {
  const { token, apiKey } = getAuth();
  return Boolean(token && apiKey);
}

const infoEl = document.getElementById("editInfo");
const errorEl = document.getElementById("editError");
const formEl = document.getElementById("editForm");
const titleEl = document.getElementById("title");
const imageUrlEl = document.getElementById("imageUrl");
const tagsEl = document.getElementById("tags");
const bodyEl = document.getElementById("body");
const deleteBtn = document.getElementById("deleteBtn");

const qp = (k) => new URLSearchParams(location.search).get(k) || "";
function requireId() {
  const id = qp("id");
  if (!id) throw new Error("Missing id in URL (?id=...)");
  return id;
}

async function loadPost(id) {
  infoEl.textContent = "Loading…";
  errorEl.textContent = "";
  const res = await fetch(`${API_BASE}/social/posts/${encodeURIComponent(id)}?_author=true`, {
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.[0]?.message || "Failed to load post");

  const d = json.data;
  titleEl.value = d.title || "";
  bodyEl.value = d.body || "";
  imageUrlEl.value = d.media?.url || "";
  tagsEl.value = Array.isArray(d.tags) ? d.tags.join(",") : "";
  infoEl.textContent = `Last updated: ${new Date(d.updated || d.created).toLocaleString()}`;
}

async function updatePost(id, payload) {
  const res = await fetch(`${API_BASE}/social/posts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.[0]?.message || "Failed to update");
  return json.data;
}

async function deletePost(id) {
  const res = await fetch(`${API_BASE}/social/posts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.errors?.[0]?.message || "Failed to delete");
  }
  return true;
}

(async function init() {
  if (!isLogged()) { location.href = "index.html"; return; }

  let id;
  try {
    id = requireId();
  } catch (e) {
    errorEl.textContent = e.message;
    infoEl.textContent = "Open this page from the Edit button in your posts.";
    formEl.style.display = "none";
    return;
  }

  try { await loadPost(id); } catch (e) { errorEl.textContent = e.message; return; }

  formEl.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    errorEl.textContent = "";
    infoEl.textContent = "Saving…";

    const title = titleEl.value.trim();
    const body = bodyEl.value.trim();
    const url = imageUrlEl.value.trim();
    const tags = tagsEl.value.split(",").map(t => t.trim()).filter(Boolean);

    if (!title || !body) {
      errorEl.textContent = "Title and Description are required.";
      infoEl.textContent = "";
      return;
    }

    const payload = { title, body, tags, ...(url ? { media: { url } } : { media: null }) };

    try {
      await updatePost(id, payload);
      infoEl.textContent = "Saved ✓";
    } catch (e) {
      infoEl.textContent = "";
      errorEl.textContent = e.message;
    }
  });

  deleteBtn.addEventListener("click", async () => {
    if (!confirm("Delete this post?")) return;
    infoEl.textContent = "Deleting…";
    try {
      await deletePost(id);
      infoEl.textContent = "Deleted ✓";
      setTimeout(() => (location.href = "feed.html"), 600);
    } catch (e) {
      infoEl.textContent = "";
      errorEl.textContent = e.message;
    }
  });
})();
