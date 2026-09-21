import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  Alert,
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

const getApiBaseUrl = () => {
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
  name: 'Siddhant Awasthi',
  photo: 'SA',
  contact: '+91 98765 43210',
  currentSalary: '₹18 LPA',
  experience: '5+ years',
  education: 'B.Tech in Computer Science',
  skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'SQL'],
  certifications: ['AWS Certified Developer', 'Google UX Design'],
  languages: ['English', 'Hindi'],
  location: 'Bengaluru, India',
};

const jobs = [
  { id: 1, title: 'Senior Frontend Developer', company: 'NovaLabs', location: 'Remote', type: 'Full-time', salary: '₹18 - 22 LPA', group: 'Applied Jobs' },
  { id: 2, title: 'Backend Engineer', company: 'Streamline AI', location: 'Bengaluru', type: 'Full-time', salary: '₹20 - 28 LPA', group: 'Recommended Jobs' },
  { id: 3, title: 'React Native Developer', company: 'Motive Studio', location: 'Hyderabad', type: 'Contract', salary: '₹14 - 18 LPA', group: 'Saved Jobs' },
  { id: 4, title: 'Product Analyst', company: 'Invenio', location: 'Pune', type: 'Hybrid', salary: '₹15 - 19 LPA', group: 'Recommended Jobs' },
];

