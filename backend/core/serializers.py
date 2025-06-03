from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Transaction, Receipt, Notice, NoticeAttachment, AuditComment, EvidenceFile

# 📌 거래내역 Serializer
class TransactionSerializer(serializers.ModelSerializer):
    club_name = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id', 'user', 'type', 'title', 'amount', 'date',
            'has_receipt', 'note', 'club_name', 'review_status'  # ✅ 수정됨
        ]

    def get_club_name(self, obj):
        try:
            return obj.user.profile.club_name or "N/A"
        except AttributeError:
            return "N/A"

# 📌 영수증 Serializer
class ReceiptSerializer(serializers.ModelSerializer):
    transaction_id = serializers.IntegerField(source='transaction.id', read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Receipt
        fields = ['id', 'transaction_id', 'image', 'image_url', 'uploaded_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None

# ✅ 공지사항 첨부파일 Serializer
class NoticeAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = NoticeAttachment
        fields = ['id', 'file_url']

    def get_file_url(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url

# ✅ 공지사항 Serializer
class NoticeSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    attachments = NoticeAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Notice
        fields = ['id', 'title', 'content', 'author_name', 'created_at', 'attachments']

# 📌 사용자 Serializer
class UserSerializer(serializers.ModelSerializer):
    is_auditor = serializers.BooleanField(source='profile.is_auditor', read_only=True)
    club_name = serializers.CharField(source='profile.club_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_auditor', 'club_name']

class AuditCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='user.username', read_only=True)
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = AuditComment
        fields = ['id', 'transaction', 'user', 'author_name', 'content', 'created_at', 'attachment', 'attachment_url']
        read_only_fields = ['user', 'created_at']

    def get_attachment_url(self, obj):
        request = self.context.get('request')
        if obj.attachment:
            return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url
        return None
    

class EvidenceFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenceFile
        fields = ['id', 'file', 'uploaded_at']


# serializers.py

class AuditCommentSummarySerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    title = serializers.CharField(source='transaction.title', read_only=True)
    date = serializers.DateField(source='transaction.date', read_only=True)
    club = serializers.SerializerMethodField()
    has_attachment = serializers.SerializerMethodField()

    class Meta:
        model = AuditComment
        fields = ['id', 'transaction_id', 'title', 'date', 'club', 'content', 'author', 'has_attachment']

    def get_author(self, obj):
        # 프로필에 name이 있으면 name 사용, 없으면 username
        try:
            return obj.user.profile.name or obj.user.username
        except AttributeError:
            return obj.user.username

    def get_club(self, obj):
        try:
            return obj.transaction.user.profile.club_name or "N/A"
        except AttributeError:
            return "N/A"

    def get_has_attachment(self, obj):
        return bool(obj.attachment)
