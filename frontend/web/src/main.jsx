import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowUpRight, Bell, Briefcase, ChevronDown, ChevronUp, ClipboardList, Download, FileText, GraduationCap, Home, Library, LogOut, Mail, MessageSquare, Pencil, Plus, Search, Send, Trash2, Upload, User, UsersRound, X } from 'lucide-react';
import { locationSuggestions } from '../../shared/locations';
import { calculateProfileCompletion, formatProfileUpdatedAt, languageSuggestions, noticePeriodOptions } from '../../shared/profile';
import './styles.css';

const defaultProfile = {
  name: '',
  professionalSummary: '',
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
  expectedSalaryLpa: '',
  totalExperienceYears: '',
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
const JOB_RECOMMENDATION_PAGE_SIZE = 12;
const navigationItems = [
  { label: 'Home', icon: Home },
  { label: 'Apply', icon: Send },
  { label: 'Connect', icon: UsersRound },
  { label: 'Library', icon: Library },
  { label: 'Courses', icon: GraduationCap },
];
const STORAGE_KEY = 'jobportal_user_profile_status';
const ACCOUNT_EMAIL_KEY = 'jobportal_account_email';
const USER_ROLE_KEY = 'jobportal_user_role';
const ACCESS_TOKEN_KEY = 'jobportal_access_token';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const getConnectAuthHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY) || ''}` });

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
  const [knownIsNewUser, setKnownIsNewUser] = useState(null);

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
      const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to send OTP');

      setKnownIsNewUser(Boolean(data.isNewUser));
      setOtpSent(true);
      setSuccessMessage(data.message || 'OTP sent successfully.');
      setResendCooldown(30);
      setOtp('');
    } catch (err) {
      if (import.meta.env.PROD) {
        setError(err.message || 'Unable to send OTP. Please try again later.');
        return;
      }
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
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
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
        accessToken: data.accessToken,
      });
    } catch (err) {
      if (import.meta.env.PROD) {
        setError(err.message || 'OTP verification failed. Please try again.');
        return;
      }
      const fallbackIsFirstTime = knownIsNewUser === true;
      localStorage.setItem(STORAGE_KEY, fallbackIsFirstTime ? 'new-user' : 'existing-user');
      onLogin({
        user: { email, role },
        isFirstTime: fallbackIsFirstTime,
        accessToken: null,
      });
      setSuccessMessage('Backend unavailable. Falling back to local onboarding flow.');
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <img className="auth-logo" src="/images/careernexus-logo.png" alt="CareerNexus, powered by Shivoham Automation Experts" />
        <h1>Welcome back</h1>
        <p className="muted">Select your role and receive OTP</p>

        <div className="role-toggle">
          <button type="button" className={role === 'recruiter' ? 'role-button active' : 'role-button'} onClick={() => { setRole('recruiter'); setEmail('recruiter@jobportal.com'); setKnownIsNewUser(null); setOtp(''); setOtpSent(false); }}>
            Recruiter
          </button>
          <button type="button" className={role === 'candidate' ? 'role-button active' : 'role-button'} onClick={() => { setRole('candidate'); setEmail('candidate@jobportal.com'); setKnownIsNewUser(null); setOtp(''); setOtpSent(false); }}>
            Candidate
          </button>
        </div>

        <form onSubmit={handleVerifyOtp} className="auth-form">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setKnownIsNewUser(null); }} placeholder={role === 'recruiter' ? 'recruiter@jobportal.com' : 'candidate@jobportal.com'} />
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
        <img className="auth-services" src="/images/career-services.png" alt="CareerNexus recruitment, talent management, career guidance, AI hiring, corporate hiring, and resume support services" />
      </div>
    </div>
  );
}

function ProfileSetupForm({ profile, role, onSave, onSkip, isEditing, sectionToEdit }) {
  const [form, setForm] = useState(() => ({ ...defaultProfile, ...profile }));
  const [skillDraft, setSkillDraft] = useState(profile.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [preferredCityError, setPreferredCityError] = useState('');
  const [profileFormError, setProfileFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
  const saveForm = async () => {
    setProfileFormError('');
    const cityCount = Array.isArray(form.preferredCity) ? form.preferredCity.length : form.preferredCity ? 1 : 0;
    if (role === 'candidate' && (!sectionToEdit || sectionToEdit === 'careerPreferences') && cityCount < 1) {
      setPreferredCityError('Select at least 1 preferred city.');
      return;
    }
    if (role === 'recruiter' && (!sectionToEdit || sectionToEdit === 'professionalProfile' || sectionToEdit === 'professionalSummary') && !form.professionalSummary.trim()) {
      setProfileFormError('Add a professional summary.');
      return;
    }
    if (role === 'recruiter' && (!sectionToEdit || sectionToEdit === 'employmentDetails') && !form.employmentDetails?.some((entry) => entry.isCurrent && entry.companyName?.trim())) {
      setProfileFormError('Add your current organization under Employment Details.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ ...form, skills: skillDraft });
    } catch (saveError) {
      setProfileFormError(saveError.message || 'Unable to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell profile-form-shell">
      <div className="profile-form-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">PROFILE</p>
          </div>
          {(sectionToEdit || role !== 'recruiter') && <button className="secondary" type="button" onClick={onSkip}>{sectionToEdit ? 'Cancel' : 'Skip for now'}</button>}
        </div>

        {role === 'recruiter' && (!sectionToEdit || sectionToEdit === 'professionalProfile' || sectionToEdit === 'professionalSummary') && <ProfileFormSection title="Professional Summary"><label className="full-width"><span>Professional summary</span><textarea value={form.professionalSummary || ''} onChange={(event) => updateField('professionalSummary', event.target.value)} rows={5} /></label></ProfileFormSection>}

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
          {input('Preferred job role', 'preferredJobRole')}<PreferredCitiesField value={form.preferredCity} error={preferredCityError} onChange={(value) => { updateField('preferredCity', value); setPreferredCityError(''); }} />{input('Expected salary (INR LPA)', 'expectedSalaryLpa', 'number')}{input('Total experience (years)', 'totalExperienceYears', 'number')}{select('Job type', 'jobType', ['Permanent', 'Contractual'])}{select('Employment type', 'employmentType', ['Full Time', 'Part Time'])}{select('Preferred shift', 'preferredShift', ['Day', 'Night', 'Rotational'])}
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
          {!sectionToEdit && role !== 'recruiter' && <button type="button" className="secondary" onClick={onSkip}>Later</button>}
          {sectionToEdit && <button type="button" className="secondary" onClick={onSkip}>Cancel</button>}
          <button type="button" onClick={saveForm} disabled={isSaving}>{isSaving ? 'Saving…' : sectionToEdit === 'keySkillsSet' ? 'Save skills' : sectionToEdit ? 'Save changes' : isEditing ? 'Update profile' : 'Create profile'}</button>
        </div>
        {profileFormError && <p className="connect-error" role="alert">{profileFormError}</p>}
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

function JobReferralControl({ job, email }) {
  const [candidates, setCandidates] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [message, setMessage] = useState('');

  const openReferrals = async () => {
    setMessage('');
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    setIsOpen(true);
    try {
      const response = await fetch(`${API_BASE_URL}/connect?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load connections.');
      setCandidates((data.connections || []).map((connection) => connection.person).filter((person) => person.role === 'candidate'));
    } catch (error) {
      setMessage(error.message || 'Unable to load connections.');
    } finally {
      setIsLoading(false);
    }
  };

  const referToCandidate = async (candidate) => {
    setProcessingId(candidate.id);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/connect/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getConnectAuthHeaders() },
        body: JSON.stringify({ email, targetEmail: candidate.email, job }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to send this referral.');
      setMessage(`Referred to ${candidate.name}.`);
    } catch (error) {
      setMessage(error.message || 'Unable to send this referral.');
    } finally {
      setProcessingId('');
    }
  };

  return <div className="job-referral-control">
    <button type="button" className="job-refer-button" onClick={openReferrals}><UsersRound size={15} /> Refer</button>
    {isOpen && <div className="job-referral-options">
      {isLoading ? <span>Loading connections...</span> : candidates.length ? candidates.map((candidate) => <button type="button" key={candidate.id} onClick={() => referToCandidate(candidate)} disabled={Boolean(processingId)}>{processingId === candidate.id ? 'Sending...' : candidate.name}</button>) : <span>No connected candidates yet.</span>}
      {message && <span role="status">{message}</span>}
    </div>}
  </div>;
}

