(async () => {
  const user = await initPage("search");
  if (!user) return;

  const branchInput = document.getElementById("branchInput");
  const searchBtn = document.getElementById("searchBtn");
  const resultsEl = document.getElementById("results");

  async function doSearch() {
    const branch = branchInput.value.trim().toUpperCase();
    if (!branch) return;
    searchBtn.disabled = true;
    resultsEl.innerHTML = `<div class="empty">Searching your network…</div>`;
    try {
      const { results } = await Api.get(`/api/search?branch=${encodeURIComponent(branch)}`);
      resultsEl.innerHTML = "";
      if (results.length === 0) {
        resultsEl.appendChild(
          el(`<div class="empty">No ${branch} requirements found through your connections yet. Try connecting with more people, or check back later.</div>`)
        );
        return;
      }
      results.forEach((r) => {
        resultsEl.appendChild(
          el(`
          <div class="result-item">
            <div>
              <div class="usn" style="font-size:16px;">${r.contactUSN}</div>
              <div class="found-through">
                ${r.contactName} · needs ${r.requiredBranch} · ${r.membersNeeded} spot(s) ·
                found through <strong>${r.foundThroughName}</strong> (${r.foundThroughUSN})
              </div>
            </div>
            <span class="pill open">Team #${r.teamId}</span>
          </div>
        `)
        );
      });
    } catch (err) {
      resultsEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
    } finally {
      searchBtn.disabled = false;
    }
  }

  searchBtn.addEventListener("click", doSearch);
  branchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });
})();
