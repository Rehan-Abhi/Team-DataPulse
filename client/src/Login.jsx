import { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useAuth } from './contexts/AuthUsage';
import api from './services/api';
import './Login.css';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { refreshProfile } = useAuth();

    const syncUser = async () => {
        try {
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
            await signInWithEmailAndPassword(auth, email, password);
            await syncUser();
            await refreshProfile();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            await syncUser();
            await refreshProfile();
        } catch (error) {
            console.error("Google Login Error:", error);
            alert("Google Sign-in Failed: " + error.message);
        }
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <p className="login-subtitle">Please enter your details</p>
                    <h2>Welcome back</h2>
                </div>
                
                <form className="login-form" onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>Email address</label>
                        <input 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="Enter your email" 
                            type="email"
                            required
                        />
                    </div>
                    
                    <div className="input-group">
                        <label>Password</label>
                        <input 
                            onChange={(e) => setPassword(e.target.value)} 
                            type="password" 
                            placeholder="Enter your password" 
                            required
                        />
                    </div>

                    <div className="form-actions">
                        <div className="remember-me">
                            <input type="checkbox" id="remember" />
                            <label htmlFor="remember" style={{marginBottom: 0}}>Remember for 30 days</label>
                        </div>
                        <a href="#" className="forgot-password">Forgot password</a>
                    </div>

                    <button type="submit" className="login-button">Sign in</button>
                </form>

                <button onClick={handleGoogleLogin} className="google-button">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{width: '20px', height: '20px'}} />
                    Sign in with Google
                </button>

                <div className="signup-link">
                    Don't have an account? <a href="/signup">Sign up</a>
                </div>
            </div>
        </div>
    );
}
export default Login;