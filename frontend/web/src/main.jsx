import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const fallbackJobs = [
  {
    id: 1,
    title: 'Frontend Developer',
    company: 'NovaLabs',
    location: 'Remote',
    type: 'Full-time',
    salary: '$120k - $150k',
  },
  {
    id: 2,
    title: 'Backend Engineer',
    company: 'Streamline AI',
    location: 'Bengaluru',
    type: 'Full-time',
    salary: '$130k - $160k',
  },
  {
    id: 3,
    title: 'UI/UX Designer',
    company: 'Motive Studio',
    location: 'Hyderabad',
    type: 'Contract',
    salary: '$80k - $110k',
  },
];

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('recruiter@jobportal.com');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [role, setRole] = useState('recruiter');
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

    if (isResend) {
      setResendLoading(true);
    } else {
      setLoadingOtp(true);
    }
    setError('');
    setSuccessMessage('');

    try {
      const endpoint = isResend ? 'http://localhost:5000/auth/resend-otp' : 'http://localhost:5000/auth/send-otp';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to send OTP');
      }

      setOtpSent(true);
      setSuccessMessage(data.message || 'OTP sent successfully.');
      setOtp('');
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || 'Unable to send OTP.');
      setOtpSent(false);
    } finally {
      if (isResend) {
        setResendLoading(false);
      } else {
        setLoadingOtp(false);
      }
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
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

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      onLogin(data);
    } catch (err) {
      setError(err.message || 'Unable to verify OTP.');
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">JOB PORTAL</p>
        <h1>Welcome back</h1>
        <p className="muted">Select your role and receive an OTP</p>

        <div className="role-toggle">
          <button
            type="button"
            className={role === 'recruiter' ? 'role-button active' : 'role-button'}
            onClick={() => {
              setRole('recruiter');
              setEmail('recruiter@jobportal.com');
              setOtp('');
              setOtpSent(false);
            }}
          >
            Recruiter
          </button>
          <button
            type="button"
            className={role === 'candidate' ? 'role-button active' : 'role-button'}
            onClick={() => {
              setRole('candidate');
              setEmail('candidate@jobportal.com');
              setOtp('');
              setOtpSent(false);
            }}
          >
            Candidate
          </button>
        </div>

        <form onSubmit={handleVerifyOtp} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'recruiter' ? 'recruiter@jobportal.com' : 'candidate@jobportal.com'}
            />
          </label>

          <button type="button" className="secondary" onClick={() => handleSendOtp(false)} disabled={loadingOtp}>
            {loadingOtp ? 'Sending...' : 'Send OTP'}
          </button>

          {successMessage ? <p className="success">{successMessage}</p> : null}

          {otpSent && (
            <button type="button" className="secondary" onClick={() => handleSendOtp(true)} disabled={resendLoading || resendCooldown > 0}>
              {resendLoading ? 'Resending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          )}

          {otpSent ? (
            <>
              <label>
                OTP
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                />
              </label>

              <button type="submit" disabled={loadingVerify}>
                {loadingVerify ? 'Verifying...' : 'Submit'}
              </button>
            </>
          ) : null}

          {error ? <p className="error">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}

function JobsScreen({ jobs, onOpenDashboard, onGoBack, role }) {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PORTAL</p>
          <h2>{role === 'candidate' ? 'Candidate Jobs' : 'Jobs'}</h2>
        </div>
        <div className="topbar-actions">
          <button className="secondary" onClick={onGoBack}>Back</button>
          {role === 'recruiter' ? (
            <button className="secondary" onClick={onOpenDashboard}>Recruiter Dashboard</button>
          ) : null}
        </div>
      </header>

      <div className="job-list">
        {jobs.map((job) => (
          <article key={job.id} className="job-card">
            <div className="job-head">
              <div>
                <h3>{job.title}</h3>
                <p className="company">{job.company}</p>
              </div>
              <span className="pill">{job.type}</span>
            </div>
            <p>{job.location}</p>
            <div className="job-meta">
              <span>{job.salary}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RecruiterDashboardScreen({ onGoBack }) {
  return (
    <div className="page-shell dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">RECRUITER</p>
          <h2>Dashboard</h2>
        </div>
        <button className="secondary" onClick={onGoBack}>Back</button>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <strong>24</strong>
          <span>Open Positions</span>
        </div>
        <div className="stat-card">
          <strong>11</strong>
          <span>Interviews</span>
        </div>
        <div className="stat-card">
          <strong>18</strong>
          <span>Shortlisted</span>
        </div>
      </div>

      <div className="dashboard-panel">
        <h3>Recent Applicants</h3>
        <ul>
          <li>Jane Doe — Frontend Developer</li>
          <li>Samir Khan — Product Designer</li>
          <li>Amelia Lee — Backend Engineer</li>
        </ul>
      </div>
    </div>
  );
}

function App() {
  const getScreenFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'login';
  };

  const [screen, setScreen] = useState(getScreenFromHash());
  const [jobs, setJobs] = useState(fallbackJobs);
  const [user, setUser] = useState(null);

  const navigateTo = (nextScreen) => {
    setScreen(nextScreen);
    const nextHash = nextScreen === 'login' ? '#login' : `#${nextScreen}`;
    window.history.pushState({ screen: nextScreen }, '', nextHash);
  };

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await fetch('http://localhost:5000/jobs');
        if (!response.ok) {
          throw new Error('Backend unavailable');
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setJobs(data);
        }
      } catch (error) {
        console.warn('Using fallback jobs data:', error.message);
      }
    };

    loadJobs();

    const handlePopState = () => {
      setScreen(getScreenFromHash());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (screen === 'login') {
    return (
      <LoginScreen
        onLogin={(data) => {
          setUser(data);
          navigateTo(data.user.role === 'candidate' ? 'candidate-jobs' : 'jobs');
        }}
      />
    );
  }

  if (screen === 'dashboard') {
    return <RecruiterDashboardScreen onGoBack={() => navigateTo('jobs')} />;
  }

  if (screen === 'candidate-jobs') {
    return (
      <JobsScreen
        jobs={jobs}
        role={user?.user?.role || 'candidate'}
        onOpenDashboard={() => navigateTo('dashboard')}
        onGoBack={() => navigateTo('login')}
      />
    );
  }

  return (
    <JobsScreen
      jobs={jobs}
      role={user?.user?.role || 'recruiter'}
      onOpenDashboard={() => navigateTo('dashboard')}
      onGoBack={() => navigateTo('login')}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
