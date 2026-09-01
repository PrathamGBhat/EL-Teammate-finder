(async () => {
  const user = await initPage("advertising");
  if (!user) return;

  const membersInput = document.getElementById("membersNeeded");
  const branchContainer = document.getElementById("branchDropdownsContainer");
  const phoneInput = document.getElementById("contactPhone");
  const descInput = document.getElementById("description");
  const createMsg = document.getElementById("createMsg");
  const createBtn = document.getElementById("createTeamBtn");
  const myTeamsEl = document.getElementById("myTeams");
  const openTeamsEl = document.getElementById("openTeams");

  const ALLOWED_BRANCHES = ["CSE", "CD", "CY", "CI", "CH", "ISE", "BT", "EC", "EE", "ET", "CV", "ME", "ASE", "IM"];

  function renderBranchDropdowns() {
    const rawVal = parseInt(membersInput.value);
    let count = isNaN(rawVal) || rawVal < 1 ? 1 : rawVal;
    if (count > 10) count = 10;

    branchContainer.innerHTML = "";
    for (let i = 1; i <= count; i++) {
      const blockHtml = `
        <div style="margin-bottom:12px;">
          <label for="branch_${i}">Required Branch for Spot #${i}</label>
          <select id="branch_${i}" class="branch-select" style="margin-bottom:0;">
            <option value="" disabled selected>Select Branch for Spot #${i}</option>
            ${ALLOWED_BRANCHES.map((b) => `<option value="${b}">${b}</option>`).join("")}
          </select>
        </div>
      `;
      branchContainer.appendChild(el(blockHtml));
    }
  }

  membersInput.addEventListener("input", renderBranchDropdowns);
  membersInput.addEventListener("blur", () => {
    let count = parseInt(membersInput.value) || 1;
    if (count < 1) count = 1;
    if (count > 10) count = 10;
    membersInput.value = count;
    renderBranchDropdowns();
  });

  renderBranchDropdowns();

  function showMsg(container, text, isError) {
    container.innerHTML = text
      ? `<div class="${isError ? "error-msg" : "success-msg"}">${text}</div>`
      : "";
  }

  createBtn.addEventListener("click", async () => {
    const rawVal = parseInt(membersInput.value);
    const count = isNaN(rawVal) || rawVal < 1 ? 1 : Math.min(rawVal, 10);
    const requiredBranches = [];
    for (let i = 1; i <= count; i++) {
      const sel = document.getElementById(`branch_${i}`);
      const val = sel ? sel.value.trim().toUpperCase() : "";
      if (!val) {
        return showMsg(createMsg, `Please select a required branch for Spot #${i}.`, true);
      }
      requiredBranches.push(val);
    }

    const contactPhone = phoneInput ? phoneInput.value.trim() : "";
    const description = descInput ? descInput.value.trim().slice(0, 200) : "";

    createBtn.disabled = true;
    try {
      await Api.post("/api/teams", { requiredBranches, contactPhone, description });
      membersInput.value = "1";
      renderBranchDropdowns();
      if (phoneInput) phoneInput.value = "";
      if (descInput) descInput.value = "";
      showMsg(createMsg, "Requirement created and advertised under your profile.", false);
      loadMyTeams();
      loadOpenTeams();
    } catch (err) {
      showMsg(createMsg, err.message, true);
    } finally {
      createBtn.disabled = false;
    }
  });

  async function loadMyTeams() {
    const { teams } = await Api.get("/api/teams?mine=1");
    myTeamsEl.innerHTML = "";
    if (teams.length === 0) {
      myTeamsEl.appendChild(el(`<div class="empty">You haven't created any requirements.</div>`));
      return;
    }
    teams.forEach((t) => {
      const branches = t.requiredBranches && t.requiredBranches.length > 0
        ? t.requiredBranches
        : [t.requiredBranch || "ANY"];
      const phoneMarkup = t.contactPhone ? ` · 📞 <strong>${t.contactPhone}</strong>` : "";
      const infoBtnHtml = `<button class="info-btn" data-action="info" title="View Details">ℹ️</button>`;

      const row = el(`
        <div class="card row">
          <div>
            <div>Team #${t.id} · ${t.membersNeeded} spot(s) needed${phoneMarkup}</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="pill ${t.status === "OPEN" ? "open" : "complete"}">${t.status}</span>
            ${t.status === "OPEN" ? `<button data-action="complete" class="secondary">Mark complete</button>` : ""}
            ${infoBtnHtml}
          </div>
        </div>
      `);

      row.querySelector('[data-action="info"]').addEventListener("click", () => {
        showDescriptionModal(t.id, `Created by you`, branches, t.description);
      });

      const completeBtn = row.querySelector('[data-action="complete"]');
      if (completeBtn) {
        completeBtn.addEventListener("click", async () => {
          await Api.post(`/api/teams/${t.id}/complete`, {});
          loadMyTeams();
          loadOpenTeams();
        });
      }
      myTeamsEl.appendChild(row);
    });
  }

  async function loadOpenTeams() {
    const [{ teams }, { advertisements }] = await Promise.all([
      Api.get("/api/teams?open=1&scope=network"),
      Api.get("/api/advertisements"),
    ]);
    const myAdByTeamId = new Map(advertisements.map((ad) => [ad.teamId, ad.id]));

    openTeamsEl.innerHTML = "";
    if (teams.length === 0) {
      openTeamsEl.appendChild(el(`<div class="empty">No open requirements from your connections yet for the selected batch.</div>`));
      return;
    }
    teams.forEach((t) => {
      const isMine = t.leaderUSN === user.usn;
      const myAdId = myAdByTeamId.get(t.id);
      const leaderNameStr = t.leaderName && t.leaderName !== t.leaderUSN ? ` (${t.leaderName})` : "";
      const phoneMarkup = t.contactPhone ? ` · 📞 <strong>${t.contactPhone}</strong>` : "";
      const branches = t.requiredBranches && t.requiredBranches.length > 0
        ? t.requiredBranches
        : [t.requiredBranch || "ANY"];
      const infoBtnHtml = `<button class="info-btn" data-action="info" title="View Details">ℹ️</button>`;

      const row = el(`
        <div class="card row">
          <div>
            <div>Team #${t.id} · led by <span class="usn">${t.leaderUSN}</span>${leaderNameStr}${phoneMarkup}</div>
            <div class="found-through">${t.membersNeeded} spot(s) needed</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <button ${isMine ? "disabled" : ""} data-action="${myAdId ? "remove" : "advertise"}" class="${myAdId ? "danger" : ""}">
              ${isMine ? "Your team" : myAdId ? "Remove" : "Advertise this"}
            </button>
            ${infoBtnHtml}
          </div>
        </div>
      `);

      row.querySelector('[data-action="info"]').addEventListener("click", () => {
        const leaderText = `Led by <span class="usn">${t.leaderUSN}</span>${leaderNameStr}`;
        showDescriptionModal(t.id, leaderText, branches, t.description);
      });

      const btn = row.querySelector('button[data-action="advertise"], button[data-action="remove"]');
      if (btn && !isMine) {
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          try {
            if (myAdId) {
              await Api.del(`/api/advertisements/${myAdId}`);
            } else {
              await Api.post("/api/advertisements", { teamId: t.id });
            }
            loadOpenTeams();
          } catch (err) {
            btn.disabled = false;
            alert(err.message);
          }
        });
      }
      openTeamsEl.appendChild(row);
    });
  }

  loadMyTeams();
  loadOpenTeams();
})();
