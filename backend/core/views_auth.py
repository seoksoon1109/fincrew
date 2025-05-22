from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


@api_view(['POST'])
@permission_classes([AllowAny])  # 🔓 회원가입은 인증 없이 가능
def register(request):
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email', '')

    if not username or not password:
        return Response({'error': '아이디와 비밀번호는 필수입니다.'}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({'error': '이미 존재하는 사용자입니다.'}, status=400)

    user = User.objects.create_user(username=username, password=password, email=email)
    return Response({'message': '회원가입 성공'}, status=status.HTTP_201_CREATED)


# ✅ 커스텀 토큰 응답 - 로그인 시 사용자 정보 포함
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        data['email'] = self.user.email
        return data


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


# ✅ 사용자 정보 조회 (로그인 상태에서만 접근 가능)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_info(request):
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
    })
