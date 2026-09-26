import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { updateUser, updateProfileData, updateProfilePic } from '../../lib/api/users';
import { getImageUrl } from '../../lib/api/client';
import styles from './edit.module.css';

export default function EditProfilePage() {
  const { currentUser, refreshCurrentUser } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const fileInputRef = useRef(null);

  // Account fields
  const [account, setAccount] = useState({ name: '', username: '', email: '', password: '' });
  const [accountErrors, setAccountErrors] = useState({});

  // Profile fields
  const [bio, setBio] = useState('');
  const [currentPost, setCurrentPost] = useState('');
  const [pastWork, setPastWork] = useState([]);
  const [education, setEducation] = useState([]);
  const [skills, setSkills] = useState([]);

  // New item forms
  const [newWork, setNewWork] = useState({ company: '', position: '', years: '' });
  const [newEdu, setNewEdu] = useState({ school: '', degree: '', fieldOfStudy: '' });
  const [newSkill, setNewSkill] = useState({ skill: '', priority: 1 });

  // Submitting states
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isUploadingPic, setIsUploadingPic] = useState(false);

  // Pic preview
  const [picPreview, setPicPreview] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const u = currentUser.userId;
    const p = currentUser;
    setAccount({ name: u.name || '', username: u.username || '', email: u.email || '', password: '' });
    setBio(p.bio || '');
    setCurrentPost(p.currentPost || '');
    // Strip _id for display but keep for keys
    setPastWork(p.pastWork || []);
    setEducation(p.education || []);
    setSkills(p.skills || []);
    if (u.profilePicture) setPicPreview(getImageUrl(u.profilePicture));
  }, [currentUser]);

  // --- Account update ---
  const handleAccountChange = (e) => {
    setAccount((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (accountErrors[e.target.name]) setAccountErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const validateAccount = () => {
    const e = {};
    if (!account.name.trim()) e.name = 'Name is required';
    if (!account.username.trim()) e.username = 'Username is required';
    if (!account.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(account.email)) e.email = 'Invalid email';
    if (account.password && account.password.length < 6) e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    const errs = validateAccount();
    if (Object.keys(errs).length) { setAccountErrors(errs); return; }
    setIsSubmittingAccount(true);
    try {
      // Only send fields that have values; don't send empty password
      const data = {
        name: account.name.trim(),
        username: account.username.trim(),
        email: account.email.trim(),
      };
      if (account.password) data.password = account.password;
      await updateUser(data);
      await refreshCurrentUser();
      toast.success('Account updated');
      setAccount((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  // --- Profile data update ---
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    try {
      // CRITICAL: Send complete arrays (they are replaced entirely in backend)
      const data = {
        bio: bio.trim(),
        currentPost: currentPost.trim(),
        pastWork: pastWork.map(({ company, position, years }) => ({ company, position, years })),
        education: education.map(({ school, degree, fieldOfStudy }) => ({ school, degree, fieldOfStudy })),
        skills: skills.map(({ skill, priority }) => ({ skill, priority: Number(priority) })),
      };
      await updateProfileData(data);
      await refreshCurrentUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // --- Profile picture ---
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPicPreview(url);
    handleUploadPic(file);
  };

  const handleUploadPic = async (file) => {
    setIsUploadingPic(true);
    try {
      await updateProfilePic(file);
      await refreshCurrentUser();
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploadingPic(false);
    }
  };

  // --- Past work management ---
  const addWork = () => {
    if (!newWork.company.trim() || !newWork.position.trim()) return;
    setPastWork((prev) => [...prev, { ...newWork, _id: Date.now().toString() }]);
    setNewWork({ company: '', position: '', years: '' });
  };
  const removeWork = (id) => setPastWork((prev) => prev.filter((w) => w._id !== id));

  // --- Education management ---
  const addEdu = () => {
    if (!newEdu.school.trim() || !newEdu.degree.trim()) return;
    setEducation((prev) => [...prev, { ...newEdu, _id: Date.now().toString() }]);
    setNewEdu({ school: '', degree: '', fieldOfStudy: '' });
  };
  const removeEdu = (id) => setEducation((prev) => prev.filter((e) => e._id !== id));

  // --- Skills management ---
  const addSkill = () => {
    if (!newSkill.skill.trim()) return;
    setSkills((prev) => [...prev, { ...newSkill, _id: Date.now().toString(), priority: Number(newSkill.priority) }]);
    setNewSkill({ skill: '', priority: 1 });
  };
  const removeSkill = (id) => setSkills((prev) => prev.filter((s) => s._id !== id));

  const initials = currentUser?.userId?.name?.slice(0, 2).toUpperCase() || '??';

  return (
    <>
      <Head>
        <title>Edit Profile — WorkSphere</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/profile')}>
              <BackIcon /> Profile
            </button>
            <h1 className={styles.pageTitle}>Edit Profile</h1>
          </div>

          {/* Profile Picture */}
          <div className="card">
            <h2 className={styles.sectionTitle}>Profile Picture</h2>
            <div className={styles.picSection}>
              <div className={styles.picPreview} onClick={() => fileInputRef.current?.click()}>
                {picPreview ? (
                  <img src={picPreview} alt="Profile" className={`avatar avatar-2xl ${styles.pic}`} />
                ) : (
                  <div className={`${styles.picFallback} avatar-2xl`}>{initials}</div>
                )}
                <div className={styles.picOverlay}>
                  {isUploadingPic ? <SpinnerIcon /> : <CameraIcon />}
                </div>
              </div>
              <div>
                <p className={styles.picHint}>Click the photo to upload a new one</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  disabled={isUploadingPic}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPic}
                >
                  {isUploadingPic ? 'Uploading...' : 'Choose photo'}
                </button>
              </div>
            </div>
          </div>

          {/* Account settings */}
          <div className="card">
            <h2 className={styles.sectionTitle}>Account</h2>
            <form onSubmit={handleAccountSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Full name</label>
                  <input id="name" name="name" type="text" className={`form-input ${accountErrors.name ? 'error' : ''}`}
                    value={account.name} onChange={handleAccountChange} disabled={isSubmittingAccount} />
                  {accountErrors.name && <span className="form-error">{accountErrors.name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="username">Username</label>
                  <input id="username" name="username" type="text" className={`form-input ${accountErrors.username ? 'error' : ''}`}
                    value={account.username} onChange={handleAccountChange} disabled={isSubmittingAccount} />
                  {accountErrors.username && <span className="form-error">{accountErrors.username}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" className={`form-input ${accountErrors.email ? 'error' : ''}`}
                    value={account.email} onChange={handleAccountChange} disabled={isSubmittingAccount} />
                  {accountErrors.email && <span className="form-error">{accountErrors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="password">New password</label>
                  <input id="password" name="password" type="password" className={`form-input ${accountErrors.password ? 'error' : ''}`}
                    placeholder="Leave blank to keep current" value={account.password}
                    onChange={handleAccountChange} disabled={isSubmittingAccount} />
                  {accountErrors.password && <span className="form-error">{accountErrors.password}</span>}
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={`btn btn-primary ${isSubmittingAccount ? 'btn-loading' : ''}`}
                  disabled={isSubmittingAccount}>
                  {isSubmittingAccount ? '' : 'Save account'}
                </button>
              </div>
            </form>
          </div>

          {/* Profile data */}
          <div className="card">
            <h2 className={styles.sectionTitle}>Profile Information</h2>
            <form onSubmit={handleProfileSubmit} className={styles.form}>
              <div className="form-group">
                <label className="form-label" htmlFor="bio">Bio</label>
                <textarea id="bio" className="form-input form-textarea" rows={4}
                  placeholder="Tell people about yourself..." value={bio}
                  onChange={(e) => setBio(e.target.value)} disabled={isSubmittingProfile} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="currentPost">Current position</label>
                <input id="currentPost" type="text" className="form-input"
                  placeholder="e.g. Senior Software Engineer at Acme" value={currentPost}
                  onChange={(e) => setCurrentPost(e.target.value)} disabled={isSubmittingProfile} />
              </div>

              {/* Past Work */}
              <div className={styles.arraySection}>
                <h3 className={styles.arrayTitle}>Experience</h3>
                {pastWork.map((w) => (
                  <div key={w._id} className={styles.arrayItem}>
                    <div className={styles.arrayItemInfo}>
                      <span className={styles.arrayItemPrimary}>{w.position}</span>
                      <span className={styles.arrayItemSecondary}>{w.company} · {w.years}</span>
                    </div>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => removeWork(w._id)} title="Remove">
                      <RemoveIcon />
                    </button>
                  </div>
                ))}
                <div className={styles.addItemGrid}>
                  <input type="text" className="form-input" placeholder="Company"
                    value={newWork.company} onChange={(e) => setNewWork((p) => ({ ...p, company: e.target.value }))} />
                  <input type="text" className="form-input" placeholder="Position"
                    value={newWork.position} onChange={(e) => setNewWork((p) => ({ ...p, position: e.target.value }))} />
                  <input type="text" className="form-input" placeholder="Years (e.g. 2020-2023)"
                    value={newWork.years} onChange={(e) => setNewWork((p) => ({ ...p, years: e.target.value }))} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addWork}
                    disabled={!newWork.company.trim() || !newWork.position.trim()}>
                    <PlusIcon /> Add
                  </button>
                </div>
              </div>

              {/* Education */}
              <div className={styles.arraySection}>
                <h3 className={styles.arrayTitle}>Education</h3>
                {education.map((e) => (
                  <div key={e._id} className={styles.arrayItem}>
                    <div className={styles.arrayItemInfo}>
                      <span className={styles.arrayItemPrimary}>{e.school}</span>
                      <span className={styles.arrayItemSecondary}>{e.degree} · {e.fieldOfStudy}</span>
                    </div>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => removeEdu(e._id)} title="Remove">
                      <RemoveIcon />
                    </button>
                  </div>
                ))}
                <div className={styles.addItemGrid}>
                  <input type="text" className="form-input" placeholder="School"
                    value={newEdu.school} onChange={(e) => setNewEdu((p) => ({ ...p, school: e.target.value }))} />
                  <input type="text" className="form-input" placeholder="Degree"
                    value={newEdu.degree} onChange={(e) => setNewEdu((p) => ({ ...p, degree: e.target.value }))} />
                  <input type="text" className="form-input" placeholder="Field of study"
                    value={newEdu.fieldOfStudy} onChange={(e) => setNewEdu((p) => ({ ...p, fieldOfStudy: e.target.value }))} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addEdu}
                    disabled={!newEdu.school.trim() || !newEdu.degree.trim()}>
                    <PlusIcon /> Add
                  </button>
                </div>
              </div>

              {/* Skills */}
              <div className={styles.arraySection}>
                <h3 className={styles.arrayTitle}>Skills</h3>
                <div className={styles.skillsTags}>
                  {[...skills].sort((a, b) => b.priority - a.priority).map((s) => (
                    <div key={s._id} className={styles.skillTag}>
                      <span>{s.skill}</span>
                      <span className={styles.skillPriority}>{s.priority}</span>
                      <button type="button" onClick={() => removeSkill(s._id)} className={styles.skillRemove}>
                        <RemoveIcon />
                      </button>
                    </div>
                  ))}
                </div>
                <div className={styles.addSkillRow}>
                  <input type="text" className="form-input" placeholder="Skill name" style={{ flex: 2 }}
                    value={newSkill.skill} onChange={(e) => setNewSkill((p) => ({ ...p, skill: e.target.value }))} />
                  <input type="number" className="form-input" placeholder="Priority" min={1} max={100} style={{ flex: 1 }}
                    value={newSkill.priority} onChange={(e) => setNewSkill((p) => ({ ...p, priority: e.target.value }))} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addSkill}
                    disabled={!newSkill.skill.trim()}>
                    <PlusIcon /> Add
                  </button>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={`btn btn-primary ${isSubmittingProfile ? 'btn-loading' : ''}`}
                  disabled={isSubmittingProfile}>
                  {isSubmittingProfile ? '' : 'Save profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// Icons
function BackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>;
}
function CameraIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function RemoveIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function SpinnerIcon() {
  return <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />;
}
