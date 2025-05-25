from django.urls import path
from . import views
from . import views_auth  # 👈 인증 관련 뷰 import 추가
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [

    # 공지 관련
    path('api/notices/', views.notice_list_create),
    path('api/notices/<int:pk>/', views.notice_detail),
    path('api/auditor/dashboard-summary/', views.auditor_dashboard_summary, name='auditor_dashboard_summary'),

    path('api/auth/register/', views_auth.register, name='register'),
    path('api/auth/login/', views_auth.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', views_auth.get_user_info),

    # 📂 거래 관련
    path('api/transactions/', views.transaction_list),
    path('api/transactions/<int:pk>/', views.transaction_detail),
    path('api/transactions/with-receipt/', views.create_transaction_with_receipt),
    path('api/transactions/<int:pk>/with-receipt/', views.transaction_detail_with_receipt),
    path('api/audit/transactions/', views.audit_transactions),

    # 🧾 영수증 관련
    path('api/receipts/', views.receipt_upload, name='receipt_upload'),
    path('api/receipts/<int:pk>/', views.receipt_detail, name='receipt_detail'),
    path('api/receipts/transaction/<int:transaction_id>/', views.receipt_delete_by_transaction, name='receipt_delete_by_transaction'),
    path('api/receipts/preview/<int:transaction_id>/', views.receipt_preview, name='receipt_preview'),
    path('api/audit/receipts/', views.audit_receipts),

    # 📅 달력 및 엑셀 업로드
    path('api/calendar/', views.calendar_data),
    path('upload/', views.upload_excel, name='upload_excel'),

    # 👤 멤버 관련
    path('api/members/', views.create_member),
    path('api/members/<int:pk>/', views.update_member),

    # 💳 회비 자동 체크
    path('api/check-membership-payment/', views.check_membership_payment, name='check_membership_payment'),
]
