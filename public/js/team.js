(async () => {
  const user = await initPage("team");
  if (!user) return;

  const branchInput = document.getElementById("branch");
  const membersInput = document.getElementById("membersNeeded");
  const phoneInput = document.getElementById("contactPhone");
  const createMsg = document.getElementById("createMsg");
  const createBtn = document.getElementById("createTeamBtn");
  const myTeamsEl = document.getElementById("myTeams");
  const openTeamsEl = document.getElementById("openTeams");

  function showMsg(container, text, isError) {
    container.innerHTML = text
      ? `<div class="${isError ? "error-msg" : "success-msg"}">${text}</div>`
      : "";
  }

  createBtn.addEventListener("click", async () => {
    const requiredBranch = branchInput.value.trim().toUpperCase();
    const membersNeeded = Number(membersInput.value);
    const contactPhone = phoneInput ? phoneInput.value.trim() : "";

    if (!requiredBranch || !membersNeeded || membersNeeded < 1) {
      return showMsg(createMsg, "Enter a branch and a valid number of teammates needed.", true);
    }
    createBtn.disabled = true;
    try {
      await Api.post("/api/teams", { requiredBranch, membersNeeded, contactPhone });
      branchInput.value = "";
      membersInput.value = "1";
      if (phoneInput) phoneInput.value = "";
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
      const phoneMarkup = t.contactPhone ? ` · 📞 <strong>${t.contactPhone}</strong>` : "";
      const row = el(`
        <div class="card row">
          <div>
            <div>Team #${t.id} · needs <strong>${t.requiredBranch}</strong> · ${t.membersNeeded} spot(s)${phoneMarkup}</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="pill ${t.status === "OPEN" ? "open" : "complete"}">${t.status}</span>
            ${t.status === "OPEN" ? `<button data-action="complete" class="secondary">Mark complete</button>` : ""}
          </div>
        </div>
      `);
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
      Api.get("/api/teams?open=1"),
      Api.get("/api/advertisements"),
    ]);
    // Map teamId -> my advertisement id (so "Remove" knows which ad to delete)
    const myAdByTeamId = new Map(advertisements.map((ad) => [ad.teamId, ad.id]));

    openTeamsEl.innerHTML = "";
    if (teams.length === 0) {
      openTeamsEl.appendChild(el(`<div class="empty">No open requirements in the system yet.</div>`));
      return;
    }
    teams.forEach((t) => {
      const isMine = t.leaderUSN === user.usn;
      const myAdId = myAdByTeamId.get(t.id);
      const phoneMarkup = t.contactPhone ? ` · 📞 <strong>${t.contactPhone}</strong>` : "";
      const row = el(`
        <div class="card row">
          <div>
            <div>Team #${t.id} · needs <strong>${t.requiredBranch}</strong> · led by <span class="usn">${t.leaderUSN}</span>${phoneMarkup}</div>
            <div class="found-through">${t.membersNeeded} spot(s) needed</div>
          </div>
          <button ${isMine ? "disabled" : ""} data-action="${myAdId ? "remove" : "advertise"}" class="${myAdId ? "danger" : ""}">
            ${isMine ? "Your team" : myAdId ? "Remove" : "Advertise this"}
          </button>
        </div>
      `);
      const btn = row.querySelector("button");
      if (!isMine) {
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
