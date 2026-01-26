import { useState, useEffect } from 'react';
import { auth } from './firebase';
import api from './services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthUsage';

function ProfileSetup() {
    const [university, setUniversity] = useState('');
    const [branch, setBranch] = useState('');
    const [semester, setSemester] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { refreshProfile } = useAuth(); // Get refresh function

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email) {
            const email = currentUser.email.toLowerCase();

            // 1. Detect University
            if (email.endsWith('@pec.edu.in')) {
                setUniversity('Punjab Engineering College');
            } else if (email.endsWith('@sgtuniversity.ac.in')) {
                setUniversity('SGT University');
            }

            // 2. Detect Branch from username (e.g., rehanabhi.bt25ece)
            // Pattern: .bt<year><branch> or just <branch>
            // Simple check for now:
            if (email.includes('ece')) setBranch('ECE');
            else if (email.includes('cse')) setBranch('CSE');
            else if (email.includes('mech')) setBranch('Mechanical');
            else if (email.includes('civil')) setBranch('Civil');
        }
    }, [refreshProfile]); // Add dependency if needed, though usually stable

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/users/profile', {
                university,
                branch,
                semester: parseInt(semester)
            });
            
            // Update context so it knows we are now complete
            await refreshProfile();

            // Redirect to dashboard on success
            navigate('/dashboard');
        } catch (error) {
            console.error("Profile Update Error:", error);
            console.error("Profile Update Error:", error);
            alert(`Failed to update profile. Server says: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-setup-container">
            <h2>Complete Your Profile</h2>
            <p>We need a few more details to set up your account.</p>
            
            <form onSubmit={handleSubmit}>
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

                <button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Profile"}
                </button>
            </form>
        </div>
    );
}

export default ProfileSetup;
