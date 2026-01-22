import { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
             // Get the token to send to backend
            const token = await userCredential.user.getIdToken();
            console.log("Logged In! Token:", token);
            
            // Redirect to dashboard
            navigate('/dashboard');
            
        } catch (error) {
            alert(error.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const token = await result.user.getIdToken();
            console.log("Google User Token:", token);
            navigate('/dashboard');

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