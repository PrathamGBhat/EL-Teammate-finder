(async () => {
  const user = await initPage("search");
  if (!user) return;

  const branchInput = document.getElementById("branchInput");
  const resultsEl = document.getElementById("results");

  async function doSearch() {
    const branch = branchInput.value.trim().toUpperCase();
    if (!branch) return;
    resultsEl.innerHTML = `<div class="empty">Searching your network for vacant spots…</div>`;
    try {
      const { results } = await Api.get(`/api/search?branch=${encodeURIComponent(branch)}`);
      resultsEl.innerHTML = "";
      if (results.length === 0) {
        resultsEl.appendChild(
          el(`<div class="empty">No vacant spots for ${branch} found through your connections yet. Try connecting with more people, or check back later.</div>`)
        );
        return;
      }
      results.forEach((r) => {
        const phoneMarkup = r.contactPhone
          ? ` · 📞 <strong>${r.contactPhone}</strong>`
          : "";
        const branches = r.requiredBranches && r.requiredBranches.length > 0
          ? r.requiredBranches
          : [r.requiredBranch || branch];
        const infoBtnHtml = `<button class="info-btn" data-action="info" title="View Details">ℹ️</button>`;
        const leaderNameStr = r.contactName && r.contactName !== r.contactUSN ? ` (${r.contactName})` : "";

        const row = el(`
          <div class="card row">
            <div>
              <div>
                <strong>Team #${r.teamId}</strong>${infoBtnHtml} · led by <span class="usn">${r.contactUSN}</span>${leaderNameStr}${phoneMarkup}
              </div>
              <div class="found-through">
                ${r.membersNeeded} spot(s) needed · found through <strong>${r.foundThroughName}</strong> (${r.foundThroughUSN})
              </div>
            </div>
            <span class="pill open">OPEN</span>
          </div>
        `);

        row.querySelector('[data-action="info"]').addEventListener("click", () => {
          const leaderText = `Led by <span class="usn">${r.contactUSN}</span>${leaderNameStr}`;
          showDescriptionModal(r.teamId, leaderText, branches, r.description);
        });

        resultsEl.appendChild(row);
      });
    } catch (err) {
      resultsEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
  }

  branchInput.addEventListener("change", doSearch);
  branchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });
})();
