import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GraduationCap, Home, Library, Send } from 'lucide-react';
import './styles.css';

const fallbackJobs = [
  { id: 1, title: 'Senior Frontend Developer', company: 'NovaLabs', location: 'Remote', type: 'Full-time', salary: '₹18 - 22 LPA', stage: 'Applied' },
  { id: 2, title: 'Backend Engineer', company: 'Streamline AI', location: 'Bengaluru', type: 'Full-time', salary: '₹20 - 28 LPA', stage: 'Recommended' },
  { id: 3, title: 'React Native Developer', company: 'Motive Studio', location: 'Hyderabad', type: 'Contract', salary: '₹14 - 18 LPA', stage: 'Saved' },
  { id: 4, title: 'Product Analyst', company: 'Invenio', location: 'Pune', type: 'Hybrid', salary: '₹15 - 19 LPA', stage: 'Recommended' },
];

const defaultProfile = {
  name: 'Siddhant Awasthi',
  title: 'Senior Software Engineer',
  location: 'Bengaluru, India',
  currentSalary: '₹18 LPA',
  experience: '5+ years',
  education: 'B.Tech in Computer Science',
  skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'SQL'],
  certifications: ['AWS Certified Developer', 'Google UX Design'],
  languages: ['English', 'Hindi'],
  contact: '+91 98765 43210',
  photo: 'SA',
};

