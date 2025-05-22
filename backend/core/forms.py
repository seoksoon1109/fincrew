from django import forms
from .models import Transaction

class TransactionForm(forms.ModelForm):
    class Meta:
        model = Transaction
        fields = ['type', 'title', 'amount', 'date', 'note']
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
            'note': forms.Textarea(attrs={'rows': 2}),
        }

BANK_CHOICES = [
    ('kakaobank', '카카오뱅크'),
    ('tossbank', '토스뱅크'),
]

class ExcelUploadForm(forms.Form):
    file = forms.FileField(label='엑셀 파일 (.xlsx)')
    bank = forms.ChoiceField(label='은행', choices=BANK_CHOICES)
