// Shared helpers used by every page.

const Api = {
  async _handle(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || "Request failed");
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  },
  get(path) {
    return fetch(path, { credentials: "same-origin" }).then(Api._handle);
  },
  post(path, body) {
    return fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then(Api._handle);
  },
  del(path) {
    return fetch(path, { method: "DELETE", credentials: "same-origin" }).then(Api._handle);
  },
};

// Call at the top of every protected page. Confirms the session cookie is
// valid (via /api/me — the server is the only source of truth for "who am
// I", never localStorage), renders the nav bar, and returns the user.
// Redirects to the login page if there's no valid session.
async function initPage(active) {
  let user;
  try {
    const res = await Api.get("/api/me");
    user = res.user;
  } catch (err) {
    window.location.href = "/index.html";
    return null;
  }
  renderNav(active, user);
  return user;
}

function renderNav(active, user) {
  const links = [
    { href: "/profile.html", label: "Profile", key: "profile" },
    { href: "/connections.html", label: "Connections", key: "connections" },
    { href: "/team.html", label: "Teams & Advertising", key: "team" },
    { href: "/search.html", label: "Find a Teammate", key: "search" },
  ];

  const nav = document.createElement("nav");
  nav.innerHTML = `
    <a class="brand" href="/profile.html">🎓 TeamFinder</a>
    ${links
      .map(
        (l) =>
          `<a class="navlink ${l.key === active ? "active" : ""}" href="${l.href}">${l.label}</a>`
      )
      .join("")}
    <div class="spacer"></div>
    ${user ? `<span class="who usn">${user.usn}</span><button class="secondary" id="logoutBtn">Log out</button>` : ""}
  `;
  document.body.prepend(nav);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await Api.post("/api/logout", {}).catch(() => {});
      window.location.href = "/index.html";
    });
  }
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
}
