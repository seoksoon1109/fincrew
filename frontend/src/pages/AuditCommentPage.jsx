import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export default function AuditCommentPage() {
    const { id } = useParams();
    const [transaction, setTransaction] = useState(null);
    const [comments, setComments] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [evidences, setEvidences] = useState([]);
    const [previewUrl, setPreviewUrl] = useState(null);

    const [descriptionEdit, setDescriptionEdit] = useState('');
    const [evidenceFiles, setEvidenceFiles] = useState([]);
    const [isEditingTransaction, setIsEditingTransaction] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editCommentId, setEditCommentId] = useState(null);

    useEffect(() => {
        fetchTransaction();
        fetchComments();
        fetchEvidences();
        fetchCurrentUser();
    }, [id]);

    const fetchTransaction = async () => {
        const res = await authFetch(`/api/transactions/${id}/with-receipt/`);
        if (res.ok) {
            const data = await res.json();
            setTransaction(data);
            setDescriptionEdit(data.description || '');
        }
    };

    const fetchComments = async () => {
        const res = await authFetch(`/api/audit/comments/${id}/`);
        if (res.ok) {
            setComments(await res.json());
        }
    };

    const fetchEvidences = async () => {
        const res = await authFetch(`/api/transactions/${id}/evidences/`);
        if (res.ok) {
            setEvidences(await res.json());
        }
    };

    const fetchCurrentUser = async () => {
        const res = await authFetch('/api/auth/me/');
        if (res.ok) {
            const data = await res.json();
            setCurrentUserId(data.id);
        }
    };

    const handleDescriptionUpdate = async () => {
        await authFetch(`/api/transactions/${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: descriptionEdit })
        });
    };

    const handleEvidenceUpload = async () => {
        if (evidenceFiles.length === 0) return;

        const formData = new FormData();
        evidenceFiles.forEach(file => formData.append('file', file));

        await authFetch(`/api/transactions/${id}/evidences/`, {
            method: 'POST',
            body: formData
        });

        setEvidenceFiles([]);
    };

    const handleEvidenceDelete = async (evidenceId) => {
        await authFetch(`/api/transactions/${id}/evidences/${evidenceId}/`, {
            method: 'DELETE'
        });
        fetchEvidences();
    };

    const handlePreview = async (receiptId) => {
        const res = await authFetch(`/api/receipts/preview/${receiptId}/`);
        const data = await res.json();
        if (data.image_url) {
            setPreviewUrl(`http://localhost:8000${data.image_url}`);
        } else {
            alert("❌ 영수증이 없습니다.");
        }
    };

    const handleCommentSubmit = async () => {
        if (!content.trim()) return;

        const formData = new FormData();
        formData.append('content', content);
        if (file) formData.append('attachment', file);

        const url = isEditing
            ? `/api/audit/comment/${editCommentId}/edit/`
            : `/api/audit/comments/${id}/`;

        const method = isEditing ? 'PUT' : 'POST';

        const res = await authFetch(url, { method, body: formData });
        if (res.ok) {
            setContent('');
            setFile(null);
            setShowModal(false);
            setIsEditing(false);
            setEditCommentId(null);
            fetchComments();
        }
    };

    const handleEditClick = (comment) => {
        setContent(comment.content);
        setIsEditing(true);
        setEditCommentId(comment.id);
        setShowModal(true);
    };

    const handleDeleteClick = async (commentId) => {
        await authFetch(`/api/audit/comment/${commentId}/delete/`, { method: 'DELETE' });
        fetchComments();
    };

    const getFileName = (url) => {
        try {
            return decodeURIComponent(url.split('/').pop());
        } catch {
            return '첨부파일';
        }
    };

    const isOwner = parseInt(currentUserId) === parseInt(transaction?.user);

    return (
        <div style={{ width: '80%', maxWidth: '800px', margin: '2rem auto' }}>
            <div style={{
                backgroundColor: '#fff', borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)', padding: '2rem'
            }}>
                {transaction && (
                    <>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>📄 거래 상세</h1>
                        <div><strong>거래일자:</strong> {transaction.date}</div>
                        <div><strong>유형:</strong> {transaction.type === 'income' ? '수입' : '지출'}</div>
                        <div><strong>비고:</strong> {transaction.note || '-'}</div>
                        <div><strong>금액:</strong> {parseInt(transaction.amount).toLocaleString()}원</div>

                        {/* 🖼️ 영수증 보기 버튼 */}
                        {transaction.receipt_id && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <button onClick={() => handlePreview(transaction.receipt_id)} style={{
                                    backgroundColor: '#f39c12', color: '#fff', padding: '6px 12px',
                                    borderRadius: '6px', border: 'none', fontWeight: 'bold'
                                }}>
                                    🖼️ 영수증 보기
                                </button>
                            </div>
                        )}

                        {/* 설명 */}
                        <div style={{ marginTop: '1rem' }}>
                            <strong>설명:</strong>
                            {isEditingTransaction ? (
                                <textarea
                                    value={descriptionEdit}
                                    onChange={(e) => setDescriptionEdit(e.target.value)}
                                    rows={3}
                                    style={{ width: '100%', marginTop: '0.5rem', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                                />
                            ) : (
                                <div style={{ marginTop: '0.5rem' }}>{transaction.description || '-'}</div>
                            )}
                        </div>

                        {/* 증빙 */}
                        <div style={{ marginTop: '1rem' }}>
                            <strong>📎 지출 근거 파일:</strong>
                            {evidences.length > 0 ? evidences.map(ev => (
                                <div key={ev.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: '#f1f1f1', padding: '8px', borderRadius: '6px', marginTop: '6px'
                                }}>
                                    <a href={ev.file} download style={{ color: '#2e86de' }}>
                                        📎 {getFileName(ev.file)}
                                    </a>
                                    {isEditingTransaction && (
                                        <button onClick={() => handleEvidenceDelete(ev.id)} style={{
                                            background: 'transparent', border: 'none', color: '#e74c3c', fontWeight: 'bold'
                                        }}>✕</button>
                                    )}
                                </div>
                            )) : <div style={{ color: '#999', marginTop: '0.5rem' }}>첨부된 파일 없음</div>}

                            {isEditingTransaction && (
                                <div style={{ marginTop: '1rem' }}>
                                    <input type="file" multiple onChange={(e) => setEvidenceFiles(Array.from(e.target.files))} />
                                </div>
                            )}
                        </div>

                        {/* 수정 버튼 */}
                        {isOwner && (
                            <div style={{ marginTop: '1rem' }}>
                                {!isEditingTransaction ? (
                                    <button onClick={() => setIsEditingTransaction(true)} style={{
                                        backgroundColor: '#2e86de', color: '#fff', padding: '8px 16px',
                                        borderRadius: '6px', border: 'none', fontWeight: 'bold'
                                    }}>✏️ 수정</button>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={async () => {
                                            await handleDescriptionUpdate();
                                            if (evidenceFiles.length > 0) await handleEvidenceUpload();
                                            await fetchTransaction();
                                            await fetchEvidences();
                                            setIsEditingTransaction(false);
                                        }} style={{
                                            backgroundColor: '#27ae60', color: '#fff', padding: '8px 16px',
                                            borderRadius: '6px', border: 'none', fontWeight: 'bold'
                                        }}>💾 저장</button>
                                        <button onClick={() => {
                                            setIsEditingTransaction(false);
                                            setDescriptionEdit(transaction.description || '');
                                        }} style={{
                                            backgroundColor: '#bdc3c7', color: '#fff', padding: '8px 16px',
                                            borderRadius: '6px', border: 'none', fontWeight: 'bold'
                                        }}>취소</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 코멘트 영역 */}
                        <div style={{ marginTop: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', borderBottom: '2px solid #ddd', paddingBottom: '0.5rem' }}>💬 코멘트</h2>
                            {comments.map(comment => (
                                <div key={comment.id} style={{
                                    backgroundColor: '#fff', padding: '1rem', borderRadius: '8px',
                                    border: '1px solid #eee', marginBottom: '1rem'
                                }}>
                                    <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                        [{comment.author_name}] {comment.created_at.slice(0, 10)}
                                    </div>
                                    <div>{comment.content}</div>
                                    {comment.attachment_url && (
                                        <a href={comment.attachment_url} download={getFileName(comment.attachment_url)} style={{ color: '#3498db' }}>
                                            📎 {getFileName(comment.attachment_url)}
                                        </a>
                                    )}
                                    {comment.user === currentUserId && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleEditClick(comment)}
                                                style={{
                                                    backgroundColor: '#2d98da',
                                                    color: '#fff',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✏️ 수정
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(comment.id)}
                                                style={{
                                                    backgroundColor: '#e74c3c',
                                                    color: '#fff',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🗑️ 삭제
                                            </button>
                                        </div>
                                    )}

                                </div>
                            ))}
                            <button onClick={() => {
                                setShowModal(true);
                                setIsEditing(false);
                                setContent('');
                                setFile(null);
                            }} style={{
                                backgroundColor: '#2d98da', color: 'white', padding: '8px 16px',
                                borderRadius: '6px', border: 'none', fontWeight: 'bold'
                            }}>➕ 코멘트 작성</button>
                        </div>
                    </>
                )}
            </div>

            {/* 코멘트 모달 */}
            {showModal && (
                <div className="modal">
                    <div className="modal-content" style={{ maxWidth: '500px', margin: 'auto', padding: '2rem' }}>
                        <h3>{isEditing ? '✏️ 코멘트 수정' : '📝 코멘트 작성'}</h3>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="코멘트를 입력하세요"
                            rows={3}
                            style={{ width: '100%', marginBottom: '1rem', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button onClick={handleCommentSubmit} style={{
                                backgroundColor: '#27ae60', color: 'white', padding: '8px 16px',
                                borderRadius: '6px', border: 'none', fontWeight: 'bold'
                            }}>{isEditing ? '수정' : '작성'}</button>
                            <button onClick={() => {
                                setShowModal(false); setIsEditing(false); setEditCommentId(null);
                                setContent(''); setFile(null);
                            }} style={{
                                backgroundColor: '#bdc3c7', color: 'white', padding: '8px 16px',
                                borderRadius: '6px', border: 'none', fontWeight: 'bold'
                            }}>취소</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 영수증 미리보기 */}
            {previewUrl && (
                <div className="modal">
                    <div className="modal-content" style={{ textAlign: 'center' }}>
                        <TransformWrapper>
                            <TransformComponent>
                                <img src={previewUrl} alt="영수증 미리보기" style={{ maxWidth: '100%', maxHeight: '60vh' }} />
                            </TransformComponent>
                        </TransformWrapper>
                        <div><button onClick={() => setPreviewUrl(null)}>닫기</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
