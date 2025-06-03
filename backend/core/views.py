# 표준 라이브러리
import os
import re
import json
import mimetypes
import pandas as pd
from datetime import datetime
from collections import defaultdict
import zipfile
from io import BytesIO
import pytz


# Django core
from django.http import HttpResponse, JsonResponse, FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.timezone import now
from django.template.loader import render_to_string
from django.db.models import Q, Count, Sum
from django.db.models.functions import TruncMonth
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User

# Django REST Framework
from rest_framework import status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.decorators import api_view, permission_classes, parser_classes

# 외부 라이브러리
from weasyprint import HTML
from urllib.parse import quote  # 한글 파일명 인코딩

# 내부 앱 - models, serializers, permissions, forms
from .models import (
    Notice, NoticeAttachment, Transaction, Receipt, Member,
    AuditComment, EvidenceFile
)
from .serializers import (
    TransactionSerializer, ReceiptSerializer, NoticeSerializer,
    AuditCommentSerializer, EvidenceFileSerializer, AuditCommentSummarySerializer
)
from .permissions import IsOwnerOrReadOnlyForAuditor
from .forms import ExcelUploadForm

class TransactionDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnlyForAuditor]

class ReceiptDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnlyForAuditor]

@api_view(['POST'])
@permission_classes([AllowAny])  # ✅ 누구나 접근 가능
def register_user(request):
    try:
        data = request.data
        username = data.get('username')
        password = data.get('password')
        email = data.get('email', '')

        if User.objects.filter(username=username).exists():
            return Response({'error': '이미 존재하는 아이디입니다.'}, status=400)

        user = User.objects.create_user(username=username, password=password, email=email)
        return Response({'message': '회원가입 성공'}, status=201)

    except Exception as e:
        return Response({'error': str(e)}, status=400)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def receipt_preview(request, transaction_id):
    try:
        # 감사 계정 여부 확인
        is_auditor = hasattr(request.user, 'profile') and request.user.profile.is_auditor

        # 감사 계정이면 user 제한 없이, 일반 계정이면 본인 거래만
        if is_auditor:
            receipt = Receipt.objects.filter(transaction_id=transaction_id).latest('upload_date')
        else:
            receipt = Receipt.objects.filter(transaction_id=transaction_id, transaction__user=request.user).latest('upload_date')

        if not receipt.image:
            return JsonResponse({'error': '이미지가 존재하지 않습니다.'}, status=404)

        return JsonResponse({'image_url': receipt.image.url})

    except Receipt.DoesNotExist:
        return JsonResponse({'error': '영수증이 없습니다.'}, status=404)

