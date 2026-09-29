import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { locationSuggestions } from '../shared/locations';
import { calculateProfileCompletion, formatProfileUpdatedAt, languageSuggestions, noticePeriodOptions } from '../shared/profile';
import {
  Image,
  Alert,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const STORAGE_KEY = 'jobportal_user_profile_status';
const ACCOUNT_EMAIL_KEY = 'jobportal_account_email';
const USER_ROLE_KEY = 'jobportal_user_role';
const SESSION_PROFILE_KEY = 'jobportal_session_profile';
const ACCESS_TOKEN_KEY = 'jobportal_access_token';

const getSalaryInputValue = (value = '') => value.replace(/^(INR|₹)\s*/i, '');

const getApiBaseUrl = () => {
  const publicApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (publicApiUrl) return publicApiUrl.replace(/\/$/, '');

  const configuredUrl = Constants.expoConfig?.extra?.apiBaseUrl;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || 'localhost:8081';
  let host = hostUri.split(':')[0] || 'localhost';
  if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
    host = '10.0.2.2';
  }

  return `http://${host}:5000`;
};

const getConnectAuthHeaders = async () => ({ Authorization: `Bearer ${await AsyncStorage.getItem(ACCESS_TOKEN_KEY) || ''}` });

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
  photo: '',
  contact: '',
  education: '',
  skills: [],
  languages: [],
  location: '',
  preferredJobRole: '',
  preferredCity: '',
  expectedSalaryLpa: '',
  totalExperienceYears: '',
  jobType: '',
  employmentType: '',
  preferredShift: '',
  employmentDetails: [],
  majorProjects: [],
  updatedAt: null,
};

const tabs = ['Applied Jobs', 'Recommended Jobs'];
const JOB_RECOMMENDATION_PAGE_SIZE = 12;
const navigationItems = [
  { label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { label: 'Apply', icon: 'paper-plane-outline' },
  { label: 'Connect', icon: 'people-outline' },
  { label: 'Library', icon: 'library-outline' },
  { label: 'Courses', icon: 'school-outline' },
];

const isProfileImageUri = (value) => typeof value === 'string' && (value.includes('://') || value.startsWith('data:'));

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('candidate@jobportal.com');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [role, setRole] = useState('candidate');
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [knownIsNewUser, setKnownIsNewUser] = useState(null);

  const handleSendOtp = async () => {
    if (loadingOtp || resendCooldown > 0) return;
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setLoadingOtp(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to send OTP');
      }

      setKnownIsNewUser(Boolean(data.isNewUser));
      setMessage(data.message || 'OTP sent successfully.');
      setOtpSent(true);
      setResendCooldown(30);
      setOtp('');
    } catch (error) {
      if (!__DEV__) {
        setError(error.message || 'Unable to send OTP. Please try again later.');
        return;
      }
      if (!__DEV__) {
        setError(error.message || 'OTP verification failed. Please try again.');
        return;
      }
      const shouldUseFallback = knownIsNewUser === true;
      setMessage('Backend unavailable. Falling back to local onboarding flow.');
      setOtpSent(true);
      if (shouldUseFallback) {
        await AsyncStorage.setItem(STORAGE_KEY, 'new-user');
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, 'existing-user');
      }
      setError(error.message || 'Unable to send OTP.');
    } finally {
      setLoadingOtp(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => setResendCooldown((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP sent to your email.');
      return;
    }

    setError('');
    setLoadingVerify(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      const isFirstTimeUser = Boolean(data.isNewUser);
      await AsyncStorage.setItem(STORAGE_KEY, isFirstTimeUser ? 'new-user' : 'existing-user');
      onLogin({ user: data.user, profile: data.user.profile, isFirstTime: isFirstTimeUser, accessToken: data.accessToken });
    } catch (error) {
      const fallbackIsFirstTime = knownIsNewUser === true;
      await AsyncStorage.setItem(STORAGE_KEY, fallbackIsFirstTime ? 'new-user' : 'existing-user');
      onLogin({ user: { email, role }, isFirstTime: fallbackIsFirstTime, accessToken: null });
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <SafeAreaView style={styles.containerDark}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.loginScroller} contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.loginCard}>
        <Image source={require('./assets/careernexus-logo.png')} style={styles.loginLogo} resizeMode="contain" accessibilityLabel="CareerNexus, powered by Shivoham Automation Experts" />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Select your role and receive OTP</Text>

        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'recruiter' && styles.roleButtonActive]}
            onPress={() => {
              setRole('recruiter');
              setEmail('recruiter@jobportal.com');
              setKnownIsNewUser(null);
              setOtp('');
              setOtpSent(false);
              setError('');
            }}
          >
            <Text style={[styles.roleText, role === 'recruiter' && styles.roleTextActive]}>Recruiter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, role === 'candidate' && styles.roleButtonActive]}
            onPress={() => {
              setRole('candidate');
              setEmail('candidate@jobportal.com');
              setKnownIsNewUser(null);
              setOtp('');
              setOtpSent(false);
              setError('');
            }}
          >
            <Text style={[styles.roleText, role === 'candidate' && styles.roleTextActive]}>Candidate</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={(value) => { setEmail(value); setKnownIsNewUser(null); }}
          placeholder={role === 'recruiter' ? 'recruiter@jobportal.com' : 'candidate@jobportal.com'}
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TouchableOpacity style={[styles.primaryButton, styles.loginButton, styles.otpAction, (loadingOtp || resendCooldown > 0) && styles.otpActionDisabled]} onPress={handleSendOtp} disabled={loadingOtp || resendCooldown > 0}>
          <Text style={styles.primaryButtonText}>{loadingOtp ? 'Sending...' : resendCooldown > 0 ? `Send OTP in ${resendCooldown}s` : 'Send OTP'}</Text>
        </TouchableOpacity>

        {message ? <Text style={styles.successText}>{message}</Text> : null}


        {otpSent && (
          <>
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleVerifyOtp} disabled={loadingVerify}>
              <Text style={styles.primaryButtonText}>{loadingVerify ? 'Verifying...' : 'Submit'}</Text>
            </TouchableOpacity>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Image source={require('./assets/career-services.png')} style={styles.loginServices} resizeMode="contain" accessibilityLabel="CareerNexus recruitment, talent management, career guidance, AI hiring, corporate hiring, and resume support services" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    <View style={[styles.locationField, isFocused && styles.locationFieldFocused]}>
      <Text style={styles.locationLabel}>{label}</Text>
      <TextInput
        style={[styles.input, styles.profileInput]}
        value={query}
        onChangeText={(text) => { setQuery(text); onChange(text); }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 120)}
        placeholder="Start typing a city"
        placeholderTextColor="#8aa3c2"
      />
      {isFocused && suggestions.length > 0 && <ScrollView style={styles.locationSuggestions} nestedScrollEnabled keyboardShouldPersistTaps="always">
        {suggestions.map((location) => <TouchableOpacity key={location} style={styles.locationSuggestion} onPress={() => selectLocation(location)}><Text style={styles.locationSuggestionText}>{location}</Text></TouchableOpacity>)}
      </ScrollView>}
    </View>
  );
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

  return (
    <View style={[styles.locationField, styles.languageField, isFocused && styles.locationFieldFocused]}>
      <Text style={styles.locationLabel}>Languages</Text>
      <TextInput
        style={[styles.input, styles.profileInput]}
        value={query}
        onChangeText={setQuery}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 120)}
        placeholder="Search and select languages"
        placeholderTextColor="#94a3b8"
      />
      {isFocused && suggestions.length > 0 && <ScrollView style={styles.locationSuggestions} nestedScrollEnabled keyboardShouldPersistTaps="always">
        {suggestions.map((language) => <TouchableOpacity key={language} style={styles.locationSuggestion} onPress={() => selectLanguage(language)}><Text style={styles.locationSuggestionText}>{language}</Text></TouchableOpacity>)}
      </ScrollView>}
      <View style={styles.skillTiles}>{selectedLanguages.map((language) => <TouchableOpacity key={language} style={styles.skillTile} onPress={() => onChange(selectedLanguages.filter((item) => item !== language))} accessibilityLabel={`Remove ${language}`}><Text style={styles.skillTileText}>{language}  ×</Text></TouchableOpacity>)}</View>
    </View>
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

  return (
    <View style={[styles.locationField, styles.preferredCitiesField, isFocused && styles.locationFieldFocused]}>
      <Text style={styles.locationLabel}>Preferred city</Text>
      <TextInput
        style={[styles.input, styles.profileInput]}
        value={query}
        onChangeText={setQuery}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 120)}
        placeholder={selectedCities.length >= 3 ? 'Maximum 3 cities selected' : 'Search and select up to 3 cities'}
        placeholderTextColor="#94a3b8"
      />
      {isFocused && suggestions.length > 0 && <ScrollView style={styles.locationSuggestions} nestedScrollEnabled keyboardShouldPersistTaps="always">
        {suggestions.map((city) => <TouchableOpacity key={city} style={styles.locationSuggestion} onPress={() => selectCity(city)}><Text style={styles.locationSuggestionText}>{city}</Text></TouchableOpacity>)}
      </ScrollView>}
      <View style={styles.skillTiles}>{selectedCities.map((city) => <TouchableOpacity key={city} style={styles.skillTile} onPress={() => onChange(selectedCities.filter((item) => item !== city))} accessibilityLabel={`Remove ${city}`}><Text style={styles.skillTileText}>{city}  ×</Text></TouchableOpacity>)}</View>
      <Text style={[styles.preferredCityHint, error && styles.preferredCityError]}>{error || 'Select at least 1 and up to 3 cities.'}</Text>
    </View>
  );
}

