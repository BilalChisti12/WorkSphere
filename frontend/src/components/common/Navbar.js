import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getImageUrl } from '../../lib/api/client';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  const avatarUrl = currentUser?.userId?.profilePicture
    ? getImageUrl(currentUser.userId.profilePicture)
    : null;

  const initials = currentUser?.userId?.name
    ? currentUser.userId.name.slice(0, 2).toUpperCase()
    : '??';

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [router.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.replace('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const navLinks = [
    { href: '/feed', label: 'Feed', icon: HomeIcon },
    { href: '/people', label: 'People', icon: PeopleIcon },
    { href: '/connections', label: 'Connections', icon: ConnectionIcon },
    { href: '/search', label: 'Search', icon: SearchIcon },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/feed" className={styles.logo}>
          <span className={styles.logoMark}>W</span>
          <span className={styles.logoText}>WorkSphere</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className={styles.links}>
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${router.pathname === href || (href !== '/feed' && router.pathname.startsWith(href)) ? styles.active : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className={styles.right}>
          {/* Create post button */}
          <Link href="/posts/create" className={`btn btn-primary btn-sm ${styles.createBtn}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Post</span>
          </Link>

          {/* User menu */}
          <div className={styles.userMenu} ref={menuRef}>
            <button
              className={styles.avatarBtn}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="User menu"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={initials} className={`avatar avatar-sm ${styles.avatarImg}`} />
              ) : (
                <div className={styles.avatarFallback}>{initials}</div>
              )}
            </button>

            {menuOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownUser}>
                  <span className={styles.dropdownName}>{currentUser?.userId?.name}</span>
                  <span className={styles.dropdownUsername}>@{currentUser?.userId?.username}</span>
                </div>
                <div className={styles.dropdownDivider} />
                <Link href="/profile" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                  <UserIcon /> My Profile
                </Link>
                <Link href="/connections/requests" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                  <ConnectionIcon /> Requests
                </Link>
                <Link href="/settings" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                  <SettingsIcon /> Settings
                </Link>
                <div className={styles.dropdownDivider} />
                <button className={`${styles.dropdownItem} ${styles.dropdownLogout}`} onClick={handleLogout}>
                  <LogoutIcon /> Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className={styles.mobileNav}>
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.mobileLink} ${router.pathname === href ? styles.active : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
          <div className={styles.mobileDivider} />
          <Link href="/posts/create" className={styles.mobileLink}>
            <PlusIcon /> Create Post
          </Link>
          <Link href="/profile" className={styles.mobileLink}>
            <UserIcon /> My Profile
          </Link>
          <Link href="/connections/requests" className={styles.mobileLink}>
            <ConnectionIcon /> Requests
          </Link>
          <Link href="/settings" className={styles.mobileLink}>
            <SettingsIcon /> Settings
          </Link>
          <button className={`${styles.mobileLink} ${styles.mobileLogout}`} onClick={handleLogout}>
            <LogoutIcon /> Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

// Icons
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ConnectionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
