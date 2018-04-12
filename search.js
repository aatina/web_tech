const db = require('./db')

module.exports = {
  search_function ( {q} ){
    return new Promise( ( resolve, reject ) => {
      db.conn.query("SELECT name, id, author, image_url, type, rank \
                     FROM \
                     ( \
                      SELECT \
                    	recipes.name 	    AS name, \
                      recipes.recipe_id AS id,\
                    	recipes.image_url AS image_url, \
                      users.username    AS author, \
                    	1 	     	        AS type,  \
                    	3		              AS rank \
                    	FROM recipes \
                      INNER JOIN users ON users.user_id=recipes.user_id \
                      WHERE name LIKE '%'||?||'%' \
                    UNION \
                    	SELECT  \
                    	users.username 	  AS name, \
                      users.user_id     AS id,\
                    	users.avatar_url  AS image_url, \
                      0                 AS author, \
                    	2		              AS type, \
                    	1		              AS rank \
                      FROM users WHERE lower(username) = lower(?) \
                    UNION \
                      SELECT  \
                      categories.name	  AS name, \
                      categories.id     AS id,\
                      0		              AS image_url,\
                      0                 AS author, \
                      3		              AS type, \
                      2		              AS rank \
                      FROM categories WHERE name = lower(?) \
                    ) results \
                    ORDER BY rank ASC", [q, q, q])
      .then( (result) => {
        return resolve(result);
      })
      .catch((err) =>{
        return reject(err);
      })
    });
  }
}
