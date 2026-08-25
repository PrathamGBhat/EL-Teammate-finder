const app = require("./src/app");
const { PORT } = require("./src/config/constants");

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
