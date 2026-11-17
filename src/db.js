const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'club.db');
const db = new Database(dbPath);

// 외래 키 제약 조건 활성화 & WAL 모드 (성능 및 동시성 향상)
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDatabase() {
  // 1. users 테이블 (조장 계정)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. posts 테이블 (동아리 모집글)
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      club_name TEXT NOT NULL,
      poster_url TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '일반',
      summary TEXT NOT NULL,
      intro TEXT NOT NULL,
      activities TEXT NOT NULL,
      members TEXT NOT NULL,
      is_closed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  // 3. applications 테이블 (지원 내역)
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      department TEXT NOT NULL,
      grade TEXT NOT NULL,
      name TEXT NOT NULL,
      student_id TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT '대기',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
    );
  `);

  // 기본 시드 데이터 주입 (테이블이 비어 있는 경우)
  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  console.log('🌱 초기 샘플 데이터 시딩 중...');

  // 기본 조장 계정 생성: 아이디 'leader1', 비밀번호 '1234', 이름 '이후경 조장'
  const passwordHash = bcrypt.hashSync('1234', 10);
  const insertUser = db.prepare(`
    INSERT INTO users (username, password, name)
    VALUES (?, ?, ?)
  `);
  const userResult = insertUser.run('leader1', passwordHash, '이후경 조장');
  const userId = userResult.lastInsertRowid;

  // 두 번째 조장 생성: 아이디 'leader2', 비밀번호 '1234', 이름 '김민수 조장'
  const userResult2 = insertUser.run('leader2', passwordHash, '김민수 조장');
  const userId2 = userResult2.lastInsertRowid;

  // 샘플 동아리 목록 삽입
  const insertPost = db.prepare(`
    INSERT INTO posts (user_id, club_name, poster_url, category, summary, intro, activities, members, is_closed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const p1 = insertPost.run(
    userId,
    '코드 크래프트 (Code Craft)',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1000&auto=format&fit=crop&q=80',
    'IT / 개발',
    '웹·앱 개발부터 알고리즘 스터디까지 함께 성장하는 개발 동아리',
    '안녕하세요! 한국폴리텍대학 아산캠퍼스 공식 개발 동아리 코드 크래프트입니다.\n비전공자부터 실력자까지, 서로 배우고 함께 프로젝트를 완성하는 열정 가득한 동아리입니다. 깃허브 협업, 해커톤 참가, 실제 배포 가능한 서비스 제작을 목표로 합니다!',
    '• 주 1회 알고리즘 & CS 기초 스터디\n• 방학 중 4주 완성 팀 프로젝트 (웹/모바일 앱)\n• 교내 및 전국 해커톤 연합 참가\n• IT 현직 선배 초청 멘토링 & 기술 세미나',
    '이후경(회장), 박지훈(부회장), 정예은, 최현우, 한소희',
    0
  );

  const p2 = insertPost.run(
    userId,
    '소리울림 (Acoustic & Band)',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1000&auto=format&fit=crop&q=80',
    '음악 / 밴드',
    '음악을 사랑하는 사람들의 모임, 정기 공연과 버스킹을 함께해요',
    '악기를 다룰 줄 몰라도 음악을 사랑하는 마음만 있다면 누구나 환영합니다!\n보컬, 기타, 베이스, 드럼, 키보드뿐만 아니라 음향 및 공연 기획에 관심 있는 분들의 많은 지원 바랍니다. 봄 정기 버스킹과 가을 축제 메인 무대를 함께 빛내요!',
    '• 매주 금요일 합주실 자유 연습 및 정기 세션\n• 학기별 캠퍼스 잔디밭 정기 버스킹\n• 가을 대학 대동제 축제 메인 무대 공연\n• 곡 카피 및 자작곡 음원 녹음 프로젝트',
    '이후경(회장), 강다니엘(기타), 윤채원(보컬), 임성진(드럼)',
    0
  );

  const p3 = insertPost.run(
    userId2,
    '포커스 (FOCUS)',
    'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1000&auto=format&fit=crop&q=80',
    '사진 / 영상',
    '캠퍼스의 사계절과 청춘의 찰나를 렌즈에 담는 출사 동아리',
    '스마트폰 카메라로도 충분합니다! 좋은 시선과 따뜻한 감성을 공유하는 사진 & 영상 제작 동아리 FOCUS입니다.\n월 1~2회 주말 출사를 떠나며, 필름 카메라 및 라이트룸/프리미어 보정 워크샵을 진행합니다.',
    '• 월 2회 서울/근교 감성 출사 (출사지 투표제)\n• 스마트폰 & 카메라 기초 촬영 기법 세미나\n• 어도비 라이트룸/프리미어프로 후보정 멘토링\n• 연말 학내 사진전 개최 및 굿즈(엽서/달력) 제작',
    '김민수(회장), 오세훈, 송지민, 배수지',
    0
  );

  const p4 = insertPost.run(
    userId2,
    '슬램덩크 (Slam Dunk)',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1000&auto=format&fit=crop&q=80',
    '체육 / 농구',
    '땀 흘리며 스트레스 해소! 교내 리그 우승을 노리는 열정 농구 동아리',
    '매주 즐겁게 운동하고 친목을 다지는 중앙 농구 동아리입니다.\n초보자를 위한 기본기 훈련부터 교내 체육대회 및 타 대학 친선 교류전까지 활발하게 운영 중입니다. 열정 넘치는 신입 회원을 모집합니다!',
    '• 화/목 저녁 정기 코트 연습 및 자체 미니게임\n• 기초 드리블/슈팅 드릴 훈련 세션\n• 대학 리그전 및 타 대학 친선전 참가\n• 프로농구(KBL) 단체 직관 및 친목 MT',
    '김민수(회장), 이정우, 신민혁, 고동욱',
    1 // 마감 테스트용
  );

  // 샘플 지원자 데이터 삽입 (p1에 지원자 2명)
  const insertApp = db.prepare(`
    INSERT INTO applications (post_id, department, grade, name, student_id, message, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertApp.run(
    p1.lastInsertRowid,
    '인공지능소프트웨어과',
    '1학년',
    '홍길동',
    '202611001',
    '웹 프론트엔드 개발에 관심이 많습니다. 방학 프로젝트에 꼭 참여하고 싶습니다!',
    '대기'
  );

  insertApp.run(
    p1.lastInsertRowid,
    '컴퓨터공학과',
    '2학년',
    '이서연',
    '202512045',
    '작년에 C언어를 배웠고 올해 리액트와 노드js를 배우고 있습니다. 잘 부탁드립니다.',
    '승인'
  );

  console.log('✅ 초기 샘플 데이터 시딩 완료!');
}

initDatabase();

module.exports = db;
