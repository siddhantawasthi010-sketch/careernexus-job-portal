import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('recruiter@jobportal.com');
  const [password, setPassword] = useState('recruiter123');
  const [role, setRole] = useState('recruiter');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      navigation.navigate(data.user.role === 'candidate' ? 'CandidateJobs' : 'Jobs', {
        user: data.user,
      });
    } catch (error) {
      Alert.alert('Login failed', error.message || 'Could not log in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.logo}>JOB PORTAL</Text>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Choose your role and sign in</Text>

      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[styles.roleButton, role === 'recruiter' && styles.roleButtonActive]}
          onPress={() => {
            setRole('recruiter');
            setEmail('recruiter@jobportal.com');
            setPassword('recruiter123');
          }}
        >
          <Text style={styles.roleText}>Recruiter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleButton, role === 'candidate' && styles.roleButtonActive]}
          onPress={() => {
            setRole('candidate');
            setEmail('candidate@jobportal.com');
            setPassword('candidate123');
          }}
        >
          <Text style={styles.roleText}>Candidate</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder={role === 'recruiter' ? 'recruiter@jobportal.com' : 'candidate@jobportal.com'}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor="#8aa3c2"
      />

      <TextInput
        style={styles.input}
        placeholder={role === 'recruiter' ? 'recruiter123' : 'candidate123'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#8aa3c2"
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0b1220',
    justifyContent: 'center',
    padding: 24,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#111c2f',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#20304d',
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
  logo: {
    color: '#7cc4ff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 1,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#bfd3ee',
    fontSize: 16,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#111c2f',
    borderColor: '#20304d',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
