// This interacts with the database
const crypto = require('crypto')
const db = require('./db')

// db.con.connect(function(err) {
//   if (err) throw err;
// })

module.exports = {

  createUser ({ username, password, email, avatar_url, birthday, location, about } ){
    return new Promise( ( resolve, reject ) => {
      const { salt, hash } = saltHashPassword( { password } )
      db.conn.query(" SELECT username, email FROM users WHERE username = ? OR email = ? ", [username, email])
      .then (user => {
        if(user.length != 0){ //Username or email taken
          console.log("rejected")
          return reject();
        }
        else{
          console.log("adding user")
          avatar_url = iconString(email)
          db.conn.query("INSERT INTO users (username, password, salt, email, avatar_url, birthday, location, about) VALUES (?,?,?,?,?,?,?,?)", [username, hash, salt, email, avatar_url, birthday, location, about])
          return resolve();
        }
      })
    })
  },
  authenticate ({ username, password }) {
    return new Promise( ( resolve, reject ) => {
      console.log(`Authenticating user ${username}`);
      db.conn.query("SELECT * FROM users WHERE username = ? ", [username])
      .then( user => {
        if(user.length > 0){
          // do something with the result
          const { hash }  = saltHashPassword({ password, salt: user[0].salt })
          if(hash === user[0].password) {
            resolve( user[0] ); // Valid credentials
          }else{
            reject( ); // Invalid credentials
          }
        }
        else{
          reject(); // Invalid credentials
        }
      })
      .catch(err => {
        console.log(err);
      })
    });
  },
  addRecipe({name, body, user, category_id, cooking_time, calories}){
    return new Promise( ( resolve, reject ) => {
      console.log(`Adding recipe ${name}`);
      //console.log(`Cooking time: cooking_time`);
      db.conn.query("INSERT INTO recipes (name, body, user_id, category_id, cooking_time, calories) VALUES (?,?,?,?,?,?)", [name, body, user, category_id, cooking_time, calories])
      return resolve();
    })
  },
  addFavourite({user, recipe}){
    return new Promise( ( resolve, reject ) => {
      db.conn.query("SELECT 1 FROM favourites WHERE user_id = ? AND recipe_id = ?", [user, recipe])
      .then( rows => {
        //console.log(rows.length);
        if(rows.length > 0){
          db.conn.query("DELETE FROM favourites where user_id = ? AND recipe_id = ?", [user, recipe])
          return resolve(rows.length);
        }
        else{
          db.conn.query("INSERT INTO favourites (user_id, recipe_id) VALUES (?,?)", [user, recipe]);
          return resolve(rows.length);
        }
      })
    })
  }
}

function saltHashPassword ( { password, salt = randomString() } ) {
  const hash = crypto.createHmac('sha512', salt).update(password)
  return { salt, hash: hash.digest('hex') }
}
function randomString () {
  return crypto.randomBytes(4).toString('hex')
}
function iconString(email){
  const hashString = crypto.createHash('md5').update(email).digest("hex");
  return hashString
}
