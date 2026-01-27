import { useState } from 'react';
import { auth } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from './contexts/AuthUsage';
import api from './services/api';

function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { refreshProfile } = useAuth();
    // No manual navigation; PublicRoute wrapper handles it once state updates

    const handleSignup = async (e) => {
        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(auth, email, password);
             // console.log("Registered! User:", userCredential.user);
            
            // Sync with backend (Non-blocking but we should wait before refresh)
            // Even if sync fails, AuthContext will eventualy catch up or we retry later
            // But best to wait for at least an attempt
            try {
                await api.post('/users/sync');
            } catch (syncError) {
                console.error("Backend Sync Error (Non-fatal):", syncError);
                // Continue to profile setup even if sync fails
            }

            // Trigger context refresh so it knows we have a user (and maybe a profile from sync)
            await refreshProfile();

        } catch (error) {
            console.error("Signup Error:", error);
            alert(error.message);
        }
    };

    return (
        <div>
            <h2>Sign Up</h2>
            <form onSubmit={handleSignup}>
                <input onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                <input onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Pass" />
                <button type="submit">Sign Up</button>
            </form>
        </div>
    );
}

export default Signup;
