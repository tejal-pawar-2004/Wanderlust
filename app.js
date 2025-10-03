if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const { any } = require("joi");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingsRouter = require("./routes/listing.js");
const reviewsRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const dburl = process.env.ATLASDB_URL;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

main()
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dburl);
}

const store = MongoStore.create({
  mongoUrl: dburl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", () => {
  console.log("ERROR IN MONGO SESSION STORE", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 3, //After 3 days
    maxAge: 1000 * 60 * 60 * 24 * 3,
    httpOnly: true,
  },
};

// app.get("/", (req, res) => {
//   res.send("Root is working");
// });

//use this before routes because we are going use this using routes
app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize()); //before using passport we have initialize first
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser()); //storing of user info
passport.deserializeUser(User.deserializeUser()); //removing of user info

app.use((req, res, next) => {
  console.log("Flash middleware ran");
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", userRouter);

// app.all("*", (req, res, next) => {
//   next(new ExpressError(404, "Page Not Found"));
// });

app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

//middleware
app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went wrong" } = err;
  // res.status(statusCode).send(message);
  res.render("error.ejs", { message });
});

app.listen(8080, () => {
  console.log("Server is listening on port 8080");
});
