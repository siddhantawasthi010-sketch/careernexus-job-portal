import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ChevronDown, ChevronUp, Download, FileText, GraduationCap, Home, Library, Pencil, Plus, Send, Trash2, Upload, User } from 'lucide-react';
import { locationSuggestions } from '../../shared/locations';
import { calculateProfileCompletion, formatProfileUpdatedAt, languageSuggestions, noticePeriodOptions } from '../../shared/profile';
import './styles.css';

const defaultProfile = {
  name: '',
  headline: '',
  currentlyWorkingAs: '',
  email: '',
  currentIndustry: '',
  department: '',
  currentRole: '',
  currentJobTitle: '',
  noticePeriod: '',
  dateOfBirth: '',
  address: '',
  location: '',
  languages: [],
  preferredJobRole: '',
  preferredCity: '',
  jobType: '',
  employmentType: '',
  preferredShift: '',
  education: '',
  skills: [],
  employmentDetails: [],
  majorProjects: [],
  contact: '',
  photo: '',
  updatedAt: null,
};

const tabs = ['Applied Jobs', 'Recommended Jobs'];
const navigationItems = [
  { label: 'Home', icon: Home },
  { label: 'Apply', icon: Send },
  { label: 'Profile', icon: User },
  { label: 'Library', icon: Library },
  { label: 'Courses', icon: GraduationCap },
];
const STORAGE_KEY = 'jobportal_user_profile_status';
const ACCOUNT_EMAIL_KEY = 'jobportal_account_email';
const API_BASE_URL = 'http://localhost:5000';

const getSalaryInputValue = (value = '') => value.replace(/^(INR|₹)\s*/i, '');
const displayValue = (value) => Array.isArray(value) ? value.join(', ') || 'Not added' : value || 'Not added';

function LocationField({ label, value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const suggestions = query.trim()
    ? locationSuggestions.filter((location) => location.toLowerCase().includes(query.trim().toLowerCase()))
    : [];
  const selectLocation = (location) => {
    setQuery(location);
    onChange(location);
    setIsFocused(false);
  };

  return (
    <div className="location-field">
      <label><span>{label}</span><input value={query} onChange={(event) => { setQuery(event.target.value); onChange(event.target.value); }} onFocus={() => setIsFocused(true)} onBlur={() => setTimeout(() => setIsFocused(false), 120)} placeholder="Start typing a city" /></label>
      {isFocused && suggestions.length > 0 && <div className="location-suggestions">
        {suggestions.map((location) => <button key={location} type="button" onMouseDown={(event) => { event.preventDefault(); selectLocation(location); }}>{location}</button>)}
      </div>}
    </div>
  );
}

function PreferredCitiesField({ value, onChange, error }) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const selectedCities = Array.isArray(value) ? value : value ? [value] : [];
  const suggestions = selectedCities.length >= 3 ? [] : locationSuggestions.filter((city) => (
    !selectedCities.includes(city) && city.toLowerCase().includes(query.trim().toLowerCase())
  ));

  const selectCity = (city) => {
    onChange([...selectedCities, city]);
    setQuery('');
  };

  return <div className="location-field preferred-cities-field">
    <label><span>Preferred city</span><input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setTimeout(() => setIsFocused(false), 120)} placeholder={selectedCities.length >= 3 ? 'Maximum 3 cities selected' : 'Search and select up to 3 cities'} /></label>
    {isFocused && suggestions.length > 0 && <div className="location-suggestions">
      {suggestions.map((city) => <button key={city} type="button" onMouseDown={(event) => { event.preventDefault(); selectCity(city); }}>{city}</button>)}
    </div>}
    <div className="profile-tiles">{selectedCities.map((city) => <button className="profile-tile" key={city} type="button" aria-label={`Remove ${city}`} onClick={() => onChange(selectedCities.filter((item) => item !== city))}>{city}<span aria-hidden="true">×</span></button>)}</div>
    <p className={error ? 'preferred-city-hint error' : 'preferred-city-hint'}>{error || 'Select at least 1 and up to 3 cities.'}</p>
  </div>;
}

