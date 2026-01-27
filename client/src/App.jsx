import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProfileSetup from './ProfileSetup';
import Auth from './Auth';
import Layout from './Layout';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';

import DashboardHome from './DashboardHome';
import Timetable from './Timetable';
import AttendanceTracker from './AttendanceTracker';
import TodoBoard from './TodoBoard';
import SGPACalculator from './SGPACalculator';
import FocusTimer from './FocusTimer';
import YourCollege from './YourCollege';
import SmartBudget from './components/SmartBudget';

function App() {

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Auth />
            </PublicRoute>
          } />
          
          <Route path="/profile-setup" element={
            <PrivateRoute requireProfile={false}>
              <ProfileSetup />
            </PrivateRoute>
          } />

          <Route path="/dashboard" element={
            <PrivateRoute requireProfile={true}>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<DashboardHome />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="attendance" element={<AttendanceTracker />} />
            <Route path="todos" element={<TodoBoard />} />
            <Route path="sgpa" element={<SGPACalculator />} />
            <Route path="focus" element={<FocusTimer />} />
            <Route path="college" element={<YourCollege />} />
            <Route path="budget" element={<SmartBudget />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
          
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;