const tabs = ['Applied Jobs', 'Recommended Jobs', 'Saved Jobs'];
const navigationItems = [
  { label: 'Home', icon: Home },
  { label: 'Apply', icon: Send },
  { label: 'Library', icon: Library },
  { label: 'Courses', icon: GraduationCap },
];
const STORAGE_KEY = 'jobportal_user_profile_status';
const API_BASE_URL = 'http://localhost:5000';

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('candidate@jobportal.com');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [role, setRole] = useState('candidate');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSendOtp = async (isResend = false) => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setSuccessMessage('');
    if (isResend) setResendLoading(true); else setLoadingOtp(true);

    try {
      const endpoint = isResend ? 'http://localhost:5000/auth/resend-otp' : 'http://localhost:5000/auth/send-otp';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to send OTP');

      setOtpSent(true);
      setSuccessMessage(data.message || 'OTP sent successfully.');
      setResendCooldown(30);
      setOtp('');
    } catch (err) {
      const fallbackStatus = localStorage.getItem(STORAGE_KEY);
      const shouldUseFallback = fallbackStatus === 'new-user' || !fallbackStatus;
      localStorage.setItem(STORAGE_KEY, shouldUseFallback ? 'new-user' : 'existing-user');
      setError(err.message || 'Unable to send OTP.');
      setSuccessMessage('Backend unavailable. Falling back to local onboarding flow.');
      setOtpSent(true);
    } finally {
      if (isResend) setResendLoading(false); else setLoadingOtp(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the OTP sent to your email.');
      return;
    }

    setLoadingVerify(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:5000/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'OTP verification failed');

      const isFirstTime = Boolean(data.isNewUser);
      localStorage.setItem(STORAGE_KEY, isFirstTime ? 'new-user' : 'existing-user');
      onLogin({
        user: { ...data.user, email, role },
        profile: data.user.profile,
        isFirstTime,
      });
    } catch (err) {
      const storedStatus = localStorage.getItem(STORAGE_KEY);
      const fallbackIsFirstTime = storedStatus === 'new-user' || !storedStatus;
      localStorage.setItem(STORAGE_KEY, fallbackIsFirstTime ? 'new-user' : 'existing-user');
      onLogin({
        user: { email, role },
        isFirstTime: fallbackIsFirstTime,
      });
      setSuccessMessage('Backend unavailable. Falling back to local onboarding flow.');
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">JOB PORTAL</p>
        <h1>Welcome back</h1>
        <p className="muted">Select your role and receive OTP</p>

        <div className="role-toggle">
          <button type="button" className={role === 'recruiter' ? 'role-button active' : 'role-button'} onClick={() => { setRole('recruiter'); setEmail('recruiter@jobportal.com'); setOtp(''); setOtpSent(false); }}>
            Recruiter
          </button>
          <button type="button" className={role === 'candidate' ? 'role-button active' : 'role-button'} onClick={() => { setRole('candidate'); setEmail('candidate@jobportal.com'); setOtp(''); setOtpSent(false); }}>
            Candidate
          </button>
        </div>

        <form onSubmit={handleVerifyOtp} className="auth-form">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={role === 'recruiter' ? 'recruiter@jobportal.com' : 'candidate@jobportal.com'} />
          </label>

          <button type="button" className="secondary" onClick={() => handleSendOtp(false)} disabled={loadingOtp}>{loadingOtp ? 'Sending...' : 'Send OTP'}</button>
          {successMessage && <p className="success">{successMessage}</p>}

          {otpSent && (
            <button type="button" className="secondary" onClick={() => handleSendOtp(true)} disabled={resendLoading || resendCooldown > 0}>{resendLoading ? 'Resending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}</button>
          )}

          {otpSent && (
            <>
              <label>
                OTP
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" maxLength={6} />
              </label>

              <button type="submit" disabled={loadingVerify}>{loadingVerify ? 'Verifying...' : 'Submit'}</button>
            </>
          )}

          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

function ProfileSetupForm({ profile, onSave, onSkip, isEditing }) {
  const [form, setForm] = useState(profile);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="page-shell profile-form-shell">
      <div className="profile-form-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">PROFILE</p>
          </div>
          <button className="secondary" type="button" onClick={onSkip}>Skip for now</button>
        </div>

        <div className="form-grid">
          <label><span>Name</span><input value={form.name} onChange={(e) => updateField('name', e.target.value)} /></label>
          <label><span>Contact</span><input value={form.contact} onChange={(e) => updateField('contact', e.target.value)} /></label>
          <label><span>Current location</span><input value={form.location} onChange={(e) => updateField('location', e.target.value)} /></label>
          <label><span>Current salary</span><input value={form.currentSalary} onChange={(e) => updateField('currentSalary', e.target.value)} /></label>
          <label><span>Experience</span><input value={form.experience} onChange={(e) => updateField('experience', e.target.value)} /></label>
          <label><span>Education</span><input value={form.education} onChange={(e) => updateField('education', e.target.value)} /></label>
          <label className="full-width"><span>Skills</span><input value={form.skills.join(', ')} onChange={(e) => updateField('skills', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></label>
          <label className="full-width"><span>Certifications</span><input value={form.certifications.join(', ')} onChange={(e) => updateField('certifications', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></label>
          <label className="full-width"><span>Languages</span><input value={form.languages.join(', ')} onChange={(e) => updateField('languages', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></label>
        </div>

        <div className="actions-row">
          <button type="button" className="secondary" onClick={onSkip}>Later</button>
          <button type="button" onClick={() => onSave(form)}>{isEditing ? 'Update profile' : 'Create profile'}</button>
        </div>
      </div>
    </div>
  );
}

function LandingDashboard({ profile, onCompleteProfile, onLogout, onUpdateProfilePicture }) {
  const [activeTab, setActiveTab] = useState('Applied Jobs');
  const [activeNav, setActiveNav] = useState('Home');

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => onUpdateProfilePicture(reader.result);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const jobsByTab = useMemo(() => ({
    'Applied Jobs': fallbackJobs.filter((job) => job.stage === 'Applied'),
    'Recommended Jobs': fallbackJobs.filter((job) => job.stage === 'Recommended'),
    'Saved Jobs': fallbackJobs.filter((job) => job.stage === 'Saved'),
  }), []);

  return (
    <div className="landing-page">
      <header className="topbar landing-topbar">
        <nav className="top-nav" aria-label="Primary navigation">
          {navigationItems.map(({ label, icon: Icon }) => {
            const isActive = activeNav === label;
            return (
              <button
                key={label}
                type="button"
                className={isActive ? 'top-nav-item active' : 'top-nav-item'}
                onClick={() => {
                  setActiveNav(label);
                  if (label === 'Profile') onCompleteProfile();
                }}
              >
                <Icon size={19} strokeWidth={isActive ? 2.6 : 2} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        <div className="header-right">
          <div className="profile-mini">
            {profile.photo?.startsWith('data:') ? <img src={profile.photo} alt="Profile" /> : profile.photo}
          </div>
          <button type="button" className="logout-btn header-logout" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <main className="dashboard-shell">
        <section className="profile-section panel">
          <div className="profile-summary">
            <div className="avatar-ring">
              <div className="avatar">
                {profile.photo?.startsWith('data:') ? <img src={profile.photo} alt="Profile" /> : profile.photo}
              </div>
            </div>
            <div className="profile-score">100%</div>
            <h2>{profile.name}</h2>
            <p className="muted light">Updated 1 week ago</p>
            <label className="photo-edit-button" htmlFor="profile-photo-input">Edit profile picture</label>
            <input id="profile-photo-input" className="profile-photo-input" type="file" accept="image/*" onChange={handlePhotoChange} />
            <div className="profile-actions">
              <button type="button" className="secondary profile-btn" onClick={onCompleteProfile}>Update Profile</button>
            </div>
          </div>

          <div className="insights-grid">
            <div className="mini-stat">
              <span className="metric">15</span>
              <span className="label">Search Appearance</span>
              <small>Last 30 days</small>
            </div>
            <div className="mini-stat">
              <span className="metric">3</span>
              <span className="label">Recruiters Activity</span>
              <small>Last 30 days</small>
            </div>
          </div>
        </section>

        <section className="jobs-section panel">
          <div className="jobs-header">
            <h3>Jobs</h3>
            <button type="button" className="link-button">View All</button>
          </div>

          <div className="tab-row">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? 'tab-button active' : 'tab-button'}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="job-list-grid">
            {jobsByTab[activeTab].map((job) => (
              <article key={job.id} className="job-card landing-job">
                <div className="job-head">
                  <div>
                    <h4>{job.title}</h4>
                    <p>{job.company}</p>
                  </div>
                  <span className="badge">{job.type}</span>
                </div>
                <div className="job-meta-row">
                  <span>{job.location}</span>
                  <span>{job.salary}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="profile-details panel">
          <h3>Professional profile</h3>
          <div className="detail-grid">
            <div><strong>Name:</strong> {profile.name}</div>
            <div><strong>Contact:</strong> {profile.contact}</div>
            <div><strong>Salary:</strong> {profile.currentSalary}</div>
            <div><strong>Experience:</strong> {profile.experience}</div>
            <div><strong>Education:</strong> {profile.education}</div>
            <div><strong>Location:</strong> {profile.location}</div>
            <div className="full"><strong>Skills:</strong> {profile.skills.join(', ')}</div>
            <div className="full"><strong>Certifications:</strong> {profile.certifications.join(', ')}</div>
            <div className="full"><strong>Languages:</strong> {profile.languages.join(', ')}</div>
          </div>
        </section>
      </main>

    </div>
  );
}

function App() {
  const [screen, setScreen] = useState('login');
  const [profile, setProfile] = useState(defaultProfile);
  const [userEmail, setUserEmail] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    const storedStatus = localStorage.getItem(STORAGE_KEY);
    if (storedStatus === 'new-user') {
      setScreen('profile-form');
      return;
    }

    if (storedStatus === 'existing-user') {
      setScreen('landing');
      return;
    }

    setScreen('login');
  }, []);

  const persistExistingUser = () => {
    localStorage.setItem(STORAGE_KEY, 'existing-user');
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setScreen('login');
  };

  const persistProfile = async (nextProfile) => {
    setProfile(nextProfile);
    if (!userEmail) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, profile: nextProfile }),
      });
      if (!response.ok) throw new Error('Unable to save profile');
    } catch (error) {
      console.warn('Unable to persist profile', error);
    }
  };

  const handleLogin = ({ user, profile: savedProfile, isFirstTime }) => {
    setUserEmail(user?.email || '');
    if (savedProfile && Object.keys(savedProfile).length > 0) {
      setProfile((currentProfile) => ({ ...currentProfile, ...savedProfile }));
    }

    if (isFirstTime) {
      localStorage.setItem(STORAGE_KEY, 'new-user');
      setIsEditingProfile(false);
      setScreen('profile-form');
      return;
    }

    persistExistingUser();
    setScreen('landing');
  };

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (screen === 'profile-form') {
    return (
      <ProfileSetupForm
        profile={profile}
        isEditing={isEditingProfile}
        onSave={(savedProfile) => {
          persistProfile(savedProfile);
          persistExistingUser();
          setIsEditingProfile(false);
          setScreen('landing');
        }}
        onSkip={() => {
          persistExistingUser();
          setIsEditingProfile(false);
          setScreen('landing');
        }}
      />
    );
  }

  return (
    <LandingDashboard
      profile={profile}
      onUpdateProfilePicture={(photo) => persistProfile({ ...profile, photo })}
      onCompleteProfile={() => {
        setIsEditingProfile(true);
        setScreen('profile-form');
      }}
      onLogout={logout}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
