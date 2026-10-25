import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { formValues, useSubmit } from '../hooks';
import { ErrorNote, Field } from '../ui';

export default function AuthPage({ mode }) {
  const { login, register } = useAuth();
  const isLogin = mode === 'login';
  const submit = useSubmit(async (values) => {
    if (isLogin) await login(values.email, values.password);
    else await register(values);
  });

  const onSubmit = (e) => {
    e.preventDefault();
    submit.run(formValues(e.currentTarget));
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="brand brand-lg">
          <span className="brand-mark">U</span> UniMate
        </div>
        <p className="muted">Routines, rides, notes, reviews and study help, all in one place.</p>
        <h1>{isLogin ? 'Log in' : 'Create your account'}</h1>
        <form onSubmit={onSubmit} className="stack">
          {!isLogin && (
            <>
              <Field label="Full name">
                <input name="name" required maxLength={80} autoComplete="name" />
              </Field>
              <Field label="Department" hint="Optional, for example CSE or BBA">
                <input name="department" maxLength={80} />
              </Field>
            </>
          )}
          <Field label="University email" hint={isLogin ? undefined : 'Must be your university address, like you@g.bracu.ac.bd'}>
            <input name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Password" hint={isLogin ? undefined : 'At least 8 characters'}>
            <input
              name="password"
              type="password"
              required
              minLength={isLogin ? undefined : 8}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </Field>
          <ErrorNote error={submit.error} />
          <button className="btn btn-primary btn-block" disabled={submit.busy}>
            {submit.busy ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>
        <p className="muted small">
          {isLogin ? (
            <>New to UniMate? <Link to="/register">Create an account</Link></>
          ) : (
            <>Already have an account? <Link to="/login">Log in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
