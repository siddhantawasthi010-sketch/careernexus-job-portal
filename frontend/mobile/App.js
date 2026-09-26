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
  photo: '',
  contact: '',
  education: '',
  skills: [],
  languages: [],
  location: '',
  preferredJobRole: '',
  preferredCity: '',
  jobType: '',
  employmentType: '',
  preferredShift: '',
  employmentDetails: [],
  majorProjects: [],
  updatedAt: null,
};

const tabs = ['Applied Jobs', 'Recommended Jobs'];
const navigationItems = [
  { label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { label: 'Apply', icon: 'paper-plane-outline' },
  { label: 'Profile', icon: 'person-outline' },
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
      const fallbackStatus = await AsyncStorage.getItem(STORAGE_KEY);
      const shouldUseFallback = fallbackStatus === 'new-user' || !fallbackStatus;
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
      onLogin({ user: data.user, profile: data.user.profile, isFirstTime: isFirstTimeUser });
    } catch (error) {
      const storedStatus = await AsyncStorage.getItem(STORAGE_KEY);
      const fallbackIsFirstTime = storedStatus === 'new-user' || !storedStatus;
      await AsyncStorage.setItem(STORAGE_KEY, fallbackIsFirstTime ? 'new-user' : 'existing-user');
      onLogin({ user: { email, role }, isFirstTime: fallbackIsFirstTime });
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
          onChangeText={setEmail}
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

function ProfileForm({ profile, email, onSave, onSkip, isEditing, sectionToEdit }) {
  const [form, setForm] = useState(() => ({ ...defaultProfile, ...profile, email: email || profile.email || '' }));
  const [skillDraft, setSkillDraft] = useState(profile.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [expandedDropdown, setExpandedDropdown] = useState('');
  const [preferredCityError, setPreferredCityError] = useState('');

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
  const saveForm = () => {
    const cityCount = Array.isArray(form.preferredCity) ? form.preferredCity.length : form.preferredCity ? 1 : 0;
    if ((!sectionToEdit || sectionToEdit === 'careerPreferences') && cityCount < 1) {
      setPreferredCityError('Select at least 1 preferred city.');
      return;
    }
    onSave({ ...form, skills: skillDraft });
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
          {section('Professional Profile', <>
            {field('Profile headline', 'headline', form, updateField)}{field('Name', 'name', form, updateField)}{field('Contact', 'contact', form, updateField, { keyboardType: 'phone-pad' })}{field('Currently working as', 'currentlyWorkingAs', form, updateField)}{field('Email ID', 'email', form, updateField, { keyboardType: 'email-address', autoCapitalize: 'none' })}{field('Education', 'education', form, updateField)}
            <LocationField label="Current location" value={form.location} onChange={(value) => updateField('location', value)} />
            <LanguageField value={form.languages} onChange={(value) => updateField('languages', value)} />
          </>, null, 'professionalProfile')}
          {section('Professional Info', <>
            {field('Current industry', 'currentIndustry', form, updateField)}{field('Department', 'department', form, updateField)}{field('Current role', 'currentRole', form, updateField)}{field('Current job title', 'currentJobTitle', form, updateField)}{dropdownField('Notice period', 'noticePeriod', noticePeriodOptions)}{field('DOB', 'dateOfBirth', form, updateField, { placeholder: 'YYYY-MM-DD' })}{field('Address', 'address', form, updateField, { multiline: true })}
          </>, null, 'professionalInfo')}
          {section('Career Preferences', <>
            {field('Preferred job role', 'preferredJobRole', form, updateField)}<PreferredCitiesField value={form.preferredCity} error={preferredCityError} onChange={(value) => { updateField('preferredCity', value); setPreferredCityError(''); }} />{choiceField('Job type', 'jobType', ['Permanent', 'Contractual'])}{choiceField('Employment type', 'employmentType', ['Full Time', 'Part Time'])}{choiceField('Preferred shift', 'preferredShift', ['Day', 'Night', 'Rotational'])}
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
            <TouchableOpacity style={styles.secondaryButton} onPress={onSkip}><Text style={styles.secondaryButtonText}>{sectionToEdit ? 'Cancel' : 'Later'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={saveForm}><Text style={styles.primaryButtonText}>{sectionToEdit === 'keySkillsSet' ? 'Save skills' : sectionToEdit ? 'Save changes' : isEditing ? 'Update profile' : 'Create profile'}</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LibraryTopics({ topics }) {
  const [activeLetter, setActiveLetter] = useState('All');
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const availableLetters = new Set(topics.map((topic) => topic.name.charAt(0).toUpperCase()));
  const filteredTopics = topics.filter((topic) => {
    return activeLetter === 'All' || topic.name.toUpperCase().startsWith(activeLetter);
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
  return (
    <View style={styles.coursesSection}>
      <Text style={styles.coursesEyebrow}>LEARNING PATHS</Text>
      <View style={styles.coursesHeader}>
        <View style={styles.coursesTitleBlock}>
          <Text style={styles.coursesTitle}>Online courses</Text>
          <Text style={styles.coursesIntro}>Practical courses for testing topics and skills commonly listed in job descriptions.</Text>
        </View>
        <Text style={styles.courseCount}>{courses.length} courses</Text>
      </View>

      {courses.map((course) => (
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

      {courses.length === 0 && <Text style={styles.emptyLibrary}>No courses available.</Text>}
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

function MobileJobCard({ job, isApplied, onApply }) {
  return <View style={styles.jobCard}>
    <View style={styles.jobHeader}>
      <View style={styles.jobTitleBlock}><Text style={styles.jobTitle}>{job.title}</Text><Text style={styles.jobCompany}>{job.company}</Text></View>
      <Text style={styles.jobMatchBadge}>{job.matchScore}% shortlist</Text>
    </View>
    <View style={styles.jobMetaRow}><Text style={styles.jobMeta}>{job.location || 'Location not listed'}</Text><Text style={styles.jobMeta}>{job.type || 'Type not listed'}</Text></View>
    <View style={styles.jobActions}>
      <TouchableOpacity style={styles.jobViewButton} onPress={() => Linking.openURL(job.url)}><Text style={styles.jobViewButtonText}>View listing</Text></TouchableOpacity>
      {isApplied ? <Text style={styles.jobAppliedStatus}>Applied</Text> : <TouchableOpacity style={styles.jobApplyButton} onPress={() => onApply(job)}><Text style={styles.jobApplyButtonText}>Apply</Text></TouchableOpacity>}
    </View>
  </View>;
}

function HomeDashboard({ profile, email, initialNav, onEditProfileSection, onLogout, onUpdateProfilePicture, onUploadResume, onDownloadResume, onDeleteResume, onApplyToJob }) {
  const [activeTab, setActiveTab] = useState('Applied Jobs');
  const [activeNav, setActiveNav] = useState(initialNav);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(profile.photo);
  const [recommendations, setRecommendations] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [careerPortals, setCareerPortals] = useState([]);
  const [jobFeedStatus, setJobFeedStatus] = useState(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState('');

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
    setJobsError('');
    setJobFeedStatus(null);
    Promise.all([
      fetch(`${getApiBaseUrl()}/jobs/recommendations?email=${encodeURIComponent(email)}`),
      fetch(`${getApiBaseUrl()}/jobs/applications?email=${encodeURIComponent(email)}`),
      fetch(`${getApiBaseUrl()}/jobs/career-portals`),
    ]).then(async ([recommendationResponse, applicationResponse, portalResponse]) => {
      const [recommendationData, applicationData, portalData] = await Promise.all([recommendationResponse.json(), applicationResponse.json(), portalResponse.json()]);
      if (!recommendationResponse.ok) throw new Error(recommendationData.message || 'Unable to load job recommendations.');
      if (!applicationResponse.ok) throw new Error(applicationData.message || 'Unable to load applied jobs.');
      if (!portalResponse.ok) throw new Error(portalData.message || 'Unable to load company career portals.');
      if (isActive) {
        setRecommendations(Array.isArray(recommendationData.jobs) ? recommendationData.jobs : []);
        setAppliedJobs(Array.isArray(applicationData) ? applicationData : []);
        setCareerPortals(Array.isArray(portalData) ? portalData : []);
        setJobFeedStatus({ diagnostic: recommendationData.diagnostic || '', sourcesFailed: Array.isArray(recommendationData.sourcesFailed) ? recommendationData.sourcesFailed : [] });
      }
    }).catch((error) => {
      if (isActive) setJobsError(error.message || 'Unable to load jobs.');
    }).finally(() => {
      if (isActive) setIsLoadingJobs(false);
    });
    return () => { isActive = false; };
  }, [email]);

  const appliedIds = new Set(appliedJobs.map((job) => job.id));
  const matchingJobs = recommendations.filter((job) => job.matchScore > 0 && !appliedIds.has(job.id));
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
      Alert.alert('Unable to apply', error.message || 'Please try again.');
    }
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
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutButtonText}>Log out</Text>
          </TouchableOpacity>
        </View>
        {(activeNav === 'Home' || activeNav === 'Apply') && <View style={styles.jobsSearchBox}>
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

        {activeNav === 'Home' && <View style={styles.statsRow}>
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

        {activeNav === 'Home' && <View style={styles.jobsSection}>
          <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>Recommended for you</Text><TouchableOpacity onPress={() => setActiveNav('Apply')}><Text style={styles.linkText}>View all</Text></TouchableOpacity></View>
          <Text style={styles.jobsIntro}>All verified listings that match your profile, skills, and preferred location.</Text>
          {isLoadingJobs && <Text style={styles.libraryStatusText}>Loading matched job listings...</Text>}
          {jobsError ? <Text style={styles.libraryStatusError}>{jobsError}</Text> : null}
          {jobFeedStatus?.sourcesFailed.map((failure) => <Text key={failure.source} style={styles.libraryStatusError}>{failure.source}: {failure.message}</Text>)}
          {!isLoadingJobs && !jobsError && homeJobs.length === 0 ? <Text style={styles.libraryStatusText}>{jobFeedStatus?.diagnostic || 'No verified job listings are currently available. View all for official employer career portals.'}</Text> : null}
          {homeJobs.map((job) => <MobileJobCard key={job.id} job={job} onApply={applyToJob} />)}
        </View>}

        {activeNav === 'Apply' && <View style={styles.jobsSection}>
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
          {jobsError ? <Text style={styles.libraryStatusError}>{jobsError}</Text> : null}
          {jobFeedStatus?.sourcesFailed.map((failure) => <Text key={failure.source} style={styles.libraryStatusError}>{failure.source}: {failure.message}</Text>)}
          {!isLoadingJobs && !jobsError && filteredJobGroups[activeTab].length === 0 ? <Text style={styles.libraryStatusText}>{jobGroups[activeTab].length ? `No jobs match “${jobSearchQuery}”.` : activeTab === 'Applied Jobs' ? 'You have not applied to any jobs yet.' : jobFeedStatus?.diagnostic || 'No verified job listings are currently available.'}</Text> : null}
          {!isLoadingJobs && !jobsError && filteredJobGroups[activeTab].map((job) => <MobileJobCard key={job.id} job={job} isApplied={activeTab === 'Applied Jobs'} onApply={applyToJob} />)}
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
          <ProfileDetailsSection title="Professional Info" fields={[
            ['Current industry', profile.currentIndustry], ['Department', profile.department], ['Current role', profile.currentRole], ['Current job title', profile.currentJobTitle], ['Notice period', profile.noticePeriod], ['DOB', profile.dateOfBirth], ['Address', profile.address],
          ]} onEdit={() => onEditProfileSection('professionalInfo')} />
          <ProfileDetailsSection title="Career Preferences" fields={[
            ['Preferred job role', profile.preferredJobRole], ['Preferred city', profile.preferredCity], ['Job type', profile.jobType], ['Employment type', profile.employmentType], ['Preferred shift', profile.preferredShift],
          ]} onEdit={() => onEditProfileSection('careerPreferences')} />
          <ProfileDetailsSection title="Key Skills Set" onEdit={() => onEditProfileSection('keySkillsSet')}><View style={styles.skillTiles}>{(profile.skills || []).map((skill) => <View style={styles.skillTile} key={skill}><Text style={styles.skillTileText}>{skill}</Text></View>)}</View></ProfileDetailsSection>
          <ProfileDetailsSection title="Employment Details" onEdit={() => onEditProfileSection('employmentDetails')}>{(profile.employmentDetails || []).map((employment, index) => <View style={styles.profileRecord} key={index}><Text style={styles.profileRecordTitle}>{employment.companyName || `Company ${index + 1}`}</Text><Text style={styles.profileRecordText}>{employment.jobTitle || 'Job title not added'} · {employment.employmentType || 'Employment type not added'} · CTC: {employment.ctc || 'Not added'}</Text><Text style={styles.profileRecordText}>{employment.joiningDate || 'Joining date not added'}{employment.isCurrent ? ' · Current' : employment.relievingDate ? ` to ${employment.relievingDate}` : ''}</Text><Text style={styles.profileRecordText}>Skills: {(employment.skills || []).join(', ') || 'Not added'} · Notice period: {employment.noticePeriod || 'Not added'}</Text><Text style={styles.profileRecordText}>{employment.jobProfile}</Text></View>)}{!profile.employmentDetails?.length && <Text style={styles.profileRecordText}>No employment details added.</Text>}</ProfileDetailsSection>
          <ProfileDetailsSection title="Major Projects" onEdit={() => onEditProfileSection('majorProjects')}>{(profile.majorProjects || []).map((project, index) => <View style={styles.profileRecord} key={index}><Text style={styles.profileRecordTitle}>{project.projectTitle || `Project ${index + 1}`}</Text><Text style={styles.profileRecordText}>{[project.companyName, project.clientName, project.status].filter(Boolean).join(' · ')}</Text><Text style={styles.profileRecordText}>{project.workedFrom || 'Start date not added'}{project.workedTill ? ` to ${project.workedTill}` : ''}</Text><Text style={styles.profileRecordText}>{project.projectDetails}</Text></View>)}{!profile.majorProjects?.length && <Text style={styles.profileRecordText}>No projects added.</Text>}</ProfileDetailsSection>
        </View>}

        {activeNav === 'Library' && <LibraryView />}

        {activeNav === 'Courses' && <CoursesView />}
      </ScrollView>
      <View style={styles.bottomNav}>
        {navigationItems.map((item) => {
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
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [profile, setProfile] = useState(defaultProfile);
  const [userEmail, setUserEmail] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [sectionToEdit, setSectionToEdit] = useState(null);
  const [landingNav, setLandingNav] = useState('Home');

  useEffect(() => {
    const loadAppState = async () => {
      try {
        const [stored, storedEmail] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(ACCOUNT_EMAIL_KEY),
        ]);
        if (storedEmail) setUserEmail(storedEmail);
        if (stored === 'existing-user') {
          setScreen('landing');
        } else if (stored === 'new-user') {
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
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(ACCOUNT_EMAIL_KEY);
      setScreen('login');
    } catch (error) {
      console.warn('Unable to clear user state', error);
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
    setProfile((currentProfile) => ({ ...currentProfile, photo, updatedAt: data.user?.updated_at || currentProfile.updatedAt }));
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
    setProfile((currentProfile) => ({ ...currentProfile, resume: data.resume, updatedAt: data.updated_at || currentProfile.updatedAt }));
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
    setProfile((currentProfile) => {
      const nextProfile = { ...currentProfile, updatedAt: data.updated_at || currentProfile.updatedAt };
      delete nextProfile.resume;
      return nextProfile;
    });
  };

  const persistProfile = async (nextProfile) => {
    const updatedAt = new Date().toISOString();
    const profileToSave = { ...nextProfile };
    delete profileToSave.updatedAt;
    setProfile({ ...nextProfile, updatedAt });
    if (!userEmail) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/profile`, {
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
        onLogin={async ({ user, profile: savedProfile, isFirstTime }) => {
          const accountEmail = user?.email || '';
          setUserEmail(accountEmail);
          if (accountEmail) await AsyncStorage.setItem(ACCOUNT_EMAIL_KEY, accountEmail);
          if (savedProfile && Object.keys(savedProfile).length > 0) {
            setProfile((currentProfile) => ({ ...currentProfile, ...savedProfile, email: user?.email || savedProfile.email || '', updatedAt: user?.updated_at || savedProfile.updatedAt || null }));
          } else {
            setProfile((currentProfile) => ({ ...currentProfile, email: user?.email || '', updatedAt: user?.updated_at || null }));
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
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
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  logoutButtonText: {
    color: '#b91c1c',
    fontSize: 17,
    fontWeight: '700',
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
  jobActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
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
    justifyContent: 'space-between',
    gap: 10,
  },
  jobMeta: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#dbe3ef',
    paddingTop: 8,
    paddingBottom: 6,
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
