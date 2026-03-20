import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Zap, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! Welcome to LifeFlow!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Zap size={28} />
          <span>LifeFlow</span>
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start organizing your life today</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <User size={16} className="input-icon" />
            <input
              type="text" placeholder="Full name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required autoFocus
            />
          </div>
          <div className="input-group">
            <Mail size={16} className="input-icon" />
            <input
              type="email" placeholder="Email address"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="input-group">
            <Lock size={16} className="input-icon" />
            <input
              type={showPass ? 'text' : 'password'} placeholder="Password (min. 6 chars)"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required minLength={6}
            />
            <button type="button" className="eye-btn" onClick={() => setShowPass(v => !v)}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
      <div className="auth-bg">
        <div className="auth-glow glow1" />
        <div className="auth-glow glow2" />
      </div>
    </div>
  );
}
