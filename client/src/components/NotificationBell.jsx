import React, { useState } from 'react';
import { useNotification } from '../hooks/useNotification';
import './NotificationBell.css';

export default function NotificationBell() {
  const { permission, supported, enabled, enableNotifications, disableNotifications } = useNotification();
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState(false);

  const isOn = enabled && permission === 'granted';

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      if (isOn) {
        await disableNotifications();
      } else {
        await enableNotifications();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return null;
  }

  return (
    <div className="notif-bell-wrapper">
      <button
        className={`notif-bell ${isOn ? 'notif-bell--on' : 'notif-bell--off'} ${loading ? 'notif-bell--loading' : ''}`}
        onClick={handleClick}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        disabled={loading}
        aria-label={isOn ? 'ปิดการแจ้งเตือน' : 'เปิดการแจ้งเตือน'}
      >
        {loading ? (
          <span className="notif-bell__spinner" />
        ) : (
          <span className="notif-bell__icon">{isOn ? '🔔' : '🔕'}</span>
        )}
      </button>
      {tooltip && (
        <div className="notif-bell__tooltip">
          {isOn
            ? 'การแจ้งเตือนเปิดอยู่\nคลิกเพื่อปิด'
            : permission === 'denied'
            ? 'การแจ้งเตือนถูกบล็อก\nกรุณาแก้ไขในตั้งค่าเบราว์เซอร์'
            : 'คลิกเพื่อเปิดการแจ้งเตือน'}
        </div>
      )}
    </div>
  );
}
