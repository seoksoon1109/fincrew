// src/utils/authFetch.js

export async function authFetch(url, options = {}) {
    const access = localStorage.getItem('access');
    const refresh = localStorage.getItem('refresh');

    const fetchWithAccess = async (token) => {
        const headers = {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        };

        // 👉 Content-Type은 FormData일 경우 생략해야 함
        const isFormData = options.body instanceof FormData;
        if (!isFormData && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        return fetch(url, { ...options, headers });
    };

    let response = await fetchWithAccess(access);

    // 토큰 만료시 refresh 시도
    if (response.status === 401 && refresh) {
        const refreshRes = await fetch('/api/auth/refresh/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });

        if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('access', data.access);

            // access 갱신 후 재요청
            response = await fetchWithAccess(data.access);
        } else {
            // refresh도 만료 → 로그아웃 처리
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            window.location.href = '/login';
            return Promise.reject(new Error('세션이 만료되었습니다.'));
        }
    }

    return response;
}
