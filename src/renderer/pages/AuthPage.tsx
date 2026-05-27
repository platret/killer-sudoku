import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ShaderBackground } from '@/components/animations/ShaderBackground';
import { toast } from '@/components/ui/Toaster';
import { useApp } from '@/lib/store';
import { api } from '@/lib/ipc';

interface FieldError {
  username?: string;
  password?: string;
}

export function AuthPage(): JSX.Element {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const setUser = useApp((s) => s.setUser);

  const mode = view.kind === 'auth' ? view.mode : 'login';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});

  const validate = (): boolean => {
    const next: FieldError = {};
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(username)) {
      next.username = '3–20 chars: letters, digits, _ . -';
    }
    if (password.length < 6 || password.length > 128) {
      next.password = '6–128 characters required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (): Promise<void> => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const res = mode === 'login'
        ? await api().auth.login({ username, password })
        : await api().auth.register({ username, password });
      if (res.success && res.user) {
        setUser(res.user);
        toast.success(mode === 'login' ? 'Welcome back' : 'Account created');
        setView({ kind: 'list' });
      } else {
        toast.error(res.error ?? 'Authentication failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex-1 overflow-hidden flex items-center justify-center">
      <ShaderBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        className="relative z-10 w-full max-w-md mx-4 surface p-8 shadow-elev"
      >
        <button
          onClick={() => setView({ kind: 'start' })}
          className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1 mb-6 focus-ring"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>

        <h1 className="text-2xl font-bold font-display text-ink mb-1">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          {mode === 'login'
            ? 'Continue solving and track your highscores.'
            : 'Pick a username — passwords are hashed with bcrypt.'}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              invalid={!!errors.username}
              placeholder="player_one"
              autoComplete="username"
            />
            {errors.username ? (
              <p className="text-xs text-danger">{errors.username}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={!!errors.password}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {errors.password ? (
              <p className="text-xs text-danger">{errors.password}</p>
            ) : null}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {submitting ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <div className="mt-6 text-xs text-ink-muted text-center">
          {mode === 'login' ? (
            <button
              onClick={() => setView({ kind: 'auth', mode: 'register' })}
              className="hover:text-ink focus-ring"
            >
              No account yet? <span className="text-accent">Register</span>
            </button>
          ) : (
            <button
              onClick={() => setView({ kind: 'auth', mode: 'login' })}
              className="hover:text-ink focus-ring"
            >
              Already have one? <span className="text-accent">Sign in</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
