import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Trash2, BookTemplate, Play, X, Clock } from 'lucide-react';
import Modal from '../components/Modal';
import ThaiDateTimePicker from '../components/ThaiDateTimePicker';
import { getLocalToday, formatDate } from '../utils/dateFormat';
import './Templates.css';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [applyTemplate, setApplyTemplate] = useState(null);
  const [applyDatetime, setApplyDatetime] = useState(getLocalToday() + 'T00:00');
  const [newTemplate, setNewTemplate] = useState({ name: '', items: [] });
  const [newItem, setNewItem] = useState({ activity_name: '', time: '', time_dt: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/templates');
      setTemplates(res.data);
    } catch { toast.error('Failed to load templates'); }
    finally { setLoading(false); }
  };

  const addItem = () => {
    if (!newItem.activity_name.trim()) { toast.error('กรุณากรอกชื่อกิจกรรม'); return; }
    // extract time part from datetime-local value
    const time = newItem.time_dt ? newItem.time_dt.split('T')[1]?.slice(0, 5) : '';
    setNewTemplate(t => ({ ...t, items: [...t.items, { activity_name: newItem.activity_name, time }] }));
    setNewItem({ activity_name: '', time: '', time_dt: '' });
  };

  const removeItem = (index) => {
    setNewTemplate(t => ({ ...t, items: t.items.filter((_, i) => i !== index) }));
  };

  const saveTemplate = async () => {
    if (!newTemplate.name.trim()) { toast.error('Template name is required'); return; }
    if (newTemplate.items.length === 0) { toast.error('Add at least one activity'); return; }
    setSaving(true);
    try {
      await axios.post('/api/templates', newTemplate);
      toast.success('Template created!');
      setShowCreate(false);
      setNewTemplate({ name: '', items: [] });
      loadTemplates();
    } catch { toast.error('Failed to create template'); }
    finally { setSaving(false); }
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await axios.delete(`/api/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.template_id !== id));
      toast.success('Template deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleApply = async () => {
    const applyDate = applyDatetime ? applyDatetime.split('T')[0] : '';
    if (!applyDate) { toast.error('กรุณาเลือกวันที่'); return; }
    try {
      const res = await axios.post(`/api/templates/${applyTemplate.template_id}/apply`, { date: applyDate });
      toast.success(res.data.message);
      setApplyTemplate(null);
    } catch { toast.error('Failed to apply template'); }
  };

  return (
    <div className="templates-page">
      <div className="page-header">
        <h1 className="page-title">Templates</h1>
        <button className="btn-new" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> New Template
        </button>
      </div>

      <p className="page-desc">
        Create reusable activity templates and apply them to any day to quickly populate your schedule.
      </p>

      {loading ? (
        <div className="loading">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <BookTemplate size={40} />
          <p>No templates yet. Create one to get started!</p>
          <button className="btn-new" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Template
          </button>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map(template => (
            <div key={template.template_id} className="template-card">
              <div className="template-header">
                <div className="template-icon"><BookTemplate size={18} /></div>
                <h3 className="template-name">{template.name}</h3>
                <div className="template-actions">
                  <button className="icon-btn apply" onClick={() => setApplyTemplate(template)} title="Apply to date">
                    <Play size={14} />
                  </button>
                  <button className="icon-btn del" onClick={() => deleteTemplate(template.template_id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="template-count">{template.items?.length || 0} activities</div>
              <div className="template-items">
                {(template.items || []).map((item, i) => (
                  <div key={i} className="template-item">
                    <span className="item-dot" />
                    <span className="item-name">{item.activity_name}</span>
                    {item.time && (
                      <span className="item-time"><Clock size={11} /> {item.time}</span>
                    )}
                  </div>
                ))}
              </div>
              <button className="apply-btn" onClick={() => setApplyTemplate(template)}>
                <Play size={14} /> Apply to Day
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Template" width="550px">
        <div className="create-template">
          <div className="form-group">
            <label>Template Name</label>
            <input
              type="text" placeholder="e.g. Morning Routine"
              value={newTemplate.name}
              onChange={e => setNewTemplate(t => ({ ...t, name: e.target.value }))}
            />
          </div>

          <div className="items-section">
            <label>Activities</label>
            {newTemplate.items.length > 0 && (
              <div className="items-list">
                {newTemplate.items.map((item, i) => (
                  <div key={i} className="item-row">
                    <span className="item-dot" />
                    <span className="item-name">{item.activity_name}</span>
                    {item.time && <span className="item-time-sm">{item.time}</span>}
                    <button className="remove-item" onClick={() => removeItem(i)}><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="add-item-row">
              <input
                type="text" placeholder="ชื่อกิจกรรม"
                value={newItem.activity_name}
                onChange={e => setNewItem(v => ({ ...v, activity_name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addItem()}
              />
              <div className="add-item-time">
                <ThaiDateTimePicker
                  value={newItem.time_dt}
                  onChange={v => setNewItem(prev => ({ ...prev, time_dt: v }))}
                />
              </div>
              <button className="add-item-btn" onClick={addItem}><Plus size={16} /></button>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-cancel" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveTemplate} disabled={saving}>
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Apply Modal */}
      <Modal isOpen={!!applyTemplate} onClose={() => setApplyTemplate(null)} title="ใช้งาน Template">
        <div className="apply-form">
          <p>ใช้ <strong>{applyTemplate?.name}</strong> กับวันที่:</p>
          <ThaiDateTimePicker
            label="เลือกวันที่"
            value={applyDatetime}
            onChange={setApplyDatetime}
          />
          {applyDatetime && (
            <p className="apply-date-preview">วันที่เลือก: <strong>{formatDate(applyDatetime.split('T')[0])}</strong></p>
          )}
          <div className="form-actions" style={{ marginTop: '1rem' }}>
            <button className="btn-cancel" onClick={() => setApplyTemplate(null)}>ยกเลิก</button>
            <button className="btn-primary" onClick={handleApply}>ใช้งาน Template</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
