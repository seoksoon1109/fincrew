import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 기본적으로 /api, /upload 경로는 Django 서버로 프록시
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/',  // Django nginx 서빙용 경로, 배포 시 변경하지 말 것
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,  // 원하는 경우 명시
    proxy: {
      '^/api/.*': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/upload/.*': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    }
  }
}))
