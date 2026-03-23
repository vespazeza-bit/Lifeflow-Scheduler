import React, { useState, useEffect, useRef } from 'react';
import './ThaiDateTimePicker.css';

const THAI_MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const THAI_DAYS_SHORT = ['อา','จ','อ','พ','พฤ','ศ','ส'];

// Convert AD year to BE (พ.ศ.)
const toBE = (year) => year + 543;
const toAD = (beYear) => beYear - 543;

// Format display: dd/mm/yyyy (BE)
function formatThai(dateStr, timeStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const be = parseInt(y) + 543;
  const time = timeStr ? ` ${timeStr}` : '';
  return `${d}/${m}/${be}${time}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// Clock face drawing
function ClockFace({ hours, minutes, seconds }) {
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  const toRad = (deg) => (deg - 90) * (Math.PI / 180);
  const handCoords = (angleDeg, len) => ({
    x: cx + len * Math.cos(toRad(angleDeg)),
    y: cy + len * Math.sin(toRad(angleDeg)),
  });

  const secAngle = seconds * 6;
  const minAngle = minutes * 6 + seconds * 0.1;
  const hrAngle = (hours % 12) * 30 + minutes * 0.5;

  const hPt = handCoords(hrAngle, r * 0.5);
  const mPt = handCoords(minAngle, r * 0.72);
  const sPt = handCoords(secAngle, r * 0.82);

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = toRad(i * 30);
    const inner = r * 0.85;
    const outer = r;
    return {
      x1: cx + inner * Math.cos(angle),
      y1: cy + inner * Math.sin(angle),
      x2: cx + outer * Math.cos(angle),
      y2: cy + outer * Math.sin(angle),
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="white" stroke="#ccc" strokeWidth="2" />
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#999" strokeWidth="1.5" />
      ))}
      {/* Hour hand */}
      <line x1={cx} y1={cy} x2={hPt.x} y2={hPt.y} stroke="#333" strokeWidth="3" strokeLinecap="round" />
      {/* Minute hand */}
      <line x1={cx} y1={cy} x2={mPt.x} y2={mPt.y} stroke="#333" strokeWidth="2" strokeLinecap="round" />
      {/* Second hand */}
      <line x1={cx} y1={cy} x2={sPt.x} y2={sPt.y} stroke="#e55" strokeWidth="1" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={2} fill="#333" />
    </svg>
  );
}

export default function ThaiDateTimePicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState({});
  const ref = useRef(null);

  const calcPopupPosition = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const popupHeight = 340; // estimated popup height
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
      // open upward
      setPopupStyle({ bottom: window.innerHeight - rect.top + 6, left: rect.left, top: 'auto' });
    } else {
      // open downward
      setPopupStyle({ top: rect.bottom + 6, left: rect.left, bottom: 'auto' });
    }
  };

  // Parse current value (format: "yyyy-MM-ddTHH:mm")
  const parseValue = (v) => {
    if (!v) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        day: now.getDate(),
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: 0,
      };
    }
    const [datePart, timePart] = v.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = (timePart || '00:00').split(':').map(Number);
    return { year: y, month: m - 1, day: d, hours: hh, minutes: mm, seconds: 0 };
  };

  const parsed = parseValue(value);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);
  const [selDay, setSelDay] = useState(parsed.day);
  const [selYear, setSelYear] = useState(parsed.year);
  const [selMonth, setSelMonth] = useState(parsed.month);
  const [hours, setHours] = useState(parsed.hours);
  const [minutes, setMinutes] = useState(parsed.minutes);
  const [seconds, setSeconds] = useState(0);

  // Keep internal state in sync when value prop changes
  useEffect(() => {
    const p = parseValue(value);
    setViewYear(p.year); setViewMonth(p.month);
    setSelDay(p.day); setSelYear(p.year); setSelMonth(p.month);
    setHours(p.hours); setMinutes(p.minutes);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buildValue = (y, mo, d, h, mi) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${y}-${pad(mo + 1)}-${pad(d)}T${pad(h)}:${pad(mi)}`;
  };

  const handleDayClick = (day, yr, mo) => {
    setSelDay(day); setSelYear(yr); setSelMonth(mo);
  };

  const handleNow = () => {
    const now = new Date();
    setViewYear(now.getFullYear()); setViewMonth(now.getMonth());
    setSelDay(now.getDate()); setSelYear(now.getFullYear()); setSelMonth(now.getMonth());
    setHours(now.getHours()); setMinutes(now.getMinutes()); setSeconds(now.getSeconds());
  };

  const handleClear = () => { onChange(''); setOpen(false); };

  const handleOk = () => {
    onChange(buildValue(selYear, selMonth, selDay, hours, minutes));
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells = [];
  // prev month padding
  const prevDays = getDaysInMonth(viewYear, viewMonth - 1 < 0 ? 11 : viewMonth - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, month: viewMonth - 1 < 0 ? 11 : viewMonth - 1, year: viewMonth - 1 < 0 ? viewYear - 1 : viewYear, other: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: viewMonth, year: viewYear, other: false });
  }
  // next month padding
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, month: viewMonth + 1 > 11 ? 0 : viewMonth + 1, year: viewMonth + 1 > 11 ? viewYear + 1 : viewYear, other: true });
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const selStr = `${selYear}-${selMonth}-${selDay}`;

  const displayText = value ? formatThai(value.split('T')[0], value.split('T')[1]?.slice(0, 5)) : '';

  return (
    <div className="tdtp-wrapper" ref={ref}>
      {label && <label className="tdtp-label">{label}</label>}
      <div className="tdtp-input" onClick={() => { calcPopupPosition(); setOpen(o => !o); }}>
        <span className="tdtp-input-icon">📅</span>
        <span className={displayText ? '' : 'tdtp-placeholder'}>
          {displayText || 'เลือกวันที่และเวลา'}
        </span>
      </div>

      {open && (
        <div className="tdtp-popup" style={popupStyle}>
          {/* Title bar */}
          <div className="tdtp-titlebar">
            {selDay ? formatThai(`${selYear}-${String(selMonth+1).padStart(2,'0')}-${String(selDay).padStart(2,'0')}`, `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`) : ''}
          </div>

          <div className="tdtp-body">
            {/* Left: Calendar */}
            <div className="tdtp-cal">
              {/* Month nav */}
              <div className="tdtp-nav">
                <div className="tdtp-nav-row">
                  <button type="button" onClick={prevMonth}>◄</button>
                  <span className="tdtp-month-label">{THAI_MONTHS[viewMonth]}</span>
                  <button type="button" onClick={nextMonth}>►</button>
                  <button type="button" onClick={() => setViewYear(y => y - 1)}>◄</button>
                </div>
                <div className="tdtp-nav-row">
                  <span className="tdtp-year-label">{toBE(viewYear)}</span>
                  <button type="button" onClick={() => setViewYear(y => y + 1)}>►</button>
                </div>
              </div>

              {/* Day headers */}
              <div className="tdtp-grid">
                {THAI_DAYS_SHORT.map(d => (
                  <div key={d} className="tdtp-dayname">{d}</div>
                ))}
                {cells.map((cell, i) => {
                  const cellStr = `${cell.year}-${cell.month}-${cell.day}`;
                  const isToday = cellStr === todayStr && !cell.other;
                  const isSel = cellStr === selStr;
                  return (
                    <div
                      key={i}
                      className={`tdtp-cell ${cell.other ? 'other' : ''} ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`}
                      onClick={() => handleDayClick(cell.day, cell.year, cell.month)}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Clock */}
            <div className="tdtp-clock-panel">
              <ClockFace hours={hours} minutes={minutes} seconds={seconds} />
              <div className="tdtp-time-inputs">
                <input
                  type="number" min="0" max="23"
                  value={String(hours).padStart(2, '0')}
                  onChange={e => setHours(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                />
                <span>:</span>
                <input
                  type="number" min="0" max="59"
                  value={String(minutes).padStart(2, '0')}
                  onChange={e => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                />
                <span>:</span>
                <input
                  type="number" min="0" max="59"
                  value={String(seconds).padStart(2, '0')}
                  onChange={e => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="tdtp-footer">
            <button type="button" className="tdtp-btn now" onClick={handleNow}>Now</button>
            <button type="button" className="tdtp-btn clear" onClick={handleClear}>Clear</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="tdtp-btn ok" onClick={handleOk}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
