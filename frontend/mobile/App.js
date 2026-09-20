import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import JobsScreen from './src/screens/JobsScreen';
import RecruiterDashboardScreen from './src/screens/RecruiterDashboardScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" options={{ headerShown: false }}>
          {(props) => <LoginScreen {...props} />}
        </Stack.Screen>

        <Stack.Screen
          name="Jobs"
          options={{ title: 'Jobs', headerStyle: { backgroundColor: '#0b1220' }, headerTintColor: '#fff' }}
        >
          {(props) => <JobsScreen {...props} />}
        </Stack.Screen>

        <Stack.Screen
          name="CandidateJobs"
          options={{ title: 'Candidate Jobs', headerStyle: { backgroundColor: '#0b1220' }, headerTintColor: '#fff' }}
        >
          {(props) => <JobsScreen {...props} />}
        </Stack.Screen>

        <Stack.Screen
          name="RecruiterDashboard"
          component={RecruiterDashboardScreen}
          options={{
            title: 'Dashboard',
            headerStyle: { backgroundColor: '#0b1220' },
            headerTintColor: '#fff',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
