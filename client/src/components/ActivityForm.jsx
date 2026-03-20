import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ThaiDateTimePicker from './ThaiDateTimePicker';
import './ActivityForm.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// combine date + time into datetime-local string
function toDatetimeLocal(date, time) {
  if (!date) return '';
  if (!time) return date + 'T00:00';
  return `${date}T${time}`;
}

// extract date and time from datetime-local string
function fromDatetimeLocal(dt) {
  if (!dt) return { date: '', time: '' };
  const [date, time] = dt.split('T');
  return { date, time: time ? time.slice(0, 5) : '' };
}

export default function ActivityForm({ activity, defaultDate, onSave, onCancel }) {
  const today = defaultDate || new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    title: '',
    start_datetime: today + 'T00:00',
    end_datetime: today + 'T01:00',
    notify_before: 10,
    repeat_type: 'none',
    repeat_days: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activity) {
      const date = activity.date || defaultDate || today;
      setForm({
        title: activity.title || '',
        start_datetime: toDatetimeLocal(date, activity.start_time),
        end_datetime: toDatetimeLocal(date, activity.end_time),
        notify_before: activity.notify_before || 10,
        repeat_type: activity.repeat_type || 'none',
        repeat_days: activity.repeat_days ? JSON.parse(activity.repeat_days) : [],
      });
    }
  }, [activity]);

  const toggleDay = (dayIndex) => {
    setForm(f => ({
      ...f,
      repeat_days: f.repeat_days.includes(dayIndex)
        ? f.repeat_days.filter(d => d !== dayIndex)
        : [...f.repeat_days, dayIndex]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setLoading(true);
    try {
      const startParts = fromDatetimeLocal(form.start_datetime);
      const endParts = fromDatetimeLocal(form.end_datetime);
      const payload = {
        title: form.title,
        date: startParts.date,
        start_time: startParts.time,
        end_time: endParts.time,
        notify_before: form.notify_before,
        repeat_type: form.repeat_type,
        repeat_days: form.repeat_days,
      };
      if (activity) {
        await axios.put(`/api/activities/${activity.activity_id}`, payload);
        toast.success('Activity updated!');
      } else {
        await axios.post('/api/activities', payload);
        toast.success('Activity created!');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="activity-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Title *</label>
        <input
          type="text"
          placeholder="e.g. Morning Workout"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          required
        />
      </div>

      <div className="form-row">
        <ThaiDateTimePicker
          label="Start Date"
          value={form.start_datetime}
          onChange={v => setForm(f => ({ ...f, start_datetime: v }))}
        />
        <ThaiDateTimePicker
          label="End Date"
          value={form.end_datetime}
          onChange={v => setForm(f => ({ ...f, end_datetime: v }))}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Notify Before (min)</label>
          <input
            type="number" min="0" max="1440"
            value={form.notify_before}
            onChange={e => setForm(f => ({ ...f, notify_before: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Repeat</label>
        <select value={form.repeat_type} onChange={e => setForm(f => ({ ...f, repeat_type: e.target.value }))}>
          <option value="none">No repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly (select days)</option>
        </select>
      </div>

      {form.repeat_type === 'weekly' && (
        <div className="form-group">
          <label>Repeat Days</label>
          <div className="day-picker">
            {DAYS.map((day, i) => (
              <button
                key={i} type="button"
                className={`day-btn ${form.repeat_days.includes(i) ? 'selected' : ''}`}
                onClick={() => toggleDay(i)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : activity ? 'Update Activity' : 'Create Activity'}
        </button>
      </div>
    </form>
  );
}
