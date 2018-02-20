const express = require('express')
const session = require('express-session');
const app = express();
const path = require("path");
const bodyParser = require('body-parser');
const showdown  = require('showdown');
const converter = new showdown.Converter();

var store = require('./store');
var db = require ('./db');

//For css and other objects that need to be served to visitors
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(session({secret: 'ssshhhhh'}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('case sensitive routing', false);

var sess;

// For now just returns username, but can be changed to get full user
function getSessionUser(sess){
  if (sess.user){
    console.log("Logged in")
    return { username: sess.user.username };
  }
  else {
    console.log("Not Logged in")
    return {}
  }
}

// GET requests
app.get('/test', (req, res) => {
  sess=req.session;
  db.conn.query("SELECT username FROM users", function (err, result, fields) {
    if (err) throw err;
    console.log(result);
  })
});

// Home page
app.get('/',function(req,res){
  sess=req.session;
  var params = getSessionUser(sess);
  db.conn.query("SELECT recipes.name, recipes.image_url, users.username FROM users INNER JOIN recipes ON recipes.user_id = users.user_id ORDER BY created_date DESC LIMIT 6")
  .then((recipe) => {
    params["recipe"] = recipe;
    res.render('pages/index', params );
  })
  .catch(() => {
    res.render('pages/index', params );
  })
});

//Singular Recipe page
app.get('/recipes/:recipeName',function(req,res){
  sess=req.session;
  var params = getSessionUser(sess);
  db.conn.query("SELECT recipes.name, recipes.image_url, recipes.body, users.username FROM users INNER JOIN recipes ON recipes.user_id = users.user_id WHERE recipes.name = ? COLLATE NOCASE", [req.params.recipeName])
  .then((recipe) => {
    params["recipe"] = recipe;
    params["method"] = converter.makeHtml(recipe[0].body);
    res.render('pages/recipe_page', params );
  })
  .catch(() => {
    res.render('pages/recipe_page', params );
  })
});

app.get('/recipes',function(req,res){
  sess=req.session;
  var params = getSessionUser(sess);
  db.conn.query("SELECT recipes.name, recipes.image_url, users.username FROM users INNER JOIN recipes ON recipes.user_id = users.user_id ORDER BY created_date DESC")
  .then((recipe) => {
    params["recipe"] = recipe;
    res.render('pages/recipes', params );
  })
  .catch(() => {
    res.render('pages/recipes', params );
  })
});

// About page
app.get('/about',function(req,res){
  sess=req.session;
  var user = getSessionUser(sess);
  res.render('pages/about', user);
});

// Add recipies
app.get('/add_recipe',function(req,res){
  sess=req.session;
  var user = getSessionUser(sess);
  res.render('pages/add_recipe', user);
});

// Only shows when logged out
app.get('/signup',function(req,res){
  sess=req.session;
  if(sess.user){
    res.redirect("/");
  } else {
    res.render('pages/signup');
  }
});

// Only shows when logged out
app.get('/login',function(req,res){
  sess=req.session;
  if(sess.user){
    res.redirect("/");
  } else {
    res.render('pages/login');
  }
});

app.get('/logout',function(req,res){
  req.session.destroy(function(err) {
    if(err) {
      console.log(err);
    } else {
      res.redirect('/');
    }
  });
});

//POST requests
app.post('/createUser', (req, res) => {
  sess=req.session;
  store.createUser({
      username: req.body.user.username,
      password: req.body.user.password,
      email: req.body.user.email
    })
    .then(() => {
      console.log("User Created");
      res.redirect("/login");
    })
    .catch(() => {
      console.log("Username or email taken");
      res.redirect("/signup");
    })
});

app.post('/addRecipe', (req, res) => {
  sess=req.session;
  if(sess.user){
    store.addRecipe({
        name: req.body.recipe.name,
        body: req.body.recipe.body,
        user: sess.user.user_id
      })
      .then(() => {
        console.log("Recipe Added " + req.body.recipe.name + " by " + sess.user.user_id);
        res.redirect("/");
      })
      .catch(() => {
        console.log("Error adding recipe " + req.body.recipe.name + " by " + sess.user.user_id + sess.user.username);
        res.redirect("/add_recipe");
      })
    } else {
      console.log("Not logged in!");
      res.redirect("/login");
    }
});

app.post('/login', (req, res) => {
  sess=req.session;
  store.authenticate({
      username: req.body.user.username,
      password: req.body.user.password
  })
  .then((user) => {
    sess.user = user;
    console.log("Valid credentials")
    res.redirect("/")
  })
  .catch(() => {
    console.log("Invalid credentials")
    res.redirect("/login")
  })
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
