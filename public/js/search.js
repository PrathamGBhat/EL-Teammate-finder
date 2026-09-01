(async () => {
  const user = await initPage("search");
  if (!user) return;

  const branchInput = document.getElementById("branchInput");
  const scopeFilter = document.getElementById("scopeFilter");
  const batchInput = document.getElementById("batchInput");
  const resultsEl = document.getElementById("results");

  // Dynamically populate Passing Year dropdown from latestPassingYear down to 2026
  await populatePassingYearDropdown(batchInput, user.usn);

  async function doSearch() {
    const branch = branchInput.value.trim().toUpperCase();
    if (!branch) return;
    const scope = scopeFilter ? scopeFilter.value : "network";
    const batch = batchInput ? batchInput.value : getUserBatch(user.usn);
    const loadingMsg = scope === "global"
      ? "Searching all teams for vacant spots…"
      : "Searching your network for vacant spots…";
    resultsEl.innerHTML = `<div class="empty">${loadingMsg}</div>`;
    try {
      const { results } = await Api.get(`/api/search?scope=${encodeURIComponent(scope)}&branch=${encodeURIComponent(branch)}&batch=${encodeURIComponent(batch)}`);
      resultsEl.innerHTML = "";
      if (results.length === 0) {
        const emptyMsg = scope === "global"
          ? `No open spots for ${branch} across the platform yet. Try another branch, or check back later.`
          : `No vacant spots for ${branch} found through your connections yet. Try connecting with more people, or check back later.`;
        resultsEl.appendChild(el(`<div class="empty">${emptyMsg}</div>`));
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
        const foundThrough = r.foundThroughUSN
          ? ` · found through <strong>${r.foundThroughName}</strong> (${r.foundThroughUSN})`
          : "";

        const row = el(`
          <div class="card row">
            <div>
              <div>
                <strong>Team #${r.teamId}</strong> · led by <span class="usn">${r.contactUSN}</span>${leaderNameStr}${phoneMarkup}
              </div>
              <div class="found-through">
                ${r.membersNeeded} spot(s) needed${foundThrough}
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="pill open">OPEN</span>
              ${infoBtnHtml}
            </div>
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
  if (scopeFilter) {
    scopeFilter.addEventListener("change", doSearch);
  }
  if (batchInput) {
    batchInput.addEventListener("change", doSearch);
  }
})();
