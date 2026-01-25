import { Outlet, Link, useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import './Layout.css';

function Layout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <h2>My App</h2>
        <nav>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/dashboard/timetable">Timetable</Link>
            <Link to="/dashboard/attendance">Attendance</Link>
            <Link to="/dashboard/todos">Tasks</Link>
            <Link to="/dashboard/sgpa">SGPA Calculator</Link>
            <Link to="/dashboard/focus">Focus</Link>
        </nav>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
