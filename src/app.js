const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

// 라우터
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const applicationRoutes = require('./routes/applications');

const app = express();

// 미들웨어 (대용량 사진 업로드 허용)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 정적 파일 제공 (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/applications', applicationRoutes);

// 서비스 헬스체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SPA Fallback: 정적 파일이나 API에 매칭되지 않은 모든 GET 요청은 index.html로 응답
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
  next();
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: '서버 내부 오류가 발생했습니다.' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`🚀 동아리 모집 게시판 서버가 실행되었습니다!`);
    console.log(`📍 주소: http://localhost:${config.port}`);
    console.log(`🔑 조장 가입 코드: ${config.signupInviteCode}`);
    console.log(`=========================================`);
  });
}

module.exports = app;
