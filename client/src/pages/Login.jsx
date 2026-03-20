import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Zap, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export default function Login() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Please enter your name'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! Welcome to LifeFlow!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Zap size={28} />
          <span>LifeFlow</span>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => setTab('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => setTab('register')}
          >
            Sign Up
          </button>
        </div>

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <>
            <p className="auth-subtitle">Sign in to your account</p>
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="input-group">
                <Mail size={16} className="input-icon" />
                <input
                  type="email" placeholder="Email"
                  value={form.email} onChange={set('email')}
                  required autoFocus
                />
              </div>
              <div className="input-group">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPass ? 'text' : 'password'} placeholder="Password"
                  value={form.password} onChange={set('password')}
                  required
                />
                <button type="button" className="eye-btn" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <p className="auth-link">
              Don't have an account?{' '}
              <button type="button" className="auth-link-btn" onClick={() => setTab('register')}>
                Sign up here
              </button>
            </p>
          </>
        )}

        {/* REGISTER FORM */}
        {tab === 'register' && (
          <>
            <p className="auth-subtitle">Create a new account to get started</p>
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="input-group">
                <User size={16} className="input-icon" />
                <input
                  type="text" placeholder="Full name"
                  value={form.name} onChange={set('name')}
                  required autoFocus
                />
              </div>
              <div className="input-group">
                <Mail size={16} className="input-icon" />
                <input
                  type="email" placeholder="Email"
                  value={form.email} onChange={set('email')}
                  required
                />
              </div>
              <div className="input-group">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPass ? 'text' : 'password'} placeholder="Password (min 6 characters)"
                  value={form.password} onChange={set('password')}
                  required minLength={6}
                />
                <button type="button" className="eye-btn" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="input-group">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPass ? 'text' : 'password'} placeholder="Confirm password"
                  value={form.confirm} onChange={set('confirm')}
                  required
                />
              </div>
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
            <p className="auth-link">
              Already have an account?{' '}
              <button type="button" className="auth-link-btn" onClick={() => setTab('login')}>
                Sign in here
              </button>
            </p>
          </>
        )}
      </div>

      <div className="auth-bg">
        <div className="auth-glow glow1" />
        <div className="auth-glow glow2" />
      </div>
    </div>
  );
}
