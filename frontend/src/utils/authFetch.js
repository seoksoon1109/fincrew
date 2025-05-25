// src/utils/authFetch.js

export async function authFetch(url, options = {}) {
    const access = localStorage.getItem('access');
    const refresh = localStorage.getItem('refresh');

    // access 토큰으로 요청을 보내는 함수
    const fetchWithAccess = async (token) => {
        const isFormData = options.body instanceof FormData;
        const headers = {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        };

        return fetch(url, { ...options, headers });
    };

    // 최초 요청
    let response = await fetchWithAccess(access);

    // access 토큰이 만료된 경우 refresh 시도
    if (response.status === 401 && refresh) {
        const refreshRes = await fetch('/api/auth/refresh/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });

        if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('access', data.access);

            // 갱신된 access 토큰으로 재요청
            response = await fetchWithAccess(data.access);
        } else {
            // refresh 토큰도 만료 → 로그아웃 처리 및 로그인 페이지 이동
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            window.location.href = '/auth';
            return Promise.reject(new Error('세션이 만료되었습니다.'));
        }
    }

    return response;
}
