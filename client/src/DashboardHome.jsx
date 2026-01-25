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
            
            <div className="quick-links">
                <h3>Quick Links</h3>
                <p>Select a feature from the sidebar to get started.</p>
            </div>
        </div>
    );
}

export default DashboardHome;
