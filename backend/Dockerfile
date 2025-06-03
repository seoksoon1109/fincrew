# backend/Dockerfile

FROM python:3.11

# 필수 시스템 패키지 설치 (WeasyPrint용)
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2 \
    pango1.0-tools \
    libpango-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    libglib2.0-0 \
    libxml2 \
    libxslt1.1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 환경 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 작업 디렉토리
WORKDIR /app

# 파이썬 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 앱 소스 복사
COPY . .

# 포트 노출
EXPOSE 8000

# Gunicorn 실행
CMD ["gunicorn", "clubaccounting.wsgi:application", "--bind", "0.0.0.0:8000"]
