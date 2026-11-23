/**
 * Campus Clubs - API Client & Auth Manager
 */

const API_BASE = '/api';
const SUPABASE_URL = 'https://yoazuudwhdyagqzdmjaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYXp1dWR3aGR5YWdxemRtamFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NzMxMzQsImV4cCI6MjEwOTI0OTEzNH0.m9FcYApmCY0iQqEMZ65Aj8IbTt_eb2nhJiUWF_JN3ak';

let supabaseClient = null;
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const auth = {
  getToken() {
    return localStorage.getItem('club_leader_token');
  },
  setToken(token) {
    localStorage.setItem('club_leader_token', token);
  },
  removeToken() {
    localStorage.removeItem('club_leader_token');
  },
  getUser() {
    const raw = localStorage.getItem('club_leader_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser(user) {
    localStorage.setItem('club_leader_user', JSON.stringify(user));
  },
  removeUser() {
    localStorage.removeItem('club_leader_user');
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  logout() {
    this.removeToken();
    this.removeUser();
  }
};

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = auth.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({ success: false, message: '서버 응답 파싱 실패' }));

  if (!response.ok) {
    throw new Error(data.message || '요청 처리 중 오류가 발생했습니다.');
  }

  return data;
}

const api = {
  // 인증
  signup(payload) {
    return request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
  },
  login(payload) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  },
  getMe() {
    return request('/auth/me');
  },

  // 동아리 모집글
  getPosts() {
    return request('/posts');
  },
  getPost(id) {
    return request(`/posts/${id}`);
  },
  createPost(payload) {
    return request('/posts', { method: 'POST', body: JSON.stringify(payload) });
  },
  toggleClosePost(id) {
    return request(`/posts/${id}/close`, { method: 'PATCH' });
  },
  deletePost(id) {
    return request(`/posts/${id}`, { method: 'DELETE' });
  },
  addPostPhoto(postId, photoUrl) {
    return request(`/posts/${postId}/photos`, {
      method: 'POST',
      body: JSON.stringify({ photoUrl })
    });
  },

  // 지원 신청
  apply(postId, payload) {
    return request(`/posts/${postId}/apply`, { method: 'POST', body: JSON.stringify(payload) });
  },

  // 지원자 관리
  getApplications(postId) {
    return request(`/posts/${postId}/applications`);
  },
  updateApplicationStatus(applicationId, status) {
    return request(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }
};

// 토스트 메시지 헬퍼
function showToast(message, type = 'normal') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
