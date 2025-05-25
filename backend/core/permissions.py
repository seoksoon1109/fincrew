# core/permissions.py

from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsOwnerOrReadOnlyForAuditor(BasePermission):
    """
    - 일반 사용자: 자기 데이터만 수정 가능
    - 감사 계정: 모든 데이터 '읽기'만 가능
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            # 읽기는: 본인 or 감사
            return obj.user == request.user or request.user.is_auditor
        # 쓰기는: 본인만 가능, 감사는 불가
        return obj.user == request.user and not request.user.is_auditor
