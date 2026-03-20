import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart3, CheckCircle2, XCircle, Clock, TrendingUp, CalendarDays, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { formatDate, getLocalToday } from '../utils/dateFormat';
import './Stats.css';

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function ring(pct, color) {
  const r = 40, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="50" y="55" textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
}

export default function Stats() {
  const now = new Date();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const monthStr = `${viewMonth.year}-${String(viewMonth.month).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/stats?month=${monthStr}`)
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, [monthStr]);

  const prevMonth = () => setViewMonth(v => {
    if (v.month === 1) return { year: v.year - 1, month: 12 };
    return { ...v, month: v.month - 1 };
  });
  const nextMonth = () => setViewMonth(v => {
    if (v.month === 12) return { year: v.year + 1, month: 1 };
    return { ...v, month: v.month + 1 };
  });

  if (loading) return <div className="loading">Loading statistics...</div>;

  const today = stats?.today || { total: 0, completed: 0, date: getLocalToday() };
  const todayRate = today.total > 0 ? Math.round((today.completed / today.total) * 100) : 0;
  const todayPending = today.total - today.completed;

  const monthly = stats?.monthly || { total: 0, completed: 0, rate: 0, data: [], logs: [] };
  const monthlyData = monthly.data || [];
  const maxBar = Math.max(...monthlyData.map(d => d.total), 1);

  const byStatus = (monthly.logs || []).reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  const isCurrentMonth = viewMonth.year === now.getFullYear() && viewMonth.month === now.getMonth() + 1;

  return (
    <div className="stats-page">
      <h1 className="page-title">Statistics</h1>

      {/* ── TODAY SECTION ── */}
      <div className="stats-section">
        <div className="section-label">
          <Flame size={16} className="icon-orange" />
          Today — {formatDate(today.date)}
        </div>

        <div className="today-grid">
          {/* Ring */}
          <div className="today-ring-card">
            {ring(todayRate, todayRate >= 70 ? '#22c55e' : todayRate >= 40 ? '#f59e0b' : '#ef4444')}
            <div className="ring-label">Completion Rate</div>
          </div>

          {/* Today stats */}
          <div className="today-stats">
            <div className="tstat-item">
              <div className="tstat-icon green"><CheckCircle2 size={18} /></div>
              <div>
                <div className="tstat-val">{today.completed}</div>
                <div className="tstat-lbl">Completed</div>
              </div>
            </div>
            <div className="tstat-item">
              <div className="tstat-icon yellow"><Clock size={18} /></div>
              <div>
                <div className="tstat-val">{todayPending}</div>
                <div className="tstat-lbl">Pending</div>
              </div>
            </div>
            <div className="tstat-item">
              <div className="tstat-icon blue"><CalendarDays size={18} /></div>
              <div>
                <div className="tstat-val">{today.total}</div>
                <div className="tstat-lbl">Total Today</div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="today-progress-card">
            <div className="tp-label">Today's Progress</div>
            <div className="tp-bar-bg">
              <div className="tp-bar-fill" style={{
                width: `${todayRate}%`,
                background: todayRate >= 70 ? '#22c55e' : todayRate >= 40 ? '#f59e0b' : '#ef4444'
              }} />
            </div>
            <div className="tp-sub">{today.completed} of {today.total} activities done</div>
          </div>
        </div>
      </div>

      {/* ── MONTHLY SECTION ── */}
      <div className="stats-section">
        <div className="section-label-row">
          <div className="section-label">
            <BarChart3 size={16} className="icon-blue" />
            Monthly Overview
          </div>
          <div className="month-nav">
            <button className="month-arrow" onClick={prevMonth}><ChevronLeft size={16} /></button>
            <span className="month-title">{MONTHS_EN[viewMonth.month - 1]} {viewMonth.year}</span>
            <button className="month-arrow" onClick={nextMonth} disabled={isCurrentMonth}><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Monthly summary cards */}
        <div className="month-summary">
          <div className="mscard blue">
            <div className="mscard-val">{monthly.total}</div>
            <div className="mscard-lbl">Total Logs</div>
          </div>
          <div className="mscard green">
            <div className="mscard-val">{monthly.completed}</div>
            <div className="mscard-lbl">Completed</div>
          </div>
          <div className="mscard red">
            <div className="mscard-val">{monthly.total - monthly.completed}</div>
            <div className="mscard-lbl">Incomplete</div>
          </div>
          <div className="mscard purple">
            <div className="mscard-val">{monthly.rate}%</div>
            <div className="mscard-lbl">Success Rate</div>
          </div>
        </div>

        {/* Bar chart by day */}
        {monthlyData.length > 0 ? (
          <div className="chart-card">
            <div className="section-label" style={{ marginBottom: '1rem' }}>
              <TrendingUp size={15} /> Daily Activity Chart
            </div>
            <div className="bar-chart">
              {monthlyData.map((day, i) => {
                const pct = Math.round((day.total / maxBar) * 100);
                const compPct = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0;
                const dayNum = day.date.split('-')[2];
                return (
                  <div key={i} className="bar-col">
                    <div className="bar-tooltip">
                      <strong>{formatDate(day.date)}</strong><br />
                      Total: {day.total} | Done: {day.completed}
                    </div>
                    <div className="bar-track">
                      <div className="bar-bg" style={{ height: `${pct}%` }}>
                        <div className="bar-done" style={{ height: `${compPct}%` }} />
                      </div>
                    </div>
                    <div className="bar-label">{dayNum}</div>
                  </div>
                );
              })}
            </div>
            <div className="chart-legend">
              <span className="legend-item total">Total</span>
              <span className="legend-item done">Completed</span>
            </div>
          </div>
        ) : (
          <div className="empty-chart">No activity data for {MONTHS_EN[viewMonth.month - 1]} {viewMonth.year}</div>
        )}

        {/* Status breakdown */}
        {monthly.total > 0 && (
          <div className="breakdown-card">
            <div className="section-label" style={{ marginBottom: '1rem' }}>Status Breakdown</div>
            <div className="breakdown-list">
              {[
                { key: 'completed', label: 'Completed', color: '#22c55e', icon: CheckCircle2 },
                { key: 'missed',    label: 'Missed',    color: '#ef4444', icon: XCircle },
                { key: 'pending',   label: 'Pending',   color: '#f59e0b', icon: Clock },
              ].map(({ key, label, color, icon: Icon }) => {
                const count = byStatus[key] || 0;
                const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key} className="breakdown-item">
                    <Icon size={16} style={{ color, flexShrink: 0 }} />
                    <span className="breakdown-label">{label}</span>
                    <div className="breakdown-bar-track">
                      <div className="breakdown-bar" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="breakdown-count">{count}</span>
                    <span className="breakdown-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent logs */}
        {monthly.logs?.length > 0 && (
          <div className="recent-card">
            <div className="section-label" style={{ marginBottom: '1rem' }}>Recent Log Entries</div>
            <div className="log-table">
              <div className="log-header">
                <span>Activity</span>
                <span>Date</span>
                <span>Status</span>
              </div>
              {monthly.logs.map((log, i) => (
                <div key={i} className="log-row">
                  <span className="log-title">{log.title}</span>
                  <span className="log-date">{formatDate(log.date)}</span>
                  <span className={`log-status ${log.status}`}>{log.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
