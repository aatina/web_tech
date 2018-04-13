const express = require('express')
const session = require('express-session');
const app = express();
const path = require("path");
const bodyParser = require('body-parser');
const showdown  = require('showdown');
const converter = new showdown.Converter();
const timeAgo = require("node-time-ago")
const expressWs = require('express-ws')(app);
const fileUpload = require('express-fileupload');

var store = require('./store');
var db = require ('./db');
var search = require ('./search');

//For css and other objects that need to be served to visitors
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(session({secret: 'ssshhhhh', resave: 'true', saveUninitialized: 'false'}));
app.use(fileUpload());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('case sensitive routing', false);

app.listen(3000, () => console.log('Example app listening on port 3000!'));

var sess;

//***** WEBSOCKET *****//
var aWss = expressWs.getWss('/');

// latest 100 messages
var history = [ ];

//helper function for escaping input strings
function htmlEntities(str) {
  return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

app.ws('/echo', function(ws, req) {
  if (sess.user){
    var user_id = sess.user.user_id;
    var username = sess.user.username;
    var user_avatar = sess.user.avatar_url;

    if(history.length > 0){
      ws.send( JSON.stringify({ type: 'history', data: history}) )
    }
  }
  else {
    ws.send("-1")
  }

  ws.on('message', function(message) {
    console.log((new Date()) + ' Received Message from ' + username + ': ' + message);

    // Message data
    var obj = {
      time: (new Date()).getTime(),
      text: htmlEntities(message),
      author: username,
      avatar: user_avatar
    };

    //store message data
    history.push(obj);
    history = history.slice(-100);

    // Broadcast message to all users
    var json = JSON.stringify({ type:'message', data: obj });
    aWss.clients.forEach(function (client) {
      client.send(json);
    });

  });
  ws.on('close', function() {
    if (username !== false) {
      console.log("connection closed");
    }
  });
});

//** END WEBSOCKET **//

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
  db.conn.query("SELECT recipes.name, recipes.recipe_id, recipes.image_name, \
  users.username FROM users INNER JOIN recipes ON recipes.user_id = users.user_id \
  ORDER BY created_date DESC LIMIT 10")
  .then((recipe) => {
    params["recipe"] = recipe;
    if(sess.added_recipe){
      params["success"] = sess.added_recipe;
      delete sess.added_recipe;
    }
    res.render('pages/index', params );
  })
  .catch(() => {
    res.render('pages/index', params );
  })
});

//Singular Recipe page
app.get('/recipes/:recipe_id',function(req,res){
  sess=req.session;
  var params = getSessionUser(sess);
  db.conn.query("SELECT recipes.recipe_id, recipes.name, recipes.image_name, recipes.body, recipes.created_date, \
                  users.username, favourites.recipe_id AS favourite_recipe, favourites.user_id AS favourite_user, \
                  categories.name AS category, recipes.cooking_time, recipes.calories, \
                  recipe_ingredients.ingredient \
                  FROM recipes INNER JOIN users ON recipes.user_id = users.user_id \
                  INNER JOIN categories ON recipes.category_id = categories.id \
                  LEFT JOIN favourites ON recipes.recipe_id = favourites.recipe_id \
                  LEFT JOIN recipe_ingredients ON recipes.recipe_id = recipe_ingredients.recipe_id\
                  WHERE recipes.recipe_id=? COLLATE NOCASE",[req.params.recipe_id])
  .then((recipe) => {
    if(recipe.length == 0){
      res.redirect('/404');
    }
    params["recipe"] = recipe;
    params["time_ago"] = timeAgo(recipe[0].created_date);
    params["method"] = converter.makeHtml(recipe[0].body);
    // throws error when no sess.user
    db.conn.query("SELECT 1 FROM favourites WHERE user_id = ? AND recipe_id = ?", [sess.user.user_id, recipe[0].recipe_id])
    .then((favourite) => {
      params["favourite"] = (favourite.length > 0) ? true : false;
      res.render('pages/recipe_page', params );
    })
    .catch(()=>{
      console.log("FAVES ERROR");
      console.log(err);
      res.render('pages/recipe_page', params );
    })
  })
  .catch((err) => {
    console.log("ERROR");
    console.log(err);
    res.render('pages/recipe_page', params );
  })
});

