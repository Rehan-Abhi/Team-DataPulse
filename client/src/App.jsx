import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProfileSetup from './ProfileSetup';
import Auth from './Auth';
import Layout from './Layout';

import DashboardHome from './DashboardHome';
import Timetable from './Timetable';
import AttendanceTracker from './AttendanceTracker';
import TodoBoard from './TodoBoard';
import SGPACalculator from './SGPACalculator';
import FocusTimer from './FocusTimer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<DashboardHome />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="attendance" element={<AttendanceTracker />} />
          <Route path="todos" element={<TodoBoard />} />
          <Route path="sgpa" element={<SGPACalculator />} />
          <Route path="focus" element={<FocusTimer />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;