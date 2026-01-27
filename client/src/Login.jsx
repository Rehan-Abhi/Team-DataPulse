import { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useAuth } from './contexts/AuthUsage';
import api from './services/api';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { refreshProfile } = useAuth();

    const syncUser = async () => {
        try {
            // Token is auto-handled by api.js interceptor if auth.currentUser is set.
            // However, after login, there might be a split second delay before auth.currentUser is propagated?
            // Actually, firebase SDK updates it synchronously on sign-in success.
            // But to be safe/explicit for the very first sync, we can rely on interceptor OR pass manually.
            // Given api.js implementation, let's try relying on the interceptor.
            const res = await api.post('/users/sync');
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
            await syncUser();
            
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
            await syncUser();
            
            // Refresh context
            await refreshProfile();
             // Navigation handled by PublicRoute wrapper in App.jsx

        } catch (error) {
            console.error("Google Login Error:", error);
            alert("Google Sign-in Failed: " + error.message);
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