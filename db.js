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
    const signed = jwt.sign(payload, jwtToken, { algorithm: "HS256" });
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
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
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
  },
};
