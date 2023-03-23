const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Middleware to set required headers
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
