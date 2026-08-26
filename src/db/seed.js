// Seeds the database with demo users, connections, teams, and advertisements for development/testing.

const User = require("./models/User");
const Connection = require("./models/Connection");
const Team = require("./models/Team");
const Advertisement = require("./models/Advertisement");
const { Counter } = require("./models/Counter");
const { hashPassword } = require("../utils/auth");

async function seed() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return; // Database is already seeded
    }

    console.log("Seeding demo database with initial data...");
    const demoPassword = "password123";
    const passwordHash = hashPassword(demoPassword);

    const seedUsers = [
      { usn: "1RV23CS001", name: "Alice", branch: "CSE", passwordHash },
      { usn: "1RV23EC010", name: "Bob", branch: "ECE", passwordHash },
      { usn: "1RV23CS020", name: "Charan", branch: "CSE", passwordHash },
      { usn: "1RV23EC030", name: "Divya", branch: "ECE", passwordHash },
      { usn: "1RV23CS050", name: "Meera", branch: "CSE", passwordHash },
      { usn: "1RV23ME060", name: "Rahul", branch: "ME", passwordHash },
      { usn: "1RV23CS070", name: "Sanya", branch: "CSE", passwordHash },
    ];
    await User.insertMany(seedUsers);

    await Connection.insertMany([
      { a: "1RV23CS001", b: "1RV23EC010" },
      { a: "1RV23CS001", b: "1RV23CS020" },
      { a: "1RV23CS001", b: "1RV23EC030" },
    ]);

    await Team.insertMany([
      {
        id: 1,
        leaderUSN: "1RV23CS050",
        requiredBranch: "ECE",
        membersNeeded: 1,
        members: ["1RV23CS050"],
        status: "OPEN",
      },
      {
        id: 2,
        leaderUSN: "1RV23ME060",
        requiredBranch: "ECE",
        membersNeeded: 2,
        members: ["1RV23ME060"],
        status: "OPEN",
      },
      {
        id: 3,
        leaderUSN: "1RV23CS070",
        requiredBranch: "CSE",
        membersNeeded: 1,
        members: ["1RV23CS070"],
        status: "OPEN",
      },
    ]);

    await Advertisement.insertMany([
      { id: 1, advertiserUSN: "1RV23EC010", teamId: 1 },
      { id: 2, advertiserUSN: "1RV23EC030", teamId: 2 },
      { id: 3, advertiserUSN: "1RV23CS020", teamId: 3 },
    ]);

    // Set sequence counter values
    await Counter.updateOne({ _id: "requestId" }, { seq: 0 }, { upsert: true });
    await Counter.updateOne({ _id: "teamId" }, { seq: 3 }, { upsert: true });
    await Counter.updateOne({ _id: "adId" }, { seq: 3 }, { upsert: true });

    console.log("Demo seed data created successfully.");
  } catch (err) {
    console.error("Error seeding database:", err);
  }
}

module.exports = { seed };
