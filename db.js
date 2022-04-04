const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const config = {
  logging: false,
};
const jwt = require("jsonwebtoken");
const jwtToken = process.env.JWT;
const bcrypt = require("bcrypt");
const saltRounds = 10;

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

User.hasMany(Note);
Note.belongsTo(User);

User.byToken = async (token) => {
  try {
    const decoded = jwt.verify(token, jwtToken);
    const user = await User.findByPk(decoded.userId);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  const compare = await bcrypt.compare(password, user.password);
  if (user && compare) {
    const payload = { userId: user.id };
    const signed = jwt.sign(payload, jwtToken);
    return signed;
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const notes = [
    { text: "hello world" },
    { text: "reminder to buy groceries" },
    { text: "reminder to do laundry" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const [note1, note2, note3] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
  await lucy.setNotes(note1);
  await moe.setNotes([note2]);
  await larry.setNotes([note3]);
  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

User.beforeCreate(async (model) => {
  const hashed = await bcrypt.hash(
    model.password,
    saltRounds
    // function (err, hash) {
    //   console.log("hash is ", hash);
    //   return hash;
    // }
  );
  model.password = hashed;
  //   const correct = bcrypt.compare(model.password, hashed)
});

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