const tabs = ['Applied Jobs', 'Recommended Jobs', 'Saved Jobs'];
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

  const handleSendOtp = async () => {
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
    } catch (error) {
      const fallbackStatus = await AsyncStorage.getItem(STORAGE_KEY);
      const shouldUseFallback = fallbackStatus === 'new-user' || !fallbackStatus;
      setMessage('Backend unavailable. Falling back to local onboarding flow.');
      setOtpSent(true);
      if (shouldUseFallback) {
        await AsyncStorage.setItem(STORAGE_KEY, 'new-user');
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, 'existing-user');
      }
    } finally {
      setLoadingOtp(false);
    }
  };

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
      <StatusBar barStyle="light-content" />
      <View style={styles.loginCard}>
        <Text style={styles.logoText}>JOB PORTAL</Text>
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
            <Text style={styles.roleText}>Recruiter</Text>
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
            <Text style={styles.roleText}>Candidate</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={role === 'recruiter' ? 'recruiter@jobportal.com' : 'candidate@jobportal.com'}
          placeholderTextColor="#8aa3c2"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TouchableOpacity style={[styles.primaryButton, styles.loginButton]} onPress={handleSendOtp} disabled={loadingOtp}>
          <Text style={styles.primaryButtonText}>{loadingOtp ? 'Sending...' : 'Send OTP'}</Text>
        </TouchableOpacity>

        {message ? <Text style={styles.successText}>{message}</Text> : null}

        {otpSent && (
          <>
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor="#8aa3c2"
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleVerifyOtp} disabled={loadingVerify}>
              <Text style={styles.primaryButtonText}>{loadingVerify ? 'Verifying...' : 'Submit'}</Text>
            </TouchableOpacity>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

function ProfileForm({ profile, onSave, onSkip, isEditing }) {
  const [form, setForm] = useState(profile);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <SafeAreaView style={styles.containerDark}>
      <StatusBar barStyle="light-content" />
      <View style={styles.formCard}>
        <Text style={styles.sectionHeading}>Complete your professional profile</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(text) => updateField('name', text)} placeholder="Name" placeholderTextColor="#8aa3c2" />
        <TextInput style={styles.input} value={form.contact} onChangeText={(text) => updateField('contact', text)} placeholder="Contact" placeholderTextColor="#8aa3c2" />
        <TextInput style={styles.input} value={form.location} onChangeText={(text) => updateField('location', text)} placeholder="Current location" placeholderTextColor="#8aa3c2" />
        <TextInput style={styles.input} value={form.currentSalary} onChangeText={(text) => updateField('currentSalary', text)} placeholder="Current salary" placeholderTextColor="#8aa3c2" />
        <TextInput style={styles.input} value={form.experience} onChangeText={(text) => updateField('experience', text)} placeholder="Experience" placeholderTextColor="#8aa3c2" />
        <TextInput style={styles.input} value={form.education} onChangeText={(text) => updateField('education', text)} placeholder="Education" placeholderTextColor="#8aa3c2" />
        <TextInput style={styles.input} value={form.skills.join(', ')} onChangeText={(text) => updateField('skills', text.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="Skills" placeholderTextColor="#8aa3c2" />
        <TextInput style={styles.input} value={form.certifications.join(', ')} onChangeText={(text) => updateField('certifications', text.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="Certifications" placeholderTextColor="#8aa3c2" />
        <TextInput style={styles.input} value={form.languages.join(', ')} onChangeText={(text) => updateField('languages', text.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="Languages" placeholderTextColor="#8aa3c2" />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onSkip}><Text style={styles.secondaryButtonText}>Later</Text></TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => onSave(form)}><Text style={styles.primaryButtonText}>{isEditing ? 'Update profile' : 'Create profile'}</Text></TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function HomeDashboard({ profile, onUpdateProfile, onLogout, onUpdateProfilePicture }) {
  const [activeTab, setActiveTab] = useState('Applied Jobs');
  const [activeNav, setActiveNav] = useState('Home');
  const [selectedPhoto, setSelectedPhoto] = useState(profile.photo);

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
        setSelectedPhoto(photoUri);
        onUpdateProfilePicture(photoUri);
      }
    } catch (error) {
      Alert.alert('Unable to select photo', 'Please try selecting your profile picture again.');
      console.warn('Unable to select profile picture', error);
    }
  };

  const jobGroups = useMemo(
    () => ({
      'Applied Jobs': jobs.filter((job) => job.group === 'Applied Jobs'),
      'Recommended Jobs': jobs.filter((job) => job.group === 'Recommended Jobs'),
      'Saved Jobs': jobs.filter((job) => job.group === 'Saved Jobs'),
    }),
    []
  );

  return (
    <SafeAreaView style={styles.homeScreen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutButtonText}>Log out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarWrap} onPress={editProfilePicture}>
            <View style={styles.avatar}>
              {isProfileImageUri(selectedPhoto) ? (
                <Image source={{ uri: selectedPhoto }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <Text style={styles.avatarText}>{selectedPhoto || 'SA'}</Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={editProfilePicture}>
            <Text style={styles.editPhotoText}>Edit profile picture</Text>
          </TouchableOpacity>
          <Text style={styles.profileScore}>100%</Text>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.metaText}>Updated 1 week ago</Text>
          <TouchableOpacity style={styles.updateButton} onPress={onUpdateProfile}>
            <Text style={styles.updateButtonText}>Update Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
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
        </View>

        <View style={styles.jobsSection}>
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

          {jobGroups[activeTab].map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={styles.jobTitleBlock}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobCompany}>{job.company}</Text>
                </View>
                <View style={styles.jobPill}><Text style={styles.jobPillText}>{job.type}</Text></View>
              </View>
              <View style={styles.jobMetaRow}>
                <Text style={styles.jobMeta}>{job.location}</Text>
                <Text style={styles.jobMeta}>{job.salary}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileGrid}>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Name:</Text> {profile.name}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Contact:</Text> {profile.contact}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Current Salary:</Text> {profile.currentSalary}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Experience:</Text> {profile.experience}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Education:</Text> {profile.education}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Location:</Text> {profile.location}</Text>
            <Text style={[styles.profileDetail, styles.fullWidth]}><Text style={styles.detailLabel}>Skills:</Text> {profile.skills.join(', ')}</Text>
            <Text style={[styles.profileDetail, styles.fullWidth]}><Text style={styles.detailLabel}>Certifications:</Text> {profile.certifications.join(', ')}</Text>
            <Text style={[styles.profileDetail, styles.fullWidth]}><Text style={styles.detailLabel}>Languages:</Text> {profile.languages.join(', ')}</Text>
          </View>
        </View>
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
                if (item.label === 'Profile') onUpdateProfile();
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

  useEffect(() => {
    const loadAppState = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
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
      setScreen('login');
    } catch (error) {
      console.warn('Unable to clear user state', error);
    }
  };

  const updateProfilePicture = (photo) => {
    const nextProfile = { ...profile, photo };
    setProfile(nextProfile);
    persistProfile(nextProfile);
  };

  const persistProfile = async (nextProfile) => {
    setProfile(nextProfile);
    if (!userEmail) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, profile: nextProfile }),
      });
      if (!response.ok) throw new Error('Unable to save profile');
    } catch (error) {
      console.warn('Unable to persist profile', error);
    }
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.containerDark}>
        <StatusBar barStyle="light-content" />
      </SafeAreaView>
    );
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        onLogin={async ({ user, profile: savedProfile, isFirstTime }) => {
          setUserEmail(user?.email || '');
          if (savedProfile && Object.keys(savedProfile).length > 0) {
            setProfile((currentProfile) => ({ ...currentProfile, ...savedProfile }));
          }
          if (isFirstTime) {
            await markUserAsNew();
            setIsEditingProfile(false);
            setScreen('profile-form');
            return;
          }

          await markUserAsExisting();
          setScreen('landing');
        }}
      />
    );
  }

  if (screen === 'profile-form') {
    return (
      <ProfileForm
        profile={profile}
        isEditing={isEditingProfile}
        onSave={async (nextProfile) => {
          await persistProfile(nextProfile);
          await markUserAsExisting();
          setIsEditingProfile(false);
          setScreen('landing');
        }}
        onSkip={async () => {
          await markUserAsExisting();
          setIsEditingProfile(false);
          setScreen('landing');
        }}
      />
    );
  }

  return (
    <HomeDashboard
      profile={profile}
      onUpdateProfilePicture={updateProfilePicture}
      onUpdateProfile={() => {
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
    backgroundColor: '#0b1220',
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    backgroundColor: '#111c2f',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#20304d',
  },
  sectionHeading: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  loginCard: {
    backgroundColor: '#111c2f',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#20304d',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  logoText: {
    color: '#7cc4ff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#bfd3ee',
    fontSize: 16,
    marginBottom: 18,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#0e1a2d',
    borderWidth: 1,
    borderColor: '#20304d',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#60a5fa',
  },
  roleText: {
    color: '#fff',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0e1a2d',
    borderColor: '#20304d',
    borderWidth: 1,
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
  },
  loginButton: {
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
    flex: 0,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    marginTop: 8,
  },
  successText: {
    color: '#86efac',
    fontSize: 14,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4b6cb7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#dbeafe',
    fontWeight: '700',
    fontSize: 15,
  },
  homeScreen: {
    flex: 1,
    backgroundColor: '#f1ead2',
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
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarWrap: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 5,
    borderColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: 'hidden',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 65,
  },
  editPhotoText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  profileScore: {
    backgroundColor: '#fff',
    color: '#111827',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  profileName: {
    color: '#111827',
    fontSize: 33,
    fontWeight: '800',
    marginBottom: 4,
  },
  metaText: {
    color: '#475569',
    fontSize: 16,
    fontStyle: 'italic',
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
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 18,
    padding: 18,
    minHeight: 120,
  },
  statNumber: {
    color: '#111827',
    fontSize: 36,
    fontWeight: '900',
  },
  statLabel: {
    color: '#334155',
    fontSize: 17,
    marginTop: 8,
  },
  statMeta: {
    color: '#64748b',
    marginTop: 6,
    fontSize: 13,
  },
  jobsSection: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 24,
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
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  linkText: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },
  tabScroll: {
    marginBottom: 14,
  },
  tabContainer: {
    gap: 8,
    paddingRight: 10,
  },
  tabButton: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
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
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
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
  profileSection: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 24,
    padding: 16,
  },
  profileGrid: {
    marginTop: 10,
  },
  profileDetail: {
    color: '#1f2937',
    fontSize: 15,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
  },
  detailLabel: {
    fontWeight: '700',
  },
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
