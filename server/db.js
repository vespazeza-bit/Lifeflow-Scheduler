const mysql = require('mysql2/promise');

let pool = null;

async function initDb() {
  pool = mysql.createPool({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'vespazeza',
    password: process.env.DB_PASS     || '',
    database: process.env.DB_NAME     || 'daily_planner',
    waitForConnections: true,
    connectionLimit: 10,
  });

  // Test connection
  await pool.query('SELECT 1');

  // Create tables if not exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activities (
      activity_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      start_time VARCHAR(10),
      end_time VARCHAR(10),
      notify_before INT DEFAULT 10,
      is_template TINYINT DEFAULT 0,
      repeat_type VARCHAR(20) DEFAULT 'none',
      repeat_days VARCHAR(50),
      date VARCHAR(20),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      log_id INT AUTO_INCREMENT PRIMARY KEY,
      activity_id INT NOT NULL,
      user_id INT NOT NULL,
      date VARCHAR(20) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      actual_time VARCHAR(10),
      reason TEXT,
      FOREIGN KEY (activity_id) REFERENCES activities(activity_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS templates (
      template_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      user_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS template_items (
      template_item_id INT AUTO_INCREMENT PRIMARY KEY,
      template_id INT NOT NULL,
      activity_name VARCHAR(255) NOT NULL,
      time VARCHAR(10),
      FOREIGN KEY (template_id) REFERENCES templates(template_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_token (user_id, token(255))
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_sent (
      id INT AUTO_INCREMENT PRIMARY KEY,
      activity_id INT NOT NULL,
      user_id INT NOT NULL,
      date VARCHAR(20) NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_notif (activity_id, user_id, date)
    )
  `);

  console.log('MySQL connected and tables ready');
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return { lastInsertRowid: result.insertId, changes: result.affectedRows };
}

module.exports = { initDb, query, queryOne, run };
