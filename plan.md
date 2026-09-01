# Implementation Plan: Dynamic Graduation Batch Management via Admin Panel

## Overview
Add an option in the **Admin Panel** to manage the **latest graduation batch year** (e.g., `2029`, `2030`, `2031`).
When an admin updates the latest graduation year (e.g., adding `2030`), the **Passing Year** dropdown filter across the app (**Search** and **Teams Directory**) will dynamically render all batch options from `latestPassingYear` **all the way down to 2026** automatically without requiring code changes.

---

## Technical Design & Calculations

### USN Batch Code Mapping:
- **Passing Year 2030** $\rightarrow$ Joining Year 2026 $\rightarrow$ USN Batch Code **`26`** (`1RV26...`, `1RZ26...`)
- **Passing Year 2029** $\rightarrow$ Joining Year 2025 $\rightarrow$ USN Batch Code **`25`** (`1RV25...`, `1RZ25...`)
- **Passing Year 2028** $\rightarrow$ Joining Year 2024 $\rightarrow$ USN Batch Code **`24`** (`1RV24...`, `1RZ24...`)
- **Formula**: `batchCode = String(passingYear - 2004)`

---

## Proposed Changes

### 1. Database Model (`src/db/models/Config.js`) [NEW]
- Create a key-value system configuration schema:
  ```javascript
  const ConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  });
  ```
- Stores key `"latestPassingYear"` (default: `2029`).

### 2. Backend API Routes
- **`GET /api/config`** (`src/routes/config.js` or `app.js`):
  - Publicly returns system configuration `{ latestPassingYear: 2029 }`.
- **`GET /api/admin/config` & `PUT /api/admin/config`** (`src/routes/admin.js`):
  - Admin endpoint to view and update `latestPassingYear`.

### 3. Admin Panel UI (`public/admin.html` & `public/js/admin.js`)
- Add a **"System Settings & Graduation Batches"** card.
- Input field to set the **Latest Graduation Year** (e.g., `2030`).
- "Save Settings" button that calls `PUT /api/admin/config`.

### 4. Dynamic Passing Year Dropdowns (`public/js/common.js`, `public/search.html`, `public/teams.html`)
- In `common.js`, add a helper `renderPassingYearOptions(selectEl, userUsn)`:
  - Fetches `/api/config` to get `latestPassingYear`.
  - Dynamically populates dropdown options from `latestPassingYear` **all the way down to 2026** (e.g. if `latestPassingYear = 2030`, renders `2030`, `2029`, `2028`, `2027`, `2026`).
  - Pre-selects the logged-in user's batch year by default.
- Update `public/js/search.js` and `public/js/teams_directory.js` to call this helper during initialization.

---

## Verification Plan

### Manual Verification:
1. Open Admin Panel as Admin user.
2. Update **Latest Graduation Year** from `2029` to `2030` and click **Save Settings**.
3. Open **Search** page (`/search.html`) and **Teams Directory** (`/teams.html`).
4. Confirm `2030` down to `2026` all appear as options in the Passing Year dropdown.
5. Create a test team with leader USN `1RV26CS001` (2030 batch), select `2030` in search filter, and verify team requirement is returned.
