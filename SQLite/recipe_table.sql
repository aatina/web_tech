CREATE TABLE IF NOT EXISTS recipes (
 recipe_id integer PRIMARY KEY,
 name text NOT NULL,
 body text,
 created_date datetime default CURRENT_TIMESTAMP,
 user_id integer NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(user_id)
);
