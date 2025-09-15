// backend/config/db.js
import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
  // used in production
  // ssl: {
  //   // use Aiven client certificate
  //   ca: fs.readFileSync('./certs/ca.pem'),       // Aiven CA certificate
  // }
});

console.log(`Connected to MySQL at ${process.env.DB_HOST}:${process.env.DB_PORT}, DB: ${process.env.DB_NAME}`);

export default pool;
