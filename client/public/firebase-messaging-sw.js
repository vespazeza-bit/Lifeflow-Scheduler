importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ⚠️ กรอก Firebase Web App config ของคุณที่นี่ (เหมือนกับใน client/src/firebase.js)
firebase.initializeApp({
  apiKey: "AIzaSyAw3unwH18gIsom6hFcR2HnYs01OWlQX5k",
  authDomain: "lifeflow-scheduler.firebaseapp.com",
  projectId: "lifeflow-scheduler",
  storageBucket: "lifeflow-scheduler.firebasestorage.app",
  messagingSenderId: "142572090913",
  appId: "1:142572090913:web:ce65a4417469d943f25560"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.activity_id || 'lifeflow',
  });
});
