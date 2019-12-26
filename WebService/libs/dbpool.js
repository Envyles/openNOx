var pg = require("pg");             //PostgreSQL libary

//Configuration for the PostgreSQL Connection
var dbConfig = {
   user: 'postgres',
   database: 'postgres', 
   password: 'postgres', 
   port: 5432, 
   idleTimeoutMillis: 60000,
   max: 20
 };

//Pool is the prefered way for the pg Connection, since there will be a lot of simultanious, short requests and everyone of these woud need some time to reconnect.
var pool = new pg.Pool(dbConfig);

module.exports = { pool }