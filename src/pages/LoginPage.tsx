import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Card, Button, Input, Banner } from '../components/ui';
import { LogIn, UserPlus } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/profile';

  if (user) {
    navigate(from, { replace: true });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const { error: signUpErr } = await signUpWithEmail(email, password, displayName || undefined);
      setLoading(false);
      if (signUpErr) {
        setError(signUpErr.message);
      } else {
        setSuccessMessage('Account created successfully! Check your email to confirm if email verification is enabled, or sign in.');
      }
    } else {
      const { error: signInErr } = await signInWithEmail(email, password);
      setLoading(false);
      if (signInErr) {
        setError(signInErr.message);
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const { error: googleErr } = await signInWithGoogle();
    setLoading(false);
    if (googleErr) {
      setError(googleErr.message);
    }
  };

  return (
    <div className="max-w-[440px] w-full mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-h1 font-bold text-brand">
          {isSignUp ? 'Create RouteX Account' : 'Sign in to RouteX'}
        </h1>
        <p className="text-small text-text-2">
          Login keeps community hazard reports trustworthy and lets you earn rewards.
        </p>
      </div>

      <Card className="space-y-5">
        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="secondary"
          onClick={handleGoogleSignIn}
          className="w-full justify-center"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          }
        >
          Continue with Google
        </Button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-white px-3 text-xs text-text-3 uppercase tracking-wider font-medium">
            or email
          </span>
          <div className="border-t border-border w-full" />
        </div>

        {error && (
          <Banner variant="disclaimer">
            <span className="text-risk-severe font-medium">{error}</span>
          </Banner>
        )}

        {successMessage && (
          <Banner variant="info">
            <span className="text-risk-low font-medium">{successMessage}</span>
          </Banner>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <Input
              label="Full Name / Display Name"
              placeholder="e.g. Tenzing Sharma"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            helperText={isSignUp ? 'Minimum 6 characters' : undefined}
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full justify-center"
            icon={isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-border/50 text-small text-text-2">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                }}
                className="text-accent font-semibold hover:underline"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                }}
                className="text-accent font-semibold hover:underline"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </Card>

      <p className="text-xs text-center text-text-3">
        By continuing, you agree to follow genuine community reporting rules.
        <br />
        <Link to="/about" className="text-accent hover:underline">
          Learn how trust scores work
        </Link>
      </p>
    </div>
  );
};
