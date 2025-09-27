import { API_BASE, authHeaders, getMyName, requireAuth, setHeaderAuthUI } from "./api.js";

let viewingName = null;
let me = null;
let isOwn = false;
let profile = null;
let page = 1;
const limit = 6;
let isFollowing = false;

const bannerEl = document.getElementById("pBanner");
const avatarEl = document.getElementById("pAvatar");
const nameEl = document.getElementById("pName");
const chipsEl = document.getElementById("pChips");
const btnEdit = document.getElementById("editProfileBtn");
const btnFollow = document.getElementById("followBtn");
const btnLogout = document.getElementById("logoutBtn");

const postsOut = document.getElementById("postsOut");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageLabel = document.getElementById("pageIndicator");

const editModal = document.getElementById("editProfileModal");
const editForm = document.getElementById("editPForm");
const editErr = document.getElementById("editPErr");
const editCancel = document.getElementById("cancelEdit");
const editAvatarUrl = document.getElementById("inpAvatar");
const editBannerUrl = document.getElementById("inpBanner");
const editBio = document.getElementById("inpBio");

function qParam(name) {
  const url = new URL(location.href);
  return url.searchParams.get(name);
}
function truncate(s, max = 100) {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
function safeUrl(u) {
  if (!u) return "";
  try {
    const x = new URL(u);
    if (x.protocol === "http:" || x.protocol === "https:") return u;
  } catch { }
  return "";
}

async function followApi(profileName, doFollow /* boolean */) {
  const base = `${API_BASE}/social/profiles/${encodeURIComponent(profileName)}`;

  if (doFollow) {
    const res = await fetch(`${base}/follow`, { method: "PUT", headers: authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.errors?.[0]?.message || "Follow failed");
    return j.data || j;
  } else {
    let res = await fetch(`${base}/follow`, { method: "DELETE", headers: authHeaders() });
    let j = await res.json().catch(() => ({}));

    if (!res.ok && (res.status === 404 || res.status === 405)) {
      res = await fetch(`${base}/unfollow`, { method: "PUT", headers: authHeaders() });
      j = await res.json().catch(() => ({}));
    }

    if (!res.ok) throw new Error(j?.errors?.[0]?.message || "Unfollow failed");
    return j.data || j;
  }
}


async function getProfile(name) {
  const url = `${API_BASE}/social/profiles/${encodeURIComponent(name)}?_followers=true&_following=true`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.message || "Profile not found");
  return data.data || data;
}

async function getProfilePosts(name, page, limit) {
  const search = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    _author: "true",
    _reactions: "true",
    _comments: "true",
  });
  const url = `${API_BASE}/social/profiles/${encodeURIComponent(name)}/posts?${search}`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.message || "Posts error");
  const list = data.data || data;
  const total = data.meta?.total || list.length;
  return { list, total };
}

async function updateProfileMedia(body) {
  const url = `${API_BASE}/social/profiles/${encodeURIComponent(me)}/media`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.message || "Update media failed");
  return data.data || data;
}

