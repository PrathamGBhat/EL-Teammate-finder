/**
 * USN-Based Teammate Matchmaking Platform — Server Entry Point
 *
 * Run with:
 *   npm start
 * Or:
 *   node server.js
 * Then open http://localhost:3000
 */

const app = require("./src/app");
const { PORT } = require("./src/config/constants");

app.listen(PORT, () => {
  console.log(`USN Teammate Matchmaking Platform running at http://localhost:${PORT}`);
});
