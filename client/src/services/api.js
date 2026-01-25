import axios from 'axios';
import { auth } from '../firebase';

// Create an Axios instance
const api = axios.create({
    // Use VITE_API_URL if set (Production), otherwise default to localhost (Development)
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// Request Interceptor: Automatically add Firebase Token to every request
api.interceptors.request.use(async (config) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            const token = await currentUser.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
            console.error("Error getting auth token", error);
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
