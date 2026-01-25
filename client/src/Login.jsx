import { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useAuth } from './contexts/AuthUsage';
import axios from 'axios';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { refreshProfile } = useAuth();

    const syncUser = async (token) => {
        try {
            const res = await axios.post('http://localhost:5000/api/users/sync', {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return res.data;
        } catch (error) {
            console.error("Sync Error:", error);
            alert("Login successful, but server sync failed.");
            return null;
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
             // Get the token to send to backend
            const token = await userCredential.user.getIdToken();
            console.log("Logged In! Token:", token);
            
            // Sync user to ensure MongoDB record exists
            await syncUser(token);
            
            // Refresh context to update 'isProfileComplete' state
            await refreshProfile();
            // Navigation handled by PublicRoute wrapper in App.jsx
            
        } catch (error) {
            alert(error.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const token = await result.user.getIdToken();
            console.log("Google User Token:", token);
            
            // Sync user
            await syncUser(token);
            
            // Refresh context
            await refreshProfile();
             // Navigation handled by PublicRoute wrapper in App.jsx

        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
                <input onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                <input onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Pass" />
                <button type="submit">Login</button>
            </form>
            <button onClick={handleGoogleLogin}>Sign in with Google</button>
        </div>
    );
}
export default Login;