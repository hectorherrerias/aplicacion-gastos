import React, { useState } from 'react';
import { Wallet, Lock, User, Eye, EyeOff, ArrowRight, Server } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDefaultCredentials = () => {
    setUsername('admin');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card animate-slide-up">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-icon">
            <Wallet size={28} />
          </div>
          <h1 className="login-title">GastosPro</h1>
          <p className="login-subtitle">Gestión Financiera Personal • Self-Hosted SQLite</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-error-alert animate-fade-in">
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label className="login-label" htmlFor="login-username">
              Usuario o Identificador
            </label>
            <div className="login-field-wrapper">
              <User size={18} className="login-field-icon" />
              <input
                id="login-username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-label" htmlFor="login-password">
              Contraseña o PIN Maestro
            </label>
            <div className="login-field-wrapper">
              <Lock size={18} className="login-field-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-password-toggle"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="login-submit-btn"
          >
            <span>{isSubmitting ? 'Accediendo...' : 'Iniciar Sesión'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Self-Hosted & Local Storage Info Footer */}
        <div className="login-footer">
          <div className="login-info-row">
            <Server size={14} className="login-info-icon" />
            <span>Base de datos SQLite local en tu servidor / Proxmox</span>
          </div>

          <button
            type="button"
            onClick={fillDefaultCredentials}
            className="login-quick-fill-btn"
          >
            Usar credenciales por defecto (admin / admin123)
          </button>
        </div>
      </div>
    </div>
  );
};
