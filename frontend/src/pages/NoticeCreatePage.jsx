import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';

export default function NoticeCreatePage() {
    const [form, setForm] = useState({ title: '', content: '', attachments: [] });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'attachments') {
            const newFiles = Array.from(files);
            const fileNames = new Set(form.attachments.map(f => f.name));
            const merged = [...form.attachments];
            newFiles.forEach(file => {
                if (!fileNames.has(file.name)) {
                    merged.push(file);
                }
            });
            setForm(prev => ({ ...prev, attachments: merged }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleRemoveAttachment = (index) => {
        setForm(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
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
        form.attachments.forEach((file) => {
            formData.append('attachments', file);
        });

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

                <label style={{ fontWeight: '600' }}>첨부파일 (선택, 다중 가능)</label>
                <input
                    name="attachments"
                    type="file"
                    multiple
                    onChange={handleChange}
                    style={{ fontSize: '0.95rem' }}
                />

                {/* 첨부파일 목록 */}
                {form.attachments.length > 0 && (
                    <div style={{
                        backgroundColor: '#f7f7f7',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                        fontSize: '0.95rem'
                    }}>
                        <strong>첨부된 파일:</strong>
                        <div style={{ marginTop: '6px' }}>
                            {form.attachments.map((file, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '4px'
                                }}>
                                    <span>• {file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAttachment(index)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#e74c3c',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            marginLeft: '10px'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && <div style={{ color: 'red', fontWeight: '500' }}>{error}</div>}

                <button
                    type="submit"
                    style={{
                        backgroundColor: '#2e86de',
                        color: '#fff',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        marginTop: '1rem'
                    }}
                >
                    등록하기
                </button>
            </form>
        </div>
    );
}
