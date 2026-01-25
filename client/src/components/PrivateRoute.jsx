import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthUsage';

export default function PrivateRoute({ children, requireProfile = true }) {
    const { currentUser, isProfileComplete } = useAuth();

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (requireProfile && !isProfileComplete) {
        return <Navigate to="/profile-setup" replace />;
    }

    return children;
}
