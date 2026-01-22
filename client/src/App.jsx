import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './Auth';
import Layout from './Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<h2>Welcome to your Dashboard! Select a feature from the sidebar.</h2>} />
          <Route path="timetable" element={<h2>Timetable Feature (Coming Soon)</h2>} />
          <Route path="sgpa" element={<h2>SGPA Calculator (Coming Soon)</h2>} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;