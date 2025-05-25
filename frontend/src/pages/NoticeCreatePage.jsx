import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';

export default function NoticeCreatePage() {
    const [form, setForm] = useState({ title: '', content: '', attachment: null });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'attachment') {
            setForm(prev => ({ ...prev, attachment: files[0] }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.title.trim() || !form.content.trim()) {
            setError('제목과 내용을 입력해주세요.');
            return;
        }

        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('content', form.content);
        if (form.attachment) formData.append('attachment', form.attachment);

        try {
            const res = await authFetch('/api/notices/', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('등록 실패');

            navigate('/notices');
        } catch (err) {
            console.error('❌ 등록 실패:', err);
            setError('공지 등록에 실패했습니다.');
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
            <h1 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>📝 공지 작성</h1>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ fontWeight: '600' }}>제목</label>
                <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="제목을 입력하세요"
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
                />

                <label style={{ fontWeight: '600' }}>내용</label>
                <textarea
                    name="content"
                    value={form.content}
                    onChange={handleChange}
                    placeholder="내용을 입력하세요"
                    rows={8}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
                />

                <label style={{ fontWeight: '600' }}>첨부파일 (선택)</label>
                <input
                    name="attachment"
                    type="file"
                    onChange={handleChange}
                    style={{ fontSize: '0.95rem' }}
                />

                {error && <div style={{ color: 'red', fontWeight: '500' }}>{error}</div>}

                <button
                    type="submit"
                    style={{ backgroundColor: '#2e86de', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', marginTop: '1rem' }}
                >
                    등록하기
                </button>
            </form>
        </div>
    );
}