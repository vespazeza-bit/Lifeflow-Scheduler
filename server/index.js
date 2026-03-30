const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { initDb, query, queryOne, run } = require('./db');

const app = express();
const PORT = 5001;
const JWT_SECRET = 'lifeflow_secret_key_2024';

app.use(cors());
app.use(express.json());

// Lazy DB init for Vercel serverless
let dbReady = false;
let dbInitPromise = null;
async function ensureDb() {
  if (dbReady) return;
  if (!dbInitPromise) dbInitPromise = initDb();
  await dbInitPromise;
  dbReady = true;
}
app.use(async (req, res, next) => {
  try { await ensureDb(); next(); } catch (err) { res.status(500).json({ error: 'DB init failed' }); }
});

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const existing = queryOne('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashed = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const result = run('INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, ?)', [name, email, hashed, now]);
    const userId = result.lastInsertRowid;
    const token = jwt.sign({ user_id: userId, name, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { user_id: userId, name, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ user_id: user.user_id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { user_id: user.user_id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  try {
    const user = queryOne('SELECT user_id, name, email, created_at FROM users WHERE user_id = ?', [req.user.user_id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Activity Routes ───────────────────────────────────────────────────────────
app.get('/api/activities', authenticate, (req, res) => {
  const { date } = req.query;
  try {
    let activities;
    if (date) {
      const dayOfWeek = new Date(date + 'T00:00:00').getDay().toString();
      activities = query(`
        SELECT * FROM activities
        WHERE user_id = ? AND (
          (repeat_type = 'none' AND date = ?) OR
          repeat_type = 'daily' OR
          (repeat_type = 'weekly' AND repeat_days LIKE ?)
        )
        ORDER BY start_time ASC
      `, [req.user.user_id, date, `%${dayOfWeek}%`]);
    } else {
      activities = query('SELECT * FROM activities WHERE user_id = ? ORDER BY date ASC, start_time ASC', [req.user.user_id]);
    }
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activities/:id', authenticate, (req, res) => {
  try {
    const activity = queryOne('SELECT * FROM activities WHERE activity_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities', authenticate, (req, res) => {
  const { title, start_time, end_time, notify_before, repeat_type, repeat_days, date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    const now = new Date().toISOString();
    const result = run(
      'INSERT INTO activities (user_id, title, start_time, end_time, notify_before, repeat_type, repeat_days, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.user_id, title, start_time || null, end_time || null, notify_before || 10, repeat_type || 'none', repeat_days ? JSON.stringify(repeat_days) : null, date || null, now]
    );
    const activity = queryOne('SELECT * FROM activities WHERE activity_id = ?', [result.lastInsertRowid]);
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/activities/:id', authenticate, (req, res) => {
  const { title, start_time, end_time, notify_before, repeat_type, repeat_days, date } = req.body;
  try {
    const existing = queryOne('SELECT * FROM activities WHERE activity_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    run(
      'UPDATE activities SET title=?, start_time=?, end_time=?, notify_before=?, repeat_type=?, repeat_days=?, date=? WHERE activity_id=? AND user_id=?',
      [
        title || existing.title,
        start_time !== undefined ? start_time : existing.start_time,
        end_time !== undefined ? end_time : existing.end_time,
        notify_before || existing.notify_before,
        repeat_type || existing.repeat_type,
        repeat_days ? JSON.stringify(repeat_days) : existing.repeat_days,
        date !== undefined ? date : existing.date,
        req.params.id, req.user.user_id
      ]
    );
    const updated = queryOne('SELECT * FROM activities WHERE activity_id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/activities/:id', authenticate, (req, res) => {
  try {
    const existing = queryOne('SELECT * FROM activities WHERE activity_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    run('DELETE FROM activities WHERE activity_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Activity Logs Routes ──────────────────────────────────────────────────────
app.get('/api/logs', authenticate, (req, res) => {
  const { date, activity_id } = req.query;
  try {
    let sql = 'SELECT l.*, a.title FROM activity_logs l JOIN activities a ON l.activity_id = a.activity_id WHERE l.user_id = ?';
    const params = [req.user.user_id];
    if (date) { sql += ' AND l.date = ?'; params.push(date); }
    if (activity_id) { sql += ' AND l.activity_id = ?'; params.push(activity_id); }
    sql += ' ORDER BY l.date DESC';
    res.json(query(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', authenticate, (req, res) => {
  const { activity_id, date, status, actual_time, reason } = req.body;
  if (!activity_id || !date) return res.status(400).json({ error: 'activity_id and date are required' });
  try {
    // Add reason column if not exists (migration)
    try { run('ALTER TABLE activity_logs ADD COLUMN reason TEXT'); } catch {}
    const existing = queryOne('SELECT * FROM activity_logs WHERE activity_id = ? AND user_id = ? AND date = ?', [activity_id, req.user.user_id, date]);
    if (existing) {
      run('UPDATE activity_logs SET status=?, actual_time=?, reason=? WHERE log_id=?',
        [status || 'pending', actual_time || null, reason || null, existing.log_id]);
      return res.json(queryOne('SELECT * FROM activity_logs WHERE log_id=?', [existing.log_id]));
    }
    const result = run('INSERT INTO activity_logs (activity_id, user_id, date, status, actual_time, reason) VALUES (?,?,?,?,?,?)',
      [activity_id, req.user.user_id, date, status || 'pending', actual_time || null, reason || null]);
    res.json(queryOne('SELECT * FROM activity_logs WHERE log_id=?', [result.lastInsertRowid]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/logs/:id', authenticate, (req, res) => {
  const { status, actual_time, reason } = req.body;
  try {
    const log = queryOne('SELECT * FROM activity_logs WHERE log_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    if (!log) return res.status(404).json({ error: 'Log not found' });
    run('UPDATE activity_logs SET status=?, actual_time=?, reason=? WHERE log_id=?',
      [status || log.status, actual_time || log.actual_time, reason !== undefined ? reason : log.reason, req.params.id]);
    res.json(queryOne('SELECT * FROM activity_logs WHERE log_id=?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Stats Route ───────────────────────────────────────────────────────────────
app.get('/api/stats', authenticate, (req, res) => {
  try {
    const { month } = req.query; // format: YYYY-MM (optional)
    const now = new Date();
    const todayDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    // Today stats
    const todayActs = query(`
      SELECT * FROM activities WHERE user_id = ? AND (
        (repeat_type = 'none' AND date = ?) OR repeat_type = 'daily' OR repeat_type = 'weekly'
      )
    `, [req.user.user_id, todayDate]);
    const todayLogs = query("SELECT * FROM activity_logs WHERE user_id = ? AND date = ?", [req.user.user_id, todayDate]);
    const todayCompleted = todayLogs.filter(l => l.status === 'completed').length;
    const todayTotal = todayActs.length;

    // Monthly range
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const [yr, mo] = targetMonth.split('-').map(Number);
    const firstDay = `${yr}-${String(mo).padStart(2,'0')}-01`;
    const lastDay = new Date(yr, mo, 0);
    const lastDayStr = `${yr}-${String(mo).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;

    // Monthly logs
    const monthlyLogs = query(`
      SELECT l.*, a.title FROM activity_logs l
      JOIN activities a ON l.activity_id = a.activity_id
      WHERE l.user_id = ? AND l.date >= ? AND l.date <= ?
      ORDER BY l.date DESC
    `, [req.user.user_id, firstDay, lastDayStr]);

    const monthCompleted = monthlyLogs.filter(l => l.status === 'completed').length;
    const monthTotal = monthlyLogs.length;
    const monthRate = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;

    // Daily breakdown for month chart (group by date)
    const dailyMap = {};
    monthlyLogs.forEach(l => {
      if (!dailyMap[l.date]) dailyMap[l.date] = { date: l.date, total: 0, completed: 0 };
      dailyMap[l.date].total++;
      if (l.status === 'completed') dailyMap[l.date].completed++;
    });
    const monthlyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Weekly data (last 7 days)
    const weeklyData = query(`
      SELECT date, COUNT(*) as total,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
      FROM activity_logs WHERE user_id = ?
      GROUP BY date ORDER BY date DESC LIMIT 7
    `, [req.user.user_id]);

    // Overall
    const totalRow = queryOne('SELECT COUNT(*) as count FROM activities WHERE user_id = ?', [req.user.user_id]);
    const completedRow = queryOne("SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ? AND status = 'completed'", [req.user.user_id]);
    const missedRow = queryOne("SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ? AND status = 'missed'", [req.user.user_id]);

    res.json({
      total: totalRow?.count || 0,
      completed: completedRow?.count || 0,
      missed: missedRow?.count || 0,
      today: { total: todayTotal, completed: todayCompleted, date: todayDate },
      weeklyData,
      monthly: { month: targetMonth, total: monthTotal, completed: monthCompleted, rate: monthRate, data: monthlyData, logs: monthlyLogs.slice(0, 20) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Templates Routes ──────────────────────────────────────────────────────────
app.get('/api/templates', authenticate, (req, res) => {
  try {
    const templates = query('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC', [req.user.user_id]);
    const result = templates.map(t => ({
      ...t,
      items: query('SELECT * FROM template_items WHERE template_id = ?', [t.template_id])
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/templates', authenticate, (req, res) => {
  const { name, items } = req.body;
  if (!name) return res.status(400).json({ error: 'Template name is required' });
  try {
    const now = new Date().toISOString();
    const result = run('INSERT INTO templates (name, user_id, created_at) VALUES (?, ?, ?)', [name, req.user.user_id, now]);
    const templateId = result.lastInsertRowid;
    if (items && items.length > 0) {
      items.forEach(item => run('INSERT INTO template_items (template_id, activity_name, time) VALUES (?, ?, ?)', [templateId, item.activity_name, item.time || null]));
    }
    const template = queryOne('SELECT * FROM templates WHERE template_id = ?', [templateId]);
    const templateItems = query('SELECT * FROM template_items WHERE template_id = ?', [templateId]);
    res.json({ ...template, items: templateItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/templates/:id', authenticate, (req, res) => {
  const { name, items } = req.body;
  if (!name) return res.status(400).json({ error: 'Template name is required' });
  try {
    const template = queryOne('SELECT * FROM templates WHERE template_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    run('UPDATE templates SET name = ? WHERE template_id = ?', [name, req.params.id]);
    run('DELETE FROM template_items WHERE template_id = ?', [req.params.id]);
    if (items && items.length > 0) {
      items.forEach(item => run('INSERT INTO template_items (template_id, activity_name, time) VALUES (?, ?, ?)', [req.params.id, item.activity_name, item.time || null]));
    }
    const updated = queryOne('SELECT * FROM templates WHERE template_id = ?', [req.params.id]);
    const updatedItems = query('SELECT * FROM template_items WHERE template_id = ?', [req.params.id]);
    res.json({ ...updated, items: updatedItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/templates/:id', authenticate, (req, res) => {
  try {
    const template = queryOne('SELECT * FROM templates WHERE template_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    run('DELETE FROM template_items WHERE template_id = ?', [req.params.id]);
    run('DELETE FROM templates WHERE template_id = ?', [req.params.id]);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/templates/:id/apply', authenticate, (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });
  try {
    const template = queryOne('SELECT * FROM templates WHERE template_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const items = query('SELECT * FROM template_items WHERE template_id = ?', [req.params.id]);
    const now = new Date().toISOString();
    items.forEach(item => run('INSERT INTO activities (user_id, title, start_time, date, repeat_type, created_at) VALUES (?, ?, ?, ?, ?, ?)', [req.user.user_id, item.activity_name, item.time || null, date, 'none', now]));
    res.json({ message: `Applied ${items.length} activities to ${date}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FCM Token Routes ──────────────────────────────────────────────────────────
app.post('/api/fcm-token', authenticate, (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const now = new Date().toISOString();
    run(
      'INSERT OR IGNORE INTO fcm_tokens (user_id, token, created_at) VALUES (?, ?, ?)',
      [req.user.user_id, token, now]
    );
    res.json({ message: 'FCM token saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fcm-token', authenticate, (req, res) => {
  const { token } = req.body;
  try {
    if (token) {
      run('DELETE FROM fcm_tokens WHERE user_id = ? AND token = ?', [req.user.user_id, token]);
    } else {
      run('DELETE FROM fcm_tokens WHERE user_id = ?', [req.user.user_id]);
    }
    res.json({ message: 'FCM token removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications/status', authenticate, (req, res) => {
  try {
    const tokens = query('SELECT id, created_at FROM fcm_tokens WHERE user_id = ?', [req.user.user_id]);
    const recentSent = query(
      'SELECT * FROM notification_sent WHERE user_id = ? ORDER BY sent_at DESC LIMIT 10',
      [req.user.user_id]
    );
    res.json({
      enabled: tokens.length > 0,
      tokenCount: tokens.length,
      tokens,
      recentSent,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cron Endpoint (for Vercel Cron Jobs) ─────────────────────────────────────
const { startNotificationCron, checkAndSendNotifications } = require('./notifications');

app.get('/api/cron/notify', async (req, res) => {
  try {
    await checkAndSendNotifications();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ──────────────────────────────────────────────────────────────
if (!process.env.VERCEL) {
  // Serve React build in production
  const clientDist = path.join(__dirname, '../client/dist');
  if (require('fs').existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientDist, 'index.html'));
      }
    });
  }

  initDb().then(() => {
    startNotificationCron();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`LifeFlow Server running on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to init database:', err);
    process.exit(1);
  });
}

module.exports = app;
