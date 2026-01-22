import { useState } from 'react';
import { auth } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Registered! User:", userCredential.user);
            // You can also get the token here if needed
            // const token = await userCredential.user.getIdToken();
            navigate('/dashboard');
        } catch (error) {
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
