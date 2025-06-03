export async function authFetch(url, options = {}) {
    const access = localStorage.getItem('access');
    const refresh = localStorage.getItem('refresh');

    console.log('[authFetch] 요청 URL:', url);
    console.log('[authFetch] access:', access);
    console.log('[authFetch] refresh:', refresh);

    if (!access) {
        console.warn('[authFetch] Access 토큰 없음 → 로그인 페이지로 이동');
        localStorage.removeItem('refresh');
        window.location.href = '/auth';
        return Promise.reject(new Error('Access 토큰이 없습니다.'));
    }

    const fetchWithAccess = async (token) => {
        const isFormData = options.body instanceof FormData;
        const headers = {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        };

        console.log('[authFetch] 최종 요청 헤더:', headers);

        return fetch(url, { ...options, headers });
    };

    let response = await fetchWithAccess(access);

    console.log('[authFetch] 첫 요청 응답 상태:', response.status);

    if (response.status === 401 && refresh) {
        console.warn('[authFetch] 401 → 리프레시 시도');

        const refreshRes = await fetch('/api/auth/refresh/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });

        console.log('[authFetch] 리프레시 응답 상태:', refreshRes.status);

        if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('access', data.access);
            console.log('[authFetch] 리프레시 성공 → 새 access 토큰 저장 후 재요청');

            response = await fetchWithAccess(data.access);
            console.log('[authFetch] 재요청 응답 상태:', response.status);
        } else {
            console.error('[authFetch] 리프레시 실패 → 로그아웃 처리');
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            window.location.href = '/auth';
            return Promise.reject(new Error('세션이 만료되었습니다.'));
        }
    }

    return response;
}
