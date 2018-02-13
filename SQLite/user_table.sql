CREATE TABLE users (
 user_id integer PRIMARY KEY,
 username text NOT NULL,
 password text NOT NULL,
 salt text NOT NULL,
 email text NOT NULL UNIQUE
);
