# 🎓 한국폴리텍 아산캠퍼스 동아리 모집게시판

> 한국폴리텍대학 아산캠퍼스 동아리 모집 게시판 서비스입니다.  
> 단체 채팅방과 포스터에 흩어져 있던 동아리 모집 공고를 한곳에 모으고, 카드 슬라이더 인터페이스를 통해 직관적으로 탐색 및 지원할 수 있습니다.

---

## 🌟 핵심 기능 요약

### 1. 🧑‍🎓 학생 (비로그인 이용자)
- **카드 슬라이더 탐색**: 화면 중앙 약 70% 크기의 입체 카드 슬라이더로 동아리 공고를 좌우로 넘겨보며 탐색 (마우스 드래그, 모바일 터치 스와이프, 방향키 지원).
- **원클릭 상세 확인**: 카드를 클릭하면 소개글, 주요 활동 내용, 회원 이름(구성원)을 한눈에 확인.
- **간편 지원 신청 (회원가입 불필요)**: 학과, 학년, 이름, 학번만 입력하면 10초 만에 지원 완료.
- **마감 여부 실시간 표시**: 모집 마감된 동아리는 마감 뱃지가 부여되고 지원 버튼이 비활성화됨.

### 2. 👑 동아리 조장 (인증된 관리자)
- **가입 코드 기반 회원가입**: 지정된 조장 가입 코드(`CLUB2026!`)를 입력해야만 계정 생성 가능 (부정 가입 방지).
- **5분 빠른 동아리 등록**: 포스터 URL, 동아리명, 소개글, 활동 내용, 회원 이름을 입력하여 즉시 공고 게시 (고품질 샘플 프리셋 지원).
- **지원자 명단 관리 및 심사**: 해당 동아리 조장만 지원자 목록(학과, 학년, 학번, 이름, 메시지)을 열람하고 `대기` / `승인` / `거절` 처리.
- **모집 마감 및 삭제**: 모집 인원이 차면 클릭 한 번으로 모집을 마감하거나 공고를 삭제.
- **철저한 접근 제어**: 비로그인 상태이거나 타 동아리 조장인 경우 지원자 열람·승인·마감·삭제가 시스템적으로 차단됨.

---

## 🛠️ 기술 스택

- **Backend**: Node.js, Express.js
- **Database**: SQLite (`better-sqlite3`, WAL 모드 지원)
- **Authentication**: JWT (JSON Web Token), `bcryptjs` 비밀번호 단방향 암호화
- **Frontend**: 모던 Vanilla HTML5, CSS3, ES6 JavaScript (외부 프레임워크 종속성 없는 가볍고 빠른 반응형 SPA)
- **Typography & Icons**: Pretendard 폰트, 인라인 SVG 아이콘
- **Deployment**: Render (또는 Railway, Cloudtype, Fly.io 등 Node.js 호스팅)

---

## 🚀 로컬 실행 방법

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일에 필요한 설정을 확인하거나 변경합니다 (기본 설정 포함됨).
```ini
PORT=3000
JWT_SECRET=super-secret-club-recruitment-key-change-in-production
SIGNUP_INVITE_CODE=CLUB2026!
```

### 3. 서버 실행
```bash
npm start
```
브라우저에서 `http://localhost:3000` 접속!

### 4. 자동화 기능 검증 테스트
```bash
npm test
```

---

## 🔑 기본 테스트 계정 및 가입 코드

- **조장 가입 코드**: `CLUB2026!`
- **미리 생성된 테스트 조장 계정 1**:
  - 아이디: `leader1`
  - 비밀번호: `1234`
  - 이름: 이후경 조장 (코드 크래프트, 소리울림 등록됨)
- **미리 생성된 테스트 조장 계정 2**:
  - 아이디: `leader2`
  - 비밀번호: `1234`
  - 이름: 김민수 조장 (포커스, 슬램덩크 등록됨)

---

## 🌐 Render 배포 가이드 (GitHub 연동 무료 배포)

이 프로젝트는 Render 배포를 위한 `render.yaml` 및 `Procfile`이 사전에 완벽히 구성되어 있습니다.

### 단계 1: GitHub 리포지토리 생성 및 푸시
1. [GitHub](https://github.com)에 로그인 후 새 Repository를 생성합니다 (예: `club-recruitment-board`).
2. 로컬 터미널에서 다음 명령어를 실행하여 코드를 푸시합니다:
```bash
git init
git add .
git commit -m "Initial commit: 동아리 모집 게시판 PRD 완성본"
git branch -M main
git remote add origin https://github.com/<내-깃허브-아이디>/<리포지토리명>.git
git push -u origin main
```

### 단계 2: Render에서 웹 서비스 생성
1. [Render.com](https://render.com)에 로그인합니다.
2. 대시보드 우측 상단의 **[New +]** 버튼을 누르고 **[Web Service]**를 선택합니다.
3. 단계 1에서 올린 GitHub 리포지토리를 연결(Connect)합니다.
4. 아래 설정값을 확인합니다:
   - **Name**: `campus-clubs` (원하는 이름)
   - **Region**: `Singapore` (한국과 가까움)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (무료)
5. **Environment Variables (환경 변수)** 추가:
   - `JWT_SECRET`: 안전한 랜덤 문자열 입력
   - `SIGNUP_INVITE_CODE`: `CLUB2026!` (또는 원하는 조장 가입 코드)
   - `NODE_VERSION`: `20.18.0` (또는 `22`)
6. **[Deploy Web Service]** 버튼을 클릭하면 약 1~2분 후 배포가 완료되고 나만의 URL(`https://campus-clubs.onrender.com`)이 생성됩니다!

> ⚠️ **무료 플랜 안내 (PRD 명시)**  
> Render 무료 티어는 인스턴스가 15분 동안 요청이 없을 시 슬립 상태로 들어가며, 재배포 시 SQLite 파일(`.db`)이 초기화될 수 있습니다. 초기화되더라도 서버 재시작 시 시드 데이터(기본 조장 계정과 4개 동아리)가 자동으로 복구되도록 설계되어 있습니다. 영구 저장이 필요할 경우 Render의 Persistent Disk 또는 클라우드 DB(Turso, Supabase 등)를 연동할 수 있습니다.