// All recipes
app.get('/recipes',function(req,res){
  sess=req.session;
  var params = getSessionUser(sess);
  db.conn.query("SELECT recipes.recipe_id, recipes.name, \
  recipes.image_name, users.username FROM users \
  INNER JOIN recipes ON recipes.user_id = users.user_id \
  ORDER BY created_date DESC LIMIT 6")
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
  db.conn.query("SELECT * FROM users WHERE username = ?", [req.params.username])
  .then((user) => {
    console.log(user.length)
    if(user.length == 0){
      res.redirect('/404');
    }
    params["user"] = user;
    params["time_ago"] = timeAgo(user[0].member_since);
    console.log(user[0].user_id);
    // TODO: to limit or not to limit?
    db.conn.query("SELECT recipes.recipe_id, recipes.name, recipes.image_name, \
    users.username FROM users INNER JOIN recipes ON recipes.user_id = users.user_id \
    WHERE users.user_id = ? ORDER BY created_date DESC ", [user[0].user_id])
    .then((recipe) => {
      params["recipe"] = recipe;
      console.log(params)
      res.render('pages/user_page', params );
    })
    .catch((err) => {
      console.log(err)
      res.render('pages/user_page', params );
    })
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
    db.conn.query("SELECT recipes.recipe_id, recipes.name, recipes.image_name, \
    users.username FROM recipes \
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

// All recipes
app.get('/category/:category_id',function(req,res){
  var params = {};
  db.conn.query("SELECT recipes.recipe_id, recipes.name, recipes.image_name, \
  users.username, categories.name AS category FROM recipes \
  INNER JOIN users ON recipes.user_id = users.user_id \
  INNER JOIN categories ON recipes.category_id = categories.id\
  WHERE recipes.category_id = ? ORDER BY created_date DESC", [req.params.category_id])
  .then((recipe) => {
    params["recipe"] = recipe;
    console.log(params)
    res.render('pages/category', params );
  })
  .catch((err) => {
    console.log(err)
    res.render('pages/category', params );
  })
});


// Add new recipe page - NOTE: this function does not add a recipe, just goes to page
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
  if(sess.user){
    res.redirect("/");
  } else {
    if(sess.login_error){
      params["error"] = sess.login_error;
      delete sess.login_error;
      res.render('pages/login', params);
    }
    else if(sess.signup_success){
      params["success"] = sess.signup_success;
      delete sess.signup_success;
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
  var params = {};
  if(sess.user){
    res.redirect("/");
  } else {
    if(sess.signup_error){
      params["signup_msg"] = sess.signup_error;
      delete sess.signup_error;
      res.render('pages/signup', params);
    } else{
      res.render('pages/signup');
    }
  }
});

// Search function
app.get('/search', function(req,res){
  var params = [];
  params["query"] = req.query.q;
  if(req.query.q == ''){
    params["err"] = "Invalid Search"
    res.render('pages/search_results', params)
  }
  search.search_function({
    q: req.query.q
  })
  .then((result) => {
    params["results"] = result;
    res.render('pages/search_results', params)
  })
  .catch((err) => {
    console.log(err)
    res.render('pages/search_results', params)
  })
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
      email: req.body.user.email,
      birthday: req.body.user.birthday,
      location: req.body.user.location,
      about: req.body.user.about
    })
    .then(() => {
      console.log("User Created");
      sess.signup_success = "User created! Please log in!";
      res.redirect("/login");
    })
    .catch(() => {
      console.log("Username or email taken");
      sess.signup_error = "Username or email taken";
      res.redirect("/signup");
    })
});


// Create a new recipe - only if logged in
app.post('/addRecipe', (req, res) => {
  sess=req.session;
  var recipe_id;
  if(sess.user){
    // Add main recipe body to database
    store.addRecipe({
        name: req.body.name,
        body: req.body.body,
        category_id: req.body.category_id,
        cooking_time: req.body.cooking_time,
        calories: req.body.calories,
        user: sess.user.user_id
      })
      .then(() => {
        console.log("Recipe Added " + req.body.name + " by " + sess.user.username);
        db.conn.query("SELECT recipe_id FROM recipes ORDER BY recipe_id  DESC LIMIT 1")
        .then((id) =>{
          // Add ingredients list to recipe-ingredients table
          recipe_id = id[0].recipe_id;
          for(var i=0; i<req.body.ingredient.length; i++){
            store.addIngredient({
              recipe_id: recipe_id,
              ingredient: req.body.ingredient[i]
            })
          }
        })
        .then(()=>{
          // Add image to recipe table
          if (!req.files){
            return res.status(400).send('No files were uploaded.');
          }
          // The name of the input field (i.e. "image") is used to retrieve the uploaded file
          let image = req.files.image;
          console.log(recipe_id)
          var image_name = store.hashString(recipe_id.toString()).substring(0,11);;
          var image_url = 'public/images/recipe_images/' + image_name + ".png"; //filetype?
          // Use the mv() method to place the file somewhere on your server
          image.mv(image_url, function(err) {
            if (err){
              console.log("file move error")
              console.log(err)
            }
          });
          db.conn.query("UPDATE recipes SET image_name = ? WHERE recipe_id=?",[image_name, recipe_id])
          .catch((err) => {
            console.log(err)
          })
        })
        .catch((err) => {
          console.log(err);
        })
      })
      .then(() => {
        sess.added_recipe = "Added recipe " + req.body.name + "!";
        res.redirect("/");
      })
      .catch((err) => {
        console.log("Error adding recipe " + req.body.name + " by " + sess.user.username);
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

// Add a recipe to your favourites list
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

// Autheticate the login request
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

// Get more recipes for infinite scroll
app.get('/getRecipes', (req, res) => {
  // Check if username is taken
  db.conn.query("SELECT recipes.recipe_id, recipes.name, recipes.image_name, \
  users.username FROM users INNER JOIN recipes ON recipes.user_id = users.user_id \
  ORDER BY created_date DESC LIMIT ? OFFSET ? ",[req.query.limit, req.query.offset])
  .then((recipe) => {
    console.log(recipe.length);
    res.send(recipe)
  })
  .catch((err) => {
    res.send(err);
  })
});


// 404 - MUST BE LAST REQUEST!
app.use(function (req, res, next) {
  res.status(404).render('pages/404', { url: req.url });
})
