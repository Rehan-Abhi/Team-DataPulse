import { useState, useEffect } from 'react';
import { auth } from './firebase';
import api from './services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthUsage';
import './ProfileSetup.css';

function ProfileSetup() {
    const [university, setUniversity] = useState('');
    const [branch, setBranch] = useState('');
    const [semester, setSemester] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { refreshProfile } = useAuth();

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email) {
            const email = currentUser.email.toLowerCase();

            if (email.endsWith('@pec.edu.in')) {
                setUniversity('Punjab Engineering College');
            } else if (email.endsWith('@sgtuniversity.ac.in')) {
                setUniversity('SGT University');
            }

            if (email.includes('ece')) setBranch('ECE');
            else if (email.includes('cse')) setBranch('CSE');
            else if (email.includes('mech')) setBranch('Mechanical');
            else if (email.includes('civil')) setBranch('Civil');
        }
    }, [refreshProfile]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/users/profile', {
                university,
                branch,
                semester: parseInt(semester)
            });
            
            await refreshProfile();
            navigate('/dashboard');
        } catch (error) {
            console.error("Profile Update Error:", error);
            alert(`Failed to update profile. Server says: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-setup-container">
            <div className="profile-card">
                <div className="profile-header">
                    <h2>Complete Your Profile</h2>
                    <p className="profile-subtitle">We need a few more details to set up your account.</p>
                </div>
                
                <form className="profile-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>University</label>
                        <select 
                            value={university} 
                            onChange={(e) => setUniversity(e.target.value)}
                            required
                        >
                            <option value="">Select University</option>
                            <option value="Punjab Engineering College">Punjab Engineering College</option>
                            <option value="SGT University">SGT University</option>
                            <option value="Delhi University">Delhi University</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Branch</label>
                        <select 
                            value={branch} 
                            onChange={(e) => setBranch(e.target.value)}
                            required
                        >
                            <option value="">Select Branch</option>
                            <option value="CSE">Computer Science (CSE)</option>
                            <option value="ECE">Electronics (ECE)</option>
                            <option value="Mechanical">Mechanical</option>
                            <option value="Civil">Civil</option>
                            <option value="Electrical">Electrical</option>
                            <option value="Aerospace">Aerospace</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Semester</label>
                        <select 
                            value={semester} 
                            onChange={(e) => setSemester(e.target.value)}
                            required
                        >
                            <option value="">Select Semester</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" className="submit-button" disabled={loading}>
                        {loading ? "Saving..." : "Save Profile"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ProfileSetup;