function LanguageField({ value = [], onChange }) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const selectedLanguages = Array.isArray(value) ? value : [];
  const suggestions = languageSuggestions.filter((language) => (
    !selectedLanguages.includes(language) && language.toLowerCase().includes(query.trim().toLowerCase())
  ));

  const selectLanguage = (language) => {
    onChange([...selectedLanguages, language]);
    setQuery('');
  };

  return <div className="location-field language-field">
    <label><span>Languages</span><input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setTimeout(() => setIsFocused(false), 120)} placeholder="Search and select languages" /></label>
    {isFocused && suggestions.length > 0 && <div className="location-suggestions language-suggestions">
      {suggestions.map((language) => <button key={language} type="button" onMouseDown={(event) => { event.preventDefault(); selectLanguage(language); }}>{language}</button>)}
    </div>}
    <div className="profile-tiles">{selectedLanguages.map((language) => <button className="profile-tile" key={language} type="button" aria-label={`Remove ${language}`} onClick={() => onChange(selectedLanguages.filter((item) => item !== language))}>{language}<span aria-hidden="true">×</span></button>)}</div>
  </div>;
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('candidate@jobportal.com');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [role, setRole] = useState('candidate');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSendOtp = async () => {
    if (loadingOtp || resendCooldown > 0) return;
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setLoadingOtp(true);

    try {
      const response = await fetch('http://localhost:5000/auth/send-otp', {
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
      setLoadingOtp(false);
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

          <button type="button" className="otp-action" onClick={handleSendOtp} disabled={loadingOtp || resendCooldown > 0}>{loadingOtp ? 'Sending...' : resendCooldown > 0 ? `Send OTP in ${resendCooldown}s` : 'Send OTP'}</button>
          {successMessage && <p className="success">{successMessage}</p>}

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

function ProfileSetupForm({ profile, onSave, onSkip, isEditing, sectionToEdit }) {
  const [form, setForm] = useState(() => ({ ...defaultProfile, ...profile }));
  const [skillDraft, setSkillDraft] = useState(profile.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [preferredCityError, setPreferredCityError] = useState('');

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const updateEntry = (collection, index, field, value) => setForm((prev) => ({
    ...prev,
    [collection]: prev[collection].map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: value } : entry),
  }));
  const addEntry = (collection, entry) => updateField(collection, [...(form[collection] || []), entry]);
  const removeEntry = (collection, index) => updateField(collection, form[collection].filter((_, entryIndex) => entryIndex !== index));
  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !skillDraft.some((item) => item.toLowerCase() === skill.toLowerCase())) setSkillDraft((items) => [...items, skill]);
    setSkillInput('');
  };
  const input = (label, key, type = 'text') => <label key={key}><span>{label}</span><input type={type} value={form[key] || ''} onChange={(event) => updateField(key, event.target.value)} /></label>;
  const select = (label, key, options) => <label key={key}><span>{label}</span><select value={form[key] || ''} onChange={(event) => updateField(key, event.target.value)}><option value="">Select</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  const saveForm = () => {
    const cityCount = Array.isArray(form.preferredCity) ? form.preferredCity.length : form.preferredCity ? 1 : 0;
    if ((!sectionToEdit || sectionToEdit === 'careerPreferences') && cityCount < 1) {
      setPreferredCityError('Select at least 1 preferred city.');
      return;
    }
    onSave({ ...form, skills: skillDraft });
  };

  return (
    <div className="page-shell profile-form-shell">
      <div className="profile-form-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">PROFILE</p>
          </div>
          <button className="secondary" type="button" onClick={onSkip}>{sectionToEdit ? 'Cancel' : 'Skip for now'}</button>
        </div>

        {(!sectionToEdit || sectionToEdit === 'professionalProfile') && <ProfileFormSection title="Professional Profile">
          <div className="form-grid">
            {input('Profile headline', 'headline')}{input('Name', 'name')}{input('Contact', 'contact')}{input('Currently working as', 'currentlyWorkingAs')}{input('Email ID', 'email', 'email')}{input('Education', 'education')}
            <LocationField label="Current location" value={form.location} onChange={(value) => updateField('location', value)} />
            <LanguageField value={form.languages} onChange={(value) => updateField('languages', value)} />
          </div>
        </ProfileFormSection>}

        {(!sectionToEdit || sectionToEdit === 'professionalInfo') && <ProfileFormSection title="Professional Info"><div className="form-grid">
          {input('Current industry', 'currentIndustry')}{input('Department', 'department')}{input('Current role', 'currentRole')}{input('Current job title', 'currentJobTitle')}{select('Notice period', 'noticePeriod', noticePeriodOptions)}{input('Date of birth', 'dateOfBirth', 'date')}{input('Address', 'address')}
        </div></ProfileFormSection>}

        {(!sectionToEdit || sectionToEdit === 'careerPreferences') && <ProfileFormSection title="Career Preferences"><div className="form-grid">
          {input('Preferred job role', 'preferredJobRole')}<PreferredCitiesField value={form.preferredCity} error={preferredCityError} onChange={(value) => { updateField('preferredCity', value); setPreferredCityError(''); }} />{select('Job type', 'jobType', ['Permanent', 'Contractual'])}{select('Employment type', 'employmentType', ['Full Time', 'Part Time'])}{select('Preferred shift', 'preferredShift', ['Day', 'Night', 'Rotational'])}
        </div></ProfileFormSection>}

        {(!sectionToEdit || sectionToEdit === 'keySkillsSet') && <ProfileFormSection title="Key Skills Set">
          <div className="skill-entry"><input aria-label="Add a skill" value={skillInput} onChange={(event) => setSkillInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSkill(); } }} placeholder="Add a skill" /><button type="button" className="icon-button" aria-label="Add skill" onClick={addSkill}><Plus size={18} /></button></div>
          <div className="profile-tiles">{skillDraft.map((skill) => <button className="profile-tile" key={skill} type="button" onClick={() => setSkillDraft((items) => items.filter((item) => item !== skill))}>{skill}<span aria-hidden="true">×</span></button>)}</div>
          {!sectionToEdit && <div className="actions-row"><button type="button" className="secondary" onClick={() => { setSkillDraft(form.skills || []); setSkillInput(''); }}>Cancel</button><button type="button" onClick={() => updateField('skills', skillDraft)}>Save skills</button></div>}
        </ProfileFormSection>}

        {(!sectionToEdit || sectionToEdit === 'employmentDetails') && <ProfileFormSection title="Employment Details" action={<button type="button" className="secondary icon-label-button" onClick={() => addEntry('employmentDetails', { isCurrent: false, employmentType: '', companyName: '', jobTitle: '', joiningDate: '', relievingDate: '', ctc: '', skills: [], jobProfile: '', noticePeriod: '' })}><Plus size={16} /> Add company</button>}>
          {(form.employmentDetails || []).map((employment, index) => <article className="repeat-entry" key={index}>
            <div className="repeat-entry-heading"><strong>{employment.companyName || `Company ${index + 1}`}</strong><button type="button" className="icon-button danger" aria-label="Remove company" onClick={() => removeEntry('employmentDetails', index)}><Trash2 size={16} /></button></div>
            <div className="form-grid">
              <label><span>Current company?</span><select value={employment.isCurrent ? 'Yes' : 'No'} onChange={(event) => updateEntry('employmentDetails', index, 'isCurrent', event.target.value === 'Yes')}><option>No</option><option>Yes</option></select></label>
              <label><span>Employment type</span><select value={employment.employmentType || ''} onChange={(event) => updateEntry('employmentDetails', index, 'employmentType', event.target.value)}><option value="">Select</option><option>Full Time</option><option>Part Time</option></select></label>
              {['companyName:Company name', 'jobTitle:Job title', 'ctc:CTC'].map((field) => { const [key, label] = field.split(':'); return <label key={key}><span>{label}</span><input value={employment[key] || ''} onChange={(event) => updateEntry('employmentDetails', index, key, event.target.value)} /></label>; })}
              <label><span>Joining date</span><input type="date" value={employment.joiningDate || ''} onChange={(event) => updateEntry('employmentDetails', index, 'joiningDate', event.target.value)} /></label>
              {!employment.isCurrent && <label><span>Relieving date</span><input type="date" value={employment.relievingDate || ''} onChange={(event) => updateEntry('employmentDetails', index, 'relievingDate', event.target.value)} /></label>}
              <label><span>Skills</span><input value={(employment.skills || []).join(', ')} onChange={(event) => updateEntry('employmentDetails', index, 'skills', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></label>
              <label className="full-width"><span>Job profile</span><textarea value={employment.jobProfile || ''} onChange={(event) => updateEntry('employmentDetails', index, 'jobProfile', event.target.value)} /></label>
              {employment.isCurrent && <label><span>Notice period</span><select value={employment.noticePeriod || ''} onChange={(event) => updateEntry('employmentDetails', index, 'noticePeriod', event.target.value)}><option value="">Select</option>{noticePeriodOptions.map((option) => <option key={option}>{option}</option>)}</select></label>}
            </div>
          </article>)}
        </ProfileFormSection>}

        {(!sectionToEdit || sectionToEdit === 'majorProjects') && <ProfileFormSection title="Major Projects" action={<button type="button" className="secondary icon-label-button" onClick={() => addEntry('majorProjects', { projectTitle: '', companyName: '', clientName: '', status: '', workedFrom: '', workedTill: '', projectDetails: '' })}><Plus size={16} /> Add project</button>}>
          {(form.majorProjects || []).map((project, index) => <article className="repeat-entry" key={index}>
            <div className="repeat-entry-heading"><strong>{project.projectTitle || `Project ${index + 1}`}</strong><div className="repeat-entry-actions">{project.saved && <button type="button" className="secondary" onClick={() => updateEntry('majorProjects', index, 'saved', false)}>Edit</button>}<button type="button" className="icon-button danger" aria-label="Remove project" onClick={() => removeEntry('majorProjects', index)}><Trash2 size={16} /></button></div></div>
            {project.saved ? <div className="saved-entry-summary"><p>{[project.companyName, project.clientName, project.status].filter(Boolean).join(' · ')}</p><p>{project.workedFrom || 'Start date not added'}{project.workedTill ? ` to ${project.workedTill}` : ''}</p><p>{project.projectDetails}</p></div> : <div className="form-grid">
              <label><span>Project title</span><input value={project.projectTitle || ''} onChange={(event) => updateEntry('majorProjects', index, 'projectTitle', event.target.value)} /></label>
              <label><span>Company</span><select value={project.companyName || ''} onChange={(event) => updateEntry('majorProjects', index, 'companyName', event.target.value)}><option value="">Select company</option>{(form.employmentDetails || []).map((employment, companyIndex) => employment.companyName && <option key={`${employment.companyName}-${companyIndex}`}>{employment.companyName}</option>)}</select></label>
              <label><span>Client name (optional)</span><input value={project.clientName || ''} onChange={(event) => updateEntry('majorProjects', index, 'clientName', event.target.value)} /></label>
              <label><span>Project status</span><select value={project.status || ''} onChange={(event) => updateEntry('majorProjects', index, 'status', event.target.value)}><option value="">Select</option><option>In progress</option><option>Finished</option></select></label>
              <label><span>Worked from</span><input type="date" value={project.workedFrom || ''} onChange={(event) => updateEntry('majorProjects', index, 'workedFrom', event.target.value)} /></label>
              <label><span>Worked till</span><input type="date" value={project.workedTill || ''} onChange={(event) => updateEntry('majorProjects', index, 'workedTill', event.target.value)} /></label>
              <label className="full-width"><span>Project details</span><textarea value={project.projectDetails || ''} onChange={(event) => updateEntry('majorProjects', index, 'projectDetails', event.target.value)} /></label>
              <div className="actions-row"><button type="button" className="secondary" onClick={() => removeEntry('majorProjects', index)}>Cancel</button><button type="button" onClick={() => updateEntry('majorProjects', index, 'saved', true)}>Save project</button></div>
            </div>}
          </article>)}
        </ProfileFormSection>}

        <div className="actions-row">
          {!sectionToEdit && <button type="button" className="secondary" onClick={onSkip}>Later</button>}
          {sectionToEdit && <button type="button" className="secondary" onClick={onSkip}>Cancel</button>}
          <button type="button" onClick={saveForm}>{sectionToEdit === 'keySkillsSet' ? 'Save skills' : sectionToEdit ? 'Save changes' : isEditing ? 'Update profile' : 'Create profile'}</button>
        </div>
      </div>
    </div>
  );
}

function ProfileFormSection({ title, action, children }) {
  return <section className="profile-form-section"><div className="profile-form-section-heading"><h2>{title}</h2>{action}</div>{children}</section>;
}

function ResumeSection({ resume, onUpload, onDownload, onDelete }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.(pdf|doc|docx|rtf)$/i.test(file.name)) {
      setError('Choose a PDF, DOC, DOCX, or RTF file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Resume file must be 2 MB or smaller.');
      return;
    }

    setError('');
    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to upload resume.');
    } finally {
      setIsUploading(false);
    }
  };

  const runAction = async (action) => {
    setError('');
    try {
      await action();
    } catch (actionError) {
      setError(actionError.message || 'Unable to complete this resume action.');
    }
  };

  return <section className="resume-panel panel">
    <div className="resume-heading"><div className="resume-heading-title"><FileText size={19} /><h3>Resume</h3></div>{resume?.uploadedAt && <span>Updated {new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(resume.uploadedAt))}</span>}</div>
    {resume ? <div className="resume-file-row">
      <div className="resume-file-info"><FileText size={20} /><div><strong>{resume.fileName}</strong><span>{(resume.size / (1024 * 1024)).toFixed(2)} MB</span></div></div>
      <div className="resume-actions"><button type="button" className="resume-icon-button" aria-label="Download resume" title="Download resume" onClick={() => runAction(onDownload)}><Download size={17} /></button><button type="button" className="resume-icon-button danger" aria-label="Delete resume" title="Delete resume" onClick={() => runAction(onDelete)}><Trash2 size={17} /></button></div>
    </div> : <p className="resume-empty">No resume uploaded yet.</p>}
    <label className="resume-upload" htmlFor="resume-file-input"><Upload size={17} /><span>{isUploading ? 'Uploading resume…' : resume ? 'Update resume' : 'Upload resume'}</span><input id="resume-file-input" type="file" accept=".pdf,.doc,.docx,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf" onChange={handleFileChange} disabled={isUploading} /></label>
    <p className="resume-hint">PDF, DOC, DOCX, or RTF · Up to 2 MB</p>
    {error && <p className="resume-error" role="alert">{error}</p>}
  </section>;
}

