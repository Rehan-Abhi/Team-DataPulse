import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
// import { useAuth } from './contexts/AuthUsage';
import './Layout.css';

function Layout() {
  // const { userProfile, currentUser } = useAuth(); // Removed unused
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="layout-container">
      {/* Floating Toggle Button */}
      <button 
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Sidebar"
      >
        {isOpen ? '◀' : '▶'}
      </button>

      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <h2>My App</h2>
        
        {/* Profile Info Removed */ }
        <div className="mb-4"></div>

        <nav>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/dashboard/timetable">Timetable</Link>
            <Link to="/dashboard/attendance">Attendance</Link>
            <Link to="/dashboard/todos">Tasks</Link>
            <Link to="/dashboard/sgpa">SGPA Calculator</Link>
            <Link to="/dashboard/focus">Focus</Link>
            <Link to="/dashboard/budget" className={({ isActive }) => 
                `flex items-center gap-2 p-3 rounded-xl transition-all ${isActive ? 'bg-emerald-50 text-emerald-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`
            }>
                Smart Budgetor 💰
            </Link>
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
