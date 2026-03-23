import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  CheckCircle2, XCircle, Clock, AlertCircle, CalendarDays,
  Plus, TrendingUp, Flame, Target, BarChart3, ChevronLeft, ChevronRight
} from 'lucide-react';
import Modal from '../components/Modal';
import ActivityForm from '../components/ActivityForm';
import { formatDateObj, getLocalToday, formatDate } from '../utils/dateFormat';
import './Dashboard.css';
import './Stats.css';

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="stat-card" style={{ '--accent': color }}>
      <div className="stat-icon"><Icon size={22} /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

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

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = getLocalToday();
  const todayLabel = formatDateObj(new Date());
  const now = new Date();

  const [stats, setStats] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const monthStr = `${viewMonth.year}-${String(viewMonth.month).padStart(2, '0')}`;

  useEffect(() => { loadStats(); }, [monthStr]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/stats?month=${monthStr}`);
      setStats(res.data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => setViewMonth(v =>
    v.month === 1 ? { year: v.year - 1, month: 12 } : { ...v, month: v.month - 1 }
  );
  const nextMonth = () => setViewMonth(v =>
    v.month === 12 ? { year: v.year + 1, month: 1 } : { ...v, month: v.month + 1 }
  );

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const todayData = stats?.today || { total: 0, completed: 0, date: today };
  const todayRate = todayData.total > 0 ? Math.round((todayData.completed / todayData.total) * 100) : 0;
  const todayPending = todayData.total - todayData.completed;

  const monthly = stats?.monthly || { total: 0, completed: 0, rate: 0, data: [], logs: [] };
  const monthlyData = monthly.data || [];
  const maxBar = Math.max(...monthlyData.map(d => d.total), 1);
  const isCurrentMonth = viewMonth.year === now.getFullYear() && viewMonth.month === now.getMonth() + 1;

  const byStatus = (monthly.logs || []).reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  const missedLogs = (monthly.logs || []).filter(l => l.status === 'missed');

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-greeting">Good {getTimeOfDay()}, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="dash-date">{todayLabel}</p>
        </div>
      </div>

      {/* Overall Stats */}
      {stats && (
        <div className="stats-grid">
          <StatCard icon={Target}      label="Total Activities" value={stats.total}     color="#6366f1" />
          <StatCard icon={CheckCircle2} label="Completed"        value={stats.completed} color="#22c55e" />
          <StatCard icon={AlertCircle}  label="Missed"           value={stats.missed}    color="#ef4444" />
          <StatCard icon={CalendarDays} label="Today's Tasks"    value={todayData.total} color="#f59e0b" />
        </div>
      )}

      {/* Today's Progress bar */}
      <div className="progress-card">
        <div className="progress-header">
          <div className="progress-title">
            <Flame size={18} className="progress-icon" />
            Today's Progress
          </div>
          <span className="progress-pct">{todayRate}%</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${todayRate}%` }} />
        </div>
        <p className="progress-sub">{todayData.completed} of {todayData.total} activities completed</p>
      </div>

      {/* Today Detail */}
      <div className="stats-section">
        <div className="section-label">
          <Flame size={16} className="icon-orange" />
          Today — {formatDate(todayData.date)}
        </div>
        <div className="today-grid">
          <div className="today-ring-card">
            {ring(todayRate, todayRate >= 70 ? '#22c55e' : todayRate >= 40 ? '#f59e0b' : '#ef4444')}
            <div className="ring-label">Completion Rate</div>
          </div>
          <div className="today-stats">
            <div className="tstat-item">
              <div className="tstat-icon green"><CheckCircle2 size={18} /></div>
              <div>
                <div className="tstat-val">{todayData.completed}</div>
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
                <div className="tstat-val">{todayData.total}</div>
                <div className="tstat-lbl">Total Today</div>
              </div>
            </div>
          </div>
          <div className="today-progress-card">
            <div className="tp-label">Today's Progress</div>
            <div className="tp-bar-bg">
              <div className="tp-bar-fill" style={{
                width: `${todayRate}%`,
                background: todayRate >= 70 ? '#22c55e' : todayRate >= 40 ? '#f59e0b' : '#ef4444'
              }} />
            </div>
            <div className="tp-sub">{todayData.completed} of {todayData.total} activities done</div>
          </div>
        </div>
      </div>

      {/* Monthly Overview */}
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

        {/* Daily Activity Chart */}
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

        {/* Status Breakdown */}
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

        {/* Missed Activities */}
        {missedLogs.length > 0 && (
          <div className="recent-card">
            <div className="section-label" style={{ marginBottom: '1rem' }}>Missed Activities</div>
            <div className="log-table">
              <div className="log-header">
                <span>Activity</span>
                <span>Date</span>
                <span>Reason</span>
                <span>Status</span>
              </div>
              {missedLogs.map((log, i) => (
                <div key={i} className="log-row">
                  <span className="log-title">{log.title}</span>
                  <span className="log-date">{formatDate(log.date)}</span>
                  <span className="log-reason">{log.reason || <span className="log-no-reason">—</span>}</span>
                  <span className={`log-status ${log.status}`}>{log.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Activity">
        <ActivityForm
          defaultDate={today}
          onSave={() => { setShowCreate(false); loadStats(); }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
