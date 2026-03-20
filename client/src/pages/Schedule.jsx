import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, addDays, subDays, startOfWeek, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, XCircle, Clock, Trash2, Edit2, Bell, Repeat } from 'lucide-react';
import Modal from '../components/Modal';
import ActivityForm from '../components/ActivityForm';
import { formatDate } from '../utils/dateFormat';
import './Schedule.css';

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activities, setActivities] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [missedModal, setMissedModal] = useState(null); // { activity }
  const [missedReason, setMissedReason] = useState('');

  // Generate week days
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
    } catch {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const getLog = (id) => logs.find(l => l.activity_id === id);

  // Status cycle: pending → completed → missed → pending
  const nextStatus = (current) => {
    if (!current || current === 'pending') return 'completed';
    if (current === 'completed') return 'missed';
    return 'pending';
  };

  const cycleStatus = async (activity) => {
    const log = getLog(activity.activity_id);
    const newStatus = nextStatus(log?.status);
    // If going to missed → open reason modal first
    if (newStatus === 'missed') {
      setMissedReason('');
      setMissedModal(activity);
      return;
    }
    await applyStatus(activity, newStatus, '');
  };

  const applyStatus = async (activity, newStatus, reason) => {
    try {
      const res = await axios.post('/api/logs', {
        activity_id: activity.activity_id,
        date: selectedDate,
        status: newStatus,
        reason: reason || null,
      });
      setLogs(prev => {
        const existing = prev.find(l => l.activity_id === activity.activity_id);
        if (existing) return prev.map(l => l.activity_id === activity.activity_id ? { ...l, status: newStatus, reason } : l);
        return [...prev, { ...res.data, reason }];
      });
      if (newStatus === 'completed') toast.success('Completed! 🎉');
      if (newStatus === 'missed') toast.error('Marked as Missed');
      if (newStatus === 'pending') toast('Reset to Pending');
    } catch { toast.error('Failed to update'); }
  };

  const confirmMissed = async () => {
    if (missedModal) {
      await applyStatus(missedModal, 'missed', missedReason);
      setMissedModal(null);
      setMissedReason('');
    }
  };

  const deleteActivity = async (id) => {
    if (!confirm('Delete this activity?')) return;
    try {
      await axios.delete(`/api/activities/${id}`);
      setActivities(prev => prev.filter(a => a.activity_id !== id));
      toast.success('Activity deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const grouped = activities.reduce((acc, a) => {
    const hour = a.start_time ? a.start_time.split(':')[0] : 'unscheduled';
    if (!acc[hour]) acc[hour] = [];
    acc[hour].push(a);
    return acc;
  }, {});

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'unscheduled') return 1;
    if (b === 'unscheduled') return -1;
    return parseInt(a) - parseInt(b);
  });

  return (
    <div className="schedule-page">
      {/* Header */}
      <div className="sched-header">
        <h1 className="page-title">Schedule</h1>
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
            const isToday = day === format(new Date(), 'yyyy-MM-dd');
            const isSelected = day === selectedDate;
            return (
              <button
                key={day}
                className={`week-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
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

      <div className="selected-date-label">
        {formatDate(selectedDate)}
        {activities.length > 0 && (
          <span className="date-activity-count">{activities.length} activities</span>
        )}
      </div>

      {/* Activities */}
      {loading ? (
        <div className="loading">Loading...</div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <Clock size={40} />
          <p>No activities for this day</p>
          <button className="btn-new" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Add Activity
          </button>
        </div>
      ) : (
        <div className="timeline">
          {sortedKeys.map(hour => (
            <div key={hour} className="timeline-group">
              <div className="timeline-hour">
                {hour === 'unscheduled' ? 'Unscheduled' : `${hour.padStart(2, '0')}:00`}
              </div>
              <div className="timeline-items">
                {grouped[hour].map(activity => {
                  const log = getLog(activity.activity_id);
                  const status = log?.status || 'pending';
                  const statusMap = {
                    completed: { cls: 'completed', icon: <CheckCircle2 size={22} />, label: 'Completed', title: 'Click → Missed' },
                    missed:    { cls: 'missed',    icon: <XCircle size={22} />,      label: 'Missed',    title: 'Click → Pending' },
                    pending:   { cls: '',           icon: <div className="check-circle" />, label: 'Pending', title: 'Click → Completed' },
                  };
                  const s = statusMap[status] || statusMap.pending;
                  return (
                    <div key={activity.activity_id} className={`timeline-item ${s.cls}`}>
                      <button
                        className={`check-btn status-${status}`}
                        onClick={() => cycleStatus(activity)}
                        title={s.title}
                      >
                        {s.icon}
                      </button>
                      <div className="timeline-info">
                        <div className="timeline-title">
                          {activity.title}
                          {status !== 'pending' && (
                            <span className={`status-badge ${status}`}>{s.label}</span>
                          )}
                        </div>
                        <div className="timeline-chips">
                          {activity.start_time && (
                            <span className="tl-chip">
                              <Clock size={12} />
                              {activity.start_time}{activity.end_time ? ` – ${activity.end_time}` : ''}
                            </span>
                          )}
                          {activity.notify_before > 0 && (
                            <span className="tl-chip tl-chip-bell">
                              <Bell size={12} />
                              {activity.notify_before} min
                            </span>
                          )}
                          {activity.repeat_type !== 'none' && (
                            <span className="tl-chip tl-chip-repeat">
                              <Repeat size={12} />
                              {activity.repeat_type === 'daily' ? 'Daily' : 'Weekly'}
                            </span>
                          )}
                        </div>
                        {status === 'missed' && log?.reason && (
                          <div className="missed-reason">
                            <span className="missed-reason-label">เหตุผล:</span> {log.reason}
                          </div>
                        )}
                      </div>
                      <div className="item-actions">
                        <button className="icon-btn edit" onClick={() => setEditActivity(activity)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="icon-btn del" onClick={() => deleteActivity(activity.activity_id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Activity">
        <ActivityForm
          defaultDate={selectedDate}
          onSave={() => { setShowCreate(false); loadData(); }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal isOpen={!!editActivity} onClose={() => setEditActivity(null)} title="Edit Activity">
        <ActivityForm
          activity={editActivity}
          defaultDate={selectedDate}
          onSave={() => { setEditActivity(null); loadData(); }}
          onCancel={() => setEditActivity(null)}
        />
      </Modal>

      {/* Missed Reason Modal */}
      <Modal isOpen={!!missedModal} onClose={() => setMissedModal(null)} title="Mark as Missed">
        <div className="missed-modal-body">
          <div className="missed-modal-activity">
            <XCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span>{missedModal?.title}</span>
          </div>
          <div className="form-group">
            <label>เหตุผลที่ไม่สามารถทำได้ <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(ไม่บังคับ)</span></label>
            <textarea
              rows={3}
              placeholder="เช่น ติดประชุม, ลืม, ไม่สบาย..."
              value={missedReason}
              onChange={e => setMissedReason(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.ctrlKey && confirmMissed()}
              autoFocus
            />
          </div>
          <div className="missed-modal-actions">
            <button className="btn-cancel" onClick={() => setMissedModal(null)}>ยกเลิก</button>
            <button className="btn-missed" onClick={confirmMissed}>
              <XCircle size={16} /> บันทึก Missed
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
