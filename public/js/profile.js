(async () => {
  const user = await initPage("profile");
  if (!user) return;

  document.getElementById("name").textContent = user.name;
  document.getElementById("sub").innerHTML = `<span class="usn">${user.usn}</span> · ${user.branch}`;

  await load();

  async function load() {
    const [{ connections }, { advertisements }, { teams }] = await Promise.all([
      Api.get("/api/connections"),
      Api.get("/api/advertisements"),
      Api.get("/api/teams?mine=1"),
    ]);

    document.getElementById("connCount").textContent = connections.length;
    document.getElementById("adCount").textContent = advertisements.filter(
      (ad) => ad.team && ad.team.status === "OPEN"
    ).length;
    document.getElementById("teamCount").textContent = teams.length;

    const list = document.getElementById("adsList");
    list.innerHTML = "";
    if (advertisements.length === 0) {
      list.appendChild(el(`<div class="empty">You're not advertising any requirements yet.</div>`));
      return;
    }
    advertisements.forEach((ad) => {
      const t = ad.team;
      if (!t) return;
      const row = el(`
        <div class="card row">
          <div>
            <div>Team #${t.id} · needs <strong>${t.requiredBranch}</strong> · led by
              <span class="usn">${t.leaderUSN}</span></div>
            <div class="found-through">${t.membersNeeded} spot(s) needed</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="pill ${t.status === "OPEN" ? "open" : "complete"}">${t.status}</span>
            <button class="danger" data-action="remove">Remove</button>
          </div>
        </div>
      `);
      row.querySelector('[data-action="remove"]').addEventListener("click", async (e) => {
        e.target.disabled = true;
        try {
          await Api.del(`/api/advertisements/${ad.id}`);
          load();
        } catch (err) {
          alert(err.message);
          e.target.disabled = false;
        }
      });
      list.appendChild(row);
    });
  }
})();
