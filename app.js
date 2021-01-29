require('dotenv').config();
const express = require('express');
const app = express();
const port=3000;
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect("mongodb://localhost:27017/UserDB",{
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
	useCreateIndex: true,
});

const userSchema = new mongoose.Schema({
	email: String,
	password: String
});



userSchema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);



app.get('/',(req,res)=>{
	res.render('home')
})

app.get('/login',(req,res)=>{
	res.render('login')
})

app.get('/register',(req,res)=>{
	res.render('register')
})

app.post("/register", (req, res) => {
	const newUser = new User({
		email: req.body.username,
		password: req.body.password
	});
	newUser.save((err) => {
		try {
			res.render("secrets")
		} catch (error) {
			console.log(err)
		}
	})
})

app.post("/login", (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	
	User.findOne({ email: username }, function (err, foundUser) {
		if (err) {
		console.log(err)
		} else {
			if (foundUser) {
				if (foundUser.password === password) {
					res.render("secrets")
				}
			}
	}
	})
})



app.listen(port, () => console.log(`this app run at http://localhost:${port}`));