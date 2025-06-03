from django.contrib import admin
from .models import Transaction, Receipt, Member, Profile, AuditComment


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'title', 'amount', 'date', 'has_receipt', 'review_status', 'note')
    list_filter = ('type', 'has_receipt', 'review_status', 'date')
    search_fields = ('title', 'note')
    ordering = ('-date',)


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('id', 'transaction', 'image', 'upload_date', 'ocr_store_name')
    list_filter = ('upload_date',)
    search_fields = ('transaction__title', 'ocr_store_name', 'ocr_result_text')
    ordering = ('-upload_date',)


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'college', 'department', 'student_id',
        'grade', 'phone_number', 'member_type', 'has_paid', 'joined_at'
    )
    list_filter = ('college', 'department', 'grade', 'member_type', 'has_paid', 'joined_at')
    search_fields = ('name', 'student_id', 'phone_number')
    ordering = ('-joined_at',)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_auditor', 'club_name')
    list_filter = ('is_auditor',)
    search_fields = ('user__username', 'user__email')


@admin.register(AuditComment)
class AuditCommentAdmin(admin.ModelAdmin):
    list_display = ('transaction', 'user', 'content', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('content', 'author__username')
    ordering = ('-created_at',)