require("dotenv").config();
const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const jwt = require("jsonwebtoken");

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "Our little secret!!!",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/UserDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: false,
});

const userSchema = new mongoose.Schema({
  username: String,
  fullname: String,
  password: String,
  googleId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"],
// });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      return cb(null, profile);
      // console.log(profile.emails[0].value)
      //   const userData = User.findOrCreate(
      //     { username: profile.emails[0].value },
      //     function (err, user) {
      //       return cb(err, user);
      //     }
      //   );

      // const userData= User.find({ username:profile.emails[0].value }, function (err, user) {
      //     return cb(err, user);
      //   });
      //   console.log(userData);
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  }),
  async (req, res) => {
    // Successful authentication, redirect home.
    let token;
    const data = req.user;
    const dataUser = await User.findOne({ googleId: data.id });
    if (dataUser == null) {
      const create = await User.create({
        username: data.emails[0].value,
        fullname: data.displayName,
        googleId: data.id,
      });
      token = jwt.sign(create.toJSON(), "secrets");
      console.log(create, "token: ", token);
    } else {
      token = jwt.sign(dataUser.toJSON(), "secrets");
      console.log(dataUser, "token: ", token);
    }
    res.json({
      message: "success login via google auth",
      success: true,
      token: token,
    });
  }
);

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret;
  User.findById(req.user._id, (err, foundUser) => {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(() => {
          res.redirect("/secrets");
        });
      }
    }
  });

});

app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
User.find({"secret":{$ne:null}},(err,foundUser)=>{
  if(err){
    console.log(err)
  }else{
    res.render("secrets",{userWithSecrets:foundUser})
  }
})
});

app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
  //   const newUser = new User({
  //     email: req.body.username,
  //     password: req.body.password,
  //   });
  //   newUser.save((err) => {
  //     try {
  //       res.render("secrets");
  //     } catch (error) {
  //       console.log(err);
  //     }
  //   });
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
  //   try {
  // 	req.login(user,()=>{
  // 		passport.authenticate("local")(req,res,()=>{
  // 			res.redirect("/secrets")
  // 		})
  // 	})
  //   } catch (error) {
  // 	  console.log(error)
  //   }

  //   const username = req.body.username;
  //   const password = req.body.password;

  //   User.findOne({ email: username }, function (err, foundUser) {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       if (foundUser) {
  //         if (foundUser.password === password) {
  //           res.render("secrets");
  //         }
  //       }
  //     }
  //   });
});

app.listen(port, () => {
  console.log(`this app run at http://localhost:${port}`);
});
