import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// ⚠️ กรอก Firebase Web App config ของคุณที่นี่
// วิธีได้มา: Firebase Console → Project Settings → Your apps → Web app
const firebaseConfig = {
  apiKey: "AIzaSyAw3unwH18gIsom6hFcR2HnYs01OWlQX5k",
  authDomain: "lifeflow-scheduler.firebaseapp.com",
  projectId: "lifeflow-scheduler",
  storageBucket: "lifeflow-scheduler.firebasestorage.app",
  messagingSenderId: "142572090913",
  appId: "1:142572090913:web:ce65a4417469d943f25560"
};

// ⚠️ กรอก VAPID Key ของคุณที่นี่
// วิธีได้มา: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
const VAPID_KEY = "BIMgtJ8_WYogSbKgFeajh0f0tzJeuR_V7yZjFJPp57-XNwZMFyflqcDVJj7x7c4c5mcf164o0VX1S_O24Qxqib4";

const app = initializeApp(firebaseConfig);

let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  // Not supported (HTTP non-localhost)
}

export { messaging, getToken, onMessage, VAPID_KEY };
