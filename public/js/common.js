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
  put(path, body) {
    return fetch(path, {
      method: "PUT",
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
    { href: "/advertising.html", label: "Advertising", key: "advertising" },
    { href: "/teams.html", label: "Teams", key: "teams" },
    { href: "/search.html", label: "Find Vacant Spots", key: "search" },
    { href: "/credits.html", label: "Credits", key: "credits" },
  ];

  if (user && (user.isAdmin || user.usn === "1RV25CS131")) {
    links.push({ href: "/admin.html", label: "Admin Panel", key: "admin" });
  }

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
      sessionStorage.removeItem("current_pwd");
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

function showDescriptionModal(teamId, leaderText, requiredBranches, description) {
  let modal = document.getElementById("descModal");
  if (!modal) {
    modal = el(`
      <div id="descModal" class="modal-backdrop" style="display:none;">
        <div class="modal-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h2 style="margin:0; font-size:17px;" id="descModalTitle">Team Requirement Details</h2>
            <button type="button" id="closeDescModalBtn" class="secondary" style="padding:4px 10px; font-size:16px;">&times;</button>
          </div>
          <p class="sub" style="margin-bottom:12px;" id="descModalSub"></p>
          <div class="card" style="background:#0d0f14; margin-bottom:0; font-size:14px; line-height:1.5; word-wrap:break-word;" id="descModalBody"></div>
        </div>
      </div>
    `);
    document.body.appendChild(modal);
    document.getElementById("closeDescModalBtn").addEventListener("click", () => {
      modal.style.display = "none";
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }

  const branchesArray = Array.isArray(requiredBranches)
    ? requiredBranches
    : [requiredBranches || "ANY"];

  const branchPills = branchesArray
    .map((b) => `<span class="pill open" style="margin-right:4px;">${b}</span>`)
    .join(" ");

  document.getElementById("descModalTitle").textContent = `Team #${teamId} Details`;
  document.getElementById("descModalSub").innerHTML = leaderText;
  document.getElementById("descModalBody").innerHTML = `
    <div style="margin-bottom:12px;">
      <label style="color:var(--muted); font-size:12px; margin-bottom:4px;">Required Branch(es)</label>
      <div>${branchPills}</div>
    </div>
    <div>
      <label style="color:var(--muted); font-size:12px; margin-bottom:4px;">Requirement Description</label>
      <div style="color:var(--text); font-size:14px;">${description ? description.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "<em>No description provided.</em>"}</div>
    </div>
  `;
  modal.style.display = "flex";
}
