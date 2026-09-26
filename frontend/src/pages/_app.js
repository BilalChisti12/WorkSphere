import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import Navbar from '../components/common/Navbar';

const PUBLIC_ROUTES = ['/login', '/register'];

function AppContent({ Component, pageProps }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const isPublic = PUBLIC_ROUTES.includes(router.pathname);
    if (!isAuthenticated && !isPublic) {
      router.replace(`/login?redirect=${encodeURIComponent(router.pathname)}`);
    }
    if (isAuthenticated && isPublic) {
      router.replace('/feed');
    }
  }, [isAuthenticated, isLoading, router.pathname]);

  const isPublic = PUBLIC_ROUTES.includes(router.pathname);
  const showNav = isAuthenticated && !isPublic;

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg)',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <>
      {showNav && <Navbar />}
      <main style={{ minHeight: '100vh', paddingTop: showNav ? '64px' : 0 }}>
        <Component {...pageProps} />
      </main>
    </>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent Component={Component} pageProps={pageProps} />
      </ToastProvider>
    </AuthProvider>
  );
}
