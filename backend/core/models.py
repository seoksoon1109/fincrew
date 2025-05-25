from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.db import models
import os

class Transaction(models.Model):
    TYPE_CHOICES = [
        ('income', '수입'),
        ('expense', '지출'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')  # 🔑 추가
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    title = models.CharField(max_length=100)
    amount = models.PositiveIntegerField()
    date = models.DateField()
    has_receipt = models.BooleanField(default=False)  # 연동 여부 표시
    note = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.get_type_display()} - {self.title} ({self.amount}원)"

class Receipt(models.Model):
    transaction = models.ForeignKey(
        'Transaction',
        on_delete=models.CASCADE,  # ✅ 변경: 연결된 거래 삭제 시 함께 삭제됨
        related_name='receipts'
    )
    image = models.ImageField(upload_to='receipts/')
    upload_date = models.DateTimeField(auto_now_add=True)
    ocr_store_name = models.CharField(max_length=100, blank=True)
    ocr_result_text = models.TextField(blank=True)

    def delete(self, *args, **kwargs):
        # 실제 이미지 파일 삭제
        if self.image and os.path.isfile(self.image.path):
            os.remove(self.image.path)
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"영수증 - {self.transaction.title if self.transaction else '미연동'}"




class Member(models.Model):
    MEMBER_TYPE_CHOICES = [
        ('undergrad', '재학생'),
        ('leave', '휴학생'),
        ('grad', '대학원생'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='members')
    name = models.CharField(max_length=50)  # ✅ 필수
    student_id = models.CharField(max_length=20, unique=True)  # ✅ 필수

    college = models.CharField(max_length=100, null=True, blank=True)       # 🔁 선택 가능
    department = models.CharField(max_length=100, null=True, blank=True)    # 🔁 선택 가능
    grade = models.PositiveSmallIntegerField(null=True, blank=True)         # 🔁 선택 가능

    phone_number = models.CharField(
        max_length=11,
        null=True,
        blank=True,  # 🔁 선택 가능
        validators=[
            RegexValidator(
                regex=r'^\d{11}$',
                message='전화번호는 하이픈 없이 11자리 숫자로 입력해야 합니다. (예: 01012345678)'
            )
        ]
    )

    member_type = models.CharField(
        max_length=10,
        choices=MEMBER_TYPE_CHOICES,
        null=True,
        blank=True  # 🔁 선택 가능
    )

    has_paid = models.BooleanField(default=False)
    joined_at = models.DateField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} ({self.student_id})'

class Notice(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    attachment = models.FileField(upload_to='notices/', blank=True, null=True)

    def __str__(self):
        return self.title
    


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    is_auditor = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.user.username} - 감사 여부: {self.is_auditor}'