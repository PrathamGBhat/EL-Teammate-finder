(async () => {
  const user = await initPage("teams");
  if (!user) return;

  const scopeFilter = document.getElementById("scopeFilter");
  const batchFilter = document.getElementById("batchFilter");
  const teamsListEl = document.getElementById("teamsList");

  // Dynamically populate Passing Year dropdown from latestPassingYear down to 2026
  await populatePassingYearDropdown(batchFilter, user.usn);

  async function loadTeams() {
    const scope = scopeFilter ? scopeFilter.value : "network";
    const batch = batchFilter ? batchFilter.value : getUserBatch(user.usn);
    teamsListEl.innerHTML = `<div class="empty">Loading teams...</div>`;

    try {
      const { teams } = await Api.get(`/api/teams?open=1&scope=${encodeURIComponent(scope)}&batch=${encodeURIComponent(batch)}`);
      teamsListEl.innerHTML = "";

      if (teams.length === 0) {
        const emptyMsg =
          scope === "network"
            ? "No open teams advertised by your direct connections yet for the selected batch."
            : "No open teams found across the platform for the selected batch.";
        teamsListEl.appendChild(el(`<div class="empty">${emptyMsg}</div>`));
        return;
      }

      teams.forEach((t) => {
        const isMine = t.leaderUSN === user.usn;
        const leaderNameStr = t.leaderName && t.leaderName !== t.leaderUSN ? ` (${t.leaderName})` : "";
        const phoneMarkup = t.contactPhone ? ` · 📞 <strong>${t.contactPhone}</strong>` : "";
        const branches = t.requiredBranches && t.requiredBranches.length > 0
          ? t.requiredBranches
          : [t.requiredBranch || "ANY"];
        const infoBtnHtml = `<button class="info-btn" data-action="info" title="View Details">ℹ️</button>`;

        const row = el(`
          <div class="card row">
            <div>
              <div>
                <strong>Team #${t.id}</strong> · led by <span class="usn">${t.leaderUSN}</span>${leaderNameStr}${phoneMarkup}
              </div>
              <div class="found-through">${t.membersNeeded} spot(s) needed</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="pill open">OPEN</span>
              ${isMine ? `<span class="pill" style="background:rgba(91,141,239,0.15); color:var(--accent);">Your Team</span>` : ""}
              ${infoBtnHtml}
            </div>
          </div>
        `);

        row.querySelector('[data-action="info"]').addEventListener("click", () => {
          const leaderText = `Led by <span class="usn">${t.leaderUSN}</span>${leaderNameStr}`;
          showDescriptionModal(t.id, leaderText, branches, t.description);
        });

        teamsListEl.appendChild(row);
      });
    } catch (err) {
      teamsListEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
  }

  if (scopeFilter) {
    scopeFilter.addEventListener("change", loadTeams);
  }
  if (batchFilter) {
    batchFilter.addEventListener("change", loadTeams);
  }

  loadTeams();
})();