function JobListingCard({ job, onApply, isApplied = false, compact = false }) {
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState('');

  const apply = async () => {
    setError('');
    const applicationWindow = !isApplied ? window.open('about:blank', '_blank') : null;
    if (applicationWindow) applicationWindow.opener = null;
    setIsApplying(true);
    try {
      await onApply(job);
      if (applicationWindow) applicationWindow.location.replace(job.url);
      else if (!isApplied) window.open(job.url, '_blank', 'noopener,noreferrer');
    } catch (applyError) {
      applicationWindow?.close();
      setError(applyError.message || 'Unable to save this application.');
    } finally {
      setIsApplying(false);
    }
  };

  return <article className={compact ? 'job-card live-job-card compact' : 'job-card live-job-card'}>
    <div className="job-head"><div><h4>{job.title}</h4><p>{job.company} · {job.source}</p></div><span className="badge">{job.matchScore}% match</span></div>
    <div className="job-meta-row"><span>{job.location || 'Location not listed'}</span><span>{job.type || 'Type not listed'}</span></div>
    <div className="job-card-actions"><a href={job.url} target="_blank" rel="noreferrer">View listing</a>{isApplied ? <span className="applied-status">Applied</span> : <button type="button" className="job-apply-button" disabled={isApplying} onClick={apply}>{isApplying ? 'Saving…' : 'Apply'}</button>}</div>
    {error && <p className="job-apply-error" role="alert">{error}</p>}
  </article>;
}

