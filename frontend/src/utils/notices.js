import { authFetch } from '../utils/authFetch';

export const fetchNotices = () => {
    return authFetch('/api/notices/')  // 실제 API 경로에 맞춰 수정
        .then(res => {
            if (!res.ok) {
                throw res;
            }
            return res.json();
        });
};

export const fetchNotice = id =>
    authFetch(`/api/notices/${id}/`).then(res => res.json());

export const createNotice = formData =>
    authFetch('/api/notices/', {
        method: 'POST',
        body: formData,
    });

export const updateNotice = (id, formData) =>
    authFetch(`/api/notices/${id}/`, {
        method: 'PUT',
        body: formData,
    });