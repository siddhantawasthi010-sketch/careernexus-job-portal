import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

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

export default function JobsScreen({ navigation, route }) {
  const [jobs, setJobs] = useState(fallbackJobs);
  const role = route?.params?.user?.role || 'recruiter';
  const isCandidate = role === 'candidate';

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/jobs`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setJobs(data);
        }
      } catch (error) {
        console.warn('Using fallback jobs data:', error.message);
      }
    };

    loadJobs();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>{isCandidate ? 'Candidate Jobs' : 'Jobs'}</Text>
          <Text style={styles.subheading}>
            {isCandidate ? 'Explore roles that match your profile' : 'Recommended roles for your team'}
          </Text>
        </View>

        {!isCandidate && (
          <TouchableOpacity
            style={styles.dashboardButton}
            onPress={() => navigation?.navigate?.('RecruiterDashboard')}
          >
            <Text style={styles.dashboardButtonText}>Recruiter Dashboard</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (!isCandidate) navigation?.navigate?.('RecruiterDashboard');
            }}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.company}>{item.company}</Text>
            <Text style={styles.meta}>{item.location} • {item.type}</Text>
            <Text style={styles.salary}>{item.salary}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  heading: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 4,
  },
  subheading: {
    color: '#bfd3ee',
    fontSize: 14,
    marginBottom: 0,
  },
  dashboardButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dashboardButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#111c2f',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#20304d',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  company: {
    color: '#7cc4ff',
    fontSize: 15,
    marginBottom: 4,
  },
  meta: {
    color: '#c9d8ef',
    fontSize: 14,
    marginBottom: 6,
  },
  salary: {
    color: '#9ae6b4',
    fontWeight: '700',
  },
});
