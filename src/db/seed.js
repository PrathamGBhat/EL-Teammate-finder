const {
  users,
  connections,
  teams,
  advertisements,
  getNextTeamId,
  getNextAdId,
} = require("./store");
const { hashPassword } = require("../utils/auth");

function seed() {
  const demoPassword = "password123";
  const seedUsers = [
    { usn: "1RV23CS001", name: "Alice", branch: "CSE" }, // "A"
    { usn: "1RV23EC010", name: "Bob", branch: "ECE" }, // "B"
    { usn: "1RV23CS020", name: "Charan", branch: "CSE" }, // "C"
    { usn: "1RV23EC030", name: "Divya", branch: "ECE" }, // "D"
    { usn: "1RV23CS050", name: "Meera", branch: "CSE" }, // leads a team needing ECE
    { usn: "1RV23ME060", name: "Rahul", branch: "ME" }, // leads a team needing ECE
    { usn: "1RV23CS070", name: "Sanya", branch: "CSE" }, // leads a team needing CSE
  ];
  seedUsers.forEach((u) =>
    users.set(u.usn, { ...u, passwordHash: hashPassword(demoPassword) })
  );

  // A is connected to B, C, D
  connections.push(
    { a: "1RV23CS001", b: "1RV23EC010" },
    { a: "1RV23CS001", b: "1RV23CS020" },
    { a: "1RV23CS001", b: "1RV23EC030" }
  );

  teams.push(
    {
      id: getNextTeamId(),
      leaderUSN: "1RV23CS050",
      requiredBranch: "ECE",
      membersNeeded: 1,
      members: ["1RV23CS050"],
      status: "OPEN",
    },
    {
      id: getNextTeamId(),
      leaderUSN: "1RV23ME060",
      requiredBranch: "ECE",
      membersNeeded: 2,
      members: ["1RV23ME060"],
      status: "OPEN",
    },
    {
      id: getNextTeamId(),
      leaderUSN: "1RV23CS070",
      requiredBranch: "CSE",
      membersNeeded: 1,
      members: ["1RV23CS070"],
      status: "OPEN",
    }
  );

  // B advertises team 1 (needs ECE), D advertises team 2 (needs ECE),
  // C advertises team 3 (needs CSE)
  advertisements.push(
    { id: getNextAdId(), advertiserUSN: "1RV23EC010", teamId: 1 },
    { id: getNextAdId(), advertiserUSN: "1RV23EC030", teamId: 2 },
    { id: getNextAdId(), advertiserUSN: "1RV23CS020", teamId: 3 }
  );
}

module.exports = { seed };
