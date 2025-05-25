import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchNotice } from "../utils/notices";   // in NoticeDetailPage.jsx

export default function NoticeDetailPage() {
    const { id } = useParams();
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        fetchNotice(id).then(setNotice);
    }, [id]);

    if (!notice) return <div>Loading...</div>;

    return (
        <div style={{ width: '70%', margin: '2rem auto' }}>
            <h2>{notice.title}</h2>
            <p><strong>작성자:</strong> {notice.author_name}</p>
            <p><strong>작성일:</strong> {new Date(notice.created_at).toLocaleString()}</p>
            <hr />
            <div style={{ whiteSpace: 'pre-line', marginTop: '1rem' }}>{notice.content}</div>
            {notice.attachment && (
                <div style={{ marginTop: '1rem' }}>
                    <a href={notice.attachment} download>📎 첨부파일 다운로드</a>
                </div>
            )}
        </div>
    );
}
