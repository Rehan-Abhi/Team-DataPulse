import { useState } from 'react';
import Login from './Login';
import Signup from './Signup';
import './App.css'; // Keep the existing styles

function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="App">
      <h1>My App</h1>
      {isLogin ? <Login /> : <Signup />}
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Need to Sign Up?" : "Already have an account? Login"}
      </button>
    </div>
  );
}

export default Auth;