function JobListingCard({ job, onApply, email, isApplied = false, compact = false }) {
  const [isApplying, setIsApplying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const apply = async () => {
    const applicationWindow = !isApplied ? window.open('about:blank', '_blank') : null;
    if (applicationWindow) applicationWindow.opener = null;
    setIsApplying(true);
    try {
      await onApply(job);
      if (applicationWindow) applicationWindow.location.replace(job.url);
      else if (!isApplied) window.open(job.url, '_blank', 'noopener,noreferrer');
    } catch (applyError) {
      applicationWindow?.close();
      console.warn('Unable to save job application:', applyError);
    } finally {
      setIsApplying(false);
    }
  };

  return <article className={compact ? 'job-card live-job-card compact' : 'job-card live-job-card'}>
    <div className="job-head"><div><h4>{job.title}</h4><p>{job.company}</p></div><span className="badge">{job.matchScore}% shortlist score</span></div>
    <div className="job-meta-row"><span title={job.location || 'Location not listed'}>{job.location || 'Location not listed'}</span><span title={job.type || 'Type not listed'}>{job.type || 'Type not listed'}</span></div>
    {job.source === 'career-nexus' && showDetails && <div className="recruiter-job-description"><p>{job.description}</p>{job.companyAbout && <p>{job.companyAbout}</p>}</div>}
    <div className="job-card-actions">{job.source === 'career-nexus' ? <button type="button" className="job-view-button" onClick={() => setShowDetails((value) => !value)}>{showDetails ? 'Hide Details' : 'View Details'}</button> : <a href={job.url} target="_blank" rel="noreferrer">View listing</a>}<JobReferralControl job={job} email={email} />{job.source === 'career-nexus' ? (job.status === 'closed' ? <span className="job-closed-status">Closed</span> : isApplied ? <span className="applied-status">Applied</span> : <button type="button" className="job-apply-button" onClick={() => { localStorage.setItem(`cn-application:${job.recruiterJobId}`, JSON.stringify(job)); window.open(`${window.location.origin}/?cn-apply=${encodeURIComponent(job.recruiterJobId)}`, '_blank', 'noopener,noreferrer'); }}>CN Apply</button>) : (isApplied ? <span className="applied-status">Applied</span> : <button type="button" className="job-apply-button" disabled={isApplying} onClick={apply}>{isApplying ? 'Saving…' : 'Apply'}</button>)}</div>
  </article>;
}

function RecruiterHome({ email, profile }) {
  const [openings, setOpenings] = useState([]);
  const [form, setForm] = useState({ position: '', location: '', workMode: 'Full-time', description: '', companyAbout: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');
  const currentEmployment = profile.employmentDetails?.find((entry) => entry.isCurrent);
  const companyName = currentEmployment?.companyName || profile.companyName || profile.currentCompany || '';

  const loadOpenings = async () => {
    const response = await fetch(`${API_BASE_URL}/jobs/recruiter?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load job openings.');
    setOpenings(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let isActive = true;
    fetch(`${API_BASE_URL}/jobs/recruiter?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load job openings.');
        if (isActive) setOpenings(Array.isArray(data) ? data : []);
      })
      .catch((loadError) => { if (isActive) console.warn('Unable to load recruiter openings:', loadError); })
      .finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, [email]);

  const postOpening = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/recruiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getConnectAuthHeaders() },
        body: JSON.stringify({ email, ...form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to post job opening.');
      setOpenings((current) => [data, ...current]);
      setForm({ position: '', location: '', workMode: 'Full-time', description: '', companyAbout: '' });
    } catch (saveError) {
      setError(saveError.message || 'Unable to post job opening.');
    } finally {
      setIsSaving(false);
    }
  };

  const closeOpening = async (opening) => {
    setProcessingId(opening.recruiterJobId);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/recruiter/${encodeURIComponent(opening.recruiterJobId)}/close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getConnectAuthHeaders() },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to close this job.');
      setOpenings((current) => current.map((item) => item.recruiterJobId === opening.recruiterJobId ? { ...item, status: 'closed' } : item));
    } catch (closeError) {
      setError(closeError.message || 'Unable to close this job.');
    } finally {
      setProcessingId('');
    }
  };

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  return <section className="recruiter-dashboard-section">
    <section className="recruiter-posting-section">
      <div className="jobs-header"><div><h3>Post a job opening</h3><p>Openings are listed under your current organization.</p></div></div>
      <form className="recruiter-job-form" onSubmit={postOpening}>
        <label><span>Company name</span><input value={companyName} readOnly required /></label>
        <label><span>Position for opening</span><input value={form.position} onChange={updateField('position')} required /></label>
        <label><span>Location</span><input value={form.location} onChange={updateField('location')} required /></label>
        <label><span>Work arrangement</span><select value={form.workMode} onChange={updateField('workMode')}><option>Full-time</option><option>Hybrid</option></select></label>
        <label className="full-width"><span>Job description</span><textarea value={form.description} onChange={updateField('description')} rows={5} required /></label>
        <label className="full-width"><span>About the company</span><textarea value={form.companyAbout} onChange={updateField('companyAbout')} rows={4} required /></label>
        {error && <p className="connect-error" role="alert">{error}</p>}
        <div className="actions-row"><button type="submit" disabled={isSaving || !companyName}>{isSaving ? 'Posting…' : 'Post opening'}</button></div>
      </form>
    </section>
    <section className="recruiter-openings-section">
      <div className="jobs-header"><div><h3>Posted jobs</h3><p>Your openings and their current application counts.</p></div></div>
      {isLoading && <p className="library-status">Loading posted jobs…</p>}
      {!isLoading && !openings.length && <p className="library-status">No job openings posted yet.</p>}
      <div className="recruiter-openings-list">{openings.map((opening) => <article className="recruiter-opening-tile" key={opening.recruiterJobId}>
        <div><h4>{opening.title}</h4><p>{opening.company} · {opening.location} · {opening.type}</p><span>{opening.applicantsCount || 0} applicants</span></div>
        {opening.status === 'open' ? <button type="button" className="connect-secondary-action" disabled={processingId === opening.recruiterJobId} onClick={() => closeOpening(opening)}>{processingId === opening.recruiterJobId ? 'Closing…' : 'Close job'}</button> : <span className="job-closed-status">Closed</span>}
      </article>)}</div>
      <button type="button" className="link-button" onClick={loadOpenings}>Refresh posted jobs</button>
    </section>
  </section>;
}

