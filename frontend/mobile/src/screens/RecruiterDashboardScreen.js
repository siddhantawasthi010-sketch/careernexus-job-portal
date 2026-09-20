import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const stats = [
  { label: 'Open Positions', value: '24' },
  { label: 'Interviews', value: '11' },
  { label: 'Shortlisted', value: '18' },
];

export default function RecruiterDashboardScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Recruiter Dashboard</Text>
      <Text style={styles.subheading}>Hiring overview</Text>

      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Recent Applicants</Text>
        <Text style={styles.listItem}>• Jane Doe — Frontend Developer</Text>
        <Text style={styles.listItem}>• Samir Khan — Product Designer</Text>
        <Text style={styles.listItem}>• Amelia Lee — Backend Engineer</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
    padding: 20,
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
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111c2f',
    padding: 16,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#20304d',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: '#bfd3ee',
    fontSize: 12,
    marginTop: 4,
  },
  panel: {
    backgroundColor: '#111c2f',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#20304d',
  },
  panelTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  listItem: {
    color: '#c9d8ef',
    fontSize: 15,
    marginBottom: 8,
  },
});
