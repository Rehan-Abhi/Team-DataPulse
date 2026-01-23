import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProfileSetup from './ProfileSetup';
import Auth from './Auth';
import Layout from './Layout';

import DashboardHome from './DashboardHome';
import Timetable from './Timetable';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<DashboardHome />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="sgpa" element={<h2>SGPA Calculator (Coming Soon)</h2>} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;