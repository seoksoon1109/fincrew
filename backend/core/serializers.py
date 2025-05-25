# core/serializers.py

from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Transaction, Receipt, Notice, Profile

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'  # 또는 ['id', 'title', 'amount', 'date', 'user', ...] 등으로 명시 가능

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


class NoticeSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Notice
        fields = ['id', 'title', 'content', 'author_name', 'created_at', 'attachment']

class UserSerializer(serializers.ModelSerializer):
    is_auditor = serializers.BooleanField(source='profile.is_auditor', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_auditor']