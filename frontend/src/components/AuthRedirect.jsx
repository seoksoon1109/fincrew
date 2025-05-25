// src/components/AuthRedirect.jsx
import { Navigate } from 'react-router-dom'

export default function AuthRedirect({ isAuthenticated, children }) {
    if (isAuthenticated) {
        return <Navigate to="/" replace />
    }
    return children
}
