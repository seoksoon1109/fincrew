// src/components/ProtectedRoute.jsx

export default function ProtectedRoute({ children }) {
    // 이제 App.jsx에서 인증 여부를 판단했으므로
    // ProtectedRoute는 단순히 자식 컴포넌트 렌더링만 하면 됩니다.
    return children
}
