import { Outlet, Link } from 'react-router-dom';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from './contexts/AuthUsage'; // Import from new hook file
import './Layout.css';

function Layout() {
  const { userProfile, currentUser } = useAuth(); // Get profile

  const handleLogout = async () => {
    await signOut(auth);
    // Navigation to /login is automatic via PrivateRoute
  };


  return (
    <div className="layout-container">
      <aside className="sidebar">
        <h2>My App</h2>
        
        {/* Profile Info */}
        <div className="sidebar-profile">
            {currentUser && <p className="user-email">{currentUser.email}</p>}
            {userProfile && userProfile.university && (
                <p className="user-uni">{userProfile.university}</p>
            )}
        </div>

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
