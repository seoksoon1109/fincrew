import { Navigate } from 'react-router-dom'

export default function AuthRedirect({ children }) {
    const token = localStorage.getItem('access')
    return token ? <Navigate to="/" replace /> : children
}
