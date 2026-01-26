import { useState, useEffect } from 'react';
import api from './services/api';
import { Link } from 'react-router-dom';
import { auth } from './firebase';

function DashboardHome() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                try {
                    // api.js handles token automatically
                    const res = await api.get('/users/profile');
                    setUser(res.data);
                } catch (error) {
                    console.error("Error fetching profile:", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) return <div>Loading profile...</div>;

    if (!user) return (
        <div>
            <h2>Welcome! Please complete your profile.</h2>
            <Link to="/profile-setup">Go to Profile Setup</Link>
        </div>
    );

    return (
        <div className="dashboard-home">
            <h1>Welcome, {user.displayName || 'Student'}!</h1>
            <div className="profile-card">
                <h3>Your Profile</h3>
                <p><strong>University:</strong> {user.university}</p>
                <p><strong>Branch:</strong> {user.branch}</p>
                <p><strong>Semester:</strong> {user.semester}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <Link to="/dashboard/college" className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg text-white hover:scale-105 transition-transform">
                    <h3 className="text-2xl font-bold mb-2">🏛️ Your College Hub</h3>
                    <p className="opacity-90">Access Library, Friends, and Roadmap for {user.university}</p>
                </Link>

                <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="flex gap-4 flex-wrap">
                        <Link to="/dashboard/todos" className="text-blue-600 hover:underline">Manage Tasks</Link>
                        <Link to="/dashboard/timetable" className="text-blue-600 hover:underline">View Schedule</Link>
                        <Link to="/dashboard/focus" className="text-blue-600 hover:underline">Start Focus</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardHome;
