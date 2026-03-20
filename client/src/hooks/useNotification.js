import { useState, useEffect, useCallback } from 'react';
import { messaging, getToken, onMessage, VAPID_KEY } from '../firebase';

const API_BASE = 'http://localhost:5001';

function isFirebaseConfigured() {
  return VAPID_KEY !== 'YOUR_VAPID_KEY' && messaging !== null;
}

export function useNotification() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [supported, setSupported] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isSupported =
      typeof Notification !== 'undefined' &&
      'serviceWorker' in navigator &&
      isFirebaseConfigured();
setSupported(isSupported);

    if (isSupported && Notification.permission === 'granted') {
      // Try to get existing token silently
      getAndRegisterToken().catch(() => {});
    }
  }, []);

  // Listen for foreground messages
  useEffect(() => {
    if (!supported) return;
    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {};
        if (title && Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icon.png',
            badge: '/icon.png',
            tag: payload.data?.activity_id || 'lifeflow',
          });
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('[useNotification] onMessage error:', err.message);
    }
  }, [supported]);

  async function getAndRegisterToken() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      if (!token) return null;

      const authToken = localStorage.getItem('token');
      if (authToken) {
        await fetch(`${API_BASE}/api/fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token }),
        });
      }

      setFcmToken(token);
      setEnabled(true);
      return token;
    } catch (err) {
      console.error('[useNotification] getAndRegisterToken error:', err.message);
      return null;
    }
  }

  const enableNotifications = useCallback(async () => {
    if (!supported) {
      alert('เบราว์เซอร์นี้ไม่รองรับ Push Notifications หรือยังไม่ได้ตั้งค่า Firebase');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        alert('กรุณาอนุญาต Notifications ในการตั้งค่าเบราว์เซอร์');
        return false;
      }

      const token = await getAndRegisterToken();
      return !!token;
    } catch (err) {
      console.error('[useNotification] enableNotifications error:', err.message);
      return false;
    }
  }, [supported]);

  const disableNotifications = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('token');
      if (authToken && fcmToken) {
        await fetch(`${API_BASE}/api/fcm-token`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token: fcmToken }),
        });
      }
      setFcmToken(null);
      setEnabled(false);
    } catch (err) {
      console.error('[useNotification] disableNotifications error:', err.message);
    }
  }, [fcmToken]);

  return {
    permission,
    supported,
    enabled,
    enableNotifications,
    disableNotifications,
  };
}
