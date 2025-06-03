from django.urls import path
from . import views
from . import views_auth
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [

    # 공지 관련
    path('api/notices/', views.notice_list_create),
    path('api/notices/<int:pk>/', views.notice_detail),
    path('api/auditor/dashboard-summary/', views.auditor_dashboard_summary, name='auditor_dashboard_summary'),
    path('api/audit/clubs/', views.club_name_list, name='club-name-list'),
    path('api/notice/check-new/', views.check_new_notices),
    path('api/notice/mark-seen/', views.mark_notices_as_seen),

    # 인증 관련
    path('api/auth/register/', views_auth.register, name='register'),
    path('api/auth/login/', views_auth.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', views_auth.get_user_info),

    # 거래 관련
    path('api/transactions/', views.transaction_list),
    path('api/transactions/<int:pk>/', views.transaction_detail),
    path('api/transactions/with-receipt/', views.create_transaction_with_receipt),
    path('api/transactions/<int:pk>/with-receipt/', views.transaction_detail_with_receipt),
    path('api/audit/transactions/', views.audit_transactions),
    path('api/audit/transactions/<int:pk>/review/', views.mark_transaction_reviewed),
    path('api/audit/transactions/<int:pk>/review_status/', views.update_review_status),
    path('api/transactions/<int:pk>/evidences/', views.evidence_files_view),
    path('api/transactions/<int:transaction_id>/evidences/<int:evidence_id>/', views.evidence_delete, name='evidence-delete'),
    path('api/transactions/<int:transaction_id>/evidences/<int:evidence_id>/edit/', views.evidence_update, name='evidence-edit'),
    path('api/audit/monthly-expense/<str:club_name>/', views.monthly_expense_by_club),
    path('api/audit/comments-summary/', views.audit_comment_summary, name='audit-comment-summary'),
    path('api/audit/comment/<int:comment_id>/download/', views.download_comment_attachment),
    path('api/audit/report/', views.export_transactions, name='export_transactions_pdf'),



    # 🔧 질문/답변 기반 감사 요청/응답
    path('api/audit/comments/<int:transaction_id>/', views.comment_list_create),
    path('api/audit/comment/<int:pk>/delete/', views.comment_delete),
    path('api/audit/comment/<int:pk>/edit/', views.comment_edit),

    # 영수증 관련
    path('api/receipts/', views.receipt_upload, name='receipt_upload'),
    path('api/receipts/<int:pk>/', views.receipt_detail, name='receipt_detail'),
    path('api/receipts/transaction/<int:transaction_id>/', views.receipt_delete_by_transaction, name='receipt_delete_by_transaction'),
    path('api/receipts/preview/<int:transaction_id>/', views.receipt_preview, name='receipt_preview'),
    path('api/audit/receipts/', views.audit_receipts),

    # 달력 및 엑셀 업로드
    path('api/calendar/', views.calendar_data),
    path('upload/', views.upload_excel, name='upload_excel'),
    path('api/audit/my-club/statistics/', views.my_club_statistics, name='my_club_statistics'),
    path('api/audit/my-club/monthly-summary/', views.my_club_monthly_summary, name='my_club_monthly_summary'),


    # 멤버 관련
    path('api/members/', views.create_member),
    path('api/members/<int:pk>/', views.update_member),

    # 회비 자동 체크
    path('api/check-membership-payment/', views.check_membership_payment, name='check_membership_payment'),
    path('api/audit/statistics-by-club/', views.audit_statistics_by_club),
]
