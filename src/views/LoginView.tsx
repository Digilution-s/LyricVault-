import React, { useState } from 'react';
import { Feather, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LoginViewProps {
  onSwitchToSignup: () => void;
  onSuccess: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToSignup, onSuccess, showToast }) => {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Password is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password);
      showToast('Welcome back! You are logged in.', 'success');
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email address to reset password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email);
      setResetEmailSent(true);
      showToast('Password reset instructions sent to your email.', 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not send reset password email.');
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
            {isResetMode ? 'Reset password' : 'Welcome back.'}
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            {isResetMode ? 'Enter your email to receive reset instructions.' : 'Your saved words are waiting.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-200 animate-fadeIn">
            {errorMsg}
          </div>
        )}

        {/* Reset Email Sent Banner */}
        {resetEmailSent ? (
          <div className="text-center space-y-4 py-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-900 dark:text-emerald-200">
              Password reset link sent! Check your inbox for instructions.
            </div>
            <button
              onClick={() => {
                setIsResetMode(false);
                setResetEmailSent(false);
              }}
              className="text-xs font-semibold text-[#8B2F4A] hover:underline dark:text-[#E06C88]"
            >
              Back to Log In
            </button>
          </div>
        ) : isResetMode ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                Email Address
              </label>
              <input
                id="reset-password-email-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-4 py-3 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                required
              />
            </div>

            <button
              id="send-reset-link-button"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#8B2F4A] py-3 text-xs font-semibold text-white hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsResetMode(false)}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel and return to login
              </button>
            </div>
          </form>
        ) : (
          /* Main Login Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                Email
              </label>
              <input
                id="login-email-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-4 py-3 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  className="text-[11px] font-medium text-[#8B2F4A] hover:underline dark:text-[#E06C88]"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="login-password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-4 py-3 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                required
              />
            </div>

            <button
              id="submit-login-button"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#8B2F4A] py-3 text-xs font-semibold text-white hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Logging In...</span>
                </>
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Toggle */}
        {!isResetMode && (
          <div className="pt-4 border-t border-[var(--border-color)] text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              Don't have an account?{' '}
              <button
                id="switch-to-signup-button"
                onClick={onSwitchToSignup}
                className="font-semibold text-[#8B2F4A] hover:underline dark:text-[#E06C88]"
              >
                Create one
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