function LibraryTopics({ topics }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState('All');
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const availableLetters = new Set(topics.map((topic) => topic.name.charAt(0).toUpperCase()));
  const filteredTopics = topics.filter((topic) => {
    const matchesLetter = activeLetter === 'All' || topic.name.toUpperCase().startsWith(activeLetter);
    const matchesSearch = [topic.name, topic.briefDescription, topic.explanation, topic.example]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
    return matchesLetter && matchesSearch;
  });

  const toggleTopic = (topicName) => {
    setExpandedTopics((currentTopics) => {
      const nextTopics = new Set(currentTopics);
      if (nextTopics.has(topicName)) nextTopics.delete(topicName); else nextTopics.add(topicName);
      return nextTopics;
    });
  };

  return (
    <section className="library-section panel">
      <div className="library-header">
        <div>
          <p className="eyebrow library-eyebrow">TESTING LIBRARY</p>
          <h2>Software testing topics</h2>
          <p className="library-intro">Build a stronger testing foundation, one concept at a time.</p>
        </div>
        <span className="topic-count">{filteredTopics.length} topics</span>
      </div>

      <label className="library-search-label" htmlFor="library-search">Search topics</label>
      <input
        id="library-search"
        className="library-search"
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search by topic, concept, or example"
      />

      <div className="alphabet-filter" aria-label="Filter topics by first letter">
        <button type="button" className={activeLetter === 'All' ? 'alphabet-button active' : 'alphabet-button'} onClick={() => setActiveLetter('All')}>All</button>
        {alphabet.map((letter) => (
          <button
            key={letter}
            type="button"
            className={activeLetter === letter ? 'alphabet-button active' : 'alphabet-button'}
            onClick={() => setActiveLetter(letter)}
            disabled={!availableLetters.has(letter)}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="topic-list">
        {filteredTopics.map((topic) => {
          const isExpanded = expandedTopics.has(topic.name);
          return (
            <article key={topic.name} className={isExpanded ? 'topic-card expanded' : 'topic-card'}>
              <button
                type="button"
                className="topic-toggle"
                onClick={() => toggleTopic(topic.name)}
                aria-expanded={isExpanded}
                aria-controls={`topic-details-${topic.name.replaceAll(' ', '-')}`}
              >
                <span>{topic.name}</span>
                {isExpanded ? <ChevronUp size={21} /> : <ChevronDown size={21} />}
              </button>
              {isExpanded && <div id={`topic-details-${topic.name.replaceAll(' ', '-')}`} className="topic-details">
                <p className="topic-brief">{topic.briefDescription}</p>
                <div className="topic-field">
                  <h4>Explanation in detail</h4>
                  <p>{topic.explanation}</p>
                </div>
                <div className="topic-field topic-example">
                  <h4>Example</h4>
                  <pre><code>{topic.example}</code></pre>
                </div>
              </div>}
            </article>
          );
        })}
      </div>

      {filteredTopics.length === 0 && <p className="empty-library">No testing topics match “{searchQuery}”.</p>}
    </section>
  );
}

function LibraryView() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/library/topics`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load library topics');
        setTopics(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(loadError.message || 'Unable to load library topics');
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, []);

  if (loading) return <section className="library-section panel"><p className="library-status">Loading testing topics...</p></section>;
  if (error) return <section className="library-section panel"><p className="library-status error">{error}</p></section>;

  return <LibraryTopics topics={topics} />;
}

function CoursesList({ courses }) {
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCourses = courses.filter((course) => (
    [course.title, course.topic, course.provider, course.level, course.duration]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  ));

  return (
    <section className="courses-section panel">
      <div className="courses-header">
        <div>
          <p className="eyebrow courses-eyebrow">LEARNING PATHS</p>
          <h2>Online courses</h2>
          <p className="courses-intro">Practical courses for testing topics and skills commonly listed in job descriptions.</p>
        </div>
        <span className="course-count">{filteredCourses.length} courses</span>
      </div>

      <label className="courses-search-label" htmlFor="courses-search">Search courses</label>
      <input
        id="courses-search"
        className="courses-search"
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search by skill, topic, or provider"
      />

      <div className="course-list">
        {filteredCourses.map((course) => (
          <article key={course.title} className="course-card">
            <div className="course-card-header">
              <div>
                <p className="course-topic">{course.topic}</p>
                <h3>{course.title}</h3>
              </div>
              <span className="course-level">{course.level}</span>
            </div>
            <div className="course-meta">
              <span>{course.provider}</span>
              <span>{course.duration}</span>
            </div>
            <a className="course-link" href={course.url} target="_blank" rel="noreferrer">View course</a>
          </article>
        ))}
      </div>

      {filteredCourses.length === 0 && <p className="empty-library">No courses match “{searchQuery}”.</p>}
    </section>
  );
}

function CoursesView() {
  const [courseList, setCourseList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/courses`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load courses');
        setCourseList(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(loadError.message || 'Unable to load courses');
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  if (loading) return <section className="courses-section panel"><p className="library-status">Loading courses...</p></section>;
  if (error) return <section className="courses-section panel"><p className="library-status error">{error}</p></section>;

  return <CoursesList courses={courseList} />;
}

function LandingDashboard({ profile, email, initialNav, onEditProfileSection, onLogout, onUpdateProfilePicture, onUploadResume, onDownloadResume, onDeleteResume }) {
  const [activeTab, setActiveTab] = useState('Applied Jobs');
  const [activeNav, setActiveNav] = useState(initialNav);
  const [recommendations, setRecommendations] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState('');

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onUpdateProfilePicture(reader.result).catch((error) => window.alert(error.message || 'Unable to update profile picture.'));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  useEffect(() => {
    if (!email) return undefined;
    let isActive = true;
    setIsLoadingJobs(true);
    setJobsError('');
    Promise.all([
      fetch(`${API_BASE_URL}/jobs/recommendations?email=${encodeURIComponent(email)}`),
      fetch(`${API_BASE_URL}/jobs/applications?email=${encodeURIComponent(email)}`),
    ]).then(async ([recommendationResponse, applicationResponse]) => {
      const [recommendationData, applicationData] = await Promise.all([recommendationResponse.json(), applicationResponse.json()]);
      if (!recommendationResponse.ok) throw new Error(recommendationData.message || 'Unable to load job recommendations.');
      if (!applicationResponse.ok) throw new Error(applicationData.message || 'Unable to load applied jobs.');
      if (isActive) {
        setRecommendations(Array.isArray(recommendationData.jobs) ? recommendationData.jobs : []);
        setAppliedJobs(Array.isArray(applicationData) ? applicationData : []);
      }
    }).catch((error) => {
      if (isActive) setJobsError(error.message || 'Unable to load jobs.');
    }).finally(() => {
      if (isActive) setIsLoadingJobs(false);
    });
    return () => { isActive = false; };
  }, [email]);

  const appliedIds = new Set(appliedJobs.map((job) => job.id));
  const homeJobs = recommendations.filter((job) => job.matchScore >= 50 && !appliedIds.has(job.id));
  const recommendedJobs = recommendations.filter((job) => job.matchScore >= 70 && !appliedIds.has(job.id));
  const jobsByTab = { 'Applied Jobs': appliedJobs, 'Recommended Jobs': recommendedJobs };

  const applyToJob = async (job) => {
    const response = await fetch(`${API_BASE_URL}/jobs/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, job }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to save this application.');
    setAppliedJobs((currentJobs) => [data, ...currentJobs.filter((currentJob) => currentJob.id !== data.id)]);
    return data;
  };

  return (
    <div className={activeNav === 'Profile' ? 'landing-page profile-page' : 'landing-page'}>
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
            {profile.photo?.startsWith('data:') ? <img src={profile.photo} alt="Profile" /> : profile.photo || profile.name?.split(/\s+/).map((part) => part[0]).join('').toUpperCase() || 'U'}
          </div>
          <button type="button" className="logout-btn header-logout" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <main className="dashboard-shell">
        {activeNav === 'Profile' && <section className="profile-section panel">
          <div className="profile-summary">
            <div className="profile-identity">
              <div className="profile-avatar-block">
                <div className="avatar-ring">
                  <div className="avatar">
                    {profile.photo?.startsWith('data:') ? <img src={profile.photo} alt="Profile" /> : profile.photo || profile.name?.split(/\s+/).map((part) => part[0]).join('').toUpperCase() || 'U'}
                  </div>
                  <label className="photo-edit-icon" htmlFor="profile-photo-input" aria-label="Edit profile picture" title="Edit profile picture"><Pencil size={16} /></label>
                </div>
                <div className="profile-score"><strong>{calculateProfileCompletion(profile)}%</strong><span>complete</span></div>
              </div>
              <div className="profile-identity-info"><h2>{profile.name || 'Your profile'}</h2><p>{profile.headline}</p><span>{profile.currentlyWorkingAs}</span></div>
              <p className="profile-updated light">{formatProfileUpdatedAt(profile.updatedAt)}</p>
            </div>
            <input id="profile-photo-input" className="profile-photo-input" type="file" accept="image/*" onChange={handlePhotoChange} />
          </div>
        </section>}

        {activeNav === 'Profile' && <ResumeSection resume={profile.resume} onUpload={onUploadResume} onDownload={onDownloadResume} onDelete={onDeleteResume} />}

        {activeNav === 'Home' && <section className="insights-grid home-insights panel">
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
        </section>}

        {activeNav === 'Home' && <section className="jobs-section panel">
          <div className="jobs-header"><div><h3>Recommended for you</h3><p className="jobs-section-intro">Live career-portal listings with at least a 50% profile match.</p></div><button type="button" className="link-button" onClick={() => setActiveNav('Apply')}>View all</button></div>
          {isLoadingJobs && <p className="library-status">Fetching fresh career-portal jobs...</p>}
          {jobsError && <p className="library-status error">{jobsError}</p>}
          {!isLoadingJobs && !jobsError && homeJobs.length === 0 && <p className="library-status">No jobs currently match your profile and preferred cities.</p>}
          <div className="job-list-grid">{homeJobs.slice(0, 6).map((job) => <JobListingCard key={job.id} job={job} onApply={applyToJob} compact />)}</div>
        </section>}

        {activeNav === 'Apply' && <section className="jobs-section panel">
          <div className="jobs-header">
            <div><h3>Jobs</h3><p className="jobs-section-intro">Recommendations are ranked by profile match and preferred location.</p></div>
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

          {isLoadingJobs && <p className="library-status">Fetching fresh career-portal jobs...</p>}
          {jobsError && <p className="library-status error">{jobsError}</p>}
          {!isLoadingJobs && !jobsError && jobsByTab[activeTab].length === 0 && <p className="library-status">{activeTab === 'Applied Jobs' ? 'You have not applied to any jobs yet.' : 'No jobs currently meet the 70% recommendation threshold.'}</p>}
          {!isLoadingJobs && !jobsError && <div className="job-list-grid">{jobsByTab[activeTab].map((job) => <JobListingCard key={job.id} job={job} onApply={applyToJob} isApplied={activeTab === 'Applied Jobs'} />)}</div>}
        </section>}

        {activeNav === 'Profile' && <div className="profile-sections">
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Professional Profile</h3><button type="button" className="profile-edit-icon" aria-label="Edit Professional Profile" title="Edit Professional Profile" onClick={() => onEditProfileSection('professionalProfile')}><Pencil size={17} /></button></div><div className="detail-grid">
            {[['Profile headline', profile.headline], ['Name', profile.name], ['Contact', profile.contact], ['Currently working as', profile.currentlyWorkingAs], ['Email ID', profile.email], ['Education', profile.education], ['Current location', profile.location], ['Languages', profile.languages]].map(([label, value]) => <div key={label}><strong>{label}:</strong> {displayValue(value)}</div>)}
          </div></section>
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Professional Info</h3><button type="button" className="profile-edit-icon" aria-label="Edit Professional Info" title="Edit Professional Info" onClick={() => onEditProfileSection('professionalInfo')}><Pencil size={17} /></button></div><div className="detail-grid">
            {[['Current industry', profile.currentIndustry], ['Department', profile.department], ['Current role', profile.currentRole], ['Current job title', profile.currentJobTitle], ['Notice period', profile.noticePeriod], ['DOB', profile.dateOfBirth], ['Address', profile.address]].map(([label, value]) => <div key={label}><strong>{label}:</strong> {displayValue(value)}</div>)}
          </div></section>
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Career Preferences</h3><button type="button" className="profile-edit-icon" aria-label="Edit Career Preferences" title="Edit Career Preferences" onClick={() => onEditProfileSection('careerPreferences')}><Pencil size={17} /></button></div><div className="detail-grid">
            {[['Preferred job role', profile.preferredJobRole], ['Preferred city', profile.preferredCity], ['Job type', profile.jobType], ['Employment type', profile.employmentType], ['Preferred shift', profile.preferredShift]].map(([label, value]) => <div key={label}><strong>{label}:</strong> {displayValue(value)}</div>)}
          </div></section>
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Key Skills Set</h3><button type="button" className="profile-edit-icon" aria-label="Edit Key Skills Set" title="Edit Key Skills Set" onClick={() => onEditProfileSection('keySkillsSet')}><Pencil size={17} /></button></div><div className="profile-tiles">{(profile.skills || []).map((skill) => <span className="profile-tile" key={skill}>{skill}</span>)}</div></section>
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Employment Details</h3><button type="button" className="profile-edit-icon" aria-label="Edit Employment Details" title="Edit Employment Details" onClick={() => onEditProfileSection('employmentDetails')}><Pencil size={17} /></button></div>{(profile.employmentDetails || []).map((employment, index) => <article className="profile-record" key={index}><strong>{employment.companyName || `Company ${index + 1}`}</strong><div>{displayValue(employment.jobTitle)} · {employment.employmentType || 'Employment type not added'} · CTC: {displayValue(employment.ctc)}</div><small>{employment.joiningDate || 'Joining date not added'}{employment.isCurrent ? ' · Current' : employment.relievingDate ? ` to ${employment.relievingDate}` : ''}</small><p>Skills: {displayValue(employment.skills)} · Notice period: {employment.noticePeriod || 'Not added'}</p><p>{employment.jobProfile}</p></article>)}{!profile.employmentDetails?.length && <p className="muted">No employment details added.</p>}</section>
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Major Projects</h3><button type="button" className="profile-edit-icon" aria-label="Edit Major Projects" title="Edit Major Projects" onClick={() => onEditProfileSection('majorProjects')}><Pencil size={17} /></button></div>{(profile.majorProjects || []).map((project, index) => <article className="profile-record" key={index}><strong>{project.projectTitle || `Project ${index + 1}`}</strong><div>{[project.companyName, project.clientName, project.status].filter(Boolean).join(' · ')}</div><small>{project.workedFrom || 'Start date not added'}{project.workedTill ? ` to ${project.workedTill}` : ''}</small><p>{project.projectDetails}</p></article>)}{!profile.majorProjects?.length && <p className="muted">No projects added.</p>}</section>
        </div>}

        {activeNav === 'Library' && <LibraryView />}

        {activeNav === 'Courses' && <CoursesView />}
      </main>

    </div>
  );
}

function App() {
  const [screen, setScreen] = useState('login');
  const [profile, setProfile] = useState(defaultProfile);
  const [userEmail, setUserEmail] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [sectionToEdit, setSectionToEdit] = useState(null);
  const [landingNav, setLandingNav] = useState('Home');

  useEffect(() => {
    const savedEmail = localStorage.getItem(ACCOUNT_EMAIL_KEY);
    if (savedEmail) setUserEmail(savedEmail);
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

  useEffect(() => {
    if (!userEmail) return undefined;
    let isActive = true;
    fetch(`${API_BASE_URL}/auth/profile/resume?email=${encodeURIComponent(userEmail)}`)
      .then((response) => response.json())
      .then((data) => { if (isActive) setProfile((currentProfile) => ({ ...currentProfile, resume: data.resume || null })); })
      .catch(() => {});
    return () => { isActive = false; };
  }, [userEmail]);

  const persistExistingUser = () => {
    localStorage.setItem(STORAGE_KEY, 'existing-user');
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_EMAIL_KEY);
    setScreen('login');
  };

  const persistProfile = async (nextProfile) => {
    const updatedAt = new Date().toISOString();
    const profileToSave = { ...nextProfile };
    delete profileToSave.updatedAt;
    setProfile({ ...nextProfile, updatedAt });
    if (!userEmail) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, profile: profileToSave }),
      });
      if (!response.ok) throw new Error('Unable to save profile');
      const data = await response.json();
      setProfile({ ...nextProfile, updatedAt: data.user?.updated_at || updatedAt });
    } catch (error) {
      console.warn('Unable to persist profile', error);
    }
  };

  const persistProfilePicture = async (photo) => {
    const accountEmail = userEmail || localStorage.getItem(ACCOUNT_EMAIL_KEY) || profile.email;
    if (!accountEmail) {
      setProfile((currentProfile) => ({ ...currentProfile, photo }));
      return;
    }

    const response = await fetch(`${API_BASE_URL}/auth/profile/photo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: accountEmail, photo }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to update profile picture.');
    setProfile((currentProfile) => ({ ...currentProfile, photo, updatedAt: data.user?.updated_at || currentProfile.updatedAt }));
  };

  const uploadResume = async (file) => {
    const accountEmail = userEmail || localStorage.getItem(ACCOUNT_EMAIL_KEY) || profile.email;
    if (!accountEmail) throw new Error('Please sign in again before uploading a resume.');
    const formData = new FormData();
    formData.append('email', accountEmail);
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/auth/profile/resume`, { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to upload resume.');
    setProfile((currentProfile) => ({ ...currentProfile, resume: data.resume, updatedAt: data.updated_at || currentProfile.updatedAt }));
  };

  const downloadResume = async () => {
    const accountEmail = userEmail || localStorage.getItem(ACCOUNT_EMAIL_KEY) || profile.email;
    if (!accountEmail) throw new Error('Please sign in again before downloading your resume.');
    const response = await fetch(`${API_BASE_URL}/auth/profile/resume?email=${encodeURIComponent(accountEmail)}`);
    const data = await response.json();
    if (!response.ok || !data.downloadUrl) throw new Error(data.message || 'Resume is not available.');
    const link = document.createElement('a');
    link.href = data.downloadUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.click();
  };

  const deleteResume = async () => {
    if (!window.confirm('Delete your uploaded resume?')) return;
    const accountEmail = userEmail || localStorage.getItem(ACCOUNT_EMAIL_KEY) || profile.email;
    if (!accountEmail) throw new Error('Please sign in again before deleting your resume.');
    const response = await fetch(`${API_BASE_URL}/auth/profile/resume`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: accountEmail }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to delete resume.');
    setProfile((currentProfile) => {
      const nextProfile = { ...currentProfile, updatedAt: data.updated_at || currentProfile.updatedAt };
      delete nextProfile.resume;
      return nextProfile;
    });
  };

  const handleLogin = ({ user, profile: savedProfile, isFirstTime }) => {
    const accountEmail = user?.email || '';
    setUserEmail(accountEmail);
    if (accountEmail) localStorage.setItem(ACCOUNT_EMAIL_KEY, accountEmail);
    if (savedProfile && Object.keys(savedProfile).length > 0) {
      setProfile((currentProfile) => ({ ...currentProfile, ...savedProfile, email: user?.email || savedProfile.email || '', updatedAt: user?.updated_at || savedProfile.updatedAt || null }));
    } else {
      setProfile((currentProfile) => ({ ...currentProfile, email: user?.email || '', updatedAt: user?.updated_at || null }));
    }

    if (isFirstTime) {
      localStorage.setItem(STORAGE_KEY, 'new-user');
      setIsEditingProfile(false);
      setScreen('profile-form');
      return;
    }

    setLandingNav('Home');
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
        sectionToEdit={sectionToEdit}
        onSave={(savedProfile) => {
          persistProfile(savedProfile);
          persistExistingUser();
          setLandingNav('Profile');
          setIsEditingProfile(false);
          setSectionToEdit(null);
          setScreen('landing');
        }}
        onSkip={() => {
          persistExistingUser();
          setLandingNav('Profile');
          setIsEditingProfile(false);
          setSectionToEdit(null);
          setScreen('landing');
        }}
      />
    );
  }

  return (
    <LandingDashboard
      profile={profile}
      email={userEmail || profile.email}
      initialNav={landingNav}
      onUpdateProfilePicture={persistProfilePicture}
      onUploadResume={uploadResume}
      onDownloadResume={downloadResume}
      onDeleteResume={deleteResume}
      onEditProfileSection={(section) => {
        setSectionToEdit(section);
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
