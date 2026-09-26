import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('recruiter@jobportal.com');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [role, setRole] = useState('recruiter');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSendOtp = async (isResend = false) => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }

    if (isResend) {
      setResendingOtp(true);
    } else {
      setSendingOtp(true);
    }

    try {
      const endpoint = isResend ? `${API_BASE_URL}/auth/resend-otp` : `${API_BASE_URL}/auth/send-otp`;
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
      setResendCooldown(30);
      Alert.alert('OTP sent', data.message || 'A one-time password has been sent to your email.');
    } catch (error) {
      setOtpSent(false);
      Alert.alert('Failed', error.message || 'Could not send OTP.');
    } finally {
      setSendingOtp(false);
      setResendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Enter OTP', 'Please enter the OTP sent to your email.');
      return;
    }

    setVerifyingOtp(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      navigation.navigate(data.user.role === 'candidate' ? 'CandidateJobs' : 'Jobs', {
        user: data.user,
      });
    } catch (error) {
      Alert.alert('Verification failed', error.message || 'Could not verify OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.logo}>CareerNexus</Text>
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

      <TouchableOpacity style={styles.button} onPress={() => handleSendOtp(false)} disabled={sendingOtp}>
        <Text style={styles.buttonText}>{sendingOtp ? 'Sending OTP...' : 'Send OTP'}</Text>
      </TouchableOpacity>

      {otpSent && (
        <>
          <TouchableOpacity
            style={[styles.secondaryButton, resendCooldown > 0 && styles.secondaryButtonDisabled]}
            onPress={() => handleSendOtp(true)}
            disabled={resendingOtp || resendCooldown > 0}
          >
            <Text style={styles.buttonText}>
              {resendingOtp ? 'Resending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            placeholderTextColor="#8aa3c2"
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleVerifyOtp} disabled={verifyingOtp}>
            <Text style={styles.buttonText}>{verifyingOtp ? 'Verifying...' : 'Submit'}</Text>
          </TouchableOpacity>
        </>
      )}
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
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#16a34a',
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
