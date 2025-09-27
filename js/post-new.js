import { API_BASE, authHeaders } from "./api.js";

const nav = document.getElementById("authRight");
const err = document.getElementById("newErr");

const hasSession = () =>
  Boolean((localStorage.getItem("accessToken") || localStorage.getItem("token")) && localStorage.getItem("apiKey"));

(function header() {
  if (hasSession()) {
    nav.innerHTML = `
      <a href="./feed.html" class="ghost">All posts</a>
      <button id="logoutBtn" class="ghost">Logout</button>
    `;
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      ["token", "accessToken", "apiKey", "name", "userName"].forEach(k => localStorage.removeItem(k));
      location.href = "./index.html";
    });
  } else {
    nav.innerHTML = `
      <a href="./index.html" class="ghost">Login</a>
      <a href="./register.html" class="ghost">Register</a>
    `;
  }
})();

if (!hasSession()) location.href = "./index.html";

document.getElementById("newForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  err.textContent = "";

  const fd = new FormData(e.target);
  const title = fd.get("title")?.toString().trim();
  const body = fd.get("body")?.toString().trim() || "";
  const mediaUrl = fd.get("mediaUrl")?.toString().trim();
  const mediaAlt = fd.get("mediaAlt")?.toString().trim();
  const tagsStr = fd.get("tags")?.toString().trim();
  const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()).filter(Boolean) : [];

  if (!title) { err.textContent = "Title is required."; return; }

  const payload = { title, body };
  if (tags.length) payload.tags = tags;
  if (mediaUrl) payload.media = { url: mediaUrl, alt: mediaAlt || "" };

  try {
    const res = await fetch(`${API_BASE}/social/posts`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.errors?.[0]?.message || res.statusText || "Failed to create post");
    location.href = `./post.html?id=${j.data.id}`;
  } catch (e2) {
    err.textContent = e2.message || "Failed to create post";
  }
});
