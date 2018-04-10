const express = require('express')
const session = require('express-session');
const app = express();
const path = require("path");
const bodyParser = require('body-parser');
const showdown  = require('showdown');
const converter = new showdown.Converter();
const timeAgo = require("node-time-ago")

var store = require('./store');
var db = require ('./db');

//For css and other objects that need to be served to visitors
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(session({secret: 'ssshhhhh', resave: 'true', saveUninitialized: 'false'}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('case sensitive routing', false);

var sess;

// For now just returns username, but can be changed to get full user
function getSessionUser(sess){
  if (sess.user){
    console.log("Logged in")
    return { sess_user: {username: sess.user.username} };
  }
  else {
    console.log("Not Logged in")
    return {}
  }
}

// ** GET requests ** //
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
  db.conn.query("SELECT recipes.recipe_id, recipes.name, recipes.image_url, recipes.body, recipes.created_date, \
                  users.username, favourites.recipe_id AS favourite_recipe, favourites.user_id AS favourite_user, \
                  categories.name AS category, recipes.cooking_time, recipes.calories \
                  FROM recipes INNER JOIN users ON recipes.user_id = users.user_id \
                  INNER JOIN categories ON recipes.category_id = categories.id \
                  LEFT JOIN favourites ON recipes.recipe_id = favourites.recipe_id \
                  WHERE recipes.name=? COLLATE NOCASE",[req.params.recipeName])
  .then((recipe) => {
    //console.log(recipe)
    params["recipe"] = recipe;
    params["time_ago"] = timeAgo(recipe[0].created_date);
    params["method"] = converter.makeHtml(recipe[0].body);
    console.log(params)
    db.conn.query("SELECT 1 FROM favourites WHERE user_id = ? AND recipe_id = ?", [sess.user.user_id, recipe[0].recipe_id])
  .then((favourite) => {
    params["favourite"] = (favourite.length > 0) ? true : false;
    res.render('pages/recipe_page', params );
  }) })
  .catch((err) => {
    //console.log("ERROR");
    //console.log(err);
    res.render('pages/recipe_page', params );
  })
});

// All recipes
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

//User page
app.get('/user/:username',function(req,res){
  sess=req.session;
  var params = getSessionUser(sess);
  db.conn.query("SELECT username FROM users WHERE username = ?", [req.params.username])
  .then((user) => {
    params["user"] = user;
    res.render('pages/user_page', params );
  })
  .catch((err) => {
    console.log(err)
    res.render('pages/user_page', params );
  })
});

//Edit user profile
app.get('/edit_user',function(req,res){
  sess=req.session;
  var params = getSessionUser(sess);
  res.render('pages/edit_user', params );
});

//Favourites of the user
app.get('/favourites',function(req,res){
  sess=req.session;
  var params = getSessionUser(sess);
  if(sess.user){
    db.conn.query("SELECT recipes.name, recipes.image_url, users.username FROM recipes \
    INNER JOIN favourites ON favourites.recipe_id = recipes.recipe_id  \
    INNER JOIN users ON users.user_id = recipes.user_id \
    WHERE favourites.user_id=? \
    ORDER BY favourites.time_added DESC", [sess.user.user_id])
    .then((recipe) => {
      params["recipe"] = recipe;
      res.render('pages/favourites', params );
    })
    .catch(() => {
      res.render('pages/favourites', params );
    })
  }
  else{
    res.render('pages/favourites', params );
  }
});

// Add new recipe
app.get('/add_recipe',function(req,res){
  sess=req.session;
  var params = getSessionUser(sess);
  db.conn.query("SELECT categories.id, categories.name FROM categories")
  .then((categories) => {
    params["category"] = categories;
    res.render('pages/add_recipe', params );
  })
  .catch((error) => {
    params["error"] = error;
    res.render('pages/add_recipe', params );
  })
});

// Login page - Only shows when logged out
app.get('/login',function(req,res){
  sess=req.session;
  var params = {};
  console.log(sess);
  if(sess.user){
    res.redirect("/");
  } else {
    if(sess.login_error){
      params["error"] = sess.login_error;
      delete sess.login_error;
      res.render('pages/login', params);
    }
    else{
      res.render('pages/login', params);
    }
  }
});

// Sign up page - Only shows when logged out
app.get('/signup',function(req,res){
  sess=req.session;
  if(sess.user){
    res.redirect("/");
  } else {
    res.render('pages/signup');
  }
});

// Logout
app.get('/logout',function(req,res){
  req.session.destroy(function(err) {
    if(err) {
      console.log(err);
    } else {
      res.redirect('/');
    }
  });
});

// ** POST requests ** //

// Create a new user
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


// Create a new recipe - only if logged in
app.post('/addRecipe', (req, res) => {
  sess=req.session;
  if(sess.user){
    store.addRecipe({
        name: req.body.recipe.name,
        body: req.body.recipe.body,
        category_id: req.body.recipe.category_id,
        cooking_time: req.body.recipe.cooking_time,
        calories: req.body.recipe.calories,
        user: sess.user.user_id
      })
      .then(() => {
        console.log("Recipe Added " + req.body.recipe.name + " by " + sess.user.username);
        res.redirect("/");
      })
      .catch((err) => {
        console.log("Error adding recipe " + req.body.recipe.name + " by " + sess.user.username);
        console.log(err);
        //sess.add_recipe_error = "";
        res.redirect("/add_recipe");
      })
    } else {
      console.log("Not logged in!");
      //TODO: add an alert if they aren't logged in
      res.redirect("/login");
    }
});

app.post('/addFavourite', (req, res) => {
  sess=req.session;
  if(sess.user){
    store.addFavourite({
        user: sess.user.user_id,
        recipe: req.body.recipe_id
      })
      .then((isAlreadyFave) => {
        if(isAlreadyFave == 1){
          console.log("Removed recipe " + req.body.recipe_id + " to favourites, for " + sess.user.username);
        }
        else {
          console.log("Added recipe " + req.body.recipe_id + " to favourites, for " + sess.user.username);
        }
        res.status(200).send({"result": isAlreadyFave});
      })
      .catch((err) => {
        console.log(err)
        console.log("Error adding recipe " + req.body.recipe_id + " to favourites, for " + sess.user.username);
        res.sendStatus(500); // Not sure about status code?
      })
    } else {
      console.log("Not logged in!");
      //TODO: add an alert if they aren't logged in
      res.send("log in to add to favourites");
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
    sess.login_error = "Invalid credentials";
    res.redirect("/login")
  })
});

// Return true if the username is valid and available
app.post('/usernameTaken', (req, res) => {
  // Check if username is taken
  // console.log(req.query.username);
  db.conn.query("SELECT 1 FROM users WHERE username = ?",[req.body.username])
  .then((result) => {
    if(result.length > 0)
    {
      res.send('1');
    }else{
      res.send('0');
    }
  })
  .catch(() => {
    res.send('-1');
  })
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
