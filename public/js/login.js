const usnInput = document.getElementById("usn");
const passwordInput = document.getElementById("password");
const nameInput = document.getElementById("name");
const branchInput = document.getElementById("branch");
const newUserFields = document.getElementById("newUserFields");
const msg = document.getElementById("msg");
const loginBtn = document.getElementById("loginBtn");

let mode = "login"; // "login" | "signup"

// If already logged in, skip straight to profile.
Api.get("/api/me")
  .then(() => (window.location.href = "/profile.html"))
  .catch(() => {}); // not logged in — stay on this page

function showMsg(text) {
  msg.style.display = text ? "block" : "none";
  msg.textContent = text || "";
}

loginBtn.addEventListener("click", async () => {
  const usn = usnInput.value.trim().toUpperCase();
  const password = passwordInput.value;
  if (!usn || !password) return showMsg("Please enter your USN and password.");

  loginBtn.disabled = true;
  try {
    if (mode === "signup") {
      const name = nameInput.value.trim();
      const branch = branchInput.value.trim().toUpperCase();
      if (!name || !branch) {
        loginBtn.disabled = false;
        return showMsg("Please enter your name and branch.");
      }
      await Api.post("/api/signup", { usn, name, branch, password });
    } else {
      await Api.post("/api/login", { usn, password });
    }
    window.location.href = "/profile.html";
  } catch (err) {
    if (err.data && err.data.isNewUser) {
      mode = "signup";
      newUserFields.style.display = "block";
      loginBtn.textContent = "Create account";
      showMsg("New USN — fill in your details to create an account.");
    } else {
      showMsg(err.message);
    }
  } finally {
    loginBtn.disabled = false;
  }
});

[usnInput, passwordInput, nameInput, branchInput].forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });
});