async function updateProfileAbout(bio) {
  const url = `${API_BASE}/social/profiles/${encodeURIComponent(me)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ bio }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.message || "Update bio failed");
  return data.data || data;
}

function setFollowUI(following) {
  isFollowing = !!following;
  btnFollow.textContent = isFollowing ? "Unfollow" : "Follow";
  btnFollow.classList.toggle("following", isFollowing);
}

function renderHeader(p) {
  const banner = p.banner?.url || "";
  const avatar = p.avatar?.url || "";
  if (bannerEl) bannerEl.style.backgroundImage = banner ? `url("${banner}")` : "";
  if (avatarEl) {
    const fallbackSVG =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110"><circle cx="55" cy="55" r="55" fill="%231b1d24"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="38" fill="%23ffae00">?</text></svg>';
    avatarEl.src = safeUrl(avatar) || fallbackSVG;
    avatarEl.alt = p.name || "avatar";
  }
  if (nameEl) nameEl.textContent = p.name || "My profile";

  const postsCount = p._count?.posts ?? p.posts ?? 0;
  const followers = Array.isArray(p.followers) ? p.followers.length : (p._count?.followers ?? 0);
  const following = Array.isArray(p.following) ? p.following.length : (p._count?.following ?? 0);

  if (chipsEl) {
    chipsEl.innerHTML = `
      <span class="chip">Posts: ${postsCount}</span>
      <span class="chip">Followers: ${followers}</span>
      <span class="chip">Following: ${following}</span>
    `;
  }

  // botones
  if (btnEdit) btnEdit.hidden = !isOwn;
  if (btnFollow) btnFollow.hidden = isOwn;

  // estado follow
  if (!isOwn) {
    const amIFollowing = (Array.isArray(p.followers) ? p.followers : []).some(f => f.name === me);
    setFollowUI(amIFollowing);
  }
}

function renderPosts(list, total) {
  postsOut.innerHTML = "";
  list.forEach(post => {
    const li = document.createElement("article");
    li.className = "card post";

    const imgUrl = post.media?.url || "";
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const author = post.author?.name || post.owner || viewingName;

    li.innerHTML = `
      <div class="thumb">${imgUrl ? `<img src="${safeUrl(imgUrl)}" alt="">` : `<div class="placeholder">No image</div>`}</div>
      <div class="content">
        <h3 class="title"><a href="./post.html?id=${encodeURIComponent(post.id)}">${truncate(post.title || "Untitled", 80)}</a></h3>
        <p class="body">${truncate(post.body || "", 100)}</p>
        <div class="tags">${tags.map(t => `<span class="tag">#${t}</span>`).join("")}</div>
        <div class="meta">@${author} • 👍 ${post._count?.reactions ?? 0} • 💬 ${post._count?.comments ?? 0}</div>
        <a class="btn" href="./post.html?id=${encodeURIComponent(post.id)}">Open</a>
      </div>
    `;
    postsOut.appendChild(li);
  });

  pageLabel.textContent = `Page ${page}`;
  const maxPage = Math.max(1, Math.ceil(total / limit));
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= maxPage;
}

btnLogout?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("apiKey");
  localStorage.removeItem("gg_auth");
  location.href = "./index.html";
});

btnFollow?.addEventListener("click", async () => {
  try {
    btnFollow.disabled = true;
    const doFollow = !isFollowing;
    await followApi(viewingName, doFollow);
    setFollowUI(doFollow);

    if (chipsEl) {
      const m = chipsEl.textContent.match(/Followers:\s*(\d+)/);
      if (m) {
        const current = parseInt(m[1], 10) || 0;
        const next = doFollow ? current + 1 : Math.max(0, current - 1);
        chipsEl.innerHTML = chipsEl.innerHTML.replace(/Followers:\s*\d+/, `Followers: ${next}`);
      }
    }
  } catch (e) {
    alert(e.message || "Action failed");
  } finally {
    btnFollow.disabled = false;
  }
});

btnEdit?.addEventListener("click", () => {
  if (!editModal) return;
  editErr.textContent = "";
  editAvatarUrl.value = profile?.avatar?.url || "";
  editBannerUrl.value = profile?.banner?.url || "";
  editBio.value = profile?.bio || "";
  editModal.hidden = false;
});
editCancel?.addEventListener("click", () => { if (editModal) editModal.hidden = true; });
editModal?.addEventListener("click", (e) => {
  if (e.target === editModal) editModal.hidden = true;
});
editForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    editErr.textContent = "";
    const submitBtn = editForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    const avatar = safeUrl(editAvatarUrl.value.trim());
    const banner = safeUrl(editBannerUrl.value.trim());
    await updateProfileMedia({
      avatar: avatar ? { url: avatar, alt: `${me} avatar` } : null,
      banner: banner ? { url: banner, alt: `${me} banner` } : null
    });

    const bio = editBio.value.trim();
    await updateProfileAbout(bio);

    alert("Profile updated!");
    location.reload();
  } catch (e) {
    editErr.textContent = e.message || "Update failed";
  } finally {
    const submitBtn = editForm.querySelector("button[type=submit]");
    if (submitBtn) submitBtn.disabled = false;
  }
});

prevBtn?.addEventListener("click", async () => {
  if (page > 1) {
    page--;
    const { list, total } = await getProfilePosts(viewingName, page, limit);
    renderPosts(list, total);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
nextBtn?.addEventListener("click", async () => {
  page++;
  const { list, total } = await getProfilePosts(viewingName, page, limit);
  if (!list || list.length === 0) {
    page--;
    return;
  }
  renderPosts(list, total);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

(async function init() {
  requireAuth();
  setHeaderAuthUI?.();

  try {
    me = await Promise.resolve(getMyName());
  } catch { me = null; }

  viewingName = qParam("user") || me;
  isOwn = viewingName && me && viewingName.toLowerCase() === me.toLowerCase();

  try {
    profile = await getProfile(viewingName);
    renderHeader(profile);

    const { list, total } = await getProfilePosts(viewingName, page, limit);
    renderPosts(list, total);
  } catch (e) {
    alert(e.message || "Error loading profile");
  }
})();
