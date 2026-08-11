import React, { useState, useEffect } from 'react';
import { Feather, ArrowRight, Loader2, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { profileService } from '../services/profileService';

interface SignupViewProps {
  onSwitchToLogin: () => void;
  onSuccess: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SignupView: React.FC<SignupViewProps> = ({ onSwitchToLogin, onSuccess, showToast }) => {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus('idle');
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const taken = await profileService.isUsernameTaken(clean);
        setUsernameStatus(taken ? 'taken' : 'available');
      } catch (e) {
        setUsernameStatus('idle');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Name is required.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Username is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email, password, name, username);
      showToast('Account created successfully! Welcome to LyricVault.', 'success');
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-8 shadow-xl">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#8B2F4A]/10 text-[#8B2F4A] dark:text-[#E06C88]">
            <Feather className="h-6 w-6" />
          </div>
          <h1 className="font-editorial text-3xl font-bold text-[var(--text-primary)]">
            Create your account
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Build your personal library of words.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-200 animate-fadeIn">
            {errorMsg}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Name
            </label>
            <input
              id="signup-name-input"
              type="text"
              placeholder="Ankit Shah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-4 py-3 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-xs font-medium text-[var(--text-secondary)]">
                @
              </span>
              <input
                id="signup-username-input"
                type="text"
                placeholder="ankit"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className={`w-full rounded-2xl border bg-[var(--bg-muted)]/60 pl-8 pr-10 py-3 text-xs font-medium text-[var(--text-primary)] focus:outline-none ${
                  usernameStatus === 'available'
                    ? 'border-emerald-500 focus:border-emerald-500'
                    : usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-[var(--border-color)] focus:border-[#8B2F4A]'
                }`}
                required
              />
              <div className="absolute right-3.5 top-3 flex items-center">
                {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-secondary)]" />}
                {usernameStatus === 'available' && <Check className="h-4 w-4 text-emerald-500" />}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <X className="h-4 w-4 text-rose-500" />}
              </div>
            </div>
            {usernameStatus === 'available' && (
              <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                ✓ Username available
              </p>
            )}
            {usernameStatus === 'taken' && (
              <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                ✕ Username already taken
              </p>
            )}
            {usernameStatus === 'invalid' && (
              <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                Username must be at least 3 characters (letters, numbers, underscores).
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Email
            </label>
            <input
              id="signup-email-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-4 py-3 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Password
            </label>
            <input
              id="signup-password-input"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-4 py-3 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
              required
            />
          </div>

          <button
            id="submit-signup-button"
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#8B2F4A] py-3.5 text-xs font-semibold text-white hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-colors shadow-sm disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="pt-4 border-t border-[var(--border-color)] text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            Already have an account?{' '}
            <button
              id="switch-to-login-button"
              onClick={onSwitchToLogin}
              className="font-semibold text-[#8B2F4A] hover:underline dark:text-[#E06C88]"
            >
              Log In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
