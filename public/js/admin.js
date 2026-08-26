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

  let currentEditingUsn = null;

  function showMsg(container, text, isError) {
    container.innerHTML = text
      ? `<div class="${isError ? "error-msg" : "success-msg"}">${text}</div>`
      : "";
  }

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

  // Search Debounce
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
})();
