from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .serializers import UserSerializer
from core.models import Profile  # ✅ Profile import

@api_view(['POST'])
@permission_classes([AllowAny])  # 🔓 회원가입은 인증 없이 가능
def register(request):
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email', '')
    club_name = request.data.get('club_name')  # ✅ 동아리명 입력 받기

    if not username or not password or not club_name:
        return Response({'error': '아이디, 비밀번호, 동아리명은 필수입니다.'}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({'error': '이미 존재하는 사용자입니다.'}, status=400)

    if Profile.objects.filter(club_name=club_name).exists():
        return Response({'error': '이미 사용 중인 동아리명입니다.'}, status=400)

    # ✅ 1. 유저 생성
    user = User.objects.create_user(username=username, password=password, email=email)

    # ✅ 2. 자동 생성된 프로필에 동아리명 저장
    user.profile.club_name = club_name
    user.profile.save()

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_info(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
