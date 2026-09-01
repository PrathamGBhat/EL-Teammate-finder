(async () => {
  const user = await initPage("admin");
  if (!user) return;

  // Client-side check: must have isAdmin flag or be 1RV25CS131
  if (!user.isAdmin && user.usn !== "1RV25CS131") {
    alert("Access restricted to administrators.");
    window.location.href = "/profile.html";
    return;
  }

  const newUsnInput = document.getElementById("newUsn");
  const newNameInput = document.getElementById("newName");
  const newBranchSelect = document.getElementById("newBranch");
  const newPasswordInput = document.getElementById("newPassword");
  const newIsAdminCheckbox = document.getElementById("newIsAdmin");
  const createMsg = document.getElementById("createMsg");
  const createUserBtn = document.getElementById("createUserBtn");

  const searchInput = document.getElementById("searchUsn");
  const userListEl = document.getElementById("userList");

  const searchTeamInput = document.getElementById("searchTeam");
  const teamListEl = document.getElementById("teamList");

  // Modal elements
  const editModal = document.getElementById("editModal");
  const editUsnDisplay = document.getElementById("editUsnDisplay");
  const editNameInput = document.getElementById("editName");
  const editBranchSelect = document.getElementById("editBranch");
  const editPasswordInput = document.getElementById("editPassword");
  const editIsAdminCheckbox = document.getElementById("editIsAdmin");
  const editMsg = document.getElementById("editMsg");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const saveEditBtn = document.getElementById("saveEditBtn");

  const toggleNewPasswordBtn = document.getElementById("toggleNewPasswordBtn");
  if (toggleNewPasswordBtn && newPasswordInput) {
    toggleNewPasswordBtn.addEventListener("click", () => {
      const isPassword = newPasswordInput.type === "password";
      newPasswordInput.type = isPassword ? "text" : "password";
      toggleNewPasswordBtn.textContent = isPassword ? "🙈" : "👁️";
    });
  }

  const toggleEditPasswordBtn = document.getElementById("toggleEditPasswordBtn");
  if (toggleEditPasswordBtn && editPasswordInput) {
    toggleEditPasswordBtn.addEventListener("click", () => {
      const isPassword = editPasswordInput.type === "password";
      editPasswordInput.type = isPassword ? "text" : "password";
      toggleEditPasswordBtn.textContent = isPassword ? "🙈" : "👁️";
    });
  }

  let currentEditingUsn = null;

  function showMsg(container, text, isError) {
    container.innerHTML = text
      ? `<div class="${isError ? "error-msg" : "success-msg"}">${text}</div>`
      : "";
  }

  // System Settings Config Handlers
  const latestPassingYearInput = document.getElementById("latestPassingYearInput");
  const configMsg = document.getElementById("configMsg");
  const saveConfigBtn = document.getElementById("saveConfigBtn");

  async function loadConfig() {
    try {
      const { latestPassingYear } = await Api.get("/api/admin/config");
      if (latestPassingYearInput) {
        latestPassingYearInput.value = latestPassingYear;
      }
    } catch (err) {
      if (latestPassingYearInput) latestPassingYearInput.value = 2029;
    }
  }

  if (saveConfigBtn && latestPassingYearInput) {
    saveConfigBtn.addEventListener("click", async () => {
      const val = parseInt(latestPassingYearInput.value);
      if (isNaN(val) || val < 2026 || val > 2100) {
        return showMsg(configMsg, "Please enter a valid graduation year (2026 - 2100).", true);
      }
      saveConfigBtn.disabled = true;
      try {
        await Api.put("/api/admin/config", { latestPassingYear: val });
        showMsg(configMsg, `Settings saved! Latest graduation year set to ${val}.`, false);
      } catch (err) {
        showMsg(configMsg, err.message, true);
      } finally {
        saveConfigBtn.disabled = false;
      }
    });
  }

  loadConfig();

  // Create User
  createUserBtn.addEventListener("click", async () => {
    const usn = newUsnInput.value.trim().toUpperCase();
    const name = newNameInput.value.trim();
    const branch = newBranchSelect.value;
    const password = newPasswordInput.value;
    const isAdmin = newIsAdminCheckbox.checked;

    if (!usn || !name || !branch || !password) {
      return showMsg(createMsg, "Please fill in all required fields.", true);
    }
    if (password.length < 6) {
      return showMsg(createMsg, "Password must be at least 6 characters.", true);
    }

    createUserBtn.disabled = true;
    try {
      await Api.post("/api/admin/users", { usn, name, branch, password, isAdmin });
      showMsg(createMsg, `User ${usn} created successfully!`, false);
      newUsnInput.value = "";
      newNameInput.value = "";
      newBranchSelect.value = "";
      newPasswordInput.value = "";
      newIsAdminCheckbox.checked = false;
      loadUsers();
    } catch (err) {
      showMsg(createMsg, err.message, true);
    } finally {
      createUserBtn.disabled = false;
    }
  });

  // User Search Debounce
  let searchDebounce;
  let activeAdminQuery = "";

  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    activeAdminQuery = searchInput.value.trim();
    searchDebounce = setTimeout(loadUsers, 250);
  });

  // Fetch and render users
  async function loadUsers() {
    const q = searchInput.value.trim();
    activeAdminQuery = q;
    userListEl.innerHTML = `<div class="empty">Loading user directory...</div>`;
    try {
      const { users } = await Api.get(`/api/admin/users?q=${encodeURIComponent(q)}`);
      // Discard stale responses if query changed
      if (activeAdminQuery !== q) return;

      userListEl.innerHTML = "";

      if (users.length === 0) {
        userListEl.appendChild(el(`<div class="empty">${q ? `No users matching "${q}".` : 'No users found in database.'}</div>`));
        return;
      }

      users.forEach((u) => {
        const isSelf = u.usn === user.usn;
        const isAdminUser = u.isAdmin || u.usn === "1RV25CS131";

        const row = el(`
          <div class="card row">
            <div>
              <div style="font-weight:600; display:flex; align-items:center; gap:6px;">
                <span class="usn">${u.usn}</span> — ${u.name}
                ${isAdminUser ? `<span class="admin-badge">Admin</span>` : ""}
              </div>
              <div class="found-through">Branch: <strong>${u.branch}</strong></div>
            </div>
            <div class="action-btns">
              <button data-action="edit" class="secondary">Edit</button>
              <button data-action="delete" class="danger" ${isSelf ? "disabled title='Cannot delete your own admin account'" : ""}>Delete</button>
            </div>
          </div>
        `);

        // Edit button handler
        row.querySelector('[data-action="edit"]').addEventListener("click", () => {
          openEditModal(u);
        });

        // Delete button handler
        if (!isSelf) {
          row.querySelector('[data-action="delete"]').addEventListener("click", async () => {
            if (confirm(`Are you sure you want to delete user ${u.usn} (${u.name})?\n\nThis will also remove all their connections, teams, and advertisements.`)) {
              try {
                await Api.del(`/api/admin/users/${u.usn}`);
                loadUsers();
              } catch (err) {
                alert(err.message);
              }
            }
          });
        }

        userListEl.appendChild(row);
      });
    } catch (err) {
      userListEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
  }

  // Team Search Debounce
  let teamSearchDebounce;
  let activeTeamQuery = "";

  if (searchTeamInput) {
    searchTeamInput.addEventListener("input", () => {
      clearTimeout(teamSearchDebounce);
      activeTeamQuery = searchTeamInput.value.trim();
      teamSearchDebounce = setTimeout(loadTeams, 250);
    });
  }

  // Fetch and render global teams
  async function loadTeams() {
    if (!teamListEl) return;
    const q = searchTeamInput ? searchTeamInput.value.trim() : "";
    activeTeamQuery = q;
    teamListEl.innerHTML = `<div class="empty">Loading team requirements...</div>`;
    try {
      const { teams } = await Api.get(`/api/admin/teams?q=${encodeURIComponent(q)}`);
      if (activeTeamQuery !== q) return;

      teamListEl.innerHTML = "";

      if (teams.length === 0) {
        teamListEl.appendChild(el(`<div class="empty">${q ? `No teams matching "${q}".` : 'No team requirements found in database.'}</div>`));
        return;
      }

      teams.forEach((t) => {
        const phoneMarkup = t.contactPhone ? ` · 📞 <strong>${t.contactPhone}</strong>` : "";
        const row = el(`
          <div class="card row">
            <div>
              <div>
                <strong>Team #${t.id}</strong> · needs <strong>${t.requiredBranch}</strong> · led by <span class="usn">${t.leaderUSN}</span>${phoneMarkup}
              </div>
              <div class="found-through">${t.membersNeeded} spot(s) needed</div>
            </div>
            <div class="action-btns" style="align-items:center;">
              <span class="pill ${t.status === "OPEN" ? "open" : "complete"}">${t.status}</span>
              <button data-action="toggle" class="secondary">${t.status === "OPEN" ? "Mark complete" : "Reopen"}</button>
              <button data-action="delete" class="danger">Delete</button>
            </div>
          </div>
        `);

        // Toggle Status Handler
        row.querySelector('[data-action="toggle"]').addEventListener("click", async (e) => {
          e.target.disabled = true;
          try {
            await Api.post(`/api/admin/teams/${t.id}/toggle-status`, {});
            loadTeams();
          } catch (err) {
            alert(err.message);
            e.target.disabled = false;
          }
        });

        // Delete Team Handler
        row.querySelector('[data-action="delete"]').addEventListener("click", async (e) => {
          if (confirm(`Are you sure you want to delete Team #${t.id} led by ${t.leaderUSN}?\n\nThis will also remove all active advertisements of this team.`)) {
            e.target.disabled = true;
            try {
              await Api.del(`/api/admin/teams/${t.id}`);
              loadTeams();
            } catch (err) {
              alert(err.message);
              e.target.disabled = false;
            }
          }
        });

        teamListEl.appendChild(row);
      });
    } catch (err) {
      teamListEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
  }

  // Open Edit Modal
  function openEditModal(u) {
    currentEditingUsn = u.usn;
    editUsnDisplay.textContent = u.usn;
    editNameInput.value = u.name;
    editBranchSelect.value = u.branch;
    editPasswordInput.value = "";
    editIsAdminCheckbox.checked = !!u.isAdmin || u.usn === "1RV25CS131";
    showMsg(editMsg, "", false);
    editModal.style.display = "flex";
  }

  // Close Edit Modal
  cancelEditBtn.addEventListener("click", () => {
    editModal.style.display = "none";
    currentEditingUsn = null;
  });

  // Save Edit Changes
  saveEditBtn.addEventListener("click", async () => {
    if (!currentEditingUsn) return;
    const name = editNameInput.value.trim();
    const branch = editBranchSelect.value;
    const password = editPasswordInput.value.trim();
    const isAdmin = editIsAdminCheckbox.checked;

    if (!name || !branch) {
      return showMsg(editMsg, "Name and branch are required.", true);
    }
    if (password && password.length < 6) {
      return showMsg(editMsg, "Password must be at least 6 characters.", true);
    }

    saveEditBtn.disabled = true;
    try {
      await Api.put(`/api/admin/users/${currentEditingUsn}`, { name, branch, password, isAdmin });
      editModal.style.display = "none";
      currentEditingUsn = null;
      loadUsers();
    } catch (err) {
      showMsg(editMsg, err.message, true);
    } finally {
      saveEditBtn.disabled = false;
    }
  });

  loadUsers();
  loadTeams();
})();
