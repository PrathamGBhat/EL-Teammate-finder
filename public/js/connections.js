(async () => {
  const user = await initPage("connections");
  if (!user) return;

  const searchInput = document.getElementById("searchUsn");
  const searchResults = document.getElementById("searchResults");
  const connectMsg = document.getElementById("connectMsg");
  const requestsList = document.getElementById("requestsList");
  const connectionsList = document.getElementById("connectionsList");

  function showConnectMsg(text, isError) {
    connectMsg.innerHTML = text
      ? `<div class="${isError ? "error-msg" : "success-msg"}">${text}</div>`
      : "";
  }

  let searchDebounce;
  let activeQuery = "";

  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    const q = searchInput.value.trim();
    activeQuery = q;
    searchResults.innerHTML = "";
    showConnectMsg("");
    if (!q) return;

    searchDebounce = setTimeout(async () => {
      try {
        const { users } = await Api.get(`/api/users?q=${encodeURIComponent(q)}`);
        // Race condition guard: discard if user updated search box in the meantime
        if (activeQuery !== q) return;

        searchResults.innerHTML = "";
        if (users.length === 0) {
          searchResults.appendChild(el(`<div class="empty">No USNs matching "${q}".</div>`));
          return;
        }
        users.forEach((u) => {
          const row = el(`
            <div class="card row">
              <div>
                <span class="usn">${u.usn}</span> — ${u.name} (${u.branch})
              </div>
              <button data-usn="${u.usn}">Connect</button>
            </div>
          `);
          row.querySelector("button").addEventListener("click", async (e) => {
            e.target.disabled = true;
            try {
              await Api.post("/api/connections/request", { to: u.usn });
              showConnectMsg(`Request sent to ${u.usn}.`, false);
              e.target.textContent = "Requested";
            } catch (err) {
              showConnectMsg(err.message, true);
              e.target.disabled = false;
            }
          });
          searchResults.appendChild(row);
        });
      } catch (err) {
        if (activeQuery === q) {
          searchResults.innerHTML = `<div class="error-msg">${err.message}</div>`;
        }
      }
    }, 250);
  });

  async function loadRequests() {
    const { requests } = await Api.get("/api/connections/requests");
    requestsList.innerHTML = "";
    if (requests.length === 0) {
      requestsList.appendChild(el(`<div class="empty">No pending requests.</div>`));
      return;
    }
    requests.forEach((r) => {
      const row = el(`
        <div class="card row">
          <div><span class="usn">${r.fromUser.usn}</span> — ${r.fromUser.name} (${r.fromUser.branch})</div>
          <div>
            <button data-action="accept">Accept</button>
            <button data-action="reject" class="secondary">Reject</button>
          </div>
        </div>
      `);
      row.querySelector('[data-action="accept"]').addEventListener("click", async () => {
        await Api.post(`/api/connections/${r.id}/accept`, {});
        loadRequests();
        loadConnections();
      });
      row.querySelector('[data-action="reject"]').addEventListener("click", async () => {
        await Api.post(`/api/connections/${r.id}/reject`, {});
        loadRequests();
      });
      requestsList.appendChild(row);
    });
  }

  async function loadConnections() {
    const { connections } = await Api.get("/api/connections");
    connectionsList.innerHTML = "";
    if (connections.length === 0) {
      connectionsList.appendChild(el(`<div class="empty">You have no connections yet.</div>`));
      return;
    }
    connections.forEach((c) => {
      const row = el(`
        <div class="card row">
          <div><span class="usn">${c.usn}</span> — ${c.name} (${c.branch})</div>
          <button data-action="remove" class="danger">Remove</button>
        </div>
      `);
      row.querySelector('[data-action="remove"]').addEventListener("click", async (e) => {
        if (confirm(`Remove connection with ${c.name} (${c.usn})?`)) {
          e.target.disabled = true;
          try {
            await Api.del(`/api/connections/${c.usn}`);
            loadConnections();
          } catch (err) {
            alert(err.message);
            e.target.disabled = false;
          }
        }
      });
      connectionsList.appendChild(row);
    });
  }

  loadRequests();
  loadConnections();
})();
