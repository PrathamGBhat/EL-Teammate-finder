const {
  users,
  connections,
  teams,
  advertisements,
  getNextAdId,
} = require("./store");
const { toPublicUser } = require("../utils/auth");

/* ============================================================
   DATA ACCESS HELPERS
   ============================================================ */

function getUser(usn) {
  return users.get(usn) || null;
}

function areConnected(usn1, usn2) {
  return connections.some(
    (c) => (c.a === usn1 && c.b === usn2) || (c.a === usn2 && c.b === usn1)
  );
}

function getConnectionsOf(usn) {
  return connections
    .filter((c) => c.a === usn || c.b === usn)
    .map((c) => (c.a === usn ? c.b : c.a))
    .map((otherUsn) => getUser(otherUsn))
    .filter(Boolean)
    .map(toPublicUser);
}

function getTeam(teamId) {
  return teams.find((t) => t.id === Number(teamId)) || null;
}

function getAdvertisementsOf(usn) {
  return advertisements
    .filter((ad) => ad.advertiserUSN === usn)
    .map((ad) => ({ ...ad, team: getTeam(ad.teamId) }));
}

function advertiseTeam(advertiserUSN, teamId) {
  if (
    advertisements.some(
      (ad) => ad.advertiserUSN === advertiserUSN && ad.teamId === teamId
    )
  ) {
    return null; // already advertising it
  }
  const ad = { id: getNextAdId(), advertiserUSN, teamId };
  advertisements.push(ad);
  return ad;
}

/**
 * THE DISCOVERY ENGINE — the heart of the platform.
 *
 *   current user -> their connections -> those connections'
 *   advertisements -> open teams matching branch -> relevant USNs
 */
function discover(usn, branch) {
  const myConnections = getConnectionsOf(usn).map((u) => u.usn);

  const results = [];
  const seenTeamIds = new Set();

  for (const connUsn of myConnections) {
    const ads = getAdvertisementsOf(connUsn);
    for (const ad of ads) {
      const team = ad.team;
      if (!team) continue;
      if (team.status !== "OPEN") continue;
      if (team.requiredBranch !== branch) continue;
      if (seenTeamIds.has(team.id)) continue; // avoid duplicate teams found via multiple friends
      seenTeamIds.add(team.id);

      results.push({
        teamId: team.id,
        contactUSN: team.leaderUSN,
        contactName: getUser(team.leaderUSN)?.name || team.leaderUSN,
        requiredBranch: team.requiredBranch,
        membersNeeded: team.membersNeeded,
        foundThroughUSN: connUsn,
        foundThroughName: getUser(connUsn)?.name || connUsn,
      });
    }
  }
  return results;
}

module.exports = {
  getUser,
  areConnected,
  getConnectionsOf,
  getTeam,
  getAdvertisementsOf,
  advertiseTeam,
  discover,
};
