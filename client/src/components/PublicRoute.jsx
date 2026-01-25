import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthUsage';

export default function PublicRoute({ children }) {
    const { currentUser, isProfileComplete } = useAuth();

    if (currentUser) {
        if (isProfileComplete) {
            return <Navigate to="/dashboard" replace />;
        } else {
            return <Navigate to="/profile-setup" replace />;
        }
    }

    return children;
}
