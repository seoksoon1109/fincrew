import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchNotice } from "../utils/notices";

export default function NoticeDetailPage() {
    const { id } = useParams();
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        fetchNotice(id).then(setNotice);
    }, [id]);

    if (!notice) return <div style={{ textAlign: 'center', padding: '2rem' }}>📄 불러오는 중...</div>;

    const getFileName = (url) => {
        try {
            return decodeURIComponent(url.split('/').pop());
        } catch {
            return '첨부파일';
        }
    };

    return (
        <div style={{ width: '80%', maxWidth: '800px', margin: '2rem auto' }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                padding: '2rem',
                fontSize: '16px',
                lineHeight: '1.6'
            }}>
                <h1 style={{
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    marginBottom: '1rem',
                    borderBottom: '2px solid #eee',
                    paddingBottom: '0.5rem'
                }}>
                    📝 {notice.title}
                </h1>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.9rem',
                    color: '#666',
                    marginBottom: '1rem'
                }}>
                    <div><strong>작성자:</strong> {notice.author_name}</div>
                    <div><strong>작성일:</strong> {new Date(notice.created_at).toLocaleString()}</div>
                </div>

                <div style={{
                    borderTop: '1px solid #ddd',
                    paddingTop: '1rem',
                    whiteSpace: 'pre-line',
                    minHeight: '150px'
                }}>
                    {notice.content}
                </div>

                {notice.attachments && notice.attachments.length > 0 && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>📎 첨부파일</h3>
                        {notice.attachments.map((file, idx) => (
                            <div key={file.id || idx} style={{
                                padding: '1rem',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.5rem'
                            }}>
                                <span style={{ fontWeight: 'bold', wordBreak: 'break-all' }}>
                                    📄 {getFileName(file.file_url)}
                                </span>
                                <a
                                    href={file.file_url}
                                    download
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: '#2e86de',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    다운로드
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
