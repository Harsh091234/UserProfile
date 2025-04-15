const express = require("express");
const userModel = require("./models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const postModel = require("./models/post");
const upload = require("./config/multerconfig");
const path = require("path");
const {connectToMongoDB} = require("./connect");
require("dotenv").config();


const app = express();
const port = process.env.port | 3000;
// const mongoUrl = process.env.mongoUrlLocal;
const mongoUrl = process.env.mongoUrlOnline;
  
connectToMongoDB(mongoUrl);

app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




app.get("/", (req, res) => {
   

    res.render("index");
})

app.get("/profile", isLoggedIn,  async(req, res) => {
    const user = await userModel.findOne({email: req.user.email}).populate("posts");
   
    res.render("profile", {user});
})

app.get("/profile/upload", (req, res) => {
    
    res.render("profileupload");
})


app.post("/upload", isLoggedIn, upload.single("image"), async(req, res) => {
     const user = await userModel.findOne({email: req.user.email});
     user.profilepic = req.file.filename;
     await user.save();
     res.redirect("/profile");
    
    
});
app.post("/post", isLoggedIn,  async(req, res) => {
    const user = await userModel.findOne({email: req.user.email});
    let {content} = req.body;

    const post = await postModel.create({
        user: user._id,
        content
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");

})

app.post("/create", async (req, res) => {
    const { username,   name, email, password, age } = req.body;
    const user = await userModel.findOne({ email });
    
    if (user) return res.status(200).send("user already created");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            const createdUser = await userModel.create({
                username,
                name,
                email,
                password: hash,
                age
            });
            const token = jwt.sign( {email: email, userid: createdUser._id}, "shhh");
            res.cookie("token", token);
            res.redirect("/profile");
        });

        
    });
});

app.get("/login", (req, res) => {
    res.render("login");
})

app.post("/login", async(req, res) => {
    const {email, password} = req.body;
    const user = await userModel.findOne({email});
    if(!user) return res.status(500).send("something went wrong");

    bcrypt.compare(password, user.password, (err, result) => {
      
        if(result){
           
            const token = jwt.sign( {email: email, userid: user._id}, "shhh");
            res.cookie("token", token);
           res.redirect("/profile");
        }
        else res.redirect("/login");
    })
})

app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
})

app.get("/like/:id",isLoggedIn, async(req, res) => {
    const post = await postModel.findOne({_id: req.params.id}).populate("user");
    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
  
    await post.save();
    res.redirect("/profile");
})

app.get("/edit/:id",isLoggedIn, async(req, res) => {
    const post = await postModel.findOne({_id: req.params.id}).populate("user");
   
    res.render("edit", {post});
})

app.post("/update/:id",isLoggedIn, async(req, res) => {
    const post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});
   
    res.redirect("/profile");
})



function isLoggedIn(req, res, next){
    if(req.cookies.token === "") res.redirect("/login");
    else{
        let data = jwt.verify(req.cookies.token, "shhh");
        req.user = data;
    }
    next();
};



app.listen(port, () => console.log(`server started at port: ${port}`));