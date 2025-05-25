from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from .serializers import TransactionSerializer
from .serializers import ReceiptSerializer
from .permissions import IsOwnerOrReadOnlyForAuditor
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Notice
from .serializers import NoticeSerializer
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from .models import Transaction, Receipt, Member
from .forms import ExcelUploadForm
import pandas as pd
from datetime import datetime
import json
import os, re
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Notice
from .serializers import NoticeSerializer

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
        receipt = Receipt.objects.filter(transaction_id=transaction_id, transaction__user=request.user).latest('upload_date')
        if not receipt.image:  # ← 이 확인이 중요!
            return JsonResponse({'error': '이미지가 존재하지 않습니다.'}, status=404)
        return JsonResponse({ 'image_url': receipt.image.url })
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
    } for t in transactions]
    return JsonResponse(data, safe=False)

@api_view(['PUT'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def transaction_detail_with_receipt(request, pk):
    transaction = get_object_or_404(Transaction, pk=pk, user=request.user)

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
    except Exception as e:
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


@api_view(['DELETE', 'PUT', 'PATCH'])  # ✅ PATCH 추가
@permission_classes([IsAuthenticated])
def transaction_detail(request, pk):
    try:
        transaction = Transaction.objects.get(pk=pk, user=request.user)
    except Transaction.DoesNotExist:
        return JsonResponse({'error': 'Transaction not found'}, status=404)

    if request.method in ['PUT', 'PATCH']:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        for field in ['title', 'amount', 'note', 'date']:
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
        return JsonResponse({'message': 'Transaction deleted'}, status=204)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_transactions(request):
    if not request.user.is_auditor:
        return Response({'detail': '접근 권한이 없습니다.'}, status=403)
    
    transactions = Transaction.objects.all().order_by('-date')
    serializer = TransactionSerializer(transactions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_receipts(request):
    if not request.user.is_auditor:
        return Response({'detail': '접근 권한이 없습니다.'}, status=403)
    
    receipts = Receipt.objects.select_related('transaction').all().order_by('-uploaded_at')
    serializer = ReceiptSerializer(receipts, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def notice_list_create(request):
    if request.method == 'GET':
        notices = Notice.objects.all().order_by('-created_at')
        serializer = NoticeSerializer(notices, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = NoticeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(author=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def notice_detail(request, pk):
    try:
        notice = Notice.objects.get(pk=pk)
    except Notice.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = NoticeSerializer(notice)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = NoticeSerializer(notice, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        notice.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auditor_dashboard_summary(request):
    user = request.user

    if not hasattr(user, 'profile') or not user.profile.is_auditor:
        return Response({'detail': '접근 권한이 없습니다.'}, status=403)

    data = {
        'audited_clubs_count': 12,
        'flagged_transaction_count': 9,
        'average_expense_ratio': 62.3,
        'average_receipt_ratio': 89.4,
        'audit_completion_rate': 57.1
    }

    return Response(data)