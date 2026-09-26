import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../../context/AuthContext';
import { login as loginApi } from '../../lib/api/auth';
import { useToast } from '../../context/ToastContext';
import styles from './auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await loginApi({ email: form.email.trim(), password: form.password });
      await login(data.token);
      toast.success('Welcome back!');
      const redirect = router.query.redirect || '/feed';
      router.replace(redirect);
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In — WorkSphere</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.panel}>
          {/* Brand */}
          <div className={styles.brand}>
            <div className={styles.brandMark}>W</div>
            <span className={styles.brandName}>WorkSphere</span>
          </div>

          <h1 className={styles.heading}>Welcome back</h1>
          <p className={styles.subheading}>Sign in to your account to continue</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-full btn-lg ${isSubmitting ? 'btn-loading' : ''}`}
              disabled={isSubmitting}
              style={{ marginTop: '8px' }}
            >
              {isSubmitting ? '' : 'Sign in'}
            </button>
          </form>

          <p className={styles.footer}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className={styles.link}>Create account</Link>
          </p>
        </div>
      </div>
    </>
  );
}
