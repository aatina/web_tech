const sqlite3 = require('sqlite3').verbose();

class database {
    constructor( ) {
      this.connection = new sqlite3.Database("recipe_site.db", (err) => {
        if (err) {
          return console.error(err.message);
        }
        console.log('Connected to the in-memory SQlite database.');
      });
    }
    query( sql, params ) {
        return new Promise( ( resolve, reject ) => {
          this.connection.all( sql, params, (err, rows ) => {
                if ( err )
                    return reject( err );
                resolve( rows );
          });
        });
    }
    close() {
        return new Promise( ( resolve, reject ) => {
          this.connection.close((err) => {
            if (err) {
              return reject(err);
            }
            console.log('Close the database connection.');
            resolve();
          });
        } );
    }
}

var conn = new database();

module.exports = { conn };
