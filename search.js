const db = require('./db')

module.exports = {
  search_function ( {q} ){
    return new Promise( ( resolve, reject ) => {
      db.conn.query("SELECT name, id, author, image_url, type \
                     FROM \
                     ( \
                      SELECT \
                    	recipes.name 	    AS name, \
                      recipes.recipe_id AS id,\
                    	recipes.image_name AS image_url, \
                      users.username    AS author, \
                    	1 	     	        AS type  \
                    	FROM recipes \
                      INNER JOIN users ON users.user_id=recipes.user_id \
                      WHERE name LIKE lower('%'||?||'%') \
                    UNION \
                    	SELECT  \
                    	users.username 	  AS name, \
                      users.user_id     AS id,\
                    	users.avatar_url  AS image_url, \
                      0                 AS author, \
                    	2		              AS type \
                      FROM users WHERE lower(username) LIKE lower('%'||?||'%') \
                    UNION \
                      SELECT  \
                      categories.name	  AS name, \
                      categories.id     AS id,\
                      0		              AS image_url,\
                      0                 AS author, \
                      3		              AS type \
                      FROM categories WHERE name = lower(?) \
                    ) results", [q, q, q])
      .then( (result) => {
        return resolve(result);
      })
      .catch((err) =>{
        return reject(err);
      })
    });
  }
}
