import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { register as registerApi } from '../../lib/api/auth';
import { useToast } from '../../context/ToastContext';
import styles from './auth.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.username.trim()) e.username = 'Username is required';
    else if (form.username.includes(' ')) e.username = 'Username cannot contain spaces';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
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
      await registerApi({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast.success('Account created! Please sign in.');
      router.push('/login');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Account — WorkSphere</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.panel}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>W</div>
            <span className={styles.brandName}>WorkSphere</span>
          </div>

          <h1 className={styles.heading}>Create your account</h1>
          <p className={styles.subheading}>Join the professional network</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.row}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  className={`form-input ${errors.username ? 'error' : ''}`}
                  placeholder="janesmith"
                  value={form.username}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {errors.username && <span className="form-error">{errors.username}</span>}
              </div>
            </div>

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
                autoComplete="new-password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Minimum 6 characters"
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
              {isSubmitting ? '' : 'Create account'}
            </button>
          </form>

          <p className={styles.footer}>
            Already have an account?{' '}
            <Link href="/login" className={styles.link}>Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
