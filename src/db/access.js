// Data access helpers: query/lookup functions for users, connections, teams, and advertisements stored in MongoDB.

const User = require("./models/User");
const Connection = require("./models/Connection");
const Team = require("./models/Team");
const Advertisement = require("./models/Advertisement");
const { getNextSequence } = require("./models/Counter");
const { toPublicUser } = require("../utils/auth");

/* ============================================================
   DATA ACCESS HELPERS
   ============================================================ */

async function getUser(usn) {
  if (!usn) return null;
  return await User.findOne({ usn }).lean();
}

async function areConnected(usn1, usn2) {
  const count = await Connection.countDocuments({
    $or: [
      { a: usn1, b: usn2 },
      { a: usn2, b: usn1 },
    ],
  });
  return count > 0;
}

async function getConnectionsOf(usn) {
  const conns = await Connection.find({
    $or: [{ a: usn }, { b: usn }],
  }).lean();
  const otherUsns = conns.map((c) => (c.a === usn ? c.b : c.a));
  if (otherUsns.length === 0) return [];
  const users = await User.find({ usn: { $in: otherUsns } }).lean();
  return users.map(toPublicUser);
}

async function getTeam(teamId) {
  if (!teamId) return null;
  return await Team.findOne({ id: Number(teamId) }).lean();
}

async function getAdvertisementsOf(usn) {
  const ads = await Advertisement.find({ advertiserUSN: usn }).lean();
  if (ads.length === 0) return [];
  const teamIds = ads.map((ad) => ad.teamId);
  const teams = await Team.find({ id: { $in: teamIds } }).lean();

  const leaderUSNs = [...new Set(teams.map((t) => t.leaderUSN))];
  const users = await User.find({ usn: { $in: leaderUSNs } }).lean();
  const userMap = new Map(users.map((u) => [u.usn, u.name]));

  const teamsWithLeaderName = teams.map((t) => ({
    ...t,
    leaderName: userMap.get(t.leaderUSN) || t.leaderUSN,
  }));

  const teamMap = new Map(teamsWithLeaderName.map((t) => [t.id, t]));
  return ads.map((ad) => ({ ...ad, team: teamMap.get(ad.teamId) || null }));
}

async function advertiseTeam(advertiserUSN, teamId) {
  const numTeamId = Number(teamId);
  const existing = await Advertisement.findOne({
    advertiserUSN,
    teamId: numTeamId,
  }).lean();
  if (existing) {
    return null; // already advertising it
  }
  const adId = await getNextSequence("adId");
  const ad = await Advertisement.create({
    id: adId,
    advertiserUSN,
    teamId: numTeamId,
  });
  return ad.toObject();
}

async function deleteAdvertisement(adId) {
  const res = await Advertisement.deleteOne({ id: Number(adId) });
  return res.deletedCount > 0;
}

/**
 * THE DISCOVERY ENGINE — the heart of the platform.
 *
 *   current user -> their connections -> those connections'
 *   advertisements -> open teams matching branch -> relevant USNs
 */
async function discover(usn, branch) {
  const myConnectionsPublic = await getConnectionsOf(usn);
  const myConnectionUSNs = myConnectionsPublic.map((u) => u.usn);

  if (myConnectionUSNs.length === 0) return [];

  const ads = await Advertisement.find({
    advertiserUSN: { $in: myConnectionUSNs },
  }).lean();
  if (ads.length === 0) return [];

  const teamIds = [...new Set(ads.map((ad) => ad.teamId))];
  const teams = await Team.find({
    id: { $in: teamIds },
    status: "OPEN",
    $or: [
      { requiredBranches: branch },
      { requiredBranch: branch },
    ],
  }).lean();
  if (teams.length === 0) return [];

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const leaderUSNs = teams.map((t) => t.leaderUSN);
  const allNeededUSNs = [...new Set([...myConnectionUSNs, ...leaderUSNs])];
  const userProfiles = await User.find({ usn: { $in: allNeededUSNs } }).lean();
  const userMap = new Map(userProfiles.map((u) => [u.usn, u]));

  const results = [];
  const seenTeamIds = new Set();

  for (const ad of ads) {
    const team = teamMap.get(ad.teamId);
    if (!team) continue;
    if (seenTeamIds.has(team.id)) continue; // avoid duplicate teams found via multiple friends
    seenTeamIds.add(team.id);

    const leader = userMap.get(team.leaderUSN);
    const connUser = userMap.get(ad.advertiserUSN);
    const branches = (team.requiredBranches && team.requiredBranches.length > 0)
      ? team.requiredBranches
      : [team.requiredBranch || "ANY"];

    results.push({
      teamId: team.id,
      contactUSN: team.leaderUSN,
      contactName: leader ? leader.name : team.leaderUSN,
      contactPhone: team.contactPhone || "",
      description: team.description || "",
      requiredBranches: branches,
      requiredBranch: branches[0],
      membersNeeded: team.membersNeeded || branches.length,
      foundThroughUSN: ad.advertiserUSN,
      foundThroughName: connUser ? connUser.name : ad.advertiserUSN,
    });
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
  deleteAdvertisement,
  discover,
};
