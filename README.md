# USN-Based Teammate Matchmaking Platform (MVP)

A tiny platform for finding EL project teammates through people you already know,
instead of randomly asking around.

## Run it

Install dependencies and start the Node.js server:

```bash
npm install
npm start
```

For development mode (with hot restart on file changes):

```bash
npm run dev
```

Then open **http://localhost:3000** in your browser.

Try the seeded demo account: USN `1RV23CS001` (Alice), password
`password123` — log in, go to **Find a Teammate**, search branch `ECE`, and
you'll see two results reached through her connections Bob and Divya,
exactly like the example in the spec. All seeded demo accounts use
`password123`.

## Authentication

Every account has a password. Passwords are hashed with Node's built-in
`crypto.scrypt` (salted, never stored or returned in plaintext). Logging in
creates a random session id stored server-side and handed to the browser as
an **HttpOnly cookie** — client-side JavaScript can never read or forge it.

Every API route that touches "my" data (connections, teams, advertisements,
search) identifies the current user **only** from that cookie — it never
trusts a USN sent in a request body. That's what stops someone from acting
as you just by knowing your USN. `GET /api/me` is how each page confirms
who's logged in and renders the nav bar; if there's no valid session it
redirects to the login page.

## Project structure

```
server.js                  Application entry point (starts Express server)
package.json               Node.json project manifest & dependencies
src/
  app.js                   Express application setup, middleware, static serving & routes
  config/
    constants.js           Configuration constants (PORT, SESSION_COOKIE, etc.)
  db/
    store.js               In-memory data store
    seed.js                Initial seed data population
    access.js              Data access helpers & Discovery Engine
  middleware/
    auth.js                Session authentication middleware
  utils/
    auth.js                Password hashing & session management utilities
  routes/
    auth.js                Auth routes (/api/login, /api/signup, /api/logout, /api/me)
    users.js               User profiles & USN search (/api/users)
    connections.js         Connections management (/api/connections)
    teams.js               Team requirements management (/api/teams)
    advertisements.js      Team advertisements management (/api/advertisements)
    search.js              Discovery engine route (/api/search)
public/                    Static frontend directory
  index.html + js/login.js         Login / signup page (USN + password)
  profile.html + js/profile.js     User profile page + manage/remove your advertisements
  connections.html + js/connections.js   Connections (search/request/accept/reject/view)
  team.html + js/team.js           Team requirement creation + Advertisement browsing/creating/removing
  search.html + js/search.js       Discovery search (the core feature)
  js/common.js                     Shared fetch() wrapper, session check (/api/me), nav bar
  css/style.css                    Shared styling
```

## How the pieces connect

1. **Login** (`index.html`) — USN + password. Wrong password is rejected.
   A USN that doesn't exist yet prompts for name + branch + password to
   create the account. A session cookie is set on success.
2. **Profile** (`profile.html`) — shows your stats and your active
   advertisements, each with a **Remove** button to deadvertise it.
3. **Connections** (`connections.html`) — search any USN, send a connection
   request, and the recipient accepts/rejects it from their own Connections
   page. Only *accepted* connections count for discovery.
4. **Team / Advertising** (`team.html`) — two things live on one page because
   they're tightly related:
   - Create a **team requirement** (as a leader) — required branch + how many
     teammates you need. This **automatically advertises it under your own
     profile** the moment you create it, so your connections can find it
     right away without an extra step.
   - Browse **all open requirements** in the system and **advertise** any of
     them under your own profile (this is how B and D "know about" a team in
     the spec's example) — or **remove** an advertisement you no longer want
     to carry. Advertisements are references to the team, not copies, so
     marking a team `COMPLETE` immediately makes every advertisement of it
     stop appearing in search.
5. **Search** (`search.html`) — the **discovery engine**, the heart of the
   project:
   ```
   your connections -> their advertisements -> open teams matching the
   branch you asked for -> the USN of the person to contact (the team leader)
   ```
   Results are just USNs to contact, with a note on which connection led you
   there — never a full "team marketplace" listing.

## API reference

`current user` below always means "whoever the session cookie says is
logged in" — never a value read from the request body.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/signup` | — | Create an account `{usn, name, branch, password}` |
| POST | `/api/login` | — | Log in `{usn, password}` |
| POST | `/api/logout` | — | Clear the session |
| GET | `/api/me` | ✓ | Get the current logged-in user |
| GET | `/api/users?q=` | ✓ | Search USNs (for connecting) |
| GET | `/api/users/:usn` | ✓ | Get another user's public profile |
| GET | `/api/connections` | ✓ | List *my* accepted connections |
| GET | `/api/connections/requests` | ✓ | List requests sent to *me* |
| POST | `/api/connections/request` | ✓ | Send a connection request `{to}` |
| POST | `/api/connections/:id/accept` | ✓ | Accept a request sent to me |
| POST | `/api/connections/:id/reject` | ✓ | Reject a request sent to me |
| GET | `/api/teams?open=1&mine=1` | ✓ | List teams (filterable) |
| POST | `/api/teams` | ✓ | Create a team requirement (auto-advertises it) |
| POST | `/api/teams/:id/complete` | ✓ | Mark my team complete |
| GET | `/api/advertisements` | ✓ | List *my* advertisements |
| POST | `/api/advertisements` | ✓ | Advertise a team `{teamId}` under my profile |
| DELETE | `/api/advertisements/:id` | ✓ | Deadvertise (remove my reference to a team) |
| GET | `/api/search?branch=` | ✓ | Run the discovery engine for me |

## Swapping in a real database later

Every piece of state lives in `src/db/store.js` (`users`, `connections`, `connectionRequests`, `teams`, `advertisements`), and every read/write goes through `src/db/access.js` (`getUser`, `areConnected`, `getConnectionsOf`, `getTeam`, `getAdvertisementsOf`, `discover`, plus the route handlers). To move to MongoDB: replace those arrays/Map with collections and rewrite just those functions in `src/db/access.js` to use queries instead of `Array.filter`/`.find` — none of the frontend or the route paths need to change.
