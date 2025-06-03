import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';

export default function NoticeEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({ title: '', content: '', attachments: [] });
    const [newFiles, setNewFiles] = useState([]);
    const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        authFetch(`/api/notices/${id}/`)
            .then(res => res.json())
            .then(data => {
                setForm({
                    title: data.title,
                    content: data.content,
                    attachments: data.attachments || [], // 배열 가정
                });
            })
            .catch(err => {
                console.error("❌ 공지 불러오기 실패:", err);
                setError('공지 내용을 불러오지 못했습니다.');
            });
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleNewFileChange = (e) => {
        const files = Array.from(e.target.files);
        setNewFiles(prev => [...prev, ...files]);
    };

    const removeExistingAttachment = (attachmentId) => {
        setForm(prev => ({
            ...prev,
            attachments: prev.attachments.filter(att => att.id !== attachmentId)
        }));
        setRemovedAttachmentIds(prev => [...prev, attachmentId]);
    };

    const removeNewFile = (index) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
    };

    const getFileName = (url) => {
        try {
            return decodeURIComponent(url.split('/').pop());
        } catch {
            return '첨부파일';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.title.trim() || !form.content.trim()) {
            setError('제목과 내용을 모두 입력해주세요.');
            return;
        }

        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('content', form.content);

        newFiles.forEach(file => {
            formData.append('attachments', file);
        });

        removedAttachmentIds.forEach(id => {
            formData.append('remove_attachment_ids', id);
        });

        try {
            const res = await authFetch(`/api/notices/${id}/`, {
                method: 'PUT',
                body: formData
            });

            if (!res.ok) throw new Error();
            navigate(`/notices/${id}`);
        } catch (err) {
            console.error("❌ 공지 수정 실패:", err);
            setError('공지 수정에 실패했습니다.');
        }
    };

    return (
        <div style={{ width: '80%', maxWidth: '800px', margin: '2rem auto' }}>
            <form onSubmit={handleSubmit} style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                padding: '2rem',
                fontSize: '16px',
                lineHeight: '1.6',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <h1 style={{
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    marginBottom: '1rem',
                    borderBottom: '2px solid #eee',
                    paddingBottom: '0.5rem'
                }}>
                    ✏️ 공지 수정
                </h1>

                <label>제목</label>
                <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />

                <label>내용</label>
                <textarea
                    name="content"
                    value={form.content}
                    onChange={handleChange}
                    rows={8}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                />

                {/* 기존 첨부파일 */}
                {form.attachments.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <strong>기존 첨부파일:</strong>
                        {form.attachments.map(att => (
                            <div key={att.id} style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', margin: '6px 0', background: '#f1f1f1', padding: '8px',
                                borderRadius: '6px'
                            }}>
                                <a href={att.file_url} download style={{ wordBreak: 'break-all', color: '#2e86de', textDecoration: 'none' }}>
                                    📎 {getFileName(att.file_url)}
                                </a>
                                <button
                                    type="button"
                                    onClick={() => removeExistingAttachment(att.id)}
                                    style={{ border: 'none', background: 'transparent', color: '#e74c3c', fontWeight: 'bold', cursor: 'pointer' }}
                                >✕</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 새 첨부파일 */}
                <label>첨부파일 추가</label>
                <input type="file" multiple onChange={handleNewFileChange} />

                {newFiles.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <strong>추가된 파일:</strong>
                        {newFiles.map((file, index) => (
                            <div key={index} style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', margin: '6px 0', background: '#e8f0fe', padding: '8px',
                                borderRadius: '6px'
                            }}>
                                <span>{file.name}</span>
                                <button
                                    type="button"
                                    onClick={() => removeNewFile(index)}
                                    style={{ border: 'none', background: 'transparent', color: '#e74c3c', fontWeight: 'bold', cursor: 'pointer' }}
                                >✕</button>
                            </div>
                        ))}
                    </div>
                )}

                {error && <div style={{ color: 'red' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" style={{
                        backgroundColor: '#2e86de',
                        color: '#fff',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}>
                        수정 완료
                    </button>
                </div>
            </form>
        </div>
    );
}
