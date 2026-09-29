import React, { useState } from 'react';
import {
  Wallet,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Server,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Por favor completa los campos requeridos.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      if (password.length < 4) {
        setError('La contraseña debe tener al menos 4 caracteres.');
        return;
      }
      if (username.trim().length < 3) {
        setError('El nombre de usuario debe tener al menos 3 caracteres.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        await register(username.trim(), password, name.trim());
      } else {
        await login(username.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
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
          <p className="login-subtitle">Gestión Financiera Personal • Self-Hosted</p>
        </div>

        {/* Mode Switch Tabs (Iniciar Sesión vs Crear Cuenta) */}
        <div className="auth-tab-switch">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
          >
            <LogIn size={16} />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
          >
            <UserPlus size={16} />
            <span>Crear Cuenta</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-error-alert animate-fade-in">
            <span>{error}</span>
          </div>
        )}

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* Name field (Only in Register mode) */}
          {mode === 'register' && (
            <div className="login-input-group animate-fade-in">
              <label className="login-label" htmlFor="register-name">
                Tu Nombre
              </label>
              <div className="login-field-wrapper">
                <User size={18} className="login-field-icon" />
                <input
                  id="register-name"
                  type="text"
                  placeholder="Ej. Héctor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="login-input"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Username field */}
          <div className="login-input-group">
            <label className="login-label" htmlFor="login-username">
              Nombre de Usuario
            </label>
            <div className="login-field-wrapper">
              <User size={18} className="login-field-icon" />
              <input
                id="login-username"
                type="text"
                placeholder="usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                autoFocus={mode === 'login'}
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div className="login-input-group">
            <label className="login-label" htmlFor="login-password">
              Contraseña
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

          {/* Confirm Password field (Only in Register mode) */}
          {mode === 'register' && (
            <div className="login-input-group animate-fade-in">
              <label className="login-label" htmlFor="register-confirm-password">
                Confirmar Contraseña
              </label>
              <div className="login-field-wrapper">
                <Lock size={18} className="login-field-icon" />
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="login-input"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="login-submit-btn"
          >
            <span>
              {isSubmitting
                ? mode === 'register'
                  ? 'Creando cuenta...'
                  : 'Accediendo...'
                : mode === 'register'
                ? 'Crear Cuenta y Empezar'
                : 'Iniciar Sesión'}
            </span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Footer info */}
        <div className="login-footer">
          <div className="login-info-row">
            <Server size={14} className="login-info-icon" />
            <span>Datos privados y aislados por usuario en SQLite</span>
          </div>

          <div className="auth-toggle-hint">
            {mode === 'login' ? (
              <span>
                ¿Aún no tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="auth-link-btn"
                >
                  Regístrate aquí
                </button>
              </span>
            ) : (
              <span>
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="auth-link-btn"
                >
                  Inicia sesión
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
