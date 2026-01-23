import { useState } from 'react';
import { auth } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

import axios from 'axios';

function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Registered! User:", userCredential.user);
            
            // Sync with backend (Non-blocking)
            try {
                const token = await userCredential.user.getIdToken();
                await axios.post('http://localhost:5000/api/users/sync', {}, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            } catch (syncError) {
                console.error("Backend Sync Error (Non-fatal):", syncError);
                // Continue to profile setup even if sync fails
            }

            navigate('/profile-setup');
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
