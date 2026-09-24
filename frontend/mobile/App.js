import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { locationSuggestions } from '../shared/locations';
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

const getSalaryInputValue = (value = '') => value.replace(/^(INR|₹)\s*/i, '');

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
  expectedSalary: '₹24 LPA',
  experience: '5+ years',
  education: 'B.Tech in Computer Science',
  skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'SQL'],
  certifications: ['AWS Certified Developer', 'Google UX Design'],
  languages: ['English', 'Hindi'],
  location: 'Bengaluru, India',
  preferredLocation: 'Bengaluru, India',
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
    <View style={styles.locationField}>
      <Text style={styles.locationLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={(text) => { setQuery(text); onChange(text); }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 120)}
        placeholder="Start typing a city"
        placeholderTextColor="#8aa3c2"
      />
      {isFocused && suggestions.length > 0 && <ScrollView style={styles.locationSuggestions} nestedScrollEnabled>
        {suggestions.map((location) => <TouchableOpacity key={location} style={styles.locationSuggestion} onPressIn={() => selectLocation(location)}><Text style={styles.locationSuggestionText}>{location}</Text></TouchableOpacity>)}
      </ScrollView>}
    </View>
  );
}

function ProfileForm({ profile, onSave, onSkip, isEditing }) {
  const [form, setForm] = useState(profile);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <SafeAreaView style={styles.containerDark}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <Text style={styles.sectionHeading}>Complete your professional profile</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={(text) => updateField('name', text)} placeholder="Name" placeholderTextColor="#8aa3c2" />
          <TextInput style={styles.input} value={form.contact} onChangeText={(text) => updateField('contact', text)} placeholder="Contact" placeholderTextColor="#8aa3c2" />
          <LocationField label="Current location" value={form.location} onChange={(value) => updateField('location', value)} />
          <LocationField label="Preferred location" value={form.preferredLocation} onChange={(value) => updateField('preferredLocation', value)} />
          <View style={styles.salaryField}><Text style={styles.locationLabel}>Current salary</Text><View style={styles.salaryInput}><Text style={styles.salaryPrefix}>INR</Text><TextInput style={styles.salaryTextInput} value={getSalaryInputValue(form.currentSalary)} onChangeText={(text) => updateField('currentSalary', text ? `INR ${text}` : '')} placeholder="Enter amount" placeholderTextColor="#8aa3c2" /></View></View>
          <View style={styles.salaryField}><Text style={styles.locationLabel}>Expected salary</Text><View style={styles.salaryInput}><Text style={styles.salaryPrefix}>INR</Text><TextInput style={styles.salaryTextInput} value={getSalaryInputValue(form.expectedSalary)} onChangeText={(text) => updateField('expectedSalary', text ? `INR ${text}` : '')} placeholder="Enter amount" placeholderTextColor="#8aa3c2" /></View></View>
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
      <TextInput
        style={styles.librarySearch}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by topic, concept, or example"
        placeholderTextColor="#64748b"
      />

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

      {filteredTopics.length === 0 && <Text style={styles.emptyLibrary}>No testing topics match “{searchQuery}”.</Text>}
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
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCourses = courses.filter((course) => (
    [course.title, course.topic, course.provider, course.level, course.duration]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  ));

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

      <Text style={styles.coursesSearchLabel}>Search courses</Text>
      <TextInput
        style={styles.coursesSearch}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by skill, topic, or provider"
        placeholderTextColor="#64748b"
      />

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

      {filteredCourses.length === 0 && <Text style={styles.emptyLibrary}>No courses match “{searchQuery}”.</Text>}
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

        {activeNav === 'Profile' && <View style={styles.profileCard}>
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
        </View>}

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
        </View>}

        {activeNav === 'Profile' && <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileGrid}>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Name:</Text> {profile.name}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Contact:</Text> {profile.contact}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Current Salary:</Text> {profile.currentSalary}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Experience:</Text> {profile.experience}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Education:</Text> {profile.education}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Location:</Text> {profile.location}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Preferred Location:</Text> {profile.preferredLocation}</Text>
            <Text style={styles.profileDetail}><Text style={styles.detailLabel}>Expected Salary:</Text> {profile.expectedSalary}</Text>
            <Text style={[styles.profileDetail, styles.fullWidth]}><Text style={styles.detailLabel}>Skills:</Text> {profile.skills.join(', ')}</Text>
            <Text style={[styles.profileDetail, styles.fullWidth]}><Text style={styles.detailLabel}>Certifications:</Text> {profile.certifications.join(', ')}</Text>
            <Text style={[styles.profileDetail, styles.fullWidth]}><Text style={styles.detailLabel}>Languages:</Text> {profile.languages.join(', ')}</Text>
          </View>
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
  formScroll: {
    width: '100%',
  },
  formScrollContent: {
    flexGrow: 1,
    paddingVertical: 18,
    justifyContent: 'center',
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
  locationField: {
    position: 'relative',
    zIndex: 20,
    elevation: 20,
  },
  locationLabel: {
    color: '#dfeafc',
    fontWeight: '600',
    marginBottom: 8,
  },
  locationSuggestions: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    zIndex: 5,
    elevation: 25,
    maxHeight: 220,
    backgroundColor: '#fff',
    borderColor: '#d0dbe8',
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
  librarySection: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 24,
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
    color: '#111827',
    fontSize: 23,
    fontWeight: '900',
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
    fontWeight: '800',
  },
  librarySearchLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
  },
  librarySearch: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderColor: 'rgba(37,99,235,0.25)',
    borderWidth: 1,
    borderRadius: 12,
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
    backgroundColor: 'rgba(255,255,255,0.55)',
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
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderColor: 'rgba(15,23,42,0.08)',
    borderWidth: 1,
    borderRadius: 16,
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
    color: '#172638',
    fontSize: 17,
    fontWeight: '800',
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
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 24,
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
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 24,
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
    color: '#111827',
    fontSize: 23,
    fontWeight: '900',
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
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderColor: 'rgba(37,99,235,0.25)',
    borderWidth: 1,
    borderRadius: 12,
    color: '#172638',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
  },
  courseCard: {
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderColor: 'rgba(15,23,42,0.08)',
    borderWidth: 1,
    borderRadius: 16,
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
    color: '#172638',
    fontSize: 17,
    fontWeight: '800',
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
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  courseLinkText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '800',
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
