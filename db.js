const { Pool } = require('pg');

const pool = new Pool({
  user: 'projet_logistique_user',
  host: 'dpg-ct3i65lumphs73dttjpg-a.oregon-postgres.render.com',
  database: 'projet_logistique',
  password: 'e7dDdRdezkssqpP3FgD9qZ0oXLIg3a4s',
  port: 5432, // Port par défaut de PostgreSQL
});

module.exports = pool;