function CandidateJobApplicationView({ email, profile, onBack }) {
  const openingId = new URLSearchParams(window.location.search).get('cn-apply');
  const draftKey = `cn-application-draft:${openingId}`;
  const [job] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`cn-application:${openingId}`) || 'null'); } catch { return null; }
  });
  const currentEmployment = profile.employmentDetails?.find((entry) => entry.isCurrent);
  const initialApplicationDetails = {
    fullName: profile.name || '',
    email: profile.email || email,
    currentCompany: currentEmployment?.companyName || profile.companyName || profile.currentCompany || '',
    expectedSalary: profile.expectedSalaryLpa || '',
    actualSalary: '',
    totalExperienceYears: profile.totalExperienceYears || '',
    relevantExperienceYears: '',
    currentlyServingNotice: 'No',
    noticePeriodDays: '',
    includeResume: Boolean(profile.resume),
  };
  const [form, setForm] = useState(() => {
    try { return { ...initialApplicationDetails, ...JSON.parse(localStorage.getItem(draftKey) || '{}') }; } catch { return initialApplicationDetails; }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setForm((current) => ({
      ...current,
      fullName: current.fullName || profile.name || '',
      email: current.email || profile.email || email,
      currentCompany: current.currentCompany || profile.employmentDetails?.find((entry) => entry.isCurrent)?.companyName || profile.companyName || profile.currentCompany || '',
      expectedSalary: current.expectedSalary || profile.expectedSalaryLpa || '',
      totalExperienceYears: current.totalExperienceYears || profile.totalExperienceYears || '',
      includeResume: profile.resume ? current.includeResume || !localStorage.getItem(draftKey) : false,
    }));
  }, [profile, email]);
  const [draftSaved, setDraftSaved] = useState(false);
  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!job?.recruiterJobId) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/recruiter/${encodeURIComponent(job.recruiterJobId)}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getConnectAuthHeaders() },
        body: JSON.stringify({ email, details: form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to submit application.');
      setSubmitted(true);
      localStorage.removeItem(`cn-application:${openingId}`);
      localStorage.removeItem(draftKey);
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit application.');
    } finally {
      setIsSaving(false);
    }
  };
  const saveDraft = () => {
    localStorage.setItem(draftKey, JSON.stringify(form));
    setDraftSaved(true);
  };
  if (!job) return <section className="jobs-section panel"><p>This application link is no longer available.</p><button type="button" onClick={onBack}>Back to jobs</button></section>;
  return <section className="cn-application-page">
    <div className="jobs-header"><div><p className="eyebrow">CAREERNEXUS APPLICATION</p><h2>{submitted ? 'Application submitted' : job.title}</h2></div><button type="button" className="connect-secondary-action" onClick={onBack}>Cancel</button></div>
    {submitted ? <p>Your application was sent to {job.company}.</p> : <>
      <div className="cn-job-summary"><h3>{job.company}</h3><p>{job.title}</p><p>{job.location} · {job.type}</p><p>{job.description}</p></div>
      <form className="recruiter-job-form" onSubmit={submit}>
        <label><span>Full name</span><input value={form.fullName} onChange={updateField('fullName')} required /></label>
        <label><span>Email</span><input type="email" value={form.email} onChange={updateField('email')} required /></label>
        <label><span>Current company</span><input value={form.currentCompany} onChange={updateField('currentCompany')} /></label>
        <label><span>Expected salary</span><input value={form.expectedSalary} onChange={updateField('expectedSalary')} required /></label>
        <label><span>Actual salary</span><input value={form.actualSalary} onChange={updateField('actualSalary')} required /></label>
        <label><span>Total years of experience</span><input type="number" min="0" step="0.1" value={form.totalExperienceYears} onChange={updateField('totalExperienceYears')} required /></label>
        <label><span>Relevant years of experience</span><input type="number" min="0" step="0.1" value={form.relevantExperienceYears} onChange={updateField('relevantExperienceYears')} required /></label>
        <label><span>Currently serving notice?</span><select value={form.currentlyServingNotice} onChange={updateField('currentlyServingNotice')}><option>No</option><option>Yes</option></select></label>
        <label><span>How early can you join (days)?</span><input type="number" min="0" value={form.noticePeriodDays} onChange={updateField('noticePeriodDays')} required /></label>
        <div className="resume-choice"><label><input type="checkbox" checked={form.includeResume} onChange={(event) => setForm((current) => ({ ...current, includeResume: event.target.checked }))} disabled={!profile.resume} /><span>{profile.resume ? `Attach resume: ${profile.resume.fileName}` : 'No resume on your profile'}</span></label></div>
        {draftSaved && <p className="connect-status">Draft saved on this device.</p>}
        {error && <p className="connect-error" role="alert">{error}</p>}
        <div className="actions-row"><button type="button" className="secondary" onClick={onBack}>Cancel</button><button type="button" className="secondary" onClick={saveDraft}>Save</button><button type="submit" disabled={isSaving}>{isSaving ? 'Submitting…' : 'Submit application'}</button></div>
      </form>
    </>}
  </section>;
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
  const [activeLetter, setActiveLetter] = useState('All');
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const filteredCourses = courses.filter((course) => (
    (activeLetter === 'All' || course.title.toUpperCase().startsWith(activeLetter))
    && [course.title, course.topic, course.provider, course.level, course.duration]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  ));
  const availableLetters = new Set(courses.map((course) => course.title.charAt(0).toUpperCase()));

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

      <label className="library-search-label" htmlFor="courses-search">Search courses</label>
      <input
        id="courses-search"
        className="library-search"
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search by skill, topic, or provider"
      />

      <div className="alphabet-filter" aria-label="Filter courses by first letter">
        <button type="button" className={activeLetter === 'All' ? 'alphabet-button active' : 'alphabet-button'} onClick={() => setActiveLetter('All')}>All</button>
        {alphabet.map((letter) => <button key={letter} type="button" className={activeLetter === letter ? 'alphabet-button active' : 'alphabet-button'} onClick={() => setActiveLetter(letter)} disabled={!availableLetters.has(letter)}>{letter}</button>)}
      </div>

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

