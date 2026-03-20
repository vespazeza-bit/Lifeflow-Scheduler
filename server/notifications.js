const cron = require('node-cron');
const admin = require('firebase-admin');
const { query, queryOne, run } = require('./db');

let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return true;
  try {
    const { serviceAccount } = require('./firebase-config');
    if (serviceAccount.project_id === 'YOUR_PROJECT_ID') {
      console.warn('[Notifications] Firebase not configured. Edit server/firebase-config.js to enable push notifications.');
      return false;
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('[Notifications] Firebase Admin initialized successfully.');
    return true;
  } catch (err) {
    console.error('[Notifications] Failed to initialize Firebase Admin:', err.message);
    return false;
  }
}

// Get current Thailand time (UTC+7)
function getNowThailand() {
  const now = new Date();
  // Thailand is UTC+7
  const offsetMs = 7 * 60 * 60 * 1000;
  const thai = new Date(now.getTime() + offsetMs);
  return thai;
}

function padTwo(n) {
  return String(n).padStart(2, '0');
}

// Format HH:MM from a Date
function toHHMM(date) {
  return `${padTwo(date.getUTCHours())}:${padTwo(date.getUTCMinutes())}`;
}

// Format YYYY-MM-DD from a Date
function toDateStr(date) {
  return `${date.getUTCFullYear()}-${padTwo(date.getUTCMonth() + 1)}-${padTwo(date.getUTCDate())}`;
}

// Add minutes to HH:MM string, return HH:MM
function subtractMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m - minutes;
  const hh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const mm = ((total % 1440) + 1440) % 1440 % 60;
  return `${padTwo(hh)}:${padTwo(mm)}`;
}

async function sendNotification(token, title, body, activityId) {
  const message = {
    token,
    notification: { title, body },
    data: { activity_id: String(activityId) },
    webpush: {
      notification: {
        title,
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200],
        tag: `activity_${activityId}`,
      },
    },
  };
  return admin.messaging().send(message);
}

async function checkAndSendNotifications() {
  if (!firebaseInitialized) return;

  const now = getNowThailand();
  const currentTime = toHHMM(now);
  const today = toDateStr(now);
  const dayOfWeek = now.getUTCDay().toString(); // 0=Sun, 6=Sat

  try {
    // Get all activities that could be notified today
    const activities = query(`
      SELECT * FROM activities
      WHERE start_time IS NOT NULL AND notify_before IS NOT NULL AND (
        (repeat_type = 'none' AND date = ?) OR
        repeat_type = 'daily' OR
        (repeat_type = 'weekly' AND repeat_days LIKE ?)
      )
    `, [today, `%${dayOfWeek}%`]);

    for (const activity of activities) {
      try {
        if (!activity.start_time) continue;
        const notifyAtTime = subtractMinutes(activity.start_time, activity.notify_before || 10);

        // Only fire within the exact minute
        if (notifyAtTime !== currentTime) continue;

        // Check if already sent today
        const alreadySent = queryOne(
          'SELECT id FROM notification_sent WHERE activity_id = ? AND user_id = ? AND date = ?',
          [activity.activity_id, activity.user_id, today]
        );
        if (alreadySent) continue;

        // Get all FCM tokens for this user
        const tokens = query('SELECT token FROM fcm_tokens WHERE user_id = ?', [activity.user_id]);
        if (!tokens.length) continue;

        const title = '⏰ LifeFlow แจ้งเตือน';
        const body = `อีก ${activity.notify_before} นาที: ${activity.title} เวลา ${activity.start_time}`;

        const invalidTokens = [];

        for (const { token } of tokens) {
          try {
            await sendNotification(token, title, body, activity.activity_id);
            console.log(`[Notifications] Sent to user ${activity.user_id} for activity "${activity.title}"`);
          } catch (err) {
            const errCode = err.errorInfo?.code || '';
            if (
              errCode === 'messaging/registration-token-not-registered' ||
              errCode === 'messaging/invalid-registration-token'
            ) {
              invalidTokens.push(token);
            } else {
              console.error(`[Notifications] FCM send error for token ${token.slice(0, 20)}...:`, err.message);
            }
          }
        }

        // Remove invalid tokens
        for (const token of invalidTokens) {
          try {
            run('DELETE FROM fcm_tokens WHERE token = ?', [token]);
            console.log(`[Notifications] Removed invalid token: ${token.slice(0, 20)}...`);
          } catch (e) {
            console.error('[Notifications] Failed to remove invalid token:', e.message);
          }
        }

        // Mark as sent
        try {
          run(
            'INSERT OR IGNORE INTO notification_sent (activity_id, user_id, date) VALUES (?, ?, ?)',
            [activity.activity_id, activity.user_id, today]
          );
        } catch (e) {
          console.error('[Notifications] Failed to mark notification as sent:', e.message);
        }
      } catch (actErr) {
        console.error(`[Notifications] Error processing activity ${activity.activity_id}:`, actErr.message);
      }
    }
  } catch (err) {
    console.error('[Notifications] Cron job error:', err.message);
  }
}

function startNotificationCron() {
  const ready = initFirebase();
  if (!ready) {
    console.warn('[Notifications] Cron job registered but will skip until Firebase is configured.');
  }

  // Run every minute
  cron.schedule('*/1 * * * *', async () => {
    await checkAndSendNotifications();
  });

  console.log('[Notifications] Cron job started (every minute).');
}

module.exports = { startNotificationCron, checkAndSendNotifications };