@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def receipt_upload(request):
    image = request.FILES.get('image')
    transaction_id = request.POST.get('transaction')

    if not image or not transaction_id:
        return JsonResponse({'error': '이미지와 거래 ID가 필요합니다.'}, status=400)

    try:
        transaction = Transaction.objects.get(id=transaction_id, user=request.user)
    except Transaction.DoesNotExist:
        return JsonResponse({'error': '거래를 찾을 수 없습니다.'}, status=404)

    Receipt.objects.create(transaction=transaction, image=image)
    if not transaction.has_receipt:
        transaction.has_receipt = True
        transaction.save()

    return JsonResponse({'status': 'uploaded'})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def receipt_delete_by_transaction(request, transaction_id):
    try:
        transaction = Transaction.objects.get(id=transaction_id, user=request.user)
    except Transaction.DoesNotExist:
        return JsonResponse({'error': '거래를 찾을 수 없습니다.'}, status=404)

    for receipt in transaction.receipts.all():
        receipt.delete()

    transaction.has_receipt = False
    transaction.save()
    return JsonResponse({'status': 'deleted'})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def receipt_detail(request, pk):
    try:
        receipt = Receipt.objects.get(pk=pk, transaction__user=request.user)
    except Receipt.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    transaction = receipt.transaction
    receipt.delete()

    if transaction and not transaction.receipts.exists():
        transaction.has_receipt = False
        transaction.save()

    return JsonResponse({'status': 'deleted'})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def transaction_list(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        parsed_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        t = Transaction.objects.create(
            user=request.user,
            type=data['type'],
            title=data['title'],
            amount=data['amount'],
            note=data['note'],
            date=parsed_date,
        )
        return JsonResponse({
            'id': t.id,
            'type': t.type,
            'title': t.title,
            'amount': t.amount,
            'note': t.note,
            'date': t.date.strftime('%Y-%m-%d'),
            'has_receipt': t.has_receipt,
            'review_status': t.review_status,  # ✅ 감사 상태 추가
        })

    transactions = Transaction.objects.filter(user=request.user).order_by('-date')
    data = [{
        'id': t.id,
        'type': t.type,
        'title': t.title,
        'amount': t.amount,
        'note': t.note,
        'date': t.date.strftime('%Y-%m-%d'),
        'has_receipt': t.has_receipt,
        'review_status': t.review_status,  # ✅ 감사 상태 추가
    } for t in transactions]
    return JsonResponse(data, safe=False)


@api_view(['GET', 'PUT'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def transaction_detail_with_receipt(request, pk):
    transaction = get_object_or_404(Transaction, pk=pk)

    if transaction.user != request.user and not getattr(request.user.profile, 'is_auditor', False):
        return Response({'detail': '권한이 없습니다.'}, status=403)

    if request.method == 'GET':
        return Response({
            'id': transaction.id,
            'type': transaction.type,
            'title': transaction.title,
            'amount': transaction.amount,
            'note': transaction.note,
            'description': transaction.description,  # ✅ 추가
            'date': transaction.date.strftime('%Y-%m-%d'),
            'has_receipt': transaction.has_receipt,
            'user': transaction.user.id,
        })
    # PUT 메서드 처리 로직
    data = request.data
    image = request.FILES.get('receipt')
    delete_flag = data.get('delete_image')
    title = data.get('title')
    amount = data.get('amount')
    note = data.get('note')
    date_str = data.get('date')

    if not all([title, amount, note, date_str]):
        return Response({'error': 'Missing one or more required fields'}, status=400)

    try:
        parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except Exception:
        return Response({'error': 'Invalid date format'}, status=400)

    transaction.title = title
    transaction.amount = amount
    transaction.note = note
    transaction.date = parsed_date
    transaction.save()

    if delete_flag == 'true':
        receipt_qs = Receipt.objects.filter(transaction=transaction)
        if receipt_qs.exists():
            receipt = receipt_qs.first()
            try:
                if receipt.image and os.path.isfile(receipt.image.path):
                    os.remove(receipt.image.path)
            except:
                pass
            receipt.delete()
            transaction.has_receipt = False
            transaction.save()
    elif image:
        receipt_qs = Receipt.objects.filter(transaction=transaction)
        if receipt_qs.exists():
            receipt = receipt_qs.first()
            try:
                if receipt.image and os.path.isfile(receipt.image.path):
                    os.remove(receipt.image.path)
            except:
                pass
            receipt.image = image
            receipt.save()
        else:
            Receipt.objects.create(transaction=transaction, image=image)
        transaction.has_receipt = True
        transaction.save()

    return Response({
        'id': transaction.id,
        'type': transaction.type,
        'title': transaction.title,
        'amount': transaction.amount,
        'note': transaction.note,
        'date': transaction.date.strftime('%Y-%m-%d'),
        'has_receipt': transaction.has_receipt,
    })

@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def create_transaction_with_receipt(request):
    try:
        title = request.POST.get('title')
        amount = int(request.POST.get('amount'))
        note = request.POST.get('note')
        date_str = request.POST.get('date')
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
        image = request.FILES.get('receipt')

        transaction = Transaction.objects.create(
            user=request.user,
            type='expense',
            title=title,
            amount=amount,
            note=note,
            date=date,
            has_receipt=bool(image),
        )

        if image:
            Receipt.objects.create(transaction=transaction, image=image)

        return JsonResponse({
            'id': transaction.id,
            'type': transaction.type,
            'title': transaction.title,
            'amount': transaction.amount,
            'note': transaction.note,
            'date': transaction.date.strftime('%Y-%m-%d'),
            'has_receipt': transaction.has_receipt,
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def create_member(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        grade = int(data.get('grade', 0))
        member = Member.objects.create(
            user=request.user,
            name=data['name'],
            college=data['college'],
            department=data['department'],
            student_id=data['student_id'],
            grade=grade,
            phone_number=data['phone_number'],
            member_type=data['member_type']
        )
        return JsonResponse({
            'id': member.id,
            'name': member.name,
            'college': member.college,
            'department': member.department,
            'student_id': member.student_id,
            'grade': member.grade,
            'phone_number': member.phone_number,
            'member_type': member.member_type,
            'has_paid': member.has_paid,
            'joined_at': member.joined_at.strftime('%Y-%m-%d')
        })

    members = Member.objects.filter(user=request.user).order_by('-joined_at')
    data = [{
        'id': m.id,
        'name': m.name,
        'college': m.college,
        'department': m.department,
        'student_id': m.student_id,
        'grade': m.grade,
        'phone_number': m.phone_number,
        'member_type': m.member_type,
        'has_paid': m.has_paid,
        'joined_at': m.joined_at.strftime('%Y-%m-%d')
    } for m in members]
    return JsonResponse(data, safe=False)

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def update_member(request, pk):
    member = get_object_or_404(Member, pk=pk, user=request.user)

    if request.method == 'PATCH':
        data = json.loads(request.body)
        for field in ['name', 'college', 'department', 'grade', 'phone_number', 'member_type', 'has_paid']:
            if field in data:
                setattr(member, field, data[field])
        if 'joined_at' in data:
            try:
                member.joined_at = datetime.strptime(data['joined_at'], '%Y-%m-%d').date()
            except:
                pass
        member.save()
        return JsonResponse({
            'id': member.id,
            'name': member.name,
            'college': member.college,
            'department': member.department,
            'student_id': member.student_id,
            'grade': member.grade,
            'phone_number': member.phone_number,
            'member_type': member.member_type,
            'has_paid': member.has_paid,
            'joined_at': member.joined_at.strftime('%Y-%m-%d')
        })

    member.delete()
    return JsonResponse({'message': '삭제 완료'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_info(request):
    user = request.user
    return JsonResponse({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_membership_payment(request):
    try:
        data = json.loads(request.body)
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        target_amount = int(data['amount'])

        transactions = Transaction.objects.filter(
            user=request.user,
            date__range=(start_date, end_date),
            amount=target_amount,
            type='income'
        )

        matched, added, ignored = 0, 0, []

        for tx in transactions:
            raw = tx.note.strip()
            match = re.match(r'^(\d{10})\s?([가-힣]{2,})$', raw)
            if not match:
                ignored.append(raw)
                continue

            student_id, name = match.groups()

            member, created = Member.objects.get_or_create(
                user=request.user,
                student_id=student_id,
                defaults={'name': name}
            )

            if not member.has_paid:
                member.has_paid = True
                member.save()

            if created:
                added += 1
            else:
                matched += 1

        return JsonResponse({
            'status': 'success',
            'matched_members': matched,
            'new_members_added': added,
            'ignored_inputs': ignored
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_data(request):
    data = Transaction.objects.filter(user=request.user).values('date', 'type', 'title', 'amount')
    result = {}
    for t in data:
        date_str = t['date'].strftime('%Y-%m-%d')
        result.setdefault(date_str, []).append({
            'type': t['type'],
            'title': t['title'],
            'amount': t['amount'],
        })
    return JsonResponse(result)

@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def upload_excel(request):
    message = None
    transactions = Transaction.objects.filter(user=request.user).order_by('-date')

    form = ExcelUploadForm(request.POST, request.FILES)
    if form.is_valid():
        bank = form.cleaned_data['bank']
        uploaded_file = request.FILES['file']
        file_name = uploaded_file.name

        try:
            if bank == 'kakaobank':
                if file_name.endswith('.xlsx'):
                    df = pd.read_excel(uploaded_file, sheet_name=0, skiprows=10)
                    df = df[['거래일시', '내용', '거래금액', '거래구분']].copy()
                    df.columns = ['거래일시', 'note', '금액', 'title']
                    df['금액'] = df['금액'].astype(str).str.replace(',', '').str.strip()
                    df['거래일시'] = pd.to_datetime(df['거래일시']).dt.date
                else:
                    raise ValueError("카카오뱅크는 .xlsx 파일만 지원됩니다.")

            elif bank == 'tossbank':
                if file_name.endswith('.xlsx'):
                    df = pd.read_excel(uploaded_file, sheet_name=0, skiprows=8)
                    df = df[['거래 일시', '적요', '거래 금액', '거래 유형']].copy()
                    df.columns = ['거래일시', 'note', '금액', 'title']
                    df['금액'] = df['금액'].astype(str).str.replace(',', '').str.strip()
                    df['거래일시'] = pd.to_datetime(df['거래일시']).dt.date
                else:
                    raise ValueError("토스뱅크는 .xlsx 파일만 지원됩니다.")

            else:
                raise ValueError("현재는 카카오뱅크와 토스뱅크만 지원됩니다.")

            inserted, skipped = 0, 0

            for _, row in df.iterrows():
                try:
                    amount = int(row['금액'])
                    if amount == 0:
                        continue
                except ValueError:
                    continue

                transaction_type = 'income' if amount > 0 else 'expense'
                title = row['title']
                note = row.get('note', '')
                date = row['거래일시']
                amount = abs(amount)

                if not Transaction.objects.filter(
                    user=request.user,
                    type=transaction_type, title=title, note=note, date=date, amount=amount
                ).exists():
                    Transaction.objects.create(
                        user=request.user,
                        type=transaction_type,
                        title=title,
                        note=note,
                        date=date,
                        amount=amount,
                    )
                    inserted += 1
                else:
                    skipped += 1

            message = f"✅ 업로드 완료: {inserted}건 저장, {skipped}건 중복 건너뜀"

        except Exception as e:
            message = f"⚠️ 파일 처리 중 오류 발생: {str(e)}"

        return JsonResponse({'message': message})

    return JsonResponse({'error': '유효하지 않은 폼'}, status=400)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])  # ✅ PATCH 추가
@permission_classes([IsAuthenticated])
def transaction_detail(request, pk):
    user = request.user

    try:
        if hasattr(user, 'profile') and user.profile.is_auditor:
            # 감사자는 모든 거래 조회 가능
            transaction = Transaction.objects.get(pk=pk)
        else:
            # 일반 사용자는 자신의 거래만 조회 가능
            transaction = Transaction.objects.get(pk=pk, user=user)
    except Transaction.DoesNotExist:
        return JsonResponse({'error': 'Transaction not found'}, status=404)

    if request.method in ['PUT', 'PATCH']:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        for field in ['title', 'amount', 'note', 'date', 'description']:
            if field in data:
                setattr(transaction, field, data[field])

        if 'date' in data:
            try:
                transaction.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            except ValueError:
                return JsonResponse({'error': 'Invalid date format'}, status=400)

        transaction.save()

        return JsonResponse({
            'id': transaction.id,
            'type': transaction.type,
            'title': transaction.title,
            'amount': transaction.amount,
            'note': transaction.note,
            'date': transaction.date.strftime('%Y-%m-%d'),
            'has_receipt': transaction.has_receipt,
        })

    elif request.method == 'DELETE':
        transaction.delete()
        return JsonResponse({'message': 'Transaction deleted'}, status=200)

    else:  # GET 요청
        return JsonResponse({
            'id': transaction.id,
            'type': transaction.type,
            'title': transaction.title,
            'amount': transaction.amount,
            'note': transaction.note,
            'date': transaction.date.strftime('%Y-%m-%d'),
            'has_receipt': transaction.has_receipt,
        })
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_transactions(request):
    if not hasattr(request.user, 'profile') or not request.user.profile.is_auditor:
        return Response({'detail': '접근 권한이 없습니다.'}, status=403)

    transactions = Transaction.objects.all()\
    .select_related('user__profile')\
    .order_by('-date')

    serializer = TransactionSerializer(transactions, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_receipts(request):
    if not hasattr(request.user, 'profile') or not request.user.profile.is_auditor:
        return Response({'detail': '접근 권한이 없습니다.'}, status=403)
    
    receipts = Receipt.objects.select_related('transaction').all().order_by('-uploaded_at')
    serializer = ReceiptSerializer(receipts, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def notice_list_create(request):
    if request.method == 'GET':
        notices = Notice.objects.all().order_by('-created_at')
        serializer = NoticeSerializer(notices, many=True, context={'request': request})  # ✅ context 추가
        return Response(serializer.data)

    if request.method == 'POST':
        # 기본 데이터 처리
        title = request.data.get('title')
        content = request.data.get('content')
        attachments = request.FILES.getlist('attachments')  # ✅ 다중 파일 처리

        # Notice 생성
        notice = Notice.objects.create(
            title=title,
            content=content,
            author=request.user
        )

        # 첨부파일 저장
        for file in attachments:
            NoticeAttachment.objects.create(notice=notice, file=file)

        # 직후 직렬화해서 반환
        serializer = NoticeSerializer(notice, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def notice_detail(request, pk):
    try:
        notice = Notice.objects.get(pk=pk)
    except Notice.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = NoticeSerializer(notice, context={'request': request})  # ✅ context 추가
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = NoticeSerializer(notice, data=request.data, partial=True, context={'request': request})  # ✅ context 추가
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        notice.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_new_notices(request):
    last_seen = request.user.profile.last_seen_notice
    if last_seen:
        has_new = Notice.objects.filter(created_at__gt=last_seen).exists()
    else:
        has_new = True
    return Response({'has_new': has_new})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notices_as_seen(request):
    profile = request.user.profile
    profile.last_seen_notice = timezone.now()
    profile.save()
    return Response({'status': 'ok'})
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auditor_dashboard_summary(request):
    user = request.user
    if not hasattr(user, 'profile') or not user.profile.is_auditor:
        return Response({'detail': '접근 권한이 없습니다.'}, status=403)

    # 동아리 수 (감사 계정 제외 유저 수)
    total_club_users = User.objects.filter(profile__is_auditor=False, is_staff=False ).count()

    # 거래내역 수
    total_tx = Transaction.objects.count()
    reviewed_tx = Transaction.objects.filter(review_status='completed').count()
    unreviewed_tx = Transaction.objects.exclude(review_status='completed').count()

    # 동아리별 지출 비율 및 영수증 등록률 계산
    users = User.objects.filter(profile__is_auditor=False)
    expense_ratios = []
    receipt_ratios = []

    for u in users:
        tx = Transaction.objects.filter(user=u)
        income_count = tx.filter(type='income').count()
        expense_count = tx.filter(type='expense').count()
        total = income_count + expense_count

        if total > 0:
            expense_ratio = expense_count / total * 100
            expense_ratios.append(expense_ratio)

            receipt_ratio = tx.filter(has_receipt=True).count() / total * 100
            receipt_ratios.append(receipt_ratio)

    average_expense_ratio = round(sum(expense_ratios) / len(expense_ratios), 1) if expense_ratios else 0
    average_receipt_ratio = round(sum(receipt_ratios) / len(receipt_ratios), 1) if receipt_ratios else 0
    audit_completion_rate = round(reviewed_tx / total_tx * 100, 1) if total_tx else 0

    return Response({
        'audited_clubs_count': total_club_users,
        'flagged_transaction_count': unreviewed_tx,
        'average_expense_ratio': average_expense_ratio,
        'average_receipt_ratio': average_receipt_ratio,
        'audit_completion_rate': audit_completion_rate
    })

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_transaction_reviewed(request, pk):
    try:
        transaction = Transaction.objects.get(pk=pk)
    except Transaction.DoesNotExist:
        return Response({'error': '해당 거래를 찾을 수 없습니다.'}, status=404)

    if not request.user.profile.is_auditor:
        return Response({'error': '접근 권한이 없습니다.'}, status=403)

    transaction.is_reviewed = request.data.get('is_reviewed', True)
    transaction.save()

    # ✅ 응답에 결과 포함
    return Response({
        'message': '거래 감사 여부가 업데이트되었습니다.',
        'id': transaction.id,
        'is_reviewed': transaction.is_reviewed,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def club_name_list(request):
    # 감사 계정을 제외한 유저들의 club_name만 추출
    clubs = User.objects.filter(profile__is_auditor=False)\
    .exclude(profile__club_name__isnull=True)\
    .exclude(profile__club_name__exact='')\
    .values_list('profile__club_name', flat=True).distinct()
    return Response(list(clubs))


@api_view(['GET', 'POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def comment_list_create(request, transaction_id):
    if request.method == 'GET':
        comments = AuditComment.objects.filter(transaction__id=transaction_id).order_by('created_at')
        serializer = AuditCommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    if request.method == 'POST':
        data = request.data.copy()
        data['transaction'] = transaction_id
        serializer = AuditCommentSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def comment_delete(request, pk):
    try:
        comment = AuditComment.objects.get(pk=pk)
        if request.user != comment.user:
            return Response({'error': '삭제 권한이 없습니다.'}, status=403)
        comment.delete()
        return Response({'message': '삭제 완료'})
    except AuditComment.DoesNotExist:
        return Response({'error': '존재하지 않는 댓글입니다.'}, status=404)
    
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def comment_edit(request, pk):
    try:
        comment = AuditComment.objects.get(pk=pk)
        if request.user != comment.user:
            return Response({'error': '수정 권한이 없습니다.'}, status=403)

        content = request.data.get('content', '')
        if content:
            comment.content = content

        # 첨부파일 제거 요청 처리
        if request.data.get('remove_attachment') == 'true':
            if comment.attachment:
                comment.attachment.delete(save=False)
                comment.attachment = None

        # 새 첨부파일 업로드
        if 'attachment' in request.FILES:
            if comment.attachment:
                comment.attachment.delete(save=False)
            comment.attachment = request.FILES['attachment']

        comment.save()

        return Response({'message': '수정 완료'})

    except AuditComment.DoesNotExist:
        return Response({'error': '존재하지 않는 댓글입니다.'}, status=404)



@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_review_status(request, pk):
    try:
        tx = Transaction.objects.get(pk=pk)
    except Transaction.DoesNotExist:
        return Response({'error': '거래내역을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('review_status')
    valid_choices = [choice[0] for choice in Transaction.REVIEW_STATUS_CHOICES]

    if new_status not in valid_choices:
        return Response({'error': '유효하지 않은 상태입니다.'}, status=status.HTTP_400_BAD_REQUEST)

    tx.review_status = new_status
    tx.save()
    return Response({'message': '감사 상태가 업데이트되었습니다.'})



@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def evidence_files_view(request, pk):
    try:
        transaction = Transaction.objects.get(pk=pk)
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found'}, status=404)

    if request.method == 'GET':
        evidences = transaction.evidences.all()
        serializer = EvidenceFileSerializer(evidences, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        files = request.FILES.getlist('file')  # ✅ 여러 파일 처리
        for f in files:
            EvidenceFile.objects.create(transaction=transaction, file=f)
        return Response({'message': '업로드 완료'}, status=201)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def evidence_delete(request, transaction_id, evidence_id):
    try:
        transaction = Transaction.objects.get(id=transaction_id)
    except Transaction.DoesNotExist:
        return Response({'error': 'Transaction not found'}, status=404)

    try:
        evidence = EvidenceFile.objects.get(id=evidence_id, transaction=transaction)
    except EvidenceFile.DoesNotExist:
        return Response({'error': 'Evidence not found'}, status=404)

    # 권한 확인
    if request.user != transaction.user:
        return Response({'error': '삭제 권한이 없습니다.'}, status=403)

    evidence.file.delete(save=False)  # 실제 파일 삭제
    evidence.delete()
    return Response({'message': 'Evidence deleted'}, status=204)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def evidence_update(request, transaction_id, evidence_id):
    try:
        transaction = Transaction.objects.get(id=transaction_id)
        evidence = EvidenceFile.objects.get(id=evidence_id, transaction=transaction)
    except (Transaction.DoesNotExist, EvidenceFile.DoesNotExist):
        return Response({'error': 'Transaction 또는 Evidence를 찾을 수 없습니다.'}, status=404)

    if request.user != transaction.user:
        return Response({'error': '수정 권한이 없습니다.'}, status=403)

    description = request.data.get('description', '').strip()
    if description:
        evidence.description = description
        evidence.save()
        return Response({'message': '설명이 수정되었습니다.', 'description': evidence.description})
    else:
        return Response({'error': '설명이 비어 있습니다.'}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_statistics_by_club(request):
    transactions = Transaction.objects.all()

    stats = transactions.values('user__profile__club_name').annotate(
        total=Count('id'),
        completed=Count('id', filter=Q(review_status='completed')),
        in_progress=Count('id', filter=Q(review_status='in_progress')),
        not_reviewed=Count('id', filter=Q(review_status='not_reviewed')),
    ).order_by('user__profile__club_name')

    result = []
    for entry in stats:
        total = entry['total']
        completed = entry['completed']
        rate = (completed / total * 100) if total > 0 else 0
        result.append({
            'club': entry['user__profile__club_name'] or '미지정',
            'total': total,
            'completed': completed,
            'in_progress': entry['in_progress'],
            'not_reviewed': entry['not_reviewed'],
            'completion_rate': round(rate, 1),
        })

    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_expense_by_club(request, club_name):
    # 수입 데이터 집계
    income_qs = Transaction.objects.filter(
        type='income',
        user__profile__club_name=club_name
    ).annotate(month=TruncMonth('date')).values('month').annotate(
        total_income=Sum('amount')
    )

    # 지출 데이터 집계
    expense_qs = Transaction.objects.filter(
        type='expense',
        user__profile__club_name=club_name
    ).annotate(month=TruncMonth('date')).values('month').annotate(
        total_expense=Sum('amount')
    )

    # 월별로 수입과 지출을 합쳐서 하나의 딕셔너리로 구성
    monthly_data = defaultdict(lambda: {'income': 0, 'expense': 0})

    for entry in income_qs:
        month_str = entry['month'].strftime('%Y-%m')
        monthly_data[month_str]['income'] = entry['total_income']

    for entry in expense_qs:
        month_str = entry['month'].strftime('%Y-%m')
        monthly_data[month_str]['expense'] = entry['total_expense']

    # 월별 정렬 후 리스트로 변환
    result = [
        {
            'month': month,
            'income': monthly_data[month]['income'],
            'expense': monthly_data[month]['expense'],
        }
        for month in sorted(monthly_data.keys())
    ]

    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_club_statistics(request):
    club_name = request.user.profile.club_name

    reviewed = Transaction.objects.filter(
        user__profile__club_name=club_name,
        review_status='completed'
    ).count()

    in_progress = Transaction.objects.filter(
        user__profile__club_name=club_name,
        review_status='in_progress'
    ).count()

    not_reviewed = Transaction.objects.filter(
        user__profile__club_name=club_name,
        review_status='not_reviewed'
    ).count()

    return Response({
        'club': club_name,
        'completed': reviewed,
        'in_progress': in_progress,
        'not_reviewed': not_reviewed,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_club_monthly_summary(request):
    club_name = request.user.profile.club_name

    income_qs = Transaction.objects.filter(
        type='income',
        user__profile__club_name=club_name
    ).annotate(month=TruncMonth('date')).values('month').annotate(
        total_income=Sum('amount')
    )

    expense_qs = Transaction.objects.filter(
        type='expense',
        user__profile__club_name=club_name
    ).annotate(month=TruncMonth('date')).values('month').annotate(
        total_expense=Sum('amount')
    )

    from collections import defaultdict
    monthly_data = defaultdict(lambda: {'income': 0, 'expense': 0})

    for entry in income_qs:
        month_str = entry['month'].strftime('%Y-%m')
        monthly_data[month_str]['income'] = entry['total_income']

    for entry in expense_qs:
        month_str = entry['month'].strftime('%Y-%m')
        monthly_data[month_str]['expense'] = entry['total_expense']

    result = [
        {
            'month': month,
            'income': monthly_data[month]['income'],
            'expense': monthly_data[month]['expense'],
        }
        for month in sorted(monthly_data.keys())
    ]

    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_comment_summary(request):
    user = request.user
    profile = getattr(user, 'profile', None)

    # 🔍 필터링 옵션
    club_name = request.GET.get('club')
    keyword = request.GET.get('keyword')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    only_mine = request.GET.get('only_mine') == 'true'

    # 🔎 코멘트 쿼리셋 기본 정의
    comments = AuditComment.objects.select_related('transaction__user__profile')

    # 🔐 권한에 따른 필터링
    if not (profile and profile.is_auditor):
        # 감사자가 아닌 경우: 본인 거래에 달린 코멘트만
        comments = comments.filter(transaction__user=user)
    elif only_mine:
        # 감사자지만 본인 거래만 보고 싶다면 명시적으로 제한
        comments = comments.filter(transaction__user=user)

    # 📌 추가 필터링
    if club_name:
        comments = comments.filter(transaction__user__profile__club_name=club_name)
    if keyword:
        comments = comments.filter(content__icontains=keyword)
    if start_date and end_date:
        comments = comments.filter(created_at__range=[start_date, end_date])

    comments = comments.order_by('-created_at')

    # ✅ 시리얼라이즈하여 반환
    serializer = AuditCommentSummarySerializer(comments, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_comment_attachment(request, comment_id):
    comment = get_object_or_404(AuditComment, id=comment_id)

    if not comment.attachment:
        return Response({'error': '첨부파일이 없습니다.'}, status=404)

    file_path = comment.attachment.path
    file_name = os.path.basename(file_path)
    content_type, _ = mimetypes.guess_type(file_path)

    response = FileResponse(open(file_path, 'rb'), content_type=content_type or 'application/octet-stream')
    response['Content-Disposition'] = f'attachment; filename="{file_name}"'
    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_transactions(request):
    user = request.user
    profile = getattr(user, 'profile', None)
    export_type = request.GET.get('type', 'pdf')  # 'pdf' or 'zip'

    # 동아리 및 거래 불러오기
    if profile and profile.is_auditor:
        club_name = request.GET.get('club')
        if not club_name:
            return HttpResponse("동아리명을 선택해야 합니다.", status=400)
        transactions = Transaction.objects.filter(user__profile__club_name=club_name).order_by('-date')
        author_label = f"감사자: {user.get_full_name() or user.username} (검토 동아리: {club_name})"
    else:
        club_name = profile.club_name if profile else None
        transactions = Transaction.objects.filter(user=user).order_by('-date')
        author_label = f"{user.get_full_name() or user.username} ({club_name})"

    # 한국 시간 생성 시간
    kst_now = now().astimezone(pytz.timezone('Asia/Seoul'))
    generated_at = kst_now.strftime('%Y-%m-%d %H:%M (%Z)')

    # 거래 리스트 구성
    tx_list = []
    for idx, t in enumerate(transactions, start=1):
        tx_list.append({
            'number': idx,
            'title': t.title,
            'amount': t.amount,
            'date': t.date.strftime('%Y-%m-%d'),
            'type_display': t.get_type_display(),
            'review_status_display': t.get_review_status_display(),
            'username': t.user.username,
            'note': t.note,
            'description': t.description,
            'receipts': [request.build_absolute_uri(r.image.url) for r in t.receipts.all()],
            'evidences': [os.path.basename(e.file.name) for e in t.evidences.all()],
        })

    # 템플릿 렌더링
    context = {
        'transactions': tx_list,
        'author': author_label,
        'generated_at': generated_at,
    }

    html_string = render_to_string('transaction_report.html', context)
    pdf_file = HTML(string=html_string, base_url=request.build_absolute_uri()).write_pdf()

    # PDF 단독 다운로드
    if export_type == 'pdf':
        filename = f'거래내역 보고서_{club_name or "내동아리"}_{kst_now.strftime("%Y.%m.%d")}.pdf'
        quoted = quote(filename)
        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{quoted}"; filename*=UTF-8\'\'{quoted}'
        return response

    # PDF + 증빙 ZIP 다운로드
    elif export_type == 'zip':
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, 'w') as zipf:
            zipf.writestr("report.pdf", pdf_file)
            for t in transactions:
                for e in t.evidences.all():
                    if e.file and os.path.exists(e.file.path):
                        zipf.write(e.file.path, arcname=f"evidences/{os.path.basename(e.file.name)}")
        buffer.seek(0)
        zip_filename = f"거래내역_보고서_{club_name or '내동아리'}_{kst_now.strftime('%Y%m%d')}.zip"
        return FileResponse(buffer, as_attachment=True, filename=zip_filename)

    return HttpResponse("type 파라미터는 'pdf' 또는 'zip'이어야 합니다.", status=400)