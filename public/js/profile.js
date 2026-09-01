(async () => {
  const user = await initPage("profile");
  if (!user) return;

  document.getElementById("name").textContent = user.name;
  document.getElementById("sub").innerHTML = `<span class="usn">${user.usn}</span> · ${user.branch}`;

  // Pre-fill Edit Profile Details form
  const profileNameInput = document.getElementById("profileName");
  const profileBranchSelect = document.getElementById("profileBranch");
  const updateProfileBtn = document.getElementById("updateProfileBtn");
  const updateProfileMsg = document.getElementById("updateProfileMsg");

  if (profileNameInput) profileNameInput.value = user.name || "";
  if (profileBranchSelect && user.branch) profileBranchSelect.value = user.branch;

  function showProfileMsg(text, isError) {
    if (updateProfileMsg) {
      updateProfileMsg.innerHTML = text
        ? `<div class="${isError ? "error-msg" : "success-msg"}">${text}</div>`
        : "";
    }
  }

  if (updateProfileBtn) {
    updateProfileBtn.addEventListener("click", async () => {
      const name = profileNameInput ? profileNameInput.value.trim() : "";
      const branch = profileBranchSelect ? profileBranchSelect.value.trim().toUpperCase() : "";

      if (!name) return showProfileMsg("Please enter your name.", true);
      if (!branch) return showProfileMsg("Please select your branch.", true);

      updateProfileBtn.disabled = true;
      try {
        const { user: updatedUser } = await Api.put("/api/users/me", { name, branch });
        document.getElementById("name").textContent = updatedUser.name;
        document.getElementById("sub").innerHTML = `<span class="usn">${updatedUser.usn}</span> · ${updatedUser.branch}`;
        showProfileMsg("Profile details updated successfully!", false);
      } catch (err) {
        showProfileMsg(err.message, true);
      } finally {
        updateProfileBtn.disabled = false;
      }
    });
  }

  const currentPasswordInput = document.getElementById("currentPassword");
  const toggleCurrentPasswordBtn = document.getElementById("toggleCurrentPasswordBtn");
  if (toggleCurrentPasswordBtn && currentPasswordInput) {
    toggleCurrentPasswordBtn.addEventListener("click", () => {
      const isPassword = currentPasswordInput.type === "password";
      currentPasswordInput.type = isPassword ? "text" : "password";
      toggleCurrentPasswordBtn.textContent = isPassword ? "🙈" : "👁️";
    });
  }

  const newPasswordInput = document.getElementById("newPassword");
  const toggleNewPasswordBtn = document.getElementById("toggleNewPasswordBtn");
  if (toggleNewPasswordBtn && newPasswordInput) {
    toggleNewPasswordBtn.addEventListener("click", () => {
      const isPassword = newPasswordInput.type === "password";
      newPasswordInput.type = isPassword ? "text" : "password";
      toggleNewPasswordBtn.textContent = isPassword ? "🙈" : "👁️";
    });
  }

  const savedPwd = localStorage.getItem("current_pwd") || sessionStorage.getItem("current_pwd");
  if (savedPwd && currentPasswordInput) {
    currentPasswordInput.value = savedPwd;
  }

  // Change Password logic
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const changePasswordMsg = document.getElementById("changePasswordMsg");

  function showMsg(text, isError) {
    changePasswordMsg.innerHTML = text
      ? `<div class="${isError ? "error-msg" : "success-msg"}">${text}</div>`
      : "";
  }

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", async () => {
      const currentPassword = currentPasswordInput.value.trim();
      const newPassword = newPasswordInput.value.trim();

      if (!currentPassword || !newPassword) {
        return showMsg("Please enter both your current and new password.", true);
      }
      if (newPassword.length < 6) {
        return showMsg("New password must be at least 6 characters.", true);
      }

      changePasswordBtn.disabled = true;
      try {
        await Api.put("/api/users/me/password", { currentPassword, newPassword });
        showMsg("Password updated successfully!", false);
        sessionStorage.setItem("current_pwd", newPassword);
        localStorage.setItem("current_pwd", newPassword);
        currentPasswordInput.value = newPassword;
        newPasswordInput.value = "";
      } catch (err) {
        showMsg(err.message, true);
      } finally {
        changePasswordBtn.disabled = false;
      }
    });
  }

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
            <span class="pill ${t.status === "OPEN" ? "open" : "complete"}">${t.status}</span>
            <button class="danger" data-action="remove">Remove</button>
            ${infoBtnHtml}
          </div>
        </div>
      `);

      row.querySelector('[data-action="info"]').addEventListener("click", () => {
        const leaderText = `Led by <span class="usn">${t.leaderUSN}</span>${leaderNameStr}`;
        showDescriptionModal(t.id, leaderText, branches, t.description);
      });

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