function ConnectView({ email, onApplyReferral, appliedJobIds, initialPerson, onMessage }) {
  const [targetRole, setTargetRole] = useState('candidate');
  const [activeSection, setActiveSection] = useState('search');
  const [selectedPerson, setSelectedPerson] = useState(initialPerson || null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [overview, setOverview] = useState({ incoming: [], outgoing: [], connections: [] });
  const [referrals, setReferrals] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialPerson) {
      setSelectedPerson(initialPerson);
      setTargetRole(initialPerson.role);
      setActiveSection('connections');
    }
  }, [initialPerson]);

  const loadOverview = async () => {
    const response = await fetch(`${API_BASE_URL}/connect?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load connections.');
    setOverview(data);
  };

  useEffect(() => {
    let isActive = true;
    setIsLoadingOverview(true);
    fetch(`${API_BASE_URL}/connect?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load connections.');
        if (isActive) setOverview(data);
      })
      .catch((loadError) => { if (isActive) setError(loadError.message || 'Unable to load connections.'); })
      .finally(() => { if (isActive) setIsLoadingOverview(false); });
    fetch(`${API_BASE_URL}/connect/referrals?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load referrals.');
        if (isActive) setReferrals(Array.isArray(data) ? data : []);
      })
      .catch((loadError) => { if (isActive) setError(loadError.message || 'Unable to load referrals.'); });
    return () => { isActive = false; };
  }, [email]);

  useEffect(() => {
    const searchText = query.trim();
    if (searchText.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return undefined;
    }
    let isActive = true;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ email, role: targetRole, q: searchText });
        const response = await fetch(`${API_BASE_URL}/connect/search?${params}`, { headers: getConnectAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to search members.');
        if (isActive) setSuggestions(Array.isArray(data) ? data : []);
      } catch (searchError) {
        if (isActive) setError(searchError.message || 'Unable to search members.');
      } finally {
        if (isActive) setIsSearching(false);
      }
    }, 250);
    return () => { isActive = false; window.clearTimeout(timer); };
  }, [email, query, targetRole]);

  const sendRequest = async (person) => {
    setProcessingId(person.id);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/connect/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getConnectAuthHeaders() },
        body: JSON.stringify({ email, targetEmail: person.email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to send the request.');
      setSuggestions((current) => current.map((item) => item.id === person.id ? { ...item, connectionState: data.state, requestId: data.request?.id || null } : item));
      await loadOverview();
    } catch (requestError) {
      setError(requestError.message || 'Unable to send the request.');
    } finally {
      setProcessingId('');
    }
  };

  const respondToRequest = async (requestId, status) => {
    setProcessingId(requestId);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/connect/requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getConnectAuthHeaders() },
        body: JSON.stringify({ email, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update this request.');
      await loadOverview();
      setSuggestions((current) => current.map((person) => person.id === data.requester_user_id ? { ...person, connectionState: status === 'accepted' ? 'connected' : null, requestId: null } : person));
    } catch (requestError) {
      setError(requestError.message || 'Unable to update this request.');
    } finally {
      setProcessingId('');
    }
  };

  const cancelRequest = async (requestId) => {
    setProcessingId(requestId);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/connect/requests/${encodeURIComponent(requestId)}?email=${encodeURIComponent(email)}`, { method: 'DELETE', headers: getConnectAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to cancel this request.');
      await loadOverview();
      setSuggestions((current) => current.map((person) => person.requestId === requestId ? { ...person, connectionState: null, requestId: null } : person));
    } catch (requestError) {
      setError(requestError.message || 'Unable to cancel this request.');
    } finally {
      setProcessingId('');
    }
  };

  const removeConnection = async () => {
    if (!selectedPerson) return;
    setProcessingId(selectedPerson.id);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/connect/connections/${encodeURIComponent(selectedPerson.email)}?email=${encodeURIComponent(email)}`, { method: 'DELETE', headers: getConnectAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to remove this connection.');
      await loadOverview();
      setSelectedPerson(null);
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove this connection.');
    } finally {
      setProcessingId('');
    }
  };

  const applyReferral = async (job) => {
    setProcessingId(String(job.id));
    setError('');
    try {
      await onApplyReferral(job);
    } catch (applyError) {
      setError(applyError.message || 'Unable to apply to this referral.');
    } finally {
      setProcessingId('');
    }
  };

  const requestButton = (person) => {
    const isProcessing = processingId === person.id;
    const label = isProcessing ? 'Sending...' : person.connectionState === 'connected' ? 'Connected' : person.connectionState === 'sent' ? 'Request Sent' : person.connectionState === 'received' ? 'Request Received' : 'Connect';
    return <button type="button" className="connect-action" onClick={() => sendRequest(person)} disabled={isProcessing || person.connectionState !== null}>{label}</button>;
  };

  const renderPerson = (person, actions = null) => <article className="connect-person" key={person.id}>
    <div className="connect-person-details">
      <button type="button" className="connect-person-link" onClick={() => setSelectedPerson(person)}>{person.name}</button>
      <span>{person.email}</span>
      {person.headline && <span>{person.headline}</span>}
      {person.company && <span>{person.company}</span>}
    </div>
    {actions}
  </article>;

  const roleTabs = [
    ['search', `Search ${targetRole === 'candidate' ? 'Candidates' : 'Recruiters'}`],
    ['incoming', 'Incoming Requests'],
    ['connections', 'Connections'],
    ['sent', 'Requests Sent'],
    ...(targetRole === 'candidate' ? [['referrals', 'Referrals']] : []),
  ];
  const roleIncoming = overview.incoming.filter((request) => request.person.role === targetRole);
  const roleOutgoing = overview.outgoing.filter((request) => request.person.role === targetRole);
  const roleConnections = overview.connections.filter((connection) => connection.person.role === targetRole);

  return <section className="connect-view">
    <div className="connect-heading"><div><p className="eyebrow">NETWORK</p><h2>{targetRole === 'candidate' ? 'Candidate Connect' : 'Recruiter Connect'}</h2></div></div>
    <div className="connect-role-switch" role="tablist" aria-label="Choose member type">
      {['candidate', 'recruiter'].map((role) => <button key={role} type="button" role="tab" aria-selected={targetRole === role} className={targetRole === role ? 'connect-role active' : 'connect-role'} onClick={() => { setTargetRole(role); setActiveSection('search'); }}>{role === 'candidate' ? 'Candidates' : 'Recruiters'}</button>)}
    </div>
    <div className="connect-section-tabs" role="tablist" aria-label={`${targetRole} connection views`}>
      {roleTabs.map(([section, label]) => <button key={section} type="button" role="tab" aria-selected={activeSection === section} className={activeSection === section ? 'connect-section-tab active' : 'connect-section-tab'} onClick={() => setActiveSection(section)}>{label}</button>)}
    </div>
    {activeSection === 'search' && <>
      <label className="connect-search-label" htmlFor="connect-search">Search by name, email, or company</label>
      <div className="connect-search-wrap">
        <input id="connect-search" className="connect-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, or company" autoComplete="off" />
        {query.trim().length >= 2 && <div className="connect-suggestions" role="listbox" aria-label={`Matching ${targetRole}s`}>
          {isSearching ? <p className="connect-empty">Searching...</p> : suggestions.length ? suggestions.map((person) => renderPerson(person, requestButton(person))) : <p className="connect-empty">No matching {targetRole}s.</p>}
        </div>}
      </div>
    </>}
    {error && <p className="connect-error" role="alert">{error}</p>}

    {selectedPerson && <section className="connect-member-details"><div><h3>{selectedPerson.name}</h3><span>{selectedPerson.role}</span></div><p>{selectedPerson.email}</p>{selectedPerson.headline && <p>{selectedPerson.headline}</p>}{selectedPerson.company && <p>{selectedPerson.company}</p>}<div className="connect-actions"><button type="button" className="connect-action" onClick={() => onMessage?.(selectedPerson)}>Message</button>{roleConnections.some((connection) => connection.person.id === selectedPerson.id) && <button type="button" className="connect-secondary-action" disabled={processingId === selectedPerson.id} onClick={removeConnection}>{processingId === selectedPerson.id ? 'Removing…' : 'Remove Connection'}</button>}<button type="button" className="connect-secondary-action" onClick={() => setSelectedPerson(null)}>Close</button></div></section>}

    {activeSection === 'incoming' && <section className="connect-list-section"><h3>Incoming requests <span>{roleIncoming.length}</span></h3>
        {roleIncoming.map((request) => renderPerson(request.person, <div className="connect-actions" key={request.requestId}>
          <button type="button" className="connect-action" disabled={processingId === request.requestId} onClick={() => respondToRequest(request.requestId, 'accepted')}>{processingId === request.requestId ? 'Saving...' : 'Accept'}</button>
          <button type="button" className="connect-secondary-action" disabled={processingId === request.requestId} onClick={() => respondToRequest(request.requestId, 'declined')}>Decline</button>
        </div>))}
        {!isLoadingOverview && !roleIncoming.length && <p className="connect-empty">No incoming requests.</p>}
      </section>}
    {activeSection === 'connections' && <section className="connect-list-section"><h3>Connections <span>{roleConnections.length}</span></h3>
        {roleConnections.map((connection) => renderPerson(connection.person, <div className="connect-actions"><button type="button" className="connect-message-action" onClick={() => onMessage?.(connection.person)} aria-label={`Message ${connection.person.name}`} title={`Message ${connection.person.name}`}><Mail size={17} /></button><span className="connect-status">Connected</span></div>))}
        {!isLoadingOverview && !roleConnections.length && <p className="connect-empty">Approved connections will appear here.</p>}
      </section>}
    {activeSection === 'sent' && <section className="connect-list-section"><h3>Requests sent <span>{roleOutgoing.length}</span></h3>
        {roleOutgoing.map((request) => renderPerson(request.person, <div className="connect-actions"><span className="connect-status">Request Sent</span><button type="button" className="connect-secondary-action" disabled={processingId === request.requestId} onClick={() => cancelRequest(request.requestId)}>{processingId === request.requestId ? 'Canceling...' : 'Cancel Request'}</button></div>))}
        {!isLoadingOverview && !roleOutgoing.length && <p className="connect-empty">No pending requests sent.</p>}
      </section>}
    {activeSection === 'referrals' && targetRole === 'candidate' && <section className="connect-list-section"><h3>Job referrals <span>{referrals.length}</span></h3>
        {referrals.map((referral) => <article className="connect-referral" key={referral.id}><div><strong>{referral.job.title}</strong><span>{referral.job.company} · Referred by {referral.referrer.name}</span><span>{referral.referrer.email}</span></div>{appliedJobIds.has(String(referral.job.id)) ? <span className="connect-status">Applied</span> : <button type="button" className="connect-action" disabled={processingId === String(referral.job.id)} onClick={() => applyReferral(referral.job)}>{processingId === String(referral.job.id) ? 'Saving...' : 'Apply'}</button>}</article>)}
        {!referrals.length && <p className="connect-empty">No job referrals yet.</p>}
      </section>}
  </section>;
}

function MessageCompose({ email, person, job, onCancel, onSent }) {
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const send = async (event) => {
    event.preventDefault();
    setIsSending(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/connect/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getConnectAuthHeaders() },
        body: JSON.stringify({ email, targetEmail: person.email, body, ...(job ? { job } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to send message.');
      onSent?.();
    } catch (sendError) {
      setError(sendError.message || 'Unable to send message.');
    } finally {
      setIsSending(false);
    }
  };
  return <form className="message-compose" onSubmit={send}>
    <div className="jobs-header"><div><h3>Message {person.name}</h3><p>{person.email}</p></div><button type="button" className="icon-button" aria-label="Cancel message" onClick={onCancel}><X size={18} /></button></div>
    {job && <div className="message-job-tile"><strong>{job.title}</strong><span>{job.company} · {job.location}</span><span>{job.type}</span></div>}
    <label><span>Your message</span><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} maxLength={5000} required /></label>
    {error && <p className="connect-error" role="alert">{error}</p>}
    <div className="actions-row"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button type="submit" disabled={isSending}>{isSending ? 'Sending…' : 'Send'}</button></div>
  </form>;
}

function RecruiterApplicationsView({ email }) {
  const [openings, setOpenings] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);

  const loadApplications = async () => {
    const response = await fetch(`${API_BASE_URL}/jobs/recruiter/applications?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load applications.');
    setOpenings(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let isActive = true;
    fetch(`${API_BASE_URL}/jobs/recruiter/applications?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load applications.');
        if (isActive) setOpenings(Array.isArray(data) ? data : []);
      })
      .catch((error) => console.warn('Unable to load received applications:', error))
      .finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, [email]);

  const openApplication = async (application) => {
    setIsLoadingDetails(true);
    setSelectedApplication(null);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/recruiter/applications/${encodeURIComponent(application.id)}?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load candidate details.');
      setSelectedApplication(data);
      await updateStatus(application.id, 'viewed');
    } catch (error) {
      console.warn('Unable to load applicant detail:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const updateStatus = async (applicationId, status) => {
    const response = await fetch(`${API_BASE_URL}/jobs/recruiter/applications/${encodeURIComponent(applicationId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getConnectAuthHeaders() },
      body: JSON.stringify({ email, status }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to update application.');
    setSelectedApplication((current) => current?.id === applicationId ? { ...current, reviewStatus: status } : current);
    setOpenings((current) => current.map((opening) => ({
      ...opening,
      applicants: opening.applicants.map((applicant) => applicant.id === applicationId ? { ...applicant, reviewStatus: status } : applicant),
    })));
  };

  const recordStatus = (applicationId, status) => updateStatus(applicationId, status).catch((error) => console.warn('Unable to update application status:', error));
  const openResume = async () => {
    const resumeUrl = selectedApplication?.resume?.downloadUrl;
    if (!resumeUrl) return;
    window.open(resumeUrl, '_blank', 'noopener,noreferrer');
    await recordStatus(selectedApplication.id, 'resume_downloaded');
  };

  return <section className="recruiter-applications-view">
    <div className="jobs-header"><div><p className="eyebrow">HIRING</p><h2>Applications Received</h2></div><button type="button" className="link-button" onClick={() => loadApplications().catch((error) => console.warn(error))}>Refresh</button></div>
    {messageTarget && <MessageCompose email={email} person={messageTarget.person} job={messageTarget.job} onCancel={() => setMessageTarget(null)} onSent={() => setMessageTarget(null)} />}
    {isLoading && <p className="library-status">Loading applications…</p>}
    {!isLoading && !openings.length && <p className="library-status">Posted job applications will appear here.</p>}
    <div className="recruiter-applications-grid">
      <div className="recruiter-application-jobs">{openings.map((opening) => <button type="button" className={selectedJob?.id === opening.id ? 'recruiter-application-job active' : 'recruiter-application-job'} key={opening.recruiterJobId} onClick={() => { setSelectedJob(opening); setSelectedApplication(null); }}>
        <strong>{opening.title}</strong><span>{opening.company} · {opening.location}</span><small>{opening.applicants.length} applicants</small>
      </button>)}</div>
      <div className="recruiter-applicant-list">
        {selectedJob ? <><h3>{selectedJob.title} applicants</h3>{selectedJob.applicants.length ? selectedJob.applicants.map((application) => <button type="button" className="recruiter-applicant-tile" key={application.id} onClick={() => openApplication(application)}>
          <span><strong>{application.candidate.name}</strong><small>{application.candidate.headline || application.candidate.company || application.candidate.email}</small></span><span className="badge">{application.matchScore}% match</span><small>{application.reviewStatus.replaceAll('_', ' ')}</small>
        </button>) : <p className="connect-empty">No candidates have applied yet.</p>}</> : <p className="connect-empty">Select a job to see ranked applicants.</p>}
      </div>
    </div>
    {isLoadingDetails && <p className="library-status">Loading candidate profile…</p>}
    {selectedApplication && <section className="recruiter-candidate-detail">
      <div className="jobs-header"><div><p className="eyebrow">{selectedApplication.matchScore || selectedJob.applicants.find((item) => item.id === selectedApplication.id)?.matchScore || 0}% MATCH</p><h3>{selectedApplication.candidate.name}</h3><p>{selectedApplication.candidate.email}</p></div></div>
      <div className="detail-grid">{Object.entries(selectedApplication.candidate.profile || {}).filter(([key, value]) => !['resume', 'photo', 'appliedJobs', 'skills', 'languages', 'employmentDetails', 'majorProjects'].includes(key) && value && typeof value !== 'object').map(([key, value]) => <div key={key}><strong>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}:</strong> {String(value)}</div>)}</div>
      {!!selectedApplication.candidate.profile?.skills?.length && <p><strong>Skills:</strong> {selectedApplication.candidate.profile.skills.join(', ')}</p>}
      {!!selectedApplication.candidate.profile?.languages?.length && <p><strong>Languages:</strong> {selectedApplication.candidate.profile.languages.join(', ')}</p>}
      {!!selectedApplication.candidate.profile?.employmentDetails?.length && <section><h4>Employment history</h4>{selectedApplication.candidate.profile.employmentDetails.map((employment, index) => <article className="profile-record" key={`${employment.companyName}-${index}`}><strong>{employment.companyName}</strong><div>{employment.jobTitle} · {employment.employmentType}</div><small>{employment.joiningDate}{employment.isCurrent ? ' · Current' : employment.relievingDate ? ` to ${employment.relievingDate}` : ''}</small><p>{employment.jobProfile}</p></article>)}</section>}
      {!!selectedApplication.candidate.profile?.majorProjects?.length && <section><h4>Projects</h4>{selectedApplication.candidate.profile.majorProjects.map((project, index) => <article className="profile-record" key={`${project.projectTitle}-${index}`}><strong>{project.projectTitle}</strong><p>{project.projectDetails}</p></article>)}</section>}
      <div className="detail-grid"><div><strong>Expected salary:</strong> {selectedApplication.applicationDetails.expectedSalary}</div><div><strong>Actual salary:</strong> {selectedApplication.applicationDetails.actualSalary}</div><div><strong>Total experience:</strong> {selectedApplication.applicationDetails.totalExperienceYears} years</div><div><strong>Relevant experience:</strong> {selectedApplication.applicationDetails.relevantExperienceYears} years</div><div><strong>Serving notice:</strong> {selectedApplication.applicationDetails.currentlyServingNotice}</div><div><strong>Can join in:</strong> {selectedApplication.applicationDetails.noticePeriodDays} days</div></div>
      <div className="recruiter-review-actions"><button type="button" className="connect-secondary-action" onClick={openResume} disabled={!selectedApplication.resume?.downloadUrl}>{selectedApplication.resume?.resume?.fileName ? `Download ${selectedApplication.resume.resume.fileName}` : 'No resume uploaded'}</button><button type="button" className="connect-secondary-action" onClick={() => recordStatus(selectedApplication.id, 'viewed')}>Application Viewed</button><button type="button" className="connect-action" onClick={() => recordStatus(selectedApplication.id, 'shortlisted')}>Shortlist</button><button type="button" className="connect-secondary-action" onClick={() => recordStatus(selectedApplication.id, 'not_shortlisted')}>Not Shortlisted</button><a className="connect-secondary-action" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedApplication.candidate.email)}&su=${encodeURIComponent(`Regarding ${selectedApplication.job.title}`)}`} target="_blank" rel="noreferrer">Contact via Gmail</a><button type="button" className="connect-secondary-action" onClick={() => setMessageTarget({ person: selectedApplication.candidate, job: selectedApplication.job })}>Message candidate</button></div>
    </section>}
  </section>;
}

function MessagesView({ email, role, onOpenPerson, initialPerson, onConsumeInitialPerson }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const otherRole = role === 'recruiter' ? 'candidate' : 'recruiter';
  useEffect(() => {
    if (!initialPerson) return;
    setSelectedPerson(initialPerson);
    onConsumeInitialPerson?.();
  }, [initialPerson]);
  const loadMessages = async () => {
    const response = await fetch(`${API_BASE_URL}/connect/messages?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load messages.');
    setMessages(Array.isArray(data) ? data : []);
  };
  useEffect(() => {
    let isActive = true;
    fetch(`${API_BASE_URL}/connect/messages?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load messages.'); if (isActive) setMessages(Array.isArray(data) ? data : []); })
      .catch((error) => console.warn('Unable to load messages:', error))
      .finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, [email]);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return undefined; }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ email, role: otherRole, q: query.trim() });
        const response = await fetch(`${API_BASE_URL}/connect/search?${params}`, { headers: getConnectAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to search members.');
        if (active) setResults(Array.isArray(data) ? data : []);
      } catch (error) { console.warn('Unable to search message recipients:', error); }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [email, query, otherRole]);
  const approve = async (candidateEmail) => {
    try {
      const response = await fetch(`${API_BASE_URL}/connect/messages/permissions/${encodeURIComponent(candidateEmail)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getConnectAuthHeaders() }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to approve messages.');
      await loadMessages();
    } catch (error) { console.warn('Unable to approve message request:', error); }
  };
  return <section className="messages-view">
    <div className="jobs-header"><div><p className="eyebrow">INBOX</p><h2>Messages</h2></div></div>
    {selectedPerson ? <MessageCompose email={email} person={selectedPerson} onCancel={() => { setSelectedPerson(null); onConsumeInitialPerson?.(); }} onSent={() => { setSelectedPerson(null); onConsumeInitialPerson?.(); loadMessages().catch(console.warn); }} /> : <div className="message-recipient-search"><label htmlFor="message-recipient">New message</label><input id="message-recipient" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${otherRole}s by name or email`} />{results.map((person) => <button key={person.id} type="button" onClick={() => setSelectedPerson(person)}>{person.name} · {person.email}</button>)}</div>}
    {isLoading && <p className="library-status">Loading messages…</p>}
    {!isLoading && !messages.length && <p className="library-status">Messages will appear here.</p>}
    <div className="message-list">{messages.map((message) => {
      const person = message.isReceived ? message.sender : message.recipient;
      const isPendingRequest = role === 'recruiter' && message.isReceived && message.sender.role === 'candidate' && message.permissionStatus !== 'approved';
      return <article className="message-item" key={message.id}>
        <div className="message-item-heading"><button type="button" className="message-person-link" onClick={() => onOpenPerson(person)}>{person.name}</button><time>{new Date(message.createdAt).toLocaleString()}</time></div>
        <p>{message.body}</p>
        {message.job && Object.keys(message.job).length > 0 && <div className="message-job-tile"><strong>{message.job.title}</strong><span>{message.job.company} · {message.job.location}</span></div>}
        {isPendingRequest && <button type="button" className="connect-action" onClick={() => approve(message.sender.email)}>Approve message request</button>}
      </article>;
    })}</div>
  </section>;
}

function NotificationsView({ email, onOpenApplications, onOpenMessages }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/connect/notifications?email=${encodeURIComponent(email)}`, { headers: getConnectAuthHeaders() })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load notifications.'); if (active) setNotifications(Array.isArray(data) ? data : []); })
      .catch((error) => console.warn('Unable to load notifications:', error))
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [email]);
  return <section className="notifications-view"><div className="jobs-header"><div><p className="eyebrow">ACTIVITY</p><h2>Notifications</h2></div></div>{isLoading && <p className="library-status">Loading notifications…</p>}{!isLoading && !notifications.length && <p className="library-status">No notifications yet.</p>}<div className="notification-list">{notifications.map((notification) => <button type="button" key={notification.id} className="notification-item" onClick={notification.type === 'application' ? onOpenApplications : onOpenMessages}><span className="notification-icon">{notification.type === 'application' ? <Briefcase size={18} /> : <Mail size={18} />}</span><span><strong>{notification.title}</strong><small>{notification.description}</small></span><time>{new Date(notification.createdAt).toLocaleDateString()}</time></button>)}</div></section>;
}

