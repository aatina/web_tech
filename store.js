// This interacts with the database
const crypto = require('crypto')
const db = require('./db')

// db.con.connect(function(err) {
//   if (err) throw err;
// })

module.exports = {

  createUser ({ username, password, email } ){
    return new Promise( ( resolve, reject ) => {
      const { salt, hash } = saltHashPassword( { password } )
      //console.log([username, hash, salt])
      db.conn.query(" SELECT username, email FROM users WHERE username = ? OR email = ? ", [username, email])
      .then (user => {
        if(user.length != 0){ //Username or email taken
          console.log("rejected")
          return reject();
        }
        else{
          console.log("adding user")
          db.conn.query("INSERT INTO users (username, password, salt, email) VALUES (?,?,?,?)", [username, hash, salt, email])
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
        // do something with the result
        const { hash }  = saltHashPassword({ password, salt: user[0].salt })
        if(hash === user[0].password) {
          resolve( user[0] ); // Valid credentials
        }else{
          reject( ); // Invalid credentials
        }
      });
    });
  },
  addRecipe({name, body, user}){
    return new Promise( ( resolve, reject ) => {
      console.log(`Adding recipe ${name}`);
      db.conn.query("INSERT INTO recipes (name, body, user_id) VALUES (?,?,?)", [name, body, user])
      return resolve();
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
