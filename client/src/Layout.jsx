import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
// import { useAuth } from './contexts/AuthUsage';
import './Layout.css';

function Layout() {
  // const { userProfile, currentUser } = useAuth(); // Removed unused
  const [isOpen, setIsOpen] = useState(window.innerWidth > 768);

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
        <div className="flex justify-between items-center mb-4">
            <h2 className="m-0 text-xl font-bold">My App</h2>
            {/* Mobile Close Button */}
            <button 
                onClick={() => setIsOpen(false)}
                className="md:hidden text-gray-500 hover:text-red-500 text-2xl font-bold p-1"
                aria-label="Close Menu"
            >
                &times;
            </button>
        </div>
        
        {/* Profile Info Removed */ }
        
        <nav>
            <Link to="/dashboard" onClick={() => window.innerWidth <= 768 && setIsOpen(false)}>Dashboard</Link>
            <Link to="/dashboard/timetable" onClick={() => window.innerWidth <= 768 && setIsOpen(false)}>Timetable</Link>
            <Link to="/dashboard/attendance" onClick={() => window.innerWidth <= 768 && setIsOpen(false)}>Attendance</Link>
            <Link to="/dashboard/todos" onClick={() => window.innerWidth <= 768 && setIsOpen(false)}>Tasks</Link>
            <Link to="/dashboard/sgpa" onClick={() => window.innerWidth <= 768 && setIsOpen(false)}>SGPA Calculator</Link>
            <Link to="/dashboard/focus" onClick={() => window.innerWidth <= 768 && setIsOpen(false)}>Focus</Link>
            <Link to="/dashboard/budget" 
                onClick={() => window.innerWidth <= 768 && setIsOpen(false)}
                className={({ isActive }) => 
                `flex items-center gap-2 p-3 rounded-xl transition-all ${isActive ? 'bg-emerald-50 text-emerald-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`
            }>
                Smart Budgetor 💰
            </Link>
            <Link to="/dashboard/studio" 
                onClick={() => window.innerWidth <= 768 && setIsOpen(false)}
                className={({ isActive }) => 
                `flex items-center gap-2 p-3 rounded-xl transition-all ${isActive ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`
            }>
                DataPulse Studio 🎙️
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