function LandingDashboard({ profile, email, role, initialNav, onEditProfileSection, onLogout, onUpdateProfilePicture, onUploadResume, onDownloadResume, onDeleteResume }) {
  const [activeTab, setActiveTab] = useState('Applied Jobs');
  const [activeNav, setActiveNav] = useState(() => new URLSearchParams(window.location.search).has('cn-apply') && role === 'candidate' ? 'CN Apply' : initialNav);
  const [connectFocusPerson, setConnectFocusPerson] = useState(null);
  const [messageRecipient, setMessageRecipient] = useState(null);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [careerPortals, setCareerPortals] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [hasMoreRecommendations, setHasMoreRecommendations] = useState(false);
  const [isLoadingMoreRecommendations, setIsLoadingMoreRecommendations] = useState(false);
  const dashboardNavigationItems = role === 'recruiter'
    ? [{ label: 'Home', icon: Home }, { label: 'Applications Received', icon: ClipboardList }, { label: 'Connect', icon: UsersRound }, { label: 'Notifications', icon: Bell }, { label: 'Messages', icon: MessageSquare }]
    : [...navigationItems.slice(0, 3), { label: 'Notifications', icon: Bell }, { label: 'Messages', icon: MessageSquare }, ...navigationItems.slice(3)];

  const handleJobSearchChange = (value) => {
    setJobSearchQuery(value);
    if (value.trim() && activeNav !== 'Apply') {
      setActiveNav('Apply');
      setActiveTab('Recommended Jobs');
    }
  };

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
    setRecommendations([]);
    setHasMoreRecommendations(false);
    fetch(`${API_BASE_URL}/jobs/recommendations?email=${encodeURIComponent(email)}&limit=${JOB_RECOMMENDATION_PAGE_SIZE}&offset=0`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load job recommendations.');
      if (isActive) {
        setRecommendations(Array.isArray(data.jobs) ? data.jobs : []);
        setHasMoreRecommendations(Boolean(data.hasMore));
      }
    }).catch((error) => {
      if (isActive) console.warn('Unable to load job recommendations:', error);
    }).finally(() => {
      if (isActive) setIsLoadingJobs(false);
    });
    Promise.all([
      fetch(`${API_BASE_URL}/jobs/applications?email=${encodeURIComponent(email)}`).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load applied jobs.');
        if (isActive) setAppliedJobs(Array.isArray(data) ? data : []);
      }),
      fetch(`${API_BASE_URL}/jobs/career-portals`).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load company career portals.');
        if (isActive) setCareerPortals(Array.isArray(data) ? data : []);
      }),
    ]).catch((error) => {
      if (isActive) console.warn('Unable to load applications or career portals:', error);
    });
    return () => { isActive = false; };
  }, [email]);

  const loadMoreRecommendations = async () => {
    if (isLoadingMoreRecommendations || !hasMoreRecommendations) return;
    setIsLoadingMoreRecommendations(true);
    try {
      const offset = recommendations.length;
      const response = await fetch(`${API_BASE_URL}/jobs/recommendations?email=${encodeURIComponent(email)}&limit=${JOB_RECOMMENDATION_PAGE_SIZE}&offset=${offset}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load more job recommendations.');
      const nextJobs = Array.isArray(data.jobs) ? data.jobs : [];
      setRecommendations((currentJobs) => [...currentJobs, ...nextJobs.filter((job) => !currentJobs.some((currentJob) => currentJob.id === job.id))]);
      setHasMoreRecommendations(Boolean(data.hasMore));
    } catch (error) {
      console.warn('Unable to load more job recommendations:', error);
    } finally {
      setIsLoadingMoreRecommendations(false);
    }
  };

  const appliedIds = new Set(appliedJobs.map((job) => String(job.id)));
  const matchingJobs = recommendations.filter((job) => job.matchScore > 0 && !appliedIds.has(String(job.id)));
  const homeJobs = matchingJobs;
  const recommendedJobs = matchingJobs;
  const jobsByTab = { 'Applied Jobs': appliedJobs, 'Recommended Jobs': recommendedJobs };
  const normalizedJobSearch = jobSearchQuery.trim().toLocaleLowerCase();
  const filteredJobsByTab = Object.fromEntries(Object.entries(jobsByTab).map(([tab, jobs]) => [
    tab,
    normalizedJobSearch ? jobs.filter((job) => [
      job.title, job.company, job.location, job.type, job.jobType, job.employmentType, job.preferredShift, job.description,
    ].some((value) => typeof value === 'string' && value.toLocaleLowerCase().includes(normalizedJobSearch))) : jobs,
  ]));

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

  const applyToReferral = async (job) => {
    if (job.source === 'career-nexus') {
      localStorage.setItem(`cn-application:${job.recruiterJobId}`, JSON.stringify(job));
      window.open(`${window.location.origin}/?cn-apply=${encodeURIComponent(job.recruiterJobId)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    const applicationWindow = window.open('about:blank', '_blank');
    if (applicationWindow) applicationWindow.opener = null;
    try {
      await applyToJob(job);
      if (applicationWindow) applicationWindow.location.replace(job.url);
      else window.open(job.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      applicationWindow?.close();
      throw error;
    }
  };

  return (
    <div className={activeNav === 'Profile' ? 'landing-page profile-page' : 'landing-page'}>
      <header className="topbar landing-topbar">
        <img className="dashboard-logo" src="/images/companylogo-after-login.png" alt="CareerNexus" />
        <nav className="top-nav" aria-label="Primary navigation">
          {dashboardNavigationItems.map(({ label, icon: Icon }) => {
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
          <button type="button" className={activeNav === 'Profile' ? 'profile-icon-button active' : 'profile-icon-button'} onClick={() => setActiveNav('Profile')} aria-label="Profile" title="Profile" aria-pressed={activeNav === 'Profile'}>
            {profile.photo?.startsWith('data:') || profile.photo?.includes('://') ? <img className="profile-button-avatar" src={profile.photo} alt="" /> : <span className="profile-button-initials">{profile.name?.split(/\s+/).map((part) => part[0]).join('').toUpperCase() || 'U'}</span>}
          </button>
          <button type="button" className="logout-icon-button" onClick={onLogout} aria-label="Log out" title="Log out"><LogOut size={18} aria-hidden="true" /></button>
        </div>
      </header>

      <main className="dashboard-shell">
        {role === 'candidate' && <div className="jobs-search-box dashboard-jobs-search" role="search">
          <Search size={18} aria-hidden="true" />
          <input type="search" aria-label="Search jobs" placeholder="Search jobs by keyword, company, city, or skill" value={jobSearchQuery} onChange={(event) => handleJobSearchChange(event.target.value)} />
        </div>}

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

        {activeNav === 'Home' && role === 'recruiter' && <RecruiterHome email={email} profile={profile} />}

        {activeNav === 'Applications Received' && role === 'recruiter' && <RecruiterApplicationsView email={email} />}

        {activeNav === 'Home' && role === 'candidate' && <section className="insights-grid home-insights panel">
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

        {activeNav === 'Home' && role === 'candidate' && <section className="jobs-section panel">
          <div className="jobs-header"><div><h3>Recommended for you</h3><p className="jobs-section-intro">All verified listings that match your profile, skills, and preferred location.</p></div><button type="button" className="link-button" onClick={() => setActiveNav('Apply')}>View all</button></div>
          {isLoadingJobs && <p className="library-status">Loading matched job listings...</p>}
          {!isLoadingJobs && homeJobs.length === 0 && <p className="library-status">No verified job listings are currently available. View all for official employer career portals.</p>}
          <div className="job-list-grid">{homeJobs.map((job) => <JobListingCard key={job.id} job={job} onApply={applyToJob} email={email} compact />)}</div>
          {hasMoreRecommendations && <button type="button" className="link-button" onClick={loadMoreRecommendations} disabled={isLoadingMoreRecommendations}>{isLoadingMoreRecommendations ? 'Loading more jobs...' : 'Load more jobs'}</button>}
        </section>}

        {activeNav === 'Apply' && role === 'candidate' && <section className="jobs-section panel">
          <div className="jobs-header">
            <div><h3>Jobs</h3><p className="jobs-section-intro">All jobs shown match your profile and preferred location; shortlist scores indicate fit.</p></div>
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

          {isLoadingJobs && <p className="library-status">Loading matched job listings...</p>}
          {!isLoadingJobs && filteredJobsByTab[activeTab].length === 0 && <p className="library-status">{jobsByTab[activeTab].length ? `No jobs match “${jobSearchQuery}”.` : activeTab === 'Applied Jobs' ? 'You have not applied to any jobs yet.' : 'No verified job listings are currently available.'}</p>}
          {!isLoadingJobs && <div className="job-list-grid">{filteredJobsByTab[activeTab].map((job) => <JobListingCard key={job.id} job={job} onApply={applyToJob} email={email} isApplied={activeTab === 'Applied Jobs'} />)}</div>}
          {activeTab === 'Recommended Jobs' && hasMoreRecommendations && <button type="button" className="link-button" onClick={loadMoreRecommendations} disabled={isLoadingMoreRecommendations}>{isLoadingMoreRecommendations ? 'Loading more jobs...' : 'Load more jobs'}</button>}
          <section className="career-portals-section">
            <div className="jobs-header"><div><h3>Official career portals</h3><p className="jobs-section-intro">Browse current vacancies directly on each employer's official site.</p></div></div>
            <div className="career-portal-grid">{careerPortals.map((portal) => <a className="career-portal-link" key={portal.slug} href={portal.careerUrl} target="_blank" rel="noreferrer"><span><strong>{portal.companyName}</strong><small>{portal.industry}</small></span><ArrowUpRight size={17} aria-hidden="true" /></a>)}</div>
          </section>
        </section>}

        {activeNav === 'Profile' && <div className="profile-sections">
          {role === 'recruiter' && <section className="profile-details panel"><div className="profile-detail-heading"><h3>Professional Summary</h3><button type="button" className="profile-edit-icon" aria-label="Edit Professional Summary" title="Edit Professional Summary" onClick={() => onEditProfileSection('professionalSummary')}><Pencil size={17} /></button></div><p>{profile.professionalSummary || 'Not added'}</p></section>}
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Professional Profile</h3><button type="button" className="profile-edit-icon" aria-label="Edit Professional Profile" title="Edit Professional Profile" onClick={() => onEditProfileSection('professionalProfile')}><Pencil size={17} /></button></div><div className="detail-grid">
            {[['Profile headline', profile.headline], ['Name', profile.name], ['Contact', profile.contact], ['Currently working as', profile.currentlyWorkingAs], ['Email ID', profile.email], ['Education', profile.education], ['Current location', profile.location], ['Languages', profile.languages]].map(([label, value]) => <div key={label}><strong>{label}:</strong> {displayValue(value)}</div>)}
          </div></section>
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Professional Info</h3><button type="button" className="profile-edit-icon" aria-label="Edit Professional Info" title="Edit Professional Info" onClick={() => onEditProfileSection('professionalInfo')}><Pencil size={17} /></button></div><div className="detail-grid">
            {[['Current industry', profile.currentIndustry], ['Department', profile.department], ['Current role', profile.currentRole], ['Current job title', profile.currentJobTitle], ['Notice period', profile.noticePeriod], ['DOB', profile.dateOfBirth], ['Address', profile.address]].map(([label, value]) => <div key={label}><strong>{label}:</strong> {displayValue(value)}</div>)}
          </div></section>
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Career Preferences</h3><button type="button" className="profile-edit-icon" aria-label="Edit Career Preferences" title="Edit Career Preferences" onClick={() => onEditProfileSection('careerPreferences')}><Pencil size={17} /></button></div><div className="detail-grid">
            {[['Preferred job role', profile.preferredJobRole], ['Preferred city', profile.preferredCity], ['Expected salary (INR LPA)', profile.expectedSalaryLpa], ['Total experience (years)', profile.totalExperienceYears], ['Job type', profile.jobType], ['Employment type', profile.employmentType], ['Preferred shift', profile.preferredShift]].map(([label, value]) => <div key={label}><strong>{label}:</strong> {displayValue(value)}</div>)}
          </div></section>
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Key Skills Set</h3><button type="button" className="profile-edit-icon" aria-label="Edit Key Skills Set" title="Edit Key Skills Set" onClick={() => onEditProfileSection('keySkillsSet')}><Pencil size={17} /></button></div><div className="profile-tiles">{(profile.skills || []).map((skill) => <span className="profile-tile" key={skill}>{skill}</span>)}</div></section>
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Employment Details</h3><button type="button" className="profile-edit-icon" aria-label="Edit Employment Details" title="Edit Employment Details" onClick={() => onEditProfileSection('employmentDetails')}><Pencil size={17} /></button></div>{(profile.employmentDetails || []).map((employment, index) => <article className="profile-record" key={index}><strong>{employment.companyName || `Company ${index + 1}`}</strong><div>{displayValue(employment.jobTitle)} · {employment.employmentType || 'Employment type not added'} · CTC: {displayValue(employment.ctc)}</div><small>{employment.joiningDate || 'Joining date not added'}{employment.isCurrent ? ' · Current' : employment.relievingDate ? ` to ${employment.relievingDate}` : ''}</small><p>Skills: {displayValue(employment.skills)} · Notice period: {employment.noticePeriod || 'Not added'}</p><p>{employment.jobProfile}</p></article>)}{!profile.employmentDetails?.length && <p className="muted">No employment details added.</p>}</section>
          <section className="profile-details panel"><div className="profile-detail-heading"><h3>Major Projects</h3><button type="button" className="profile-edit-icon" aria-label="Edit Major Projects" title="Edit Major Projects" onClick={() => onEditProfileSection('majorProjects')}><Pencil size={17} /></button></div>{(profile.majorProjects || []).map((project, index) => <article className="profile-record" key={index}><strong>{project.projectTitle || `Project ${index + 1}`}</strong><div>{[project.companyName, project.clientName, project.status].filter(Boolean).join(' · ')}</div><small>{project.workedFrom || 'Start date not added'}{project.workedTill ? ` to ${project.workedTill}` : ''}</small><p>{project.projectDetails}</p></article>)}{!profile.majorProjects?.length && <p className="muted">No projects added.</p>}</section>
        </div>}

        {activeNav === 'Library' && <LibraryView />}

        {activeNav === 'Courses' && <CoursesView />}

        {activeNav === 'Connect' && <ConnectView email={email} onApplyReferral={applyToReferral} appliedJobIds={appliedIds} initialPerson={connectFocusPerson} onMessage={(person) => { setMessageRecipient(person); setActiveNav('Messages'); }} />}

        {activeNav === 'Messages' && <MessagesView email={email} role={role} onOpenPerson={(person) => { setConnectFocusPerson(person); setActiveNav('Connect'); }} initialPerson={messageRecipient} onConsumeInitialPerson={() => setMessageRecipient(null)} />}

        {activeNav === 'Notifications' && <NotificationsView email={email} onOpenApplications={() => setActiveNav('Applications Received')} onOpenMessages={() => setActiveNav('Messages')} />}

        {activeNav === 'CN Apply' && role === 'candidate' && <CandidateJobApplicationView email={email} profile={profile} onBack={() => { const openingId = new URLSearchParams(window.location.search).get('cn-apply'); if (openingId) localStorage.removeItem(`cn-application:${openingId}`); window.history.replaceState(null, '', window.location.pathname); setActiveNav('Apply'); }} />}
      </main>

    </div>
  );
}

function App() {
  const [screen, setScreen] = useState('login');
  const [profile, setProfile] = useState(defaultProfile);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('candidate');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [sectionToEdit, setSectionToEdit] = useState(null);
  const [landingNav, setLandingNav] = useState('Home');

  useEffect(() => {
    const savedEmail = localStorage.getItem(ACCOUNT_EMAIL_KEY);
    setUserRole(localStorage.getItem(USER_ROLE_KEY) || 'candidate');
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
    fetch(`${API_BASE_URL}/auth/profile?email=${encodeURIComponent(userEmail)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load the saved profile.');
        if (isActive && data.user) setProfile((current) => ({ ...current, ...data.user.profile, email: data.user.email || userEmail, updatedAt: data.user.updated_at || current.updatedAt }));
      })
      .catch((error) => console.warn('Unable to load the saved profile:', error));
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
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setScreen('login');
  };

  const persistProfile = async (nextProfile) => {
    const updatedAt = new Date().toISOString();
    const profileToSave = { ...nextProfile };
    delete profileToSave.updatedAt;
    if (!userEmail) {
      setProfile({ ...nextProfile, updatedAt });
      return;
    }
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, profile: profileToSave }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to save profile.');
    setProfile({ ...nextProfile, updatedAt: data.user?.updated_at || updatedAt });
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

  const handleLogin = ({ user, profile: savedProfile, isFirstTime, accessToken }) => {
    const accountEmail = user?.email || '';
    const accountRole = user?.role === 'recruiter' ? 'recruiter' : 'candidate';
    setUserEmail(accountEmail);
    setUserRole(accountRole);
    if (accountEmail) localStorage.setItem(ACCOUNT_EMAIL_KEY, accountEmail);
    localStorage.setItem(USER_ROLE_KEY, accountRole);
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
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
        role={userRole}
        isEditing={isEditingProfile}
        sectionToEdit={sectionToEdit}
        onSave={async (savedProfile) => {
          await persistProfile(savedProfile);
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
      role={userRole}
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
