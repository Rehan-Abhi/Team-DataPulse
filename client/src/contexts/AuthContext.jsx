import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import api from '../services/api'; // Import api service
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
                    // api.js interceptor handles the token automatically
                    const response = await api.get('/users/profile');
                    
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
                try {
                    const response = await api.get('/users/profile');
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
