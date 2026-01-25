import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import AuthContext from './AuthUsage'; // Import the context

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isProfileComplete, setIsProfileComplete] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            
            if (user) {
                try {
                    const token = await user.getIdToken();
                    const response = await axios.get('http://localhost:5000/api/users/profile', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    if (response.data) {
                        setUserProfile(response.data);
                        if (response.data.university && response.data.branch && response.data.semester) {
                            setIsProfileComplete(true);
                        } else {
                            setIsProfileComplete(false);
                        }
                    } else {
                        setIsProfileComplete(false);
                    }
                } catch (error) {
                    console.error("Error fetching profile in AuthContext:", error);
                    setIsProfileComplete(false);
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
                setIsProfileComplete(false);
            }
            
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userProfile,
        isProfileComplete,
        loading,
        refreshProfile: async () => {
            if (currentUser) {
                const token = await currentUser.getIdToken();
                try {
                     const response = await axios.get('http://localhost:5000/api/users/profile', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setUserProfile(response.data);
                    if (response.data.university && response.data.branch && response.data.semester) {
                        setIsProfileComplete(true);
                    }
                } catch (e) { console.error(e); }
            }
        }
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
