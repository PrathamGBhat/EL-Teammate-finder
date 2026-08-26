# USN-Based Teammate Matchmaking Platform

A platform for finding EL project teammates through people you already know, powered by Node.js, Express, MongoDB (Mongoose), and ready for 1-click deployment to Vercel.

## Run it locally

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/usn_teammate
PORT=3000
```

3. Start the application:

```bash
npm start
```

For development mode (with hot restart):

```bash
npm run dev
```

Then open **http://localhost:3000** in your browser.

Try the seeded demo account: USN `1RV23CS001` (Alice), password `password123` — log in, go to **Find a Teammate**, search branch `ECE`, and you'll see two results reached through her connections Bob and Divya. All seeded demo accounts use `password123`.

---

## Deploy to Vercel

This project is pre-configured for Vercel serverless functions with connection caching and automatic routing (`vercel.json` and `api/index.js`).

### Option 1: Vercel CLI (Recommended)

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Run `vercel` command from the root directory:
   ```bash
   vercel
   ```

3. Add your MongoDB Atlas connection string as an environment variable in Vercel:
   ```bash
   vercel env add MONGODB_URI
   ```
   Provide your MongoDB Atlas URI (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/usn_teammate`).

4. Deploy to production:
   ```bash
   vercel --prod
   ```

### Option 2: Vercel Dashboard (Git Import)

1. Push this code repository to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel Dashboard](https://vercel.com/new) and import the repository.
3. In **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `SESSION_COOKIE` (optional): `sid`
4. Click **Deploy**. Vercel will build and host your project immediately!

---

## Architecture & Database

Data storage is managed using **MongoDB** via **Mongoose**:

- `User`: User profiles with salted `scrypt` password hashing.
- `Session`: Active user sessions with automatic TTL expiration.
- `Connection`: Undirected graph connections between users.
- `ConnectionRequest`: Sent/received connection requests (`pending`, `accepted`, `rejected`).
- `Team`: Team requirements created by project leaders.
- `Advertisement`: References to advertised teams for network discovery.
- `Counter`: Auto-incrementing sequential IDs for request, team, and advertisement identifiers.

### Serverless Connection Caching

`src/db/connect.js` caches the Mongoose connection across lambda invocations to optimize execution speeds and prevent connection pool exhaustion during serverless deployment on Vercel.

---

## API reference

`current user` below always means "whoever the session cookie says is logged in" — derived securely server-side.

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