function ProfileForm({ profile, email, role, onSave, onSkip, isEditing, sectionToEdit }) {
  const [form, setForm] = useState(() => ({ ...defaultProfile, ...profile, email: email || profile.email || '' }));
  const [skillDraft, setSkillDraft] = useState(profile.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [expandedDropdown, setExpandedDropdown] = useState('');
  const [preferredCityError, setPreferredCityError] = useState('');
  const [profileFormError, setProfileFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateEntry = (collection, index, field, value) => setForm((prev) => ({
    ...prev,
    [collection]: prev[collection].map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: value } : entry),
  }));
  const addEntry = (collection, entry) => updateField(collection, [...(form[collection] || []), entry]);
  const removeEntry = (collection, index) => updateField(collection, form[collection].filter((_, entryIndex) => entryIndex !== index));
  const field = (label, key, entry, onChange, options = {}) => <View style={styles.profileField} key={key}><Text style={styles.locationLabel}>{label}</Text><TextInput style={[styles.input, styles.profileInput]} value={entry[key] || ''} onChangeText={(value) => onChange(key, value)} placeholder={label} placeholderTextColor="#94a3b8" {...options} /></View>;
  const choiceField = (label, key, choices, entry = form, onChange = updateField) => <View style={styles.profileField} key={key}><Text style={styles.locationLabel}>{label}</Text><View style={styles.choiceRow}>{choices.map((choice) => <TouchableOpacity key={choice} style={[styles.choiceButton, entry[key] === choice && styles.choiceButtonActive]} onPress={() => onChange(key, choice)}><Text style={[styles.choiceText, entry[key] === choice && styles.choiceTextActive]}>{choice}</Text></TouchableOpacity>)}</View></View>;
  const dropdownField = (label, key, choices, entry = form, onChange = updateField, dropdownKey = key) => <View style={[styles.profileField, styles.dropdownField]} key={dropdownKey}>
    <Text style={styles.locationLabel}>{label}</Text>
    <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setExpandedDropdown((current) => current === dropdownKey ? '' : dropdownKey)}>
      <Text style={[styles.dropdownValue, !entry[key] && styles.dropdownPlaceholder]}>{entry[key] || 'Select notice period'}</Text>
      <Ionicons name={expandedDropdown === dropdownKey ? 'chevron-up' : 'chevron-down'} size={17} color="#526779" />
    </TouchableOpacity>
    {expandedDropdown === dropdownKey && <View style={styles.dropdownOptions}>{choices.map((choice) => <TouchableOpacity key={choice} style={styles.dropdownOption} onPress={() => { onChange(key, choice); setExpandedDropdown(''); }}><Text style={styles.dropdownOptionText}>{choice}</Text></TouchableOpacity>)}</View>}
  </View>;
  const saveForm = async () => {
    setProfileFormError('');
    const cityCount = Array.isArray(form.preferredCity) ? form.preferredCity.length : form.preferredCity ? 1 : 0;
    if (role === 'candidate' && (!sectionToEdit || sectionToEdit === 'careerPreferences') && cityCount < 1) {
      setPreferredCityError('Select at least 1 preferred city.');
      return;
    }
    if (role === 'recruiter' && (!sectionToEdit || sectionToEdit === 'professionalSummary') && !form.professionalSummary.trim()) {
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
  const section = (title, children, action, sectionKey) => (!sectionToEdit || sectionToEdit === sectionKey) ? <View style={styles.formSection} key={title}><View style={styles.formSectionHeading}><Text style={styles.formSectionTitle}>{title}</Text>{action}</View>{children}</View> : null;
  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !skillDraft.some((item) => item.toLowerCase() === skill.toLowerCase())) setSkillDraft((items) => [...items, skill]);
    setSkillInput('');
  };

  return (
    <SafeAreaView style={styles.containerDark}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <Text style={styles.sectionHeading}>{sectionToEdit ? 'Edit profile section' : 'Complete your professional profile'}</Text>
          {role === 'recruiter' ? section('Professional Summary', <>{field('Professional summary', 'professionalSummary', form, updateField, { multiline: true })}</>, null, 'professionalSummary') : null}
          {section('Professional Profile', <>
            {field('Profile headline', 'headline', form, updateField)}{field('Name', 'name', form, updateField)}{field('Contact', 'contact', form, updateField, { keyboardType: 'phone-pad' })}{field('Currently working as', 'currentlyWorkingAs', form, updateField)}{field('Email ID', 'email', form, updateField, { keyboardType: 'email-address', autoCapitalize: 'none' })}{field('Education', 'education', form, updateField)}
            <LocationField label="Current location" value={form.location} onChange={(value) => updateField('location', value)} />
            <LanguageField value={form.languages} onChange={(value) => updateField('languages', value)} />
          </>, null, 'professionalProfile')}
          {section('Professional Info', <>
            {field('Current industry', 'currentIndustry', form, updateField)}{field('Department', 'department', form, updateField)}{field('Current role', 'currentRole', form, updateField)}{field('Current job title', 'currentJobTitle', form, updateField)}{dropdownField('Notice period', 'noticePeriod', noticePeriodOptions)}{field('DOB', 'dateOfBirth', form, updateField, { placeholder: 'YYYY-MM-DD' })}{field('Address', 'address', form, updateField, { multiline: true })}
          </>, null, 'professionalInfo')}
          {section('Career Preferences', <>
            {field('Preferred job role', 'preferredJobRole', form, updateField)}<PreferredCitiesField value={form.preferredCity} error={preferredCityError} onChange={(value) => { updateField('preferredCity', value); setPreferredCityError(''); }} />{field('Expected salary (INR LPA)', 'expectedSalaryLpa', form, updateField, { keyboardType: 'decimal-pad' })}{field('Total experience (years)', 'totalExperienceYears', form, updateField, { keyboardType: 'decimal-pad' })}{choiceField('Job type', 'jobType', ['Permanent', 'Contractual'])}{choiceField('Employment type', 'employmentType', ['Full Time', 'Part Time'])}{choiceField('Preferred shift', 'preferredShift', ['Day', 'Night', 'Rotational'])}
          </>, null, 'careerPreferences')}
          {section('Key Skills Set', <>
            <View style={styles.skillEntry}><TextInput style={[styles.input, styles.profileInput, styles.skillInput]} value={skillInput} onChangeText={setSkillInput} onSubmitEditing={addSkill} placeholder="Add a skill" placeholderTextColor="#94a3b8" /><TouchableOpacity style={styles.addButton} onPress={addSkill}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity></View>
            <View style={styles.skillTiles}>{skillDraft.map((skill) => <TouchableOpacity key={skill} style={styles.skillTile} onPress={() => setSkillDraft((items) => items.filter((item) => item !== skill))}><Text style={styles.skillTileText}>{skill}  ×</Text></TouchableOpacity>)}</View>
            {!sectionToEdit && <View style={styles.buttonRow}><TouchableOpacity style={styles.secondaryButton} onPress={() => { setSkillDraft(form.skills || []); setSkillInput(''); }}><Text style={styles.secondaryButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={() => updateField('skills', skillDraft)}><Text style={styles.primaryButtonText}>Save skills</Text></TouchableOpacity></View>}
          </>, null, 'keySkillsSet')}
          {section('Employment Details', <>
            {(form.employmentDetails || []).map((employment, index) => <View style={styles.repeatEntry} key={index}>
              <View style={styles.repeatHeading}><Text style={styles.repeatTitle}>{employment.companyName || `Company ${index + 1}`}</Text><TouchableOpacity onPress={() => removeEntry('employmentDetails', index)}><Ionicons name="trash-outline" size={19} color="#dc2626" /></TouchableOpacity></View>
              {choiceField('Is it your current company?', 'isCurrent', ['Yes', 'No'], { isCurrent: employment.isCurrent ? 'Yes' : 'No' }, (_, value) => updateEntry('employmentDetails', index, 'isCurrent', value === 'Yes'))}
              {choiceField('Employment type', 'employmentType', ['Full Time', 'Part Time'], employment, (key, value) => updateEntry('employmentDetails', index, key, value))}
              {field('Company name', 'companyName', employment, (key, value) => updateEntry('employmentDetails', index, key, value))}{field('Job title', 'jobTitle', employment, (key, value) => updateEntry('employmentDetails', index, key, value))}{field('Joining date', 'joiningDate', employment, (key, value) => updateEntry('employmentDetails', index, key, value), { placeholder: 'YYYY-MM-DD' })}
              {!employment.isCurrent && field('Relieving date', 'relievingDate', employment, (key, value) => updateEntry('employmentDetails', index, key, value), { placeholder: 'YYYY-MM-DD' })}
              {field('CTC', 'ctc', employment, (key, value) => updateEntry('employmentDetails', index, key, value))}{field('Skills (comma separated)', 'skillsText', { skillsText: (employment.skills || []).join(', ') }, (_, value) => updateEntry('employmentDetails', index, 'skills', value.split(',').map((item) => item.trim()).filter(Boolean)))}{field('Job profile', 'jobProfile', employment, (key, value) => updateEntry('employmentDetails', index, key, value), { multiline: true })}
              {employment.isCurrent && dropdownField('Notice period', 'noticePeriod', noticePeriodOptions, employment, (key, value) => updateEntry('employmentDetails', index, key, value), `employment-${index}-noticePeriod`)}
            </View>)}
            <TouchableOpacity style={styles.addRecordButton} onPress={() => addEntry('employmentDetails', { isCurrent: false, employmentType: '', companyName: '', jobTitle: '', joiningDate: '', relievingDate: '', ctc: '', skills: [], jobProfile: '', noticePeriod: '' })}><Ionicons name="add" size={18} color="#93c5fd" /><Text style={styles.addRecordText}>Add company</Text></TouchableOpacity>
          </>, null, 'employmentDetails')}
          {section('Major Projects', <>
            {(form.majorProjects || []).map((project, index) => <View style={styles.repeatEntry} key={index}>
              <View style={styles.repeatHeading}><Text style={styles.repeatTitle}>{project.projectTitle || `Project ${index + 1}`}</Text><View style={styles.repeatActions}>{project.saved && <TouchableOpacity onPress={() => updateEntry('majorProjects', index, 'saved', false)}><Text style={styles.editRecordText}>Edit</Text></TouchableOpacity>}<TouchableOpacity onPress={() => removeEntry('majorProjects', index)}><Ionicons name="trash-outline" size={19} color="#dc2626" /></TouchableOpacity></View></View>
              {project.saved ? <View><Text style={styles.profileRecordText}>{[project.companyName, project.clientName, project.status].filter(Boolean).join(' · ')}</Text><Text style={styles.profileRecordText}>{project.workedFrom || 'Start date not added'}{project.workedTill ? ` to ${project.workedTill}` : ''}</Text><Text style={styles.profileRecordText}>{project.projectDetails}</Text></View> : <>
              {field('Project title', 'projectTitle', project, (key, value) => updateEntry('majorProjects', index, key, value))}
              <View style={styles.profileField}><Text style={styles.locationLabel}>Company</Text><View style={styles.choiceRow}>{(form.employmentDetails || []).filter((employment) => employment.companyName).map((employment, companyIndex) => <TouchableOpacity key={`${employment.companyName}-${companyIndex}`} style={[styles.choiceButton, project.companyName === employment.companyName && styles.choiceButtonActive]} onPress={() => updateEntry('majorProjects', index, 'companyName', employment.companyName)}><Text style={[styles.choiceText, project.companyName === employment.companyName && styles.choiceTextActive]}>{employment.companyName}</Text></TouchableOpacity>)}</View></View>
              {field('Client name (optional)', 'clientName', project, (key, value) => updateEntry('majorProjects', index, key, value))}{choiceField('Project status', 'status', ['In progress', 'Finished'], project, (key, value) => updateEntry('majorProjects', index, key, value))}{field('Worked from', 'workedFrom', project, (key, value) => updateEntry('majorProjects', index, key, value), { placeholder: 'YYYY-MM-DD' })}{field('Worked till', 'workedTill', project, (key, value) => updateEntry('majorProjects', index, key, value), { placeholder: 'YYYY-MM-DD' })}{field('Project details', 'projectDetails', project, (key, value) => updateEntry('majorProjects', index, key, value), { multiline: true })}
              <View style={styles.buttonRow}><TouchableOpacity style={styles.secondaryButton} onPress={() => removeEntry('majorProjects', index)}><Text style={styles.secondaryButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={() => updateEntry('majorProjects', index, 'saved', true)}><Text style={styles.primaryButtonText}>Save project</Text></TouchableOpacity></View>
              </>}
            </View>)}
            <TouchableOpacity style={styles.addRecordButton} onPress={() => addEntry('majorProjects', { projectTitle: '', companyName: '', clientName: '', status: '', workedFrom: '', workedTill: '', projectDetails: '' })}><Ionicons name="add" size={18} color="#93c5fd" /><Text style={styles.addRecordText}>Add project</Text></TouchableOpacity>
          </>, null, 'majorProjects')}

          <View style={styles.buttonRow}>
            {(sectionToEdit || role !== 'recruiter') ? <TouchableOpacity style={styles.secondaryButton} onPress={onSkip}><Text style={styles.secondaryButtonText}>{sectionToEdit ? 'Cancel' : 'Later'}</Text></TouchableOpacity> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={saveForm} disabled={isSaving}><Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : sectionToEdit === 'keySkillsSet' ? 'Save skills' : sectionToEdit ? 'Save changes' : isEditing ? 'Update profile' : 'Create profile'}</Text></TouchableOpacity>
          </View>
          {profileFormError ? <Text style={styles.connectError}>{profileFormError}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
    <View style={styles.librarySection}>
      <Text style={styles.libraryEyebrow}>TESTING LIBRARY</Text>
      <View style={styles.libraryHeader}>
        <View style={styles.libraryTitleBlock}>
          <Text style={styles.libraryTitle}>Software testing topics</Text>
          <Text style={styles.libraryIntro}>Build a stronger testing foundation, one concept at a time.</Text>
        </View>
        <Text style={styles.topicCount}>{filteredTopics.length} topics</Text>
      </View>

      <Text style={styles.librarySearchLabel}>Search topics</Text>
      <TextInput style={styles.librarySearch} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search by topic, concept, or example" placeholderTextColor="#94a3b8" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alphabetScroll} contentContainerStyle={styles.alphabetFilter}>
        <TouchableOpacity style={[styles.alphabetButton, activeLetter === 'All' && styles.alphabetButtonActive]} onPress={() => setActiveLetter('All')}>
          <Text style={[styles.alphabetButtonText, activeLetter === 'All' && styles.alphabetButtonTextActive]}>All</Text>
        </TouchableOpacity>
        {alphabet.map((letter) => {
          const isAvailable = availableLetters.has(letter);
          return (
            <TouchableOpacity
              key={letter}
              style={[styles.alphabetButton, activeLetter === letter && styles.alphabetButtonActive, !isAvailable && styles.alphabetButtonDisabled]}
              onPress={() => setActiveLetter(letter)}
              disabled={!isAvailable}
            >
              <Text style={[styles.alphabetButtonText, activeLetter === letter && styles.alphabetButtonTextActive, !isAvailable && styles.alphabetButtonTextDisabled]}>{letter}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filteredTopics.map((topic) => {
        const isExpanded = expandedTopics.has(topic.name);
        return (
          <View key={topic.name} style={styles.topicCard}>
            <TouchableOpacity style={styles.topicToggle} onPress={() => toggleTopic(topic.name)} accessibilityState={{ expanded: isExpanded }}>
              <Text style={styles.topicTitle}>{topic.name}</Text>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={21} color="#172638" />
            </TouchableOpacity>
            {isExpanded && <View style={styles.topicDetails}>
              <Text style={styles.topicBrief}>{topic.briefDescription}</Text>
              <Text style={styles.topicFieldTitle}>Explanation in detail</Text>
              <Text style={styles.topicExplanation}>{topic.explanation}</Text>
              <Text style={styles.topicFieldTitle}>Example</Text>
              <View style={styles.topicExample}>
                <Text style={styles.topicExampleText}>{topic.example}</Text>
              </View>
            </View>}
          </View>
        );
      })}

      {filteredTopics.length === 0 && <Text style={styles.emptyLibrary}>No testing topics available.</Text>}
    </View>
  );
}

function LibraryView() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/library/topics`);
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

  if (loading) return <View style={styles.libraryStatus}><Text style={styles.libraryStatusText}>Loading testing topics...</Text></View>;
  if (error) return <View style={styles.libraryStatus}><Text style={styles.libraryStatusError}>{error}</Text></View>;

  return <LibraryTopics topics={topics} />;
}

function CoursesList({ courses }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState('All');
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const filteredCourses = courses.filter((course) => (
    (activeLetter === 'All' || course.title.toUpperCase().startsWith(activeLetter))
    && [course.title, course.topic, course.provider, course.level, course.duration].join(' ').toLowerCase().includes(normalizedQuery)
  ));
  const availableLetters = new Set(courses.map((course) => course.title.charAt(0).toUpperCase()));

  return (
    <View style={styles.coursesSection}>
      <Text style={styles.coursesEyebrow}>LEARNING PATHS</Text>
      <View style={styles.coursesHeader}>
        <View style={styles.coursesTitleBlock}>
          <Text style={styles.coursesTitle}>Online courses</Text>
          <Text style={styles.coursesIntro}>Practical courses for testing topics and skills commonly listed in job descriptions.</Text>
        </View>
        <Text style={styles.courseCount}>{filteredCourses.length} courses</Text>
      </View>

      <Text style={styles.librarySearchLabel}>Search courses</Text>
      <TextInput style={styles.librarySearch} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search by skill, topic, or provider" placeholderTextColor="#94a3b8" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alphabetScroll} contentContainerStyle={styles.alphabetFilter}>
        <TouchableOpacity style={[styles.alphabetButton, activeLetter === 'All' && styles.alphabetButtonActive]} onPress={() => setActiveLetter('All')}><Text style={[styles.alphabetButtonText, activeLetter === 'All' && styles.alphabetButtonTextActive]}>All</Text></TouchableOpacity>
        {alphabet.map((letter) => {
          const isAvailable = availableLetters.has(letter);
          return <TouchableOpacity key={letter} style={[styles.alphabetButton, activeLetter === letter && styles.alphabetButtonActive, !isAvailable && styles.alphabetButtonDisabled]} onPress={() => setActiveLetter(letter)} disabled={!isAvailable}><Text style={[styles.alphabetButtonText, activeLetter === letter && styles.alphabetButtonTextActive, !isAvailable && styles.alphabetButtonTextDisabled]}>{letter}</Text></TouchableOpacity>;
        })}
      </ScrollView>

      {filteredCourses.map((course) => (
        <View key={course.title} style={styles.courseCard}>
          <View style={styles.courseCardHeader}>
            <View style={styles.courseTitleBlock}>
              <Text style={styles.courseTopic}>{course.topic}</Text>
              <Text style={styles.courseTitle}>{course.title}</Text>
            </View>
            <Text style={styles.courseLevel}>{course.level}</Text>
          </View>
          <View style={styles.courseMeta}>
            <Text style={styles.courseMetaText}>{course.provider}</Text>
            <Text style={styles.courseMetaText}>{course.duration}</Text>
          </View>
          <TouchableOpacity style={styles.courseLink} onPress={() => Linking.openURL(course.url)}>
            <Text style={styles.courseLinkText}>View course</Text>
            <Ionicons name="open-outline" size={16} color="#1d4ed8" />
          </TouchableOpacity>
        </View>
      ))}

      {filteredCourses.length === 0 && <Text style={styles.emptyLibrary}>{courses.length ? `No courses match “${searchQuery}”.` : 'No courses available.'}</Text>}
    </View>
  );
}

function CoursesView() {
  const [courseList, setCourseList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/courses`);
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

  if (loading) return <View style={styles.libraryStatus}><Text style={styles.libraryStatusText}>Loading courses...</Text></View>;
  if (error) return <View style={styles.libraryStatus}><Text style={styles.libraryStatusError}>{error}</Text></View>;

  return <CoursesList courses={courseList} />;
}

function ConnectView({ email, profile, onApplyReferral, onApplyRecruiterJob, appliedJobIds, initialPerson, onMessage }) {
  const [targetRole, setTargetRole] = useState('candidate');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [activeSection, setActiveSection] = useState('search');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [overview, setOverview] = useState({ incoming: [], outgoing: [], connections: [] });
  const [referrals, setReferrals] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialPerson) return;
    setSelectedPerson(initialPerson);
    setTargetRole(initialPerson.role);
    setActiveSection('connections');
  }, [initialPerson]);

  const loadOverview = async () => {
    const response = await fetch(`${getApiBaseUrl()}/connect?email=${encodeURIComponent(email)}`, { headers: await getConnectAuthHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load connections.');
    setOverview(data);
  };

  useEffect(() => {
    let isActive = true;
    setIsLoadingOverview(true);
    getConnectAuthHeaders().then((headers) => fetch(`${getApiBaseUrl()}/connect?email=${encodeURIComponent(email)}`, { headers }))
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load connections.');
        if (isActive) setOverview(data);
      })
      .catch((loadError) => { if (isActive) setError(loadError.message || 'Unable to load connections.'); })
      .finally(() => { if (isActive) setIsLoadingOverview(false); });
    getConnectAuthHeaders().then((headers) => fetch(`${getApiBaseUrl()}/connect/referrals?email=${encodeURIComponent(email)}`, { headers }))
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
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ email, role: targetRole, q: searchText });
        const response = await fetch(`${getApiBaseUrl()}/connect/search?${params}`, { headers: await getConnectAuthHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to search members.');
        if (isActive) setSuggestions(Array.isArray(data) ? data : []);
      } catch (searchError) {
        if (isActive) setError(searchError.message || 'Unable to search members.');
      } finally {
        if (isActive) setIsSearching(false);
      }
    }, 250);
    return () => { isActive = false; clearTimeout(timer); };
  }, [email, query, targetRole]);

  const sendRequest = async (person) => {
    setProcessingId(person.id);
    setError('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/connect/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getConnectAuthHeaders() },
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
      const response = await fetch(`${getApiBaseUrl()}/connect/requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...await getConnectAuthHeaders() },
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
      const response = await fetch(`${getApiBaseUrl()}/connect/requests/${encodeURIComponent(requestId)}?email=${encodeURIComponent(email)}`, { method: 'DELETE', headers: await getConnectAuthHeaders() });
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
      const response = await fetch(`${getApiBaseUrl()}/connect/connections/${encodeURIComponent(selectedPerson.email)}?email=${encodeURIComponent(email)}`, { method: 'DELETE', headers: await getConnectAuthHeaders() });
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

  const renderPerson = (person, actions = null, requestId = person.id) => <View style={styles.connectPerson} key={requestId}>
    <View style={styles.connectPersonDetails}>
      <TouchableOpacity onPress={() => setSelectedPerson(person)}><Text style={styles.connectPersonName}>{person.name}</Text></TouchableOpacity>
      <Text style={styles.connectPersonMeta}>{person.email}</Text>
      {person.headline ? <Text style={styles.connectPersonMeta}>{person.headline}</Text> : null}
      {person.company ? <Text style={styles.connectPersonMeta}>{person.company}</Text> : null}
    </View>
    {actions}
  </View>;

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

  return <View style={styles.connectView}>
    <Text style={styles.connectEyebrow}>NETWORK</Text>
    <Text style={styles.connectTitle}>{targetRole === 'candidate' ? 'Candidate Connect' : 'Recruiter Connect'}</Text>
    <View style={styles.connectRoleSwitch}>
      {['candidate', 'recruiter'].map((role) => <TouchableOpacity key={role} style={[styles.connectRoleButton, targetRole === role && styles.connectRoleButtonActive]} onPress={() => { setTargetRole(role); setActiveSection('search'); }} accessibilityRole="tab" accessibilityState={{ selected: targetRole === role }}><Text style={[styles.connectRoleText, targetRole === role && styles.connectRoleTextActive]}>{role === 'candidate' ? 'Candidates' : 'Recruiters'}</Text></TouchableOpacity>)}
    </View>
    <View style={styles.connectSectionTabs}>
      {roleTabs.map(([section, label]) => <TouchableOpacity key={section} accessibilityRole="tab" accessibilityState={{ selected: activeSection === section }} style={[styles.connectSectionTab, activeSection === section && styles.connectSectionTabActive]} onPress={() => setActiveSection(section)}><Text style={[styles.connectSectionTabText, activeSection === section && styles.connectSectionTabTextActive]}>{label}</Text></TouchableOpacity>)}
    </View>
    {activeSection === 'search' ? <>
      <Text style={styles.connectSearchLabel}>Search by name, email, or company</Text>
      <TextInput style={styles.connectSearchInput} value={query} onChangeText={setQuery} placeholder="Name, email, or company" placeholderTextColor="#94a3b8" autoCapitalize="none" accessibilityLabel={`Search ${targetRole}s by name, email, or company`} />
      {query.trim().length >= 2 ? <View style={styles.connectSuggestions}>
        {isSearching ? <Text style={styles.connectEmpty}>Searching...</Text> : suggestions.length ? suggestions.map((person) => {
          const isProcessing = processingId === person.id;
          const label = isProcessing ? 'Sending...' : person.connectionState === 'connected' ? 'Connected' : person.connectionState === 'sent' ? 'Request Sent' : person.connectionState === 'received' ? 'Request Received' : 'Connect';
          return renderPerson(person, <TouchableOpacity style={[styles.connectAction, person.connectionState && styles.connectActionDisabled]} onPress={() => sendRequest(person)} disabled={isProcessing || person.connectionState !== null}><Text style={[styles.connectActionText, person.connectionState && styles.connectActionTextDisabled]}>{label}</Text></TouchableOpacity>);
        }) : <Text style={styles.connectEmpty}>No matching {targetRole}s.</Text>}
      </View> : null}
    </> : null}
    {error ? <Text style={styles.connectError}>{error}</Text> : null}

    {selectedPerson ? <View style={styles.connectMemberDetails}><Text style={styles.connectPersonName}>{selectedPerson.name}</Text><Text style={styles.connectPersonMeta}>{selectedPerson.role} · {selectedPerson.email}</Text>{selectedPerson.headline ? <Text style={styles.connectPersonMeta}>{selectedPerson.headline}</Text> : null}{selectedPerson.company ? <Text style={styles.connectPersonMeta}>{selectedPerson.company}</Text> : null}<View style={styles.connectActionGroup}><TouchableOpacity style={styles.connectAction} onPress={() => onMessage?.(selectedPerson)}><Text style={styles.connectActionText}>Message</Text></TouchableOpacity>{roleConnections.some((connection) => connection.person.id === selectedPerson.id) ? <TouchableOpacity style={styles.connectSecondaryAction} onPress={removeConnection} disabled={processingId === selectedPerson.id}><Text style={styles.connectSecondaryActionText}>{processingId === selectedPerson.id ? 'Removing...' : 'Remove Connection'}</Text></TouchableOpacity> : null}<TouchableOpacity style={styles.connectSecondaryAction} onPress={() => setSelectedPerson(null)}><Text style={styles.connectSecondaryActionText}>Close</Text></TouchableOpacity></View></View> : null}

    {activeSection === 'incoming' ? <View style={styles.connectListSection}>
        <Text style={styles.connectSectionTitle}>Incoming requests ({roleIncoming.length})</Text>
        {roleIncoming.map((request) => renderPerson(request.person, <View style={styles.connectActionGroup}>
          <TouchableOpacity style={styles.connectAction} onPress={() => respondToRequest(request.requestId, 'accepted')} disabled={processingId === request.requestId}><Text style={styles.connectActionText}>{processingId === request.requestId ? 'Saving...' : 'Accept'}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.connectSecondaryAction} onPress={() => respondToRequest(request.requestId, 'declined')} disabled={processingId === request.requestId}><Text style={styles.connectSecondaryActionText}>Decline</Text></TouchableOpacity>
        </View>, request.requestId))}
        {!isLoadingOverview && !roleIncoming.length ? <Text style={styles.connectEmpty}>No incoming requests.</Text> : null}
      </View> : null}
    {activeSection === 'connections' ? <View style={styles.connectListSection}>
        <Text style={styles.connectSectionTitle}>Connections ({roleConnections.length})</Text>
        {roleConnections.map((connection) => renderPerson(connection.person, <View style={styles.connectActionGroup}><TouchableOpacity style={styles.connectMessageAction} accessibilityLabel={`Message ${connection.person.name}`} onPress={() => onMessage?.(connection.person)}><Ionicons name="mail-outline" size={18} color="#245c8a" /></TouchableOpacity><Text style={styles.connectStatus}>Connected</Text></View>, connection.requestId))}
        {!isLoadingOverview && !roleConnections.length ? <Text style={styles.connectEmpty}>Approved connections will appear here.</Text> : null}
      </View> : null}
    {activeSection === 'sent' ? <View style={styles.connectListSection}>
        <Text style={styles.connectSectionTitle}>Requests sent ({roleOutgoing.length})</Text>
        {roleOutgoing.map((request) => renderPerson(request.person, <View style={styles.connectActionGroup}><Text style={styles.connectStatus}>Request Sent</Text><TouchableOpacity style={styles.connectSecondaryAction} onPress={() => cancelRequest(request.requestId)} disabled={processingId === request.requestId}><Text style={styles.connectSecondaryActionText}>{processingId === request.requestId ? 'Canceling...' : 'Cancel Request'}</Text></TouchableOpacity></View>, request.requestId))}
        {!isLoadingOverview && !roleOutgoing.length ? <Text style={styles.connectEmpty}>No pending requests sent.</Text> : null}
      </View> : null}
    {activeSection === 'referrals' && targetRole === 'candidate' ? <View style={styles.connectListSection}>
        <Text style={styles.connectSectionTitle}>Job referrals ({referrals.length})</Text>
        {referrals.map((referral) => <View style={styles.connectReferral} key={referral.id}><View style={styles.connectReferralDetails}><Text style={styles.connectPersonName}>{referral.job.title}</Text><Text style={styles.connectPersonMeta}>{referral.job.company} · Referred by {referral.referrer.name}</Text><Text style={styles.connectPersonMeta}>{referral.referrer.email}</Text></View>{appliedJobIds.has(String(referral.job.id)) ? <Text style={styles.connectStatus}>Applied</Text> : referral.job.source === 'career-nexus' ? <TouchableOpacity style={styles.connectAction} onPress={() => setSelectedReferral(referral.job)}><Text style={styles.connectActionText}>CN Apply</Text></TouchableOpacity> : <TouchableOpacity style={styles.connectAction} onPress={() => applyReferral(referral.job)} disabled={processingId === String(referral.job.id)}><Text style={styles.connectActionText}>{processingId === String(referral.job.id) ? 'Saving...' : 'Apply'}</Text></TouchableOpacity>}</View>)}
        {!referrals.length ? <Text style={styles.connectEmpty}>No job referrals yet.</Text> : null}
      </View> : null}
    {selectedReferral ? <MobileJobCard job={selectedReferral} isApplied={false} onApply={onApplyReferral} onApplyRecruiterJob={onApplyRecruiterJob} email={email} profile={profile} startInApplication onCNApplyClose={() => setSelectedReferral(null)} /> : null}
  </View>;
}

function ProfileDetailsSection({ title, fields, children, onEdit }) {
  return <View style={styles.profileSection}><View style={styles.profileSectionHeading}><Text style={styles.sectionTitle}>{title}</Text><TouchableOpacity style={styles.profileEditIcon} accessibilityLabel={`Edit ${title}`} onPress={onEdit}><Ionicons name="create-outline" size={20} color="#1d4ed8" /></TouchableOpacity></View>{fields?.map(([label, value]) => <Text style={styles.profileDetail} key={label}><Text style={styles.detailLabel}>{label}: </Text>{Array.isArray(value) ? value.join(', ') || 'Not added' : value || 'Not added'}</Text>)}{children}</View>;
}

function ResumeSection({ resume, onUpload, onDownload, onDelete }) {
  const [isUploading, setIsUploading] = useState(false);

  const pickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/rtf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;
      if (!/\.(pdf|doc|docx|rtf)$/i.test(file.name)) {
        Alert.alert('Unsupported file', 'Choose a PDF, DOC, DOCX, or RTF file.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        Alert.alert('File too large', 'Resume file must be 2 MB or smaller.');
        return;
      }
      setIsUploading(true);
      await onUpload(file);
    } catch (error) {
      Alert.alert('Resume upload failed', error.message || 'Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = () => Alert.alert('Delete resume?', 'This removes the uploaded resume from your profile.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try {
        await onDelete();
      } catch (error) {
        Alert.alert('Unable to delete resume', error.message || 'Please try again.');
      }
    } },
  ]);

  const downloadResume = async () => {
    try {
      await onDownload();
    } catch (error) {
      Alert.alert('Unable to download resume', error.message || 'Please try again.');
    }
  };

  return <View style={styles.resumeSection}>
    <View style={styles.resumeHeading}><View style={styles.resumeTitleRow}><Ionicons name="document-text-outline" size={19} color="#263b4a" /><Text style={styles.resumeTitle}>Resume</Text></View>{resume?.uploadedAt ? <Text style={styles.resumeDate}>Updated {new Date(resume.uploadedAt).toLocaleDateString()}</Text> : null}</View>
    {resume ? <View style={styles.resumeFileRow}>
      <View style={styles.resumeFileInfo}><Ionicons name="document-outline" size={21} color="#2563eb" /><View style={styles.resumeFileText}><Text style={styles.resumeFileName}>{resume.fileName}</Text><Text style={styles.resumeFileSize}>{(resume.size / (1024 * 1024)).toFixed(2)} MB</Text></View></View>
      <View style={styles.resumeActions}><TouchableOpacity style={styles.resumeIconButton} accessibilityLabel="Download resume" onPress={downloadResume}><Ionicons name="download-outline" size={18} color="#35536a" /></TouchableOpacity><TouchableOpacity style={[styles.resumeIconButton, styles.resumeDeleteButton]} accessibilityLabel="Delete resume" onPress={confirmDelete}><Ionicons name="trash-outline" size={18} color="#a33d3d" /></TouchableOpacity></View>
    </View> : <Text style={styles.resumeEmpty}>No resume uploaded yet.</Text>}
    <TouchableOpacity style={styles.resumeUploadButton} onPress={pickResume} disabled={isUploading}><Ionicons name="cloud-upload-outline" size={18} color="#245c8a" /><Text style={styles.resumeUploadText}>{isUploading ? 'Uploading resume...' : resume ? 'Update resume' : 'Upload resume'}</Text></TouchableOpacity>
    <Text style={styles.resumeHint}>PDF, DOC, DOCX, or RTF · Up to 2 MB</Text>
  </View>;
}

function MobileJobReferralControl({ job, email }) {
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
      const response = await fetch(`${getApiBaseUrl()}/connect?email=${encodeURIComponent(email)}`, { headers: await getConnectAuthHeaders() });
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
      const response = await fetch(`${getApiBaseUrl()}/connect/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getConnectAuthHeaders() },
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

  return <View style={styles.mobileJobReferralControl}>
    <TouchableOpacity style={styles.mobileJobReferButton} onPress={openReferrals}><Ionicons name="people-outline" size={16} color="#245c8a" /><Text style={styles.mobileJobReferText}>Refer</Text></TouchableOpacity>
    {isOpen ? <View style={styles.mobileJobReferralOptions}>
      {isLoading ? <Text style={styles.connectEmpty}>Loading connections...</Text> : candidates.length ? candidates.map((candidate) => <TouchableOpacity key={candidate.id} style={styles.mobileJobReferralOption} onPress={() => referToCandidate(candidate)} disabled={Boolean(processingId)}><Text style={styles.mobileJobReferralOptionText}>{processingId === candidate.id ? 'Sending...' : candidate.name}</Text></TouchableOpacity>) : <Text style={styles.connectEmpty}>No connected candidates yet.</Text>}
      {message ? <Text style={styles.mobileJobReferralMessage}>{message}</Text> : null}
    </View> : null}
  </View>;
}

function MobileJobCard({ job, isApplied, onApply, onApplyRecruiterJob, email, profile, startInApplication = false, onCNApplyClose }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showApplication, setShowApplication] = useState(startInApplication);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationError, setApplicationError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const applicationDraftKey = `cn-application-draft:${job.recruiterJobId}`;
  const currentEmployment = profile?.employmentDetails?.find((entry) => entry.isCurrent);
  const [applicationDetails, setApplicationDetails] = useState({
    fullName: profile?.name || '',
    email: profile?.email || email,
    currentCompany: currentEmployment?.companyName || profile?.companyName || profile?.currentCompany || '',
    expectedSalary: profile?.expectedSalaryLpa || '',
    actualSalary: '',
    totalExperienceYears: profile?.totalExperienceYears || '',
    relevantExperienceYears: '',
    currentlyServingNotice: 'No',
    noticePeriodDays: '',
    includeResume: Boolean(profile?.resume),
  });
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(applicationDraftKey).then((savedDraft) => {
      if (active && savedDraft) {
        try { setApplicationDetails((current) => ({ ...current, ...JSON.parse(savedDraft) })); setDraftSaved(true); } catch (error) { console.warn('Unable to restore job application draft:', error); }
      }
    }).catch((error) => console.warn('Unable to load job application draft:', error));
    return () => { active = false; };
  }, [applicationDraftKey]);
  useEffect(() => {
    if (!profile?.resume) return undefined;
    let active = true;
    AsyncStorage.getItem(applicationDraftKey).then((savedDraft) => {
      if (active && !savedDraft) setApplicationDetails((current) => ({ ...current, includeResume: true }));
    }).catch((error) => console.warn('Unable to check application draft preferences:', error));
    return () => { active = false; };
  }, [applicationDraftKey, profile?.resume]);
  const updateApplication = (field, value) => setApplicationDetails((current) => ({ ...current, [field]: value }));
  const submitRecruiterApplication = async () => {
    setIsSubmitting(true);
    setApplicationError('');
    try {
      await onApplyRecruiterJob(job, applicationDetails);
      await AsyncStorage.removeItem(applicationDraftKey);
      setShowApplication(false);
      onCNApplyClose?.();
    } catch (error) {
      setApplicationError(error.message || 'Unable to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const saveApplicationDraft = async () => {
    try {
      await AsyncStorage.setItem(applicationDraftKey, JSON.stringify(applicationDetails));
      setDraftSaved(true);
    } catch (error) {
      setApplicationError(error.message || 'Unable to save this application draft.');
    }
  };
  return <View style={styles.jobCard}>
    <View style={styles.jobHeader}>
      <View style={styles.jobTitleBlock}><Text style={styles.jobTitle}>{job.title}</Text><Text style={styles.jobCompany}>{job.company}</Text></View>
      <Text style={styles.jobMatchBadge}>{job.matchScore}% shortlist</Text>
    </View>
    <View style={styles.jobMetaRow}><Text style={[styles.jobMeta, styles.jobLocation]} numberOfLines={1} ellipsizeMode="tail" accessibilityLabel={job.location || 'Location not listed'}>{job.location || 'Location not listed'}</Text><Text style={[styles.jobMeta, styles.jobType]} numberOfLines={1} ellipsizeMode="tail" accessibilityLabel={job.type || 'Type not listed'}>{job.type || 'Type not listed'}</Text></View>
    {job.source === 'career-nexus' && showDetails ? <View style={styles.recruiterJobDescription}><Text style={styles.jobCompany}>{job.description}</Text></View> : null}
    <View style={styles.jobActions}>
      {job.source === 'career-nexus' ? <TouchableOpacity style={styles.jobViewButton} onPress={() => setShowDetails((value) => !value)}><Text style={styles.jobViewButtonText}>{showDetails ? 'Hide details' : 'View Details'}</Text></TouchableOpacity> : <TouchableOpacity style={styles.jobViewButton} onPress={() => Linking.openURL(job.url)}><Text style={styles.jobViewButtonText}>View listing</Text></TouchableOpacity>}
      <MobileJobReferralControl job={job} email={email} />
      {job.source === 'career-nexus' ? (job.status === 'closed' ? <Text style={styles.jobClosedStatus}>Closed</Text> : isApplied ? <Text style={styles.jobAppliedStatus}>Applied</Text> : <TouchableOpacity style={styles.jobApplyButton} onPress={() => setShowApplication(true)}><Text style={styles.jobApplyButtonText}>CN Apply</Text></TouchableOpacity>) : (isApplied ? <Text style={styles.jobAppliedStatus}>Applied</Text> : <TouchableOpacity style={styles.jobApplyButton} onPress={() => onApply(job)}><Text style={styles.jobApplyButtonText}>Apply</Text></TouchableOpacity>)}
    </View>
    {job.source === 'career-nexus' ? <Modal visible={showApplication} animationType="slide" onRequestClose={() => { setShowApplication(false); onCNApplyClose?.(); }}>
      <SafeAreaView style={styles.cnApplicationModal}><ScrollView contentContainerStyle={styles.cnApplicationContent} keyboardShouldPersistTaps="handled">
        <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>CN Apply</Text><TouchableOpacity onPress={() => { setShowApplication(false); onCNApplyClose?.(); }} accessibilityLabel="Cancel application"><Ionicons name="close" size={22} color="#526779" /></TouchableOpacity></View>
        <Text style={styles.jobTitle}>{job.title}</Text><Text style={styles.jobCompany}>{job.company} · {job.location} · {job.type}</Text><Text style={styles.profileRecordText}>{job.description}</Text>
        {[
          ['Full name', 'fullName'], ['Email', 'email'], ['Current company', 'currentCompany'], ['Expected salary', 'expectedSalary'], ['Actual salary', 'actualSalary'], ['Total years of experience', 'totalExperienceYears'], ['Relevant years of experience', 'relevantExperienceYears'],
        ].map(([label, field]) => <View style={styles.profileField} key={field}><Text style={styles.locationLabel}>{label}</Text><TextInput style={[styles.input, styles.profileInput]} value={String(applicationDetails[field] || '')} onChangeText={(value) => updateApplication(field, value)} keyboardType={['totalExperienceYears', 'relevantExperienceYears'].includes(field) ? 'decimal-pad' : 'default'} /></View>)}
        <View style={styles.profileField}><Text style={styles.locationLabel}>Currently serving notice?</Text><View style={styles.choiceRow}>{['Yes', 'No'].map((choice) => <TouchableOpacity key={choice} style={[styles.choiceButton, applicationDetails.currentlyServingNotice === choice && styles.choiceButtonActive]} onPress={() => updateApplication('currentlyServingNotice', choice)}><Text style={[styles.choiceText, applicationDetails.currentlyServingNotice === choice && styles.choiceTextActive]}>{choice}</Text></TouchableOpacity>)}</View></View>
        <View style={styles.profileField}><Text style={styles.locationLabel}>How early can you join (days)?</Text><TextInput style={[styles.input, styles.profileInput]} value={String(applicationDetails.noticePeriodDays || '')} onChangeText={(value) => updateApplication('noticePeriodDays', value)} keyboardType="number-pad" /></View>
        <TouchableOpacity style={styles.resumeChoice} onPress={() => updateApplication('includeResume', !applicationDetails.includeResume)} disabled={!profile?.resume}><Ionicons name={applicationDetails.includeResume ? 'checkbox' : 'square-outline'} size={20} color="#245c8a" /><Text style={styles.profileRecordText}>{profile?.resume ? `Attach resume: ${profile.resume.fileName}` : 'No resume on your profile'}</Text></TouchableOpacity>
        {applicationError ? <Text style={styles.connectError}>{applicationError}</Text> : null}
        {draftSaved ? <Text style={styles.connectStatus}>Draft saved on this device.</Text> : null}
        <View style={styles.buttonRow}><TouchableOpacity style={styles.secondaryButton} onPress={() => { setShowApplication(false); onCNApplyClose?.(); }}><Text style={styles.secondaryButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.secondaryButton} onPress={saveApplicationDraft}><Text style={styles.secondaryButtonText}>Save</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={submitRecruiterApplication} disabled={isSubmitting}><Text style={styles.primaryButtonText}>{isSubmitting ? 'Submitting...' : 'Submit application'}</Text></TouchableOpacity></View>
      </ScrollView></SafeAreaView>
    </Modal> : null}
  </View>;
}

function MobileRecruiterHome({ email, profile }) {
  const [openings, setOpenings] = useState([]);
  const [form, setForm] = useState({ position: '', location: '', workMode: 'Full-time', description: '', companyAbout: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');
  const companyName = profile.employmentDetails?.find((entry) => entry.isCurrent)?.companyName || profile.companyName || profile.currentCompany || '';
  const update = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));
  const loadOpenings = async () => {
    const response = await fetch(`${getApiBaseUrl()}/jobs/recruiter?email=${encodeURIComponent(email)}`, { headers: await getConnectAuthHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load job openings.');
    setOpenings(Array.isArray(data) ? data : []);
  };
  useEffect(() => {
    let active = true;
    getConnectAuthHeaders().then((headers) => fetch(`${getApiBaseUrl()}/jobs/recruiter?email=${encodeURIComponent(email)}`, { headers }))
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load job openings.'); if (active) setOpenings(Array.isArray(data) ? data : []); })
      .catch((error) => console.warn('Unable to load recruiter openings:', error))
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [email]);
  const postOpening = async () => {
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/jobs/recruiter`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...await getConnectAuthHeaders() }, body: JSON.stringify({ email, ...form }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to post job opening.');
      setOpenings((current) => [data, ...current]);
      setForm({ position: '', location: '', workMode: 'Full-time', description: '', companyAbout: '' });
    } catch (error) { setError(error.message || 'Unable to post job opening.'); }
    finally { setIsSaving(false); }
  };
  const closeOpening = async (opening) => {
    setProcessingId(opening.recruiterJobId);
    try {
      const response = await fetch(`${getApiBaseUrl()}/jobs/recruiter/${encodeURIComponent(opening.recruiterJobId)}/close`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...await getConnectAuthHeaders() }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to close job.');
      setOpenings((current) => current.map((job) => job.recruiterJobId === opening.recruiterJobId ? { ...job, status: 'closed' } : job));
    } catch (error) { setError(error.message || 'Unable to close job.'); }
    finally { setProcessingId(''); }
  };
  return <View style={styles.jobsSection}>
    <Text style={styles.sectionTitle}>Post a job opening</Text><Text style={styles.jobsIntro}>Company name uses your current organization.</Text>
    <TextInput style={[styles.input, styles.profileInput]} value={companyName} editable={false} placeholder="Current organization" placeholderTextColor="#94a3b8" />
    <TextInput style={[styles.input, styles.profileInput]} value={form.position} onChangeText={update('position')} placeholder="Position for opening" placeholderTextColor="#94a3b8" />
    <TextInput style={[styles.input, styles.profileInput]} value={form.location} onChangeText={update('location')} placeholder="Location" placeholderTextColor="#94a3b8" />
    <View style={styles.choiceRow}>{['Full-time', 'Hybrid'].map((mode) => <TouchableOpacity key={mode} style={[styles.choiceButton, form.workMode === mode && styles.choiceButtonActive]} onPress={() => update('workMode')(mode)}><Text style={[styles.choiceText, form.workMode === mode && styles.choiceTextActive]}>{mode}</Text></TouchableOpacity>)}</View>
    <TextInput style={[styles.input, styles.profileInput]} value={form.description} onChangeText={update('description')} placeholder="Job description" placeholderTextColor="#94a3b8" multiline />
    <TextInput style={[styles.input, styles.profileInput]} value={form.companyAbout} onChangeText={update('companyAbout')} placeholder="About the company" placeholderTextColor="#94a3b8" multiline />
    {error ? <Text style={styles.connectError}>{error}</Text> : null}
    <TouchableOpacity style={styles.primaryButton} onPress={postOpening} disabled={isSaving || !companyName || !form.position.trim() || !form.location.trim() || !form.description.trim() || !form.companyAbout.trim()}><Text style={styles.primaryButtonText}>{isSaving ? 'Posting...' : 'Post opening'}</Text></TouchableOpacity>
    <View style={styles.recruiterOpeningsHeader}><Text style={styles.sectionTitle}>Posted jobs</Text><TouchableOpacity onPress={() => loadOpenings().catch((error) => setError(error.message))}><Text style={styles.linkText}>Refresh</Text></TouchableOpacity></View>
    {isLoading ? <Text style={styles.libraryStatusText}>Loading posted jobs...</Text> : null}
    {!isLoading && !openings.length ? <Text style={styles.libraryStatusText}>No job openings posted yet.</Text> : null}
    {openings.map((opening) => <View style={styles.recruiterOpeningTile} key={opening.recruiterJobId}><View style={styles.recruiterOpeningDetails}><Text style={styles.jobTitle}>{opening.title}</Text><Text style={styles.jobCompany}>{opening.company} · {opening.location} · {opening.type}</Text><Text style={styles.profileRecordText}>{opening.applicantsCount || 0} applicants</Text></View>{opening.status === 'open' ? <TouchableOpacity style={styles.connectSecondaryAction} onPress={() => closeOpening(opening)} disabled={processingId === opening.recruiterJobId}><Text style={styles.connectSecondaryActionText}>{processingId === opening.recruiterJobId ? 'Closing...' : 'Close job'}</Text></TouchableOpacity> : <Text style={styles.connectStatus}>Closed</Text>}</View>)}
  </View>;
}

function MobileMessageCompose({ email, person, job, onCancel, onSent }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const send = async () => {
    setError(''); setIsSending(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/connect/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...await getConnectAuthHeaders() }, body: JSON.stringify({ email, targetEmail: person.email, body, ...(job ? { job } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to send message.');
      onSent?.();
    } catch (sendError) { setError(sendError.message || 'Unable to send message.'); }
    finally { setIsSending(false); }
  };
  return <Modal visible animationType="slide" onRequestClose={onCancel}><SafeAreaView style={styles.cnApplicationModal}><ScrollView contentContainerStyle={styles.cnApplicationContent} keyboardShouldPersistTaps="handled"><View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>Message {person.name}</Text><TouchableOpacity onPress={onCancel} accessibilityLabel="Cancel message"><Ionicons name="close" size={22} color="#526779" /></TouchableOpacity></View>{job ? <View style={styles.messageJobTile}><Text style={styles.jobTitle}>{job.title}</Text><Text style={styles.jobCompany}>{job.company} · {job.location}</Text></View> : null}<TextInput style={[styles.input, styles.profileInput]} value={body} onChangeText={setBody} placeholder="Your message" placeholderTextColor="#94a3b8" multiline maxLength={5000} />{error ? <Text style={styles.connectError}>{error}</Text> : null}<View style={styles.buttonRow}><TouchableOpacity style={styles.secondaryButton} onPress={onCancel}><Text style={styles.secondaryButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={send} disabled={isSending || !body.trim()}><Text style={styles.primaryButtonText}>{isSending ? 'Sending...' : 'Send'}</Text></TouchableOpacity></View></ScrollView></SafeAreaView></Modal>;
}

function MobileRecruiterApplicationsView({ email }) {
  const [openings, setOpenings] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messageTarget, setMessageTarget] = useState(null);
  useEffect(() => {
    let active = true;
    getConnectAuthHeaders().then((headers) => fetch(`${getApiBaseUrl()}/jobs/recruiter/applications?email=${encodeURIComponent(email)}`, { headers }))
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load applications.'); if (active) setOpenings(Array.isArray(data) ? data : []); })
      .catch((error) => console.warn('Unable to load recruiter applications:', error))
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [email]);
  const updateStatus = async (applicationId, status) => {
    const response = await fetch(`${getApiBaseUrl()}/jobs/recruiter/applications/${encodeURIComponent(applicationId)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...await getConnectAuthHeaders() }, body: JSON.stringify({ email, status }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to update application status.');
    setSelectedApplication((current) => current ? { ...current, reviewStatus: status } : current);
    setOpenings((current) => current.map((opening) => ({ ...opening, applicants: opening.applicants.map((application) => application.id === applicationId ? { ...application, reviewStatus: status } : application) })));
  };
  const openApplication = async (application) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/jobs/recruiter/applications/${encodeURIComponent(application.id)}?email=${encodeURIComponent(email)}`, { headers: await getConnectAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load candidate details.');
      setSelectedApplication(data);
      await updateStatus(application.id, 'viewed');
    } catch (error) { console.warn('Unable to load recruiter applicant:', error); }
  };
  const action = (status) => selectedApplication && updateStatus(selectedApplication.id, status).catch((error) => console.warn(error));
  const openResume = async () => {
    const url = selectedApplication?.resume?.downloadUrl;
    if (!url) return;
    await Linking.openURL(url);
    await action('resume_downloaded');
  };
  return <View style={styles.jobsSection}>
    <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>Applications Received</Text><Text style={styles.linkText}>Ranked by match score</Text></View>
    {isLoading ? <Text style={styles.libraryStatusText}>Loading applications...</Text> : null}
    {!isLoading && !openings.length ? <Text style={styles.libraryStatusText}>Posted job applications will appear here.</Text> : null}
    {openings.map((opening) => <View key={opening.recruiterJobId} style={styles.recruiterApplicationGroup}><TouchableOpacity style={styles.recruiterOpeningTile} onPress={() => { setSelectedJob(opening); setSelectedApplication(null); }}><View style={styles.recruiterOpeningDetails}><Text style={styles.jobTitle}>{opening.title}</Text><Text style={styles.jobCompany}>{opening.company} · {opening.location}</Text><Text style={styles.profileRecordText}>{opening.applicants.length} applicants</Text></View><Ionicons name={selectedJob?.id === opening.id ? 'chevron-up' : 'chevron-down'} size={20} color="#526779" /></TouchableOpacity>{selectedJob?.id === opening.id ? opening.applicants.map((application) => <TouchableOpacity style={styles.recruiterApplicantTile} key={application.id} onPress={() => openApplication(application)}><View style={styles.recruiterOpeningDetails}><Text style={styles.connectPersonName}>{application.candidate.name}</Text><Text style={styles.connectPersonMeta}>{application.candidate.headline || application.candidate.email}</Text></View><Text style={styles.jobMatchBadge}>{application.matchScore}%</Text></TouchableOpacity>) : null}</View>)}
    {selectedApplication ? <View style={styles.recruiterCandidateDetail}><Text style={styles.sectionTitle}>{selectedApplication.candidate.name}</Text><Text style={styles.connectPersonMeta}>{selectedApplication.candidate.email} · {selectedJob?.title}</Text><Text style={styles.jobMatchBadge}>{selectedJob?.applicants.find((item) => item.id === selectedApplication.id)?.matchScore || 0}% match</Text>{Object.entries(selectedApplication.candidate.profile || {}).filter(([key, value]) => !['resume', 'photo', 'appliedJobs', 'skills', 'languages', 'employmentDetails', 'majorProjects'].includes(key) && value && typeof value !== 'object').map(([key, value]) => <Text style={styles.profileDetail} key={key}><Text style={styles.detailLabel}>{key}: </Text>{String(value)}</Text>)}{selectedApplication.candidate.profile?.skills?.length ? <Text style={styles.profileDetail}>Skills: {selectedApplication.candidate.profile.skills.join(', ')}</Text> : null}{selectedApplication.candidate.profile?.languages?.length ? <Text style={styles.profileDetail}>Languages: {selectedApplication.candidate.profile.languages.join(', ')}</Text> : null}{selectedApplication.candidate.profile?.employmentDetails?.map((employment, index) => <View style={styles.profileRecord} key={`${employment.companyName}-${index}`}><Text style={styles.profileRecordTitle}>{employment.companyName}</Text><Text style={styles.profileRecordText}>{employment.jobTitle} · {employment.employmentType}</Text><Text style={styles.profileRecordText}>{employment.joiningDate}{employment.isCurrent ? ' · Current' : employment.relievingDate ? ` to ${employment.relievingDate}` : ''}</Text><Text style={styles.profileRecordText}>{employment.jobProfile}</Text></View>)}<Text style={styles.profileDetail}>Expected salary: {selectedApplication.applicationDetails.expectedSalary}</Text><Text style={styles.profileDetail}>Actual salary: {selectedApplication.applicationDetails.actualSalary}</Text><Text style={styles.profileDetail}>Total experience: {selectedApplication.applicationDetails.totalExperienceYears} years</Text><Text style={styles.profileDetail}>Relevant experience: {selectedApplication.applicationDetails.relevantExperienceYears} years</Text><Text style={styles.profileDetail}>Serving notice: {selectedApplication.applicationDetails.currentlyServingNotice}</Text><Text style={styles.profileDetail}>Can join in: {selectedApplication.applicationDetails.noticePeriodDays} days</Text><View style={styles.connectActionGroup}><TouchableOpacity style={styles.connectSecondaryAction} onPress={openResume} disabled={!selectedApplication.resume?.downloadUrl}><Text style={styles.connectSecondaryActionText}>{selectedApplication.resume?.resume?.fileName ? 'Download resume' : 'No resume'}</Text></TouchableOpacity><TouchableOpacity style={styles.connectSecondaryAction} onPress={() => action('viewed')}><Text style={styles.connectSecondaryActionText}>Viewed</Text></TouchableOpacity><TouchableOpacity style={styles.connectAction} onPress={() => action('shortlisted')}><Text style={styles.connectActionText}>Shortlist</Text></TouchableOpacity><TouchableOpacity style={styles.connectSecondaryAction} onPress={() => action('not_shortlisted')}><Text style={styles.connectSecondaryActionText}>Not shortlisted</Text></TouchableOpacity><TouchableOpacity style={styles.connectSecondaryAction} onPress={() => Linking.openURL(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedApplication.candidate.email)}`)}><Text style={styles.connectSecondaryActionText}>Contact via Gmail</Text></TouchableOpacity><TouchableOpacity style={styles.connectSecondaryAction} onPress={() => setMessageTarget({ person: selectedApplication.candidate, job: selectedApplication.job })}><Text style={styles.connectSecondaryActionText}>Message</Text></TouchableOpacity></View></View> : null}
    {messageTarget ? <MobileMessageCompose email={email} person={messageTarget.person} job={messageTarget.job} onCancel={() => setMessageTarget(null)} onSent={() => setMessageTarget(null)} /> : null}
  </View>;
}

function MobileMessagesView({ email, role, onOpenPerson, initialPerson, onConsumeInitialPerson }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [target, setTarget] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const otherRole = role === 'recruiter' ? 'candidate' : 'recruiter';
  useEffect(() => {
    if (!initialPerson) return;
    setTarget(initialPerson);
    onConsumeInitialPerson?.();
  }, [initialPerson]);
  const loadMessages = async () => {
    const response = await fetch(`${getApiBaseUrl()}/connect/messages?email=${encodeURIComponent(email)}`, { headers: await getConnectAuthHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load messages.');
    setMessages(Array.isArray(data) ? data : []);
  };
  useEffect(() => {
    let active = true;
    getConnectAuthHeaders().then((headers) => fetch(`${getApiBaseUrl()}/connect/messages?email=${encodeURIComponent(email)}`, { headers }))
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load messages.'); if (active) setMessages(Array.isArray(data) ? data : []); })
      .catch((error) => console.warn('Unable to load messages:', error))
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [email]);
  const searchPeople = async () => {
    if (query.trim().length < 2) return;
    try {
      const params = new URLSearchParams({ email, role: otherRole, q: query.trim() });
      const response = await fetch(`${getApiBaseUrl()}/connect/search?${params}`, { headers: await getConnectAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to search members.');
      setResults(Array.isArray(data) ? data : []);
    } catch (error) { console.warn('Unable to search message recipients:', error); }
  };
  const approve = async (candidateEmail) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/connect/messages/permissions/${encodeURIComponent(candidateEmail)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...await getConnectAuthHeaders() }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to approve messages.');
      await loadMessages();
    } catch (error) { console.warn('Unable to approve messages:', error); }
  };
  return <View style={styles.jobsSection}><Text style={styles.sectionTitle}>Messages</Text><View style={styles.messageRecipientSearch}><TextInput style={[styles.input, styles.profileInput]} value={query} onChangeText={setQuery} placeholder={`Search ${otherRole}s`} placeholderTextColor="#94a3b8" /><TouchableOpacity style={styles.connectSecondaryAction} onPress={searchPeople}><Text style={styles.connectSecondaryActionText}>Search</Text></TouchableOpacity></View>{results.map((person) => <TouchableOpacity key={person.id} style={styles.recruiterApplicantTile} onPress={() => setTarget(person)}><Text style={styles.connectPersonName}>{person.name} · {person.email}</Text></TouchableOpacity>)}{isLoading ? <Text style={styles.libraryStatusText}>Loading messages...</Text> : null}{!isLoading && !messages.length ? <Text style={styles.libraryStatusText}>Messages will appear here.</Text> : null}{messages.map((message) => { const person = message.isReceived ? message.sender : message.recipient; const needsApproval = role === 'recruiter' && message.isReceived && message.sender.role === 'candidate' && message.permissionStatus !== 'approved'; return <View style={styles.messageItem} key={message.id}><TouchableOpacity onPress={() => onOpenPerson(person)}><Text style={styles.connectPersonName}>{person.name} · {new Date(message.createdAt).toLocaleDateString()}</Text></TouchableOpacity><Text style={styles.profileDetail}>{message.body}</Text>{message.job && Object.keys(message.job).length ? <View style={styles.messageJobTile}><Text style={styles.connectPersonName}>{message.job.title}</Text><Text style={styles.connectPersonMeta}>{message.job.company} · {message.job.location}</Text></View> : null}{needsApproval ? <TouchableOpacity style={styles.connectAction} onPress={() => approve(message.sender.email)}><Text style={styles.connectActionText}>Approve message request</Text></TouchableOpacity> : null}</View>; })}{target ? <MobileMessageCompose email={email} person={target} onCancel={() => setTarget(null)} onSent={() => { setTarget(null); loadMessages().catch(console.warn); }} /> : null}</View>;
}

function MobileNotificationsView({ email, onOpenApplications, onOpenMessages }) {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    let active = true;
    getConnectAuthHeaders().then((headers) => fetch(`${getApiBaseUrl()}/connect/notifications?email=${encodeURIComponent(email)}`, { headers }))
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load notifications.'); if (active) setNotifications(Array.isArray(data) ? data : []); })
      .catch((error) => console.warn('Unable to load notifications:', error));
    return () => { active = false; };
  }, [email]);
  return <View style={styles.jobsSection}><Text style={styles.sectionTitle}>Notifications</Text>{!notifications.length ? <Text style={styles.libraryStatusText}>No notifications yet.</Text> : notifications.map((notification) => <TouchableOpacity key={notification.id} style={styles.notificationItem} onPress={notification.type === 'application' ? onOpenApplications : onOpenMessages}><Text style={styles.connectPersonName}>{notification.title}</Text><Text style={styles.connectPersonMeta}>{notification.description}</Text><Text style={styles.connectPersonMeta}>{new Date(notification.createdAt).toLocaleDateString()}</Text></TouchableOpacity>)}</View>;
}

function HomeDashboard({ profile, email, role, initialNav, onEditProfileSection, onLogout, onUpdateProfilePicture, onUploadResume, onDownloadResume, onDeleteResume, onApplyToJob }) {
  const [activeTab, setActiveTab] = useState('Applied Jobs');
  const [activeNav, setActiveNav] = useState(initialNav);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(profile.photo);
  const [connectFocusPerson, setConnectFocusPerson] = useState(null);
  const [messageRecipient, setMessageRecipient] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [careerPortals, setCareerPortals] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [hasMoreRecommendations, setHasMoreRecommendations] = useState(false);
  const [isLoadingMoreRecommendations, setIsLoadingMoreRecommendations] = useState(false);
  const dashboardNavigationItems = role === 'recruiter'
    ? [{ label: 'Home', icon: 'home-outline', activeIcon: 'home' }, { label: 'Applications', icon: 'documents-outline' }, { label: 'Connect', icon: 'people-outline' }, { label: 'Messages', icon: 'chatbubble-ellipses-outline' }, { label: 'Profile', icon: 'person-outline' }]
    : [...navigationItems.slice(0, 3), { label: 'Messages', icon: 'chatbubble-ellipses-outline' }, ...navigationItems.slice(3)];

  const handleJobSearchChange = (value) => {
    setJobSearchQuery(value);
    if (value.trim() && activeNav !== 'Apply') {
      setActiveNav('Apply');
      setActiveTab('Recommended Jobs');
    }
  };

  useEffect(() => {
    if (!email) return undefined;
    let isActive = true;
    setIsLoadingJobs(true);
    setRecommendations([]);
    setHasMoreRecommendations(false);
    fetch(`${getApiBaseUrl()}/jobs/recommendations?email=${encodeURIComponent(email)}&limit=${JOB_RECOMMENDATION_PAGE_SIZE}&offset=0`).then(async (response) => {
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
      fetch(`${getApiBaseUrl()}/jobs/applications?email=${encodeURIComponent(email)}`).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load applied jobs.');
        if (isActive) setAppliedJobs(Array.isArray(data) ? data : []);
      }),
      fetch(`${getApiBaseUrl()}/jobs/career-portals`).then(async (response) => {
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
      const response = await fetch(`${getApiBaseUrl()}/jobs/recommendations?email=${encodeURIComponent(email)}&limit=${JOB_RECOMMENDATION_PAGE_SIZE}&offset=${offset}`);
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
  const jobGroups = { 'Applied Jobs': appliedJobs, 'Recommended Jobs': recommendedJobs };
  const normalizedJobSearch = jobSearchQuery.trim().toLocaleLowerCase();
  const filteredJobGroups = Object.fromEntries(Object.entries(jobGroups).map(([tab, jobs]) => [
    tab,
    normalizedJobSearch ? jobs.filter((job) => [
      job.title, job.company, job.location, job.type, job.jobType, job.employmentType, job.preferredShift, job.description,
    ].some((value) => typeof value === 'string' && value.toLocaleLowerCase().includes(normalizedJobSearch))) : jobs,
  ]));

  const applyToJob = async (job) => {
    try {
      const application = await onApplyToJob(job);
      setAppliedJobs((currentJobs) => [application, ...currentJobs.filter((currentJob) => currentJob.id !== application.id)]);
      await Linking.openURL(job.url);
    } catch (error) {
      console.warn('Unable to apply to job:', error);
    }
  };

  const applyToReferral = async (job) => {
    const application = await onApplyToJob(job);
    setAppliedJobs((currentJobs) => [application, ...currentJobs.filter((currentJob) => String(currentJob.id) !== String(application.id))]);
    await Linking.openURL(job.url);
  };

  const applyToRecruiterJob = async (job, details) => {
    const response = await fetch(`${getApiBaseUrl()}/jobs/recruiter/${encodeURIComponent(job.recruiterJobId)}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await getConnectAuthHeaders() },
      body: JSON.stringify({ email, details }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to submit application.');
    setAppliedJobs((currentJobs) => [data, ...currentJobs.filter((currentJob) => String(currentJob.id) !== String(data.id))]);
  };

  const editProfilePicture = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo permission required', 'Allow photo access in your phone settings to update your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      const photoUri = result.assets?.[0]?.uri;
      if (!result.canceled && photoUri) {
        await onUpdateProfilePicture(photoUri);
        setSelectedPhoto(photoUri);
      }
    } catch (error) {
      Alert.alert('Unable to select photo', 'Please try selecting your profile picture again.');
      console.warn('Unable to select profile picture', error);
    }
  };

  return (
    <SafeAreaView style={styles.homeScreen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Image source={require('./assets/companylogo-after-login.png')} style={styles.dashboardLogo} resizeMode="contain" accessibilityLabel="CareerNexus" />
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.profileHeaderButton, activeNav === 'Profile' && styles.profileHeaderButtonActive]} onPress={() => setActiveNav('Profile')} accessibilityRole="button" accessibilityLabel="Profile" accessibilityState={{ selected: activeNav === 'Profile' }}>
              {isProfileImageUri(profile.photo) ? <Image source={{ uri: profile.photo }} style={styles.profileHeaderAvatar} resizeMode="cover" /> : <Text style={styles.profileHeaderInitials}>{profile.name?.split(/\s+/).map((part) => part[0]).join('').toUpperCase() || 'U'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.notificationsHeaderButton, activeNav === 'Notifications' && styles.notificationsHeaderButtonActive]} onPress={() => setActiveNav('Notifications')} accessibilityRole="button" accessibilityLabel="Notifications" accessibilityState={{ selected: activeNav === 'Notifications' }}>
              <Ionicons name={activeNav === 'Notifications' ? 'notifications' : 'notifications-outline'} size={19} color={activeNav === 'Notifications' ? '#2563eb' : '#526779'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutIconButton} onPress={onLogout} accessibilityRole="button" accessibilityLabel="Log out">
              <Ionicons name="log-out-outline" size={20} color="#b91c1c" />
            </TouchableOpacity>
          </View>
        </View>
        {role === 'candidate' && (activeNav === 'Home' || activeNav === 'Apply') && <View style={styles.jobsSearchBox}>
          <Ionicons name="search-outline" size={18} color="#5b6d7b" />
          <TextInput value={jobSearchQuery} onChangeText={handleJobSearchChange} placeholder="Search jobs by keyword, company, city, or skill" placeholderTextColor="#74838e" style={styles.jobsSearchInput} returnKeyType="search" accessibilityLabel="Search jobs" />
          {jobSearchQuery ? <TouchableOpacity onPress={() => setJobSearchQuery('')} accessibilityLabel="Clear job search"><Ionicons name="close-circle" size={18} color="#74838e" /></TouchableOpacity> : null}
        </View>}

        {activeNav === 'Profile' && <View style={styles.profileCard}>
          <View style={styles.profileHeroRow}>
            <View style={styles.avatarWrap}>
              <TouchableOpacity style={styles.avatar} onPress={editProfilePicture} accessibilityLabel="Edit profile picture">
                {isProfileImageUri(selectedPhoto) ? (
                  <Image source={{ uri: selectedPhoto }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarText}>{selectedPhoto || profile.name?.split(/\s+/).map((part) => part[0]).join('').toUpperCase() || 'U'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoEditIcon} onPress={editProfilePicture} accessibilityLabel="Edit profile picture">
                <Ionicons name="create-outline" size={18} color="#1d4ed8" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileIdentity}>
              <Text style={styles.profileName}>{profile.name || 'Your profile'}</Text>
              {profile.headline ? <Text style={styles.profileHeadline}>{profile.headline}</Text> : null}
              {profile.currentlyWorkingAs ? <Text style={styles.profileCurrentRole}>{profile.currentlyWorkingAs}</Text> : null}
              <Text style={styles.profileScore}>{calculateProfileCompletion(profile)}% profile complete</Text>
              <Text style={styles.metaText}>{formatProfileUpdatedAt(profile.updatedAt)}</Text>
            </View>
          </View>
        </View>}

        {activeNav === 'Profile' && <ResumeSection resume={profile.resume} onUpload={onUploadResume} onDownload={onDownloadResume} onDelete={onDeleteResume} />}

        {activeNav === 'Home' && role === 'recruiter' && <MobileRecruiterHome email={email} profile={profile} />}

        {activeNav === 'Applications' && role === 'recruiter' && <MobileRecruiterApplicationsView email={email} />}

        {activeNav === 'Home' && role === 'candidate' && <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>15</Text>
            <Text style={styles.statLabel}>Search Appearance</Text>
            <Text style={styles.statMeta}>Last 30 days</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Recruiters Activity</Text>
            <Text style={styles.statMeta}>Last 30 days</Text>
          </View>
        </View>}

        {activeNav === 'Home' && role === 'candidate' && <View style={styles.jobsSection}>
          <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>Recommended for you</Text><TouchableOpacity onPress={() => setActiveNav('Apply')}><Text style={styles.linkText}>View all</Text></TouchableOpacity></View>
          <Text style={styles.jobsIntro}>All verified listings that match your profile, skills, and preferred location.</Text>
          {isLoadingJobs && <Text style={styles.libraryStatusText}>Loading matched job listings...</Text>}
          {!isLoadingJobs && homeJobs.length === 0 ? <Text style={styles.libraryStatusText}>No verified job listings are currently available. View all for official employer career portals.</Text> : null}
          {homeJobs.map((job) => <MobileJobCard key={job.id} job={job} onApply={applyToJob} onApplyRecruiterJob={applyToRecruiterJob} email={email} profile={profile} />)}
          {hasMoreRecommendations ? <TouchableOpacity style={styles.secondaryButton} onPress={loadMoreRecommendations} disabled={isLoadingMoreRecommendations}><Text style={styles.secondaryButtonText}>{isLoadingMoreRecommendations ? 'Loading more jobs...' : 'Load more jobs'}</Text></TouchableOpacity> : null}
        </View>}

        {activeNav === 'Apply' && role === 'candidate' && <View style={styles.jobsSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Jobs</Text>
            <Text style={styles.linkText}>View All</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.jobsIntro}>All jobs shown match your profile and preferred location; shortlist scores indicate fit.</Text>
          {isLoadingJobs && <Text style={styles.libraryStatusText}>Loading matched job listings...</Text>}
          {!isLoadingJobs && filteredJobGroups[activeTab].length === 0 ? <Text style={styles.libraryStatusText}>{jobGroups[activeTab].length ? `No jobs match “${jobSearchQuery}”.` : activeTab === 'Applied Jobs' ? 'You have not applied to any jobs yet.' : 'No verified job listings are currently available.'}</Text> : null}
          {!isLoadingJobs && filteredJobGroups[activeTab].map((job) => <MobileJobCard key={job.id} job={job} isApplied={activeTab === 'Applied Jobs'} onApply={applyToJob} onApplyRecruiterJob={applyToRecruiterJob} email={email} profile={profile} />)}
          {activeTab === 'Recommended Jobs' && hasMoreRecommendations ? <TouchableOpacity style={styles.secondaryButton} onPress={loadMoreRecommendations} disabled={isLoadingMoreRecommendations}><Text style={styles.secondaryButtonText}>{isLoadingMoreRecommendations ? 'Loading more jobs...' : 'Load more jobs'}</Text></TouchableOpacity> : null}
          <View style={styles.careerPortalSection}>
            <Text style={styles.portalSectionTitle}>Official career portals</Text>
            <Text style={styles.jobsIntro}>Browse current vacancies directly on each employer's official site.</Text>
            {careerPortals.map((portal) => <TouchableOpacity key={portal.slug} style={styles.careerPortalRow} onPress={() => Linking.openURL(portal.careerUrl)} accessibilityRole="link">
              <View style={styles.careerPortalText}><Text style={styles.careerPortalName}>{portal.companyName}</Text><Text style={styles.careerPortalIndustry}>{portal.industry}</Text></View>
              <Ionicons name="open-outline" size={18} color="#245c8a" />
            </TouchableOpacity>)}
          </View>
        </View>}

        {activeNav === 'Profile' && <View style={styles.profileSections}>
          <ProfileDetailsSection title="Professional Profile" fields={[
            ['Profile headline', profile.headline], ['Name', profile.name], ['Contact', profile.contact], ['Currently working as', profile.currentlyWorkingAs], ['Email ID', profile.email], ['Education', profile.education], ['Current location', profile.location], ['Languages', profile.languages],
          ]} onEdit={() => onEditProfileSection('professionalProfile')} />
          {role === 'recruiter' ? <ProfileDetailsSection title="Professional Summary" fields={[["Summary", profile.professionalSummary]]} onEdit={() => onEditProfileSection('professionalSummary')} /> : null}
          <ProfileDetailsSection title="Professional Info" fields={[
            ['Current industry', profile.currentIndustry], ['Department', profile.department], ['Current role', profile.currentRole], ['Current job title', profile.currentJobTitle], ['Notice period', profile.noticePeriod], ['DOB', profile.dateOfBirth], ['Address', profile.address],
          ]} onEdit={() => onEditProfileSection('professionalInfo')} />
          {role === 'candidate' ? <ProfileDetailsSection title="Career Preferences" fields={[
            ['Preferred job role', profile.preferredJobRole], ['Preferred city', profile.preferredCity], ['Expected salary (INR LPA)', profile.expectedSalaryLpa], ['Total experience (years)', profile.totalExperienceYears], ['Job type', profile.jobType], ['Employment type', profile.employmentType], ['Preferred shift', profile.preferredShift],
          ]} onEdit={() => onEditProfileSection('careerPreferences')} /> : null}
          <ProfileDetailsSection title="Key Skills Set" onEdit={() => onEditProfileSection('keySkillsSet')}><View style={styles.skillTiles}>{(profile.skills || []).map((skill) => <View style={styles.skillTile} key={skill}><Text style={styles.skillTileText}>{skill}</Text></View>)}</View></ProfileDetailsSection>
          <ProfileDetailsSection title="Employment Details" onEdit={() => onEditProfileSection('employmentDetails')}>{(profile.employmentDetails || []).map((employment, index) => <View style={styles.profileRecord} key={index}><Text style={styles.profileRecordTitle}>{employment.companyName || `Company ${index + 1}`}</Text><Text style={styles.profileRecordText}>{employment.jobTitle || 'Job title not added'} · {employment.employmentType || 'Employment type not added'} · CTC: {employment.ctc || 'Not added'}</Text><Text style={styles.profileRecordText}>{employment.joiningDate || 'Joining date not added'}{employment.isCurrent ? ' · Current' : employment.relievingDate ? ` to ${employment.relievingDate}` : ''}</Text><Text style={styles.profileRecordText}>Skills: {(employment.skills || []).join(', ') || 'Not added'} · Notice period: {employment.noticePeriod || 'Not added'}</Text><Text style={styles.profileRecordText}>{employment.jobProfile}</Text></View>)}{!profile.employmentDetails?.length && <Text style={styles.profileRecordText}>No employment details added.</Text>}</ProfileDetailsSection>
          <ProfileDetailsSection title="Major Projects" onEdit={() => onEditProfileSection('majorProjects')}>{(profile.majorProjects || []).map((project, index) => <View style={styles.profileRecord} key={index}><Text style={styles.profileRecordTitle}>{project.projectTitle || `Project ${index + 1}`}</Text><Text style={styles.profileRecordText}>{[project.companyName, project.clientName, project.status].filter(Boolean).join(' · ')}</Text><Text style={styles.profileRecordText}>{project.workedFrom || 'Start date not added'}{project.workedTill ? ` to ${project.workedTill}` : ''}</Text><Text style={styles.profileRecordText}>{project.projectDetails}</Text></View>)}{!profile.majorProjects?.length && <Text style={styles.profileRecordText}>No projects added.</Text>}</ProfileDetailsSection>
        </View>}

        {activeNav === 'Library' && <LibraryView />}

        {activeNav === 'Courses' && <CoursesView />}

        {activeNav === 'Connect' && <ConnectView email={email} profile={profile} onApplyReferral={applyToReferral} onApplyRecruiterJob={applyToRecruiterJob} appliedJobIds={appliedIds} initialPerson={connectFocusPerson} onMessage={(person) => { setMessageRecipient(person); setActiveNav('Messages'); }} />}

        {activeNav === 'Messages' && <MobileMessagesView email={email} role={role} onOpenPerson={(person) => { setConnectFocusPerson(person); setActiveNav('Connect'); }} initialPerson={messageRecipient} onConsumeInitialPerson={() => setMessageRecipient(null)} />}

        {activeNav === 'Notifications' && <MobileNotificationsView email={email} onOpenApplications={() => setActiveNav('Applications')} onOpenMessages={() => setActiveNav('Messages')} />}

        {activeNav === 'Messages' && <MobileMessagesView email={email} role={role} onOpenPerson={() => setActiveNav('Connect')} />}

        {activeNav === 'Notifications' && <MobileNotificationsView email={email} onOpenApplications={() => setActiveNav('Applications')} onOpenMessages={() => setActiveNav('Messages')} />}
      </ScrollView>
      <View style={styles.bottomNav}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomNavItems}>
          {dashboardNavigationItems.map((item) => {
            const isActive = activeNav === item.label;
            return (
              <TouchableOpacity
                key={item.label}
                style={styles.bottomNavItem}
                onPress={() => {
                  setActiveNav(item.label);
                }}
              >
                <Ionicons name={isActive && item.activeIcon ? item.activeIcon : item.icon} size={23} color={isActive ? '#2563eb' : '#64748b'} />
                <Text style={[styles.bottomNavLabel, isActive && styles.bottomNavLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [profile, setProfile] = useState(defaultProfile);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('candidate');
  const [isReady, setIsReady] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [sectionToEdit, setSectionToEdit] = useState(null);
  const [landingNav, setLandingNav] = useState('Home');

  const storeSessionProfile = async (nextProfile) => {
    try {
      await AsyncStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(nextProfile));
    } catch (error) {
      console.warn('Unable to cache the signed-in profile', error);
    }
  };

  useEffect(() => {
    const loadAppState = async () => {
      try {
        const [stored, storedEmail, storedProfile, storedRole] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(ACCOUNT_EMAIL_KEY),
          AsyncStorage.getItem(SESSION_PROFILE_KEY),
          AsyncStorage.getItem(USER_ROLE_KEY),
        ]);
        setUserRole(storedRole === 'recruiter' ? 'recruiter' : 'candidate');
        if (storedEmail && (stored === 'existing-user' || stored === 'new-user')) {
          setUserEmail(storedEmail);
          if (storedProfile) {
            try {
              setProfile({ ...defaultProfile, ...JSON.parse(storedProfile), email: storedEmail });
            } catch (error) {
              console.warn('Unable to restore the cached profile', error);
            }
          }
        }
        if (stored === 'existing-user' && storedEmail) {
          setScreen('landing');
        } else if (stored === 'new-user' && storedEmail) {
          setScreen('profile-form');
        }
      } catch (error) {
        console.warn('Unable to load app state', error);
      } finally {
        setIsReady(true);
      }
    };

    loadAppState();
  }, []);

  useEffect(() => {
    if (!userEmail) return undefined;
    let isActive = true;
    fetch(`${getApiBaseUrl()}/auth/profile?email=${encodeURIComponent(userEmail)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to refresh the saved profile.');
        return data.user;
      })
      .then(async (user) => {
        if (!isActive || !user) return;
        const restoredProfile = {
          ...defaultProfile,
          ...(user.profile || {}),
          email: user.email || userEmail,
          updatedAt: user.updated_at || null,
        };
        setProfile(restoredProfile);
        await storeSessionProfile(restoredProfile);
      })
      .catch((error) => console.warn('Unable to refresh the saved profile; keeping the local copy.', error));
    return () => { isActive = false; };
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return undefined;
    let isActive = true;
    fetch(`${getApiBaseUrl()}/auth/profile/resume?email=${encodeURIComponent(userEmail)}`)
      .then((response) => response.json())
      .then((data) => { if (isActive) setProfile((currentProfile) => ({ ...currentProfile, resume: data.resume || null })); })
      .catch(() => {});
    return () => { isActive = false; };
  }, [userEmail]);

  const markUserAsExisting = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'existing-user');
    } catch (error) {
      console.warn('Unable to persist user state', error);
    }
  };

  const markUserAsNew = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'new-user');
    } catch (error) {
      console.warn('Unable to persist onboarding state', error);
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEY),
        AsyncStorage.removeItem(ACCOUNT_EMAIL_KEY),
        AsyncStorage.removeItem(USER_ROLE_KEY),
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(SESSION_PROFILE_KEY),
      ]);
    } catch (error) {
      console.warn('Unable to clear user state', error);
    } finally {
      setProfile(defaultProfile);
      setUserEmail('');
      setIsEditingProfile(false);
      setSectionToEdit(null);
      setLandingNav('Home');
      setScreen('login');
    }
  };

  const updateProfilePicture = async (photo) => {
    const accountEmail = userEmail || await AsyncStorage.getItem(ACCOUNT_EMAIL_KEY) || profile.email;
    if (!accountEmail) {
      setProfile((currentProfile) => ({ ...currentProfile, photo }));
      return;
    }

    const response = await fetch(`${getApiBaseUrl()}/auth/profile/photo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: accountEmail, photo }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to update profile picture.');
    const nextProfile = { ...profile, photo, updatedAt: data.user?.updated_at || profile.updatedAt };
    setProfile(nextProfile);
    await storeSessionProfile(nextProfile);
  };

  const uploadResume = async (file) => {
    const accountEmail = userEmail || await AsyncStorage.getItem(ACCOUNT_EMAIL_KEY) || profile.email;
    if (!accountEmail) throw new Error('Please sign in again before uploading a resume.');
    const formData = new FormData();
    formData.append('email', accountEmail);
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    });
    const response = await fetch(`${getApiBaseUrl()}/auth/profile/resume`, { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to upload resume.');
    const nextProfile = { ...profile, resume: data.resume, updatedAt: data.updated_at || profile.updatedAt };
    setProfile(nextProfile);
    await storeSessionProfile(nextProfile);
  };

  const applyToJob = async (job) => {
    const accountEmail = userEmail || await AsyncStorage.getItem(ACCOUNT_EMAIL_KEY) || profile.email;
    if (!accountEmail) throw new Error('Sign in again before applying to jobs.');
    const response = await fetch(`${getApiBaseUrl()}/jobs/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: accountEmail, job }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to save this application.');
    return data;
  };

  const downloadResume = async () => {
    const accountEmail = userEmail || await AsyncStorage.getItem(ACCOUNT_EMAIL_KEY) || profile.email;
    if (!accountEmail) throw new Error('Please sign in again before downloading your resume.');
    const response = await fetch(`${getApiBaseUrl()}/auth/profile/resume?email=${encodeURIComponent(accountEmail)}`);
    const data = await response.json();
    if (!response.ok || !data.downloadUrl) throw new Error(data.message || 'Resume is not available.');
    await Linking.openURL(data.downloadUrl);
  };

  const deleteResume = async () => {
    const accountEmail = userEmail || await AsyncStorage.getItem(ACCOUNT_EMAIL_KEY) || profile.email;
    if (!accountEmail) throw new Error('Please sign in again before deleting your resume.');
    const response = await fetch(`${getApiBaseUrl()}/auth/profile/resume`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: accountEmail }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to delete resume.');
    const nextProfile = { ...profile, updatedAt: data.updated_at || profile.updatedAt };
    delete nextProfile.resume;
    setProfile(nextProfile);
    await storeSessionProfile(nextProfile);
  };

  const persistProfile = async (nextProfile) => {
    const updatedAt = new Date().toISOString();
    const profileToSave = { ...nextProfile };
    delete profileToSave.updatedAt;
    const nextProfileWithTimestamp = { ...nextProfile, updatedAt };
    if (!userEmail) {
      setProfile(nextProfileWithTimestamp);
      await storeSessionProfile(nextProfileWithTimestamp);
      return;
    }
    const response = await fetch(`${getApiBaseUrl()}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, profile: profileToSave }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to save profile.');
    const savedProfile = { ...nextProfile, updatedAt: data.user?.updated_at || updatedAt };
    setProfile(savedProfile);
    await storeSessionProfile(savedProfile);
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.containerDark}>
        <StatusBar barStyle="dark-content" />
      </SafeAreaView>
    );
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        onLogin={async ({ user, profile: savedProfile, isFirstTime, accessToken }) => {
          const accountEmail = user?.email || '';
          const accountRole = user?.role === 'recruiter' ? 'recruiter' : 'candidate';
          setUserEmail(accountEmail);
          setUserRole(accountRole);
          if (accountEmail) await AsyncStorage.setItem(ACCOUNT_EMAIL_KEY, accountEmail);
          await AsyncStorage.setItem(USER_ROLE_KEY, accountRole);
          if (accessToken) await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
          else await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
          const nextProfile = { ...defaultProfile, ...(savedProfile || {}), email: accountEmail, updatedAt: user?.updated_at || savedProfile?.updatedAt || null };
          await storeSessionProfile(nextProfile);
          if (savedProfile && Object.keys(savedProfile).length > 0) {
            setProfile(nextProfile);
          } else {
            setProfile(nextProfile);
          }
          if (isFirstTime) {
            await markUserAsNew();
            setIsEditingProfile(false);
            setScreen('profile-form');
            return;
          }

          await markUserAsExisting();
          setLandingNav('Home');
          setScreen('landing');
        }}
      />
    );
  }

  if (screen === 'profile-form') {
    return (
      <ProfileForm
        profile={profile}
        email={userEmail}
        role={userRole}
        isEditing={isEditingProfile}
        sectionToEdit={sectionToEdit}
        onSave={async (nextProfile) => {
          await persistProfile(nextProfile);
          await markUserAsExisting();
          setLandingNav('Profile');
          setIsEditingProfile(false);
          setSectionToEdit(null);
          setScreen('landing');
        }}
        onSkip={async () => {
          await markUserAsExisting();
          setLandingNav('Profile');
          setIsEditingProfile(false);
          setSectionToEdit(null);
          setScreen('landing');
        }}
      />
    );
  }

  return (
    <HomeDashboard
      profile={profile}
      email={userEmail || profile.email}
      role={userRole}
      initialNav={landingNav}
      onUpdateProfilePicture={updateProfilePicture}
      onUploadResume={uploadResume}
      onDownloadResume={downloadResume}
      onDeleteResume={deleteResume}
      onApplyToJob={applyToJob}
      onEditProfileSection={(section) => {
        setSectionToEdit(section);
        setIsEditingProfile(true);
        setScreen('profile-form');
      }}
      onLogout={logout}
    />
  );
}

const styles = StyleSheet.create({
  containerDark: {
    flex: 1,
    backgroundColor: '#e9eef1',
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    backgroundColor: '#e7edef',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bdc9d0',
  },
  formSection: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#bdc9d0',
  },
  formSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  formSectionTitle: { color: '#263445', fontSize: 16, fontWeight: '600', flexShrink: 1 },
  profileField: { marginBottom: 12 },
  dropdownField: { zIndex: 25 },
  dropdownTrigger: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderWidth: 1, borderColor: '#b9c6ce', borderRadius: 7, backgroundColor: '#dce4e8', paddingHorizontal: 12 },
  dropdownValue: { color: '#263445', fontSize: 14 },
  dropdownPlaceholder: { color: '#64748b' },
  dropdownOptions: { marginTop: 4, borderWidth: 1, borderColor: '#cbd6dd', borderRadius: 7, backgroundColor: '#fff', overflow: 'hidden' },
  dropdownOption: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#edf1f4' },
  dropdownOptionText: { color: '#263445', fontSize: 14 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceButton: { borderWidth: 1, borderColor: '#d1d9e2', borderRadius: 7, paddingVertical: 8, paddingHorizontal: 11, backgroundColor: '#fff' },
  choiceButtonActive: { borderColor: '#60a5fa', backgroundColor: '#eff6ff' },
  choiceText: { color: '#475569', fontWeight: '500' },
  choiceTextActive: { color: '#1d4ed8' },
  skillEntry: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  skillInput: { flex: 1 },
  addButton: { height: 48, width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#2563eb' },
  skillTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 10 },
  preferredCityHint: { color: '#5b6d7b', fontSize: 11, marginTop: 5 },
  preferredCityError: { color: '#b42318' },
  skillTile: { borderRadius: 7, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: '#dbeafe' },
  skillTileText: { color: '#1d4ed8', fontWeight: '600' },
  repeatEntry: { marginBottom: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fbfcfd' },
  repeatHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  repeatTitle: { color: '#263445', fontSize: 15, fontWeight: '600', flex: 1 },
  repeatActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  editRecordText: { color: '#93c5fd', fontWeight: '700' },
  addRecordButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#345b8d', borderRadius: 8, marginTop: 6 },
  addRecordText: { color: '#1d4ed8', fontWeight: '600' },
  formScroll: {
    width: '100%',
  },
  formScrollContent: {
    flexGrow: 1,
    paddingVertical: 18,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: '#f3f6f8',
  },
  sectionHeading: {
    color: '#263445',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: '#d7e0e6',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  loginScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 18,
  },
  loginScroller: {
    width: '100%',
  },
  loginLogo: {
    width: '100%',
    height: 150,
    marginBottom: 18,
  },
  loginServices: {
    width: '100%',
    height: 100,
    marginTop: 20,
  },
  logoText: {
    color: '#245c8a',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: {
    color: '#172b3a',
    fontSize: 27,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#5b6d7b',
    fontSize: 14,
    marginBottom: 18,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#edf2f5',
    borderWidth: 1,
    borderColor: '#d7e0e6',
    borderRadius: 7,
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  roleText: {
    color: '#34495a',
    fontWeight: '600',
  },
  roleTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#fff',
    borderColor: '#bdc9d0',
    borderWidth: 1,
    borderRadius: 7,
    color: '#263445',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  profileInput: { backgroundColor: '#dce4e8', borderColor: '#b9c6ce', borderRadius: 7, color: '#263445', fontSize: 14, fontWeight: '400' },
  locationField: {
    position: 'relative',
  },
  locationFieldFocused: {
    zIndex: 20,
    elevation: 40,
  },
  locationLabel: {
    color: '#475569',
    fontWeight: '500',
    fontSize: 13,
    marginBottom: 8,
  },
  locationSuggestions: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    zIndex: 40,
    elevation: 40,
    maxHeight: 220,
    backgroundColor: '#e7edef',
    borderColor: '#b9c6ce',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  locationSuggestion: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
  },
  locationSuggestionText: {
    color: '#172638',
    fontSize: 14,
  },
  salaryField: {
    zIndex: 1,
    marginBottom: 12,
  },
  salaryInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0e1a2d',
    borderColor: '#20304d',
    borderWidth: 1,
    borderRadius: 12,
  },
  salaryPrefix: {
    color: '#dbeafe',
    fontWeight: '800',
    paddingLeft: 14,
  },
  salaryTextInput: {
    flex: 1,
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 7,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flex: 1,
    alignItems: 'center',
  },
  loginButton: {
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
    flex: 0,
  },
  otpAction: { backgroundColor: '#2563eb', borderRadius: 7 },
  otpActionDisabled: { backgroundColor: '#557fce', opacity: 1 },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    marginTop: 8,
  },
  successText: {
    color: '#15803d',
    fontSize: 14,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 7,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 7,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flex: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#475569',
    fontWeight: '500',
    fontSize: 14,
  },
  homeScreen: {
    flex: 1,
    backgroundColor: '#e9eef1',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileHeaderButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd6dd',
    borderRadius: 18,
  },
  profileHeaderAvatar: { width: 34, height: 34, borderRadius: 17 },
  profileHeaderInitials: { color: '#245c8a', fontSize: 12, fontWeight: '800' },
  notificationsHeaderButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd6dd', borderRadius: 18, backgroundColor: '#fff' },
  notificationsHeaderButtonActive: { backgroundColor: '#eaf2ff', borderColor: '#2563eb' },
  profileHeaderButtonActive: {
    backgroundColor: '#eaf2ff',
    borderColor: '#2563eb',
  },
  dashboardLogo: {
    width: 92,
    height: 52,
  },
  brand: {
    backgroundColor: '#ef4444',
    color: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
    fontSize: 20,
    fontWeight: '800',
  },
  timeLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d7e0e6',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  resumeSection: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d7e0e6', borderRadius: 8, padding: 16, marginBottom: 14 },
  resumeHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: '#dce3e8' },
  resumeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resumeTitle: { color: '#172b3a', fontSize: 16, fontWeight: '700' },
  resumeDate: { color: '#657684', fontSize: 11, flexShrink: 1, textAlign: 'right' },
  resumeFileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 13 },
  resumeFileInfo: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  resumeFileText: { flex: 1, minWidth: 0 },
  resumeFileName: { color: '#263b4a', fontSize: 13, fontWeight: '600' },
  resumeFileSize: { color: '#657684', fontSize: 11, marginTop: 2 },
  resumeActions: { flexDirection: 'row', gap: 6 },
  resumeIconButton: { width: 34, height: 34, borderWidth: 1, borderColor: '#d7e0e6', borderRadius: 7, backgroundColor: '#f2f5f7', alignItems: 'center', justifyContent: 'center' },
  resumeDeleteButton: { backgroundColor: '#f8f1f1', borderColor: '#ead3d3' },
  resumeUploadButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#91a8b8', borderStyle: 'dashed', borderRadius: 7 },
  resumeUploadText: { color: '#245c8a', fontSize: 13, fontWeight: '600' },
  resumeHint: { color: '#657684', fontSize: 11, textAlign: 'center', marginTop: 7 },
  resumeEmpty: { color: '#657684', fontSize: 12, marginVertical: 12 },
  profileHeroRow: { flexDirection: 'column', alignItems: 'center', gap: 4 },
  profileIdentity: { alignItems: 'center', width: '100%' },
  profileHeadline: { color: '#33495b', fontSize: 14, fontWeight: '600', marginBottom: 3, textAlign: 'center' },
  profileCurrentRole: { color: '#5b6d7b', fontSize: 13, marginBottom: 6, textAlign: 'center' },
  avatarWrap: {
    position: 'relative',
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 2,
    borderColor: '#d7e0e6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: 'hidden',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#33495a',
    fontSize: 30,
    fontWeight: '600',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 65,
  },
  photoEditIcon: { position: 'absolute', right: 0, bottom: 2, width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  profileScore: {
    alignSelf: 'center',
    color: '#33495b',
    backgroundColor: '#edf2f5',
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 7,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 7,
  },
  profileName: {
    color: '#172b3a',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 5,
    textAlign: 'center',
  },
  metaText: {
    color: '#657684',
    fontSize: 12,
    fontStyle: 'normal',
    marginBottom: 16,
  },
  dashboardActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap',
  },
  updateButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d4a937',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  updateButtonText: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  logoutIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderColor: '#d7e0e6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    minHeight: 120,
  },
  statNumber: {
    color: '#172b3a',
    fontSize: 30,
    fontWeight: '700',
  },
  statLabel: {
    color: '#33495b',
    fontSize: 15,
    marginTop: 8,
  },
  statMeta: {
    color: '#64748b',
    marginTop: 6,
    fontSize: 13,
  },
  jobsSection: {
    backgroundColor: '#fff',
    borderColor: '#d7e0e6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#172b3a',
    fontSize: 20,
    fontWeight: '700',
  },
  linkText: {
    color: '#245c8a',
    fontSize: 14,
    fontWeight: '600',
  },
  tabScroll: {
    marginBottom: 14,
  },
  tabContainer: {
    gap: 8,
    paddingRight: 10,
  },
  jobsSearchBox: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, marginBottom: 14, borderWidth: 1, borderColor: '#cbd6dd', borderRadius: 7, backgroundColor: '#fff' },
  jobsSearchInput: { flex: 1, minWidth: 0, height: 42, paddingVertical: 0, color: '#172b3a', fontSize: 14 },
  tabButton: {
    backgroundColor: '#edf2f5',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 6,
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff',
  },
  jobCard: {
    backgroundColor: '#fff',
    borderColor: '#d7e0e6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  jobMatchBadge: { color: '#245c8a', backgroundColor: '#e7eff5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: '600' },
  jobActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 12 },
  jobViewButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: '#cbd6dd', borderRadius: 7, backgroundColor: '#f3f6f8' },
  jobViewButtonText: { color: '#245c8a', fontSize: 13, fontWeight: '600' },
  jobApplyButton: { minHeight: 38, minWidth: 80, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 7, backgroundColor: '#2563eb' },
  jobApplyButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  jobAppliedStatus: { color: '#15803d', fontSize: 13, fontWeight: '600' },
  jobsIntro: { color: '#5b6d7b', fontSize: 12, lineHeight: 17, marginBottom: 12 },
  careerPortalSection: { marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: '#d7e0e6' },
  portalSectionTitle: { color: '#172b3a', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  careerPortalRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e4eaee' },
  careerPortalText: { flex: 1, gap: 3 },
  careerPortalName: { color: '#172b3a', fontSize: 14, fontWeight: '600' },
  careerPortalIndustry: { color: '#5b6d7b', fontSize: 12 },
  jobHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobTitleBlock: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 180,
    minWidth: 0,
  },
  jobTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  jobCompany: {
    color: '#475569',
    fontSize: 16,
    marginTop: 4,
  },
  jobPill: {
    flexShrink: 0,
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  jobPillText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jobMeta: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  jobLocation: {
    flex: 1,
    minWidth: 0,
  },
  jobType: {
    flexShrink: 0,
    maxWidth: '38%',
  },
  librarySection: {
    backgroundColor: '#fff',
    borderColor: '#d7e0e6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 18,
  },
  libraryEyebrow: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 5,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  libraryTitleBlock: {
    flex: 1,
  },
  libraryTitle: {
    color: '#172b3a',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  libraryIntro: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
  },
  topicCount: {
    color: '#1d4ed8',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '600',
  },
  librarySearchLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
  },
  librarySearch: {
    backgroundColor: '#edf2f5',
    borderColor: '#cbd6dd',
    borderWidth: 1,
    borderRadius: 7,
    color: '#172638',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
  },
  alphabetScroll: {
    marginBottom: 16,
  },
  alphabetFilter: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 8,
  },
  alphabetButton: {
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#edf2f5',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
  },
  alphabetButtonActive: {
    backgroundColor: '#2563eb',
  },
  alphabetButtonDisabled: {
    opacity: 0.35,
  },
  alphabetButtonText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  alphabetButtonTextActive: {
    color: '#fff',
  },
  alphabetButtonTextDisabled: {
    color: '#64748b',
  },
  topicCard: {
    backgroundColor: '#fff',
    borderColor: '#d7e0e6',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 14,
  },
  topicToggle: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  topicDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topicTitle: {
    color: '#172b3a',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  topicBrief: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 16,
  },
  topicFieldTitle: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 5,
  },
  topicExplanation: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  topicExample: {
    backgroundColor: '#172638',
    borderRadius: 10,
    padding: 12,
  },
  topicExampleText: {
    color: '#dbeafe',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyLibrary: {
    color: '#475569',
    textAlign: 'center',
    paddingVertical: 22,
  },
  libraryStatus: {
    backgroundColor: '#fff',
    borderColor: '#d7e0e6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 28,
    marginBottom: 18,
  },
  libraryStatusText: {
    color: '#475569',
    textAlign: 'center',
  },
  libraryStatusError: {
    color: '#b91c1c',
    textAlign: 'center',
  },
  coursesSection: {
    backgroundColor: '#fff',
    borderColor: '#d7e0e6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 18,
  },
  connectView: {
    backgroundColor: '#fff',
    borderColor: '#d7e0e6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 18,
  },
  connectEyebrow: { color: '#2563eb', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  connectTitle: { color: '#172b3a', fontSize: 21, fontWeight: '700', marginBottom: 5 },
  connectIntro: { color: '#5b6d7b', fontSize: 12, lineHeight: 17, marginBottom: 16 },
  connectRoleSwitch: { flexDirection: 'row', alignSelf: 'flex-start', gap: 4, padding: 4, borderWidth: 1, borderColor: '#d7e0e6', borderRadius: 8, backgroundColor: '#f3f6f8', marginBottom: 16 },
  connectRoleButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  connectRoleButtonActive: { backgroundColor: '#2563eb' },
  connectRoleText: { color: '#526779', fontSize: 13, fontWeight: '700' },
  connectRoleTextActive: { color: '#fff' },
  connectSectionTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#d7e0e6' },
  connectSectionTab: { paddingHorizontal: 9, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  connectSectionTabActive: { borderBottomColor: '#2563eb' },
  connectSectionTabText: { color: '#526779', fontSize: 11, fontWeight: '700' },
  connectSectionTabTextActive: { color: '#1d4ed8' },
  connectSearchLabel: { color: '#334155', fontSize: 12, fontWeight: '800', marginBottom: 7 },
  connectSearchInput: { minHeight: 44, color: '#172b3a', backgroundColor: '#fff', borderColor: '#cbd6dd', borderWidth: 1, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 },
  connectSuggestions: { marginTop: 5, borderColor: '#d7e0e6', borderWidth: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' },
  connectPerson: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#e4eaee' },
  connectPersonDetails: { flex: 1, minWidth: 0, gap: 3 },
  connectPersonName: { color: '#172b3a', fontSize: 14, fontWeight: '700' },
  connectPersonMeta: { color: '#5b6d7b', fontSize: 12 },
  connectAction: { minHeight: 34, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 11, borderRadius: 6, backgroundColor: '#2563eb' },
  connectActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  connectActionDisabled: { backgroundColor: '#edf2f5' },
  connectActionTextDisabled: { color: '#526779' },
  connectSecondaryAction: { minHeight: 34, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: '#cbd6dd', borderRadius: 6 },
  connectSecondaryActionText: { color: '#526779', fontSize: 12, fontWeight: '700' },
  connectActionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  connectMessageAction: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#cbd6dd', borderRadius: 6 },
  connectMemberDetails: { gap: 7, marginVertical: 12, padding: 12, borderWidth: 1, borderColor: '#d7e0e6', borderRadius: 7, backgroundColor: '#f7f9fa' },
  connectReferral: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e4eaee' },
  connectReferralDetails: { flex: 1, minWidth: 0, gap: 3 },
  connectLists: { gap: 20, marginTop: 24 },
  connectListSection: { gap: 7 },
  connectSectionTitle: { color: '#172b3a', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  connectStatus: { color: '#526779', fontSize: 12, fontWeight: '700' },
  connectEmpty: { color: '#64748b', fontSize: 12, paddingVertical: 8 },
  connectError: { color: '#b91c1c', fontSize: 12, marginTop: 8 },
  mobileJobReferralControl: { position: 'relative' },
  mobileJobReferButton: { minHeight: 38, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: '#cbd6dd', borderRadius: 7, backgroundColor: '#fff' },
  mobileJobReferText: { color: '#245c8a', fontSize: 12, fontWeight: '700' },
  mobileJobReferralOptions: { width: 190, maxHeight: 190, marginTop: 5, padding: 5, borderWidth: 1, borderColor: '#d7e0e6', borderRadius: 7, backgroundColor: '#fff' },
  mobileJobReferralOption: { paddingVertical: 8, paddingHorizontal: 7 },
  mobileJobReferralOptionText: { color: '#172b3a', fontSize: 12 },
  mobileJobReferralMessage: { paddingHorizontal: 7, paddingVertical: 5, color: '#245c8a', fontSize: 11 },
  recruiterOpeningsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 8 },
  recruiterOpeningTile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8, padding: 12, borderWidth: 1, borderColor: '#d7e0e6', borderRadius: 7, backgroundColor: '#fff' },
  recruiterOpeningDetails: { flex: 1, minWidth: 0, gap: 4 },
  recruiterApplicationGroup: { marginTop: 8 },
  recruiterApplicantTile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6, marginLeft: 12, padding: 10, borderWidth: 1, borderColor: '#d7e0e6', borderRadius: 6, backgroundColor: '#f8fafb' },
  recruiterCandidateDetail: { gap: 8, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#d7e0e6' },
  messageRecipientSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 10 },
  messageItem: { gap: 7, marginTop: 9, padding: 12, borderWidth: 1, borderColor: '#d7e0e6', borderRadius: 7, backgroundColor: '#fff' },
  messageJobTile: { gap: 4, padding: 10, borderLeftWidth: 3, borderLeftColor: '#2563eb', backgroundColor: '#f3f6f8' },
  notificationItem: { gap: 4, marginTop: 8, padding: 12, borderWidth: 1, borderColor: '#d7e0e6', borderRadius: 6, backgroundColor: '#fff' },
  cnApplicationModal: { flex: 1, backgroundColor: '#f5f7f8' },
  cnApplicationContent: { gap: 12, padding: 18, paddingBottom: 36 },
  recruiterJobDescription: { marginTop: 8, marginBottom: 3, padding: 10, borderRadius: 6, backgroundColor: '#f3f6f8' },
  resumeChoice: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  coursesEyebrow: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 5,
  },
  coursesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  coursesTitleBlock: {
    flex: 1,
  },
  coursesTitle: {
    color: '#172b3a',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  coursesIntro: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
  },
  courseCount: {
    color: '#1d4ed8',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '800',
  },
  coursesSearchLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
  },
  coursesSearch: {
    backgroundColor: '#edf2f5',
    borderColor: '#cbd6dd',
    borderWidth: 1,
    borderRadius: 7,
    color: '#172638',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
  },
  courseCard: {
    backgroundColor: '#fff',
    borderColor: '#d7e0e6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
  },
  courseCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  courseTitleBlock: {
    flex: 1,
  },
  courseTopic: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  courseTitle: {
    color: '#172b3a',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  courseLevel: {
    color: '#1d4ed8',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '800',
  },
  courseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  courseMetaText: {
    color: '#475569',
    flexShrink: 1,
    fontSize: 12,
  },
  courseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'center',
    marginTop: 12,
  },
  courseLinkText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '800',
  },
  profileSection: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d7e0e6',
    borderRadius: 8,
    padding: 16,
  },
  profileSectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  profileEditIcon: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  profileSections: { gap: 12, paddingBottom: 16 },
  profileGrid: {
    marginTop: 10,
  },
  profileDetail: {
    color: '#334155',
    fontSize: 14,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#edf2f5',
    borderRadius: 7,
  },
  detailLabel: {
    fontWeight: '600',
  },
  profileRecord: { borderTopWidth: 1, borderTopColor: '#dbe3ef', paddingVertical: 10 },
  profileRecordTitle: { color: '#263445', fontWeight: '600', marginBottom: 4 },
  profileRecordText: { color: '#475569', marginBottom: 3 },
  fullWidth: {
    width: '100%',
  },
  bottomNav: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#dbe3ef',
    paddingTop: 8,
    paddingBottom: 6,
  },
  bottomNavItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minWidth: '100%',
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 4,
  },
  bottomNavLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  bottomNavLabelActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
});
