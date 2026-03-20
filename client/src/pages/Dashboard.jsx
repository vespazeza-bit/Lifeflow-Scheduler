import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  CheckCircle2, XCircle, Clock, AlertCircle, CalendarDays,
  Plus, TrendingUp, Flame, Target, Bell, Repeat
} from 'lucide-react';
import Modal from '../components/Modal';
import ActivityForm from '../components/ActivityForm';
import { formatDateObj, getLocalToday } from '../utils/dateFormat';
import './Dashboard.css';

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

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = getLocalToday();
  const todayLabel = formatDateObj(new Date());

  const [activities, setActivities] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [actRes, logRes, statRes] = await Promise.all([
        axios.get(`/api/activities?date=${today}`),
        axios.get(`/api/logs?date=${today}`),
        axios.get('/api/stats'),
      ]);
      setActivities(actRes.data);
      setLogs(logRes.data);
      setStats(statRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getLogForActivity = (activityId) => logs.find(l => l.activity_id === activityId);

  const toggleStatus = async (activity) => {
    const log = getLogForActivity(activity.activity_id);
    const newStatus = log?.status === 'completed' ? 'pending' : 'completed';
    try {
      await axios.post('/api/logs', { activity_id: activity.activity_id, date: today, status: newStatus });
      setLogs(prev => {
        const existing = prev.find(l => l.activity_id === activity.activity_id);
        if (existing) return prev.map(l => l.activity_id === activity.activity_id ? { ...l, status: newStatus } : l);
        return [...prev, { activity_id: activity.activity_id, date: today, status: newStatus }];
      });
      if (newStatus === 'completed') toast.success('Activity completed! 🎉');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const completedToday = logs.filter(l => l.status === 'completed').length;
  const totalToday = activities.length;
  const progressPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-greeting">Good {getTimeOfDay()}, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="dash-date">{todayLabel}</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <StatCard icon={Target} label="Total Activities" value={stats.total} color="#6366f1" />
          <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="#22c55e" />
          <StatCard icon={AlertCircle} label="Missed" value={stats.missed} color="#ef4444" />
          <StatCard icon={CalendarDays} label="Today's Tasks" value={totalToday} color="#f59e0b" />
        </div>
      )}

      {/* Today's Progress */}
      <div className="progress-card">
        <div className="progress-header">
          <div className="progress-title">
            <Flame size={18} className="progress-icon" />
            Today's Progress
          </div>
          <span className="progress-pct">{progressPct}%</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="progress-sub">{completedToday} of {totalToday} activities completed</p>
      </div>

      {/* Today's Activities */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Today's Schedule</h2>
          <button className="link-btn" onClick={() => navigate('/schedule')}>View all →</button>
        </div>

        {activities.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={40} />
            <p>No activities scheduled for today</p>
            <button className="btn-new" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Add Activity
            </button>
          </div>
        ) : (
          <div className="dash-schedule-list">
            {activities.map(activity => {
              const log = getLogForActivity(activity.activity_id);
              const status = log?.status || 'pending';
              const statusMap = {
                completed: { cls: 'completed', icon: <CheckCircle2 size={22} />, label: 'Completed' },
                missed:    { cls: 'missed',    icon: <XCircle size={22} />,      label: 'Missed' },
                pending:   { cls: '',           icon: <div className="dash-check-circle" />, label: null },
              };
              const s = statusMap[status] || statusMap.pending;
              return (
                <div key={activity.activity_id} className={`dash-sched-item ${s.cls}`}>
                  {/* Status icon — read only */}
                  <div className={`dash-status-icon status-${status}`}>
                    {s.icon}
                  </div>

                  <div className="dash-sched-info">
                    <div className="dash-sched-title">
                      {activity.title}
                      {s.label && (
                        <span className={`dash-status-badge ${status}`}>{s.label}</span>
                      )}
                    </div>
                    <div className="dash-sched-chips">
                      {activity.start_time && (
                        <span className="dash-chip">
                          <Clock size={12} />
                          {activity.start_time}{activity.end_time ? ` – ${activity.end_time}` : ''}
                        </span>
                      )}
                      {activity.notify_before > 0 && (
                        <span className="dash-chip dash-chip-bell">
                          <Bell size={12} />
                          {activity.notify_before} min
                        </span>
                      )}
                      {activity.repeat_type !== 'none' && (
                        <span className="dash-chip dash-chip-repeat">
                          <Repeat size={12} />
                          {activity.repeat_type === 'daily' ? 'Daily' : 'Weekly'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Activity">
        <ActivityForm
          defaultDate={today}
          onSave={() => { setShowCreate(false); loadData(); }}
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
