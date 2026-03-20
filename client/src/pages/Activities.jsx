import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format, addDays, subDays, startOfWeek, parseISO } from 'date-fns';
import { Plus, Search, Edit2, Trash2, Clock, Repeat, Calendar, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import Modal from '../components/Modal';
import ActivityForm from '../components/ActivityForm';
import { formatDate, getLocalToday } from '../utils/dateFormat';
import './Activities.css';

export default function Activities() {
  const todayStr = getLocalToday();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [activities, setActivities] = useState([]);
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editActivity, setEditActivity] = useState(null);

  // Week strip
  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [actRes, logRes] = await Promise.all([
        axios.get(`/api/activities?date=${selectedDate}`),
        axios.get(`/api/logs?date=${selectedDate}`),
      ]);
      setActivities(actRes.data);
      setLogs(logRes.data);
    } catch { toast.error('Failed to load activities'); }
    finally { setLoading(false); }
  };

  const getLog = (id) => logs.find(l => l.activity_id === id);

  const toggleStatus = async (activity) => {
    const log = getLog(activity.activity_id);
    const newStatus = log?.status === 'completed' ? 'pending' : 'completed';
    try {
      await axios.post('/api/logs', { activity_id: activity.activity_id, date: selectedDate, status: newStatus });
      setLogs(prev => {
        const ex = prev.find(l => l.activity_id === activity.activity_id);
        if (ex) return prev.map(l => l.activity_id === activity.activity_id ? { ...l, status: newStatus } : l);
        return [...prev, { activity_id: activity.activity_id, date: selectedDate, status: newStatus }];
      });
      if (newStatus === 'completed') toast.success('เสร็จแล้ว! 🎉');
    } catch { toast.error('Failed to update status'); }
  };

  const deleteActivity = async (id) => {
    if (!confirm('ลบกิจกรรมนี้?')) return;
    try {
      await axios.delete(`/api/activities/${id}`);
      setActivities(prev => prev.filter(a => a.activity_id !== id));
      toast.success('ลบกิจกรรมแล้ว');
    } catch { toast.error('Failed to delete'); }
  };

  const repeatLabel = (a) => {
    if (a.repeat_type === 'daily') return 'Daily';
    if (a.repeat_type === 'weekly') {
      const days = a.repeat_days ? JSON.parse(a.repeat_days) : [];
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days.map(d => names[d]).join(', ');
    }
    return null;
  };

  const filtered = search
    ? activities.filter(a => a.title.toLowerCase().includes(search.toLowerCase()))
    : activities;

  const isToday = selectedDate === todayStr;

  return (
    <div className="activities-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity</h1>
          <p className="page-sub">
            {isToday ? 'Today — ' : ''}{formatDate(selectedDate)}
            {' · '}{filtered.length} Order
          </p>
        </div>
        <button className="btn-new" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Add Activity
        </button>
      </div>

      {/* Week strip */}
      <div className="week-nav">
        <button className="nav-arrow" onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 7), 'yyyy-MM-dd'))}>
          <ChevronLeft size={18} />
        </button>
        <div className="week-days">
          {weekDays.map(day => {
            const d = parseISO(day);
            const isTodayDay = day === todayStr;
            const isSelected = day === selectedDate;
            return (
              <button
                key={day}
                className={`week-day ${isSelected ? 'selected' : ''} ${isTodayDay ? 'today' : ''}`}
                onClick={() => setSelectedDate(day)}
              >
                <span className="week-day-label">{format(d, 'EEE')}</span>
                <span className="week-day-num">{format(d, 'd')}</span>
              </button>
            );
          })}
        </div>
        <button className="nav-arrow" onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 7), 'yyyy-MM-dd'))}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="search-box">
        <Search size={16} className="search-icon" />
        <input
          type="text" placeholder="Search for activities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Activity list */}
      {loading ? (
        <div className="loading">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Calendar size={40} />
          <p>{search ? 'No activities match your search.' : 'There are no events for the day.'}</p>
          {!search && (
            <button className="btn-new" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Add Activity
            </button>
          )}
        </div>
      ) : (
        <div className="act-list">
          {filtered.map(activity => {
            const log = getLog(activity.activity_id);
            const isDone = log?.status === 'completed';
            const label = repeatLabel(activity);
            return (
              <div key={activity.activity_id} className={`act-row ${isDone ? 'done' : ''}`}>
                {/* Check button */}
                <button
                  className={`check-btn ${isDone ? 'checked' : ''}`}
                  onClick={() => toggleStatus(activity)}
                  title={isDone ? 'Click to undo' : 'Mark as done'}
                >
                  {isDone
                    ? <CheckCircle2 size={24} strokeWidth={2.5} />
                    : <div className="check-circle" />
                  }
                </button>

                {/* Info */}
                <div className="act-info">
                  <div className="act-title-row">
                    <div className="act-title">{activity.title}</div>
                    {isDone && <span className="done-badge">✓ Done</span>}
                  </div>
                  <div className="act-meta">
                    {activity.start_time && (
                      <span className="meta-chip">
                        <Clock size={12} />
                        {activity.start_time}{activity.end_time ? ` – ${activity.end_time}` : ''}
                      </span>
                    )}
                    {label && (
                      <span className="meta-chip repeat-chip">
                        <Repeat size={12} />
                        {label}
                      </span>
                    )}
                    {activity.notify_before > 0 && (
                      <span className="meta-chip">🔔 {activity.notify_before} นาที</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="act-actions">
                  <button className="icon-btn edit" onClick={() => setEditActivity(activity)} title="แก้ไข">
                    <Edit2 size={15} />
                  </button>
                  <button className="icon-btn del" onClick={() => deleteActivity(activity.activity_id)} title="ลบ">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Activity">
        <ActivityForm
          defaultDate={selectedDate}
          onSave={() => { setShowCreate(false); loadData(); }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal isOpen={!!editActivity} onClose={() => setEditActivity(null)} title="แก้ไขกิจกรรม">
        <ActivityForm
          activity={editActivity}
          onSave={() => { setEditActivity(null); loadData(); }}
          onCancel={() => setEditActivity(null)}
        />
      </Modal>
    </div>
  );
}
