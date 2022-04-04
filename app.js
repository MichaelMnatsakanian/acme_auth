const express = require("express");
const app = express();
app.use(express.json());
const {
  models: { User, Note },
} = require("./db");
const path = require("path");

async function requireToken(req, res, next) {
  try {
    const token = req.headers.authorization;
    const tokenUser = await User.byToken(token);
    req.user = tokenUser;
    next();
  } catch (err) {
    next(err);
  }
}

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.post("/api/auth", async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth", requireToken, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/users/:id/notes", requireToken, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const tokenUser = req.user;
    if (userId == tokenUser.id) {
      const user = await User.findByPk(userId, {
        include: [{ model: Note }],
      });
      res.json(user);
    } else {
      res.status(403).send();
    }
  } catch (err) {
    next(err);
  }
});

app.delete("/api/auth", async (req, res, next) => {
  try {
    res.send();
  } catch (ex) {
    next(ex);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
