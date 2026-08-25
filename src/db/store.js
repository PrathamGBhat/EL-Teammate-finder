/* ============================================================
   DATA STORE (in-memory — swap for MongoDB/etc. later)
   ============================================================ */

const users = new Map(); // usn -> { usn, name, branch, passwordHash }
const sessions = new Map(); // sid -> usn

const connections = []; // { a, b } (accepted, undirected pair)
const connectionRequests = []; // { id, from, to, status: 'pending'|'accepted'|'rejected' }
const teams = []; // { id, leaderUSN, requiredBranch, membersNeeded, members: [usn], status: 'OPEN'|'COMPLETE' }
let advertisements = []; // { id, advertiserUSN, teamId }

let nextRequestId = 1;
let nextTeamId = 1;
let nextAdId = 1;

function getNextRequestId() {
  return nextRequestId++;
}

function getNextTeamId() {
  return nextTeamId++;
}

function getNextAdId() {
  return nextAdId++;
}

function deleteAdvertisement(adId) {
  const index = advertisements.findIndex((a) => a.id === adId);
  if (index !== -1) {
    advertisements.splice(index, 1);
    return true;
  }
  return false;
}

module.exports = {
  users,
  sessions,
  connections,
  connectionRequests,
  teams,
  get advertisements() {
    return advertisements;
  },
  set advertisements(val) {
    advertisements = val;
  },
  getNextRequestId,
  getNextTeamId,
  getNextAdId,
  deleteAdvertisement,
};
