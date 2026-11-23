/**
 * Campus Clubs - Main Application Logic
 * PRD 요구사항 충족: 회원가입, 로그인, 등록, 카드 슬라이더, 상세 조회, 지원 신청, 승인/거절, 마감, 삭제
 */

document.addEventListener('DOMContentLoaded', () => {
  // 상태 변수
  let currentPosts = [];
  let currentDetailPost = null;
  let currentApplications = [];
  let currentFilter = 'all';

  // DOM 요소 참조
  const guestNav = document.getElementById('guestNav');
  const leaderNav = document.getElementById('leaderNav');
  const navLeaderName = document.getElementById('navLeaderName');
  const btnOpenLoginModal = document.getElementById('btnOpenLoginModal');
  const btnOpenSignupModal = document.getElementById('btnOpenSignupModal');
  const btnOpenCreatePost = document.getElementById('btnOpenCreatePost');
  const btnLogout = document.getElementById('btnLogout');
  const btnLogo = document.getElementById('btnLogo');

  // 모달 요소들
  const detailModal = document.getElementById('detailModal');
  const applyModal = document.getElementById('applyModal');
  const applicationsModal = document.getElementById('applicationsModal');
  const signupModal = document.getElementById('signupModal');
  const loginModal = document.getElementById('loginModal');
  const createPostModal = document.getElementById('createPostModal');
  const photoLightboxModal = document.getElementById('photoLightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');

  // 이미지 자르기 (Cropper) 모달 관련 요소
  const imageCropperModal = document.getElementById('imageCropperModal');
  const cropperImageElement = document.getElementById('cropperImageElement');
  const btnApplyCrop = document.getElementById('btnApplyCrop');
  const btnCropRotateLeft = document.getElementById('btnCropRotateLeft');
  const btnCropRotateRight = document.getElementById('btnCropRotateRight');
  const btnCropReset = document.getElementById('btnCropReset');

  // 활동사진 추가 관련 DOM
  const btnAddActivityPhoto = document.getElementById('btnAddActivityPhoto');
  const fileInputActivityPhoto = document.getElementById('fileInputActivityPhoto');

  // 동아리 등록 파일 자르기 관련 DOM
  const btnUploadPosterFile = document.getElementById('btnUploadPosterFile');
  const fileInputPoster = document.getElementById('fileInputPoster');
  const btnUploadActivityPhotoFile = document.getElementById('btnUploadActivityPhotoFile');
  const fileInputCreatePhotos = document.getElementById('fileInputCreatePhotos');

  // Cropper 상태
  let cropperInstance = null;
  let onCropCompleteCallback = null;

  function openCropper(file, onComplete, defaultRatio = NaN) {
    if (!file) return;
    onCropCompleteCallback = onComplete;

    const reader = new FileReader();
    reader.onload = (e) => {
      cropperImageElement.src = e.target.result;
      openModal(imageCropperModal);

      // 모달 렌더링 후 Cropper 인스턴스 초기화
      setTimeout(() => {
        if (cropperInstance) {
          cropperInstance.destroy();
        }

        // 비율 버튼 상태 갱신
        document.querySelectorAll('.btn-crop-tool[data-ratio]').forEach(btn => {
          const r = parseFloat(btn.dataset.ratio);
          btn.classList.toggle('active', isNaN(defaultRatio) ? isNaN(r) : Math.abs(r - defaultRatio) < 0.05);
        });

        cropperInstance = new Cropper(cropperImageElement, {
          aspectRatio: defaultRatio,
          viewMode: 1,
          autoCropArea: 0.9,
          responsive: true,
          restore: false
        });
      }, 100);
    };
    reader.readAsDataURL(file);
  }

  // 자르기 비율 버튼 이벤트
  document.querySelectorAll('.btn-crop-tool[data-ratio]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-crop-tool[data-ratio]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const ratio = parseFloat(btn.dataset.ratio);
      if (cropperInstance) {
        cropperInstance.setAspectRatio(ratio);
      }
    });
  });

  // 자르기 회전 및 리셋
  btnCropRotateLeft.addEventListener('click', () => {
    if (cropperInstance) cropperInstance.rotate(-90);
  });
  btnCropRotateRight.addEventListener('click', () => {
    if (cropperInstance) cropperInstance.rotate(90);
  });
  btnCropReset.addEventListener('click', () => {
    if (cropperInstance) cropperInstance.reset();
  });

  // 자르기 완료 버튼
  btnApplyCrop.addEventListener('click', () => {
    if (!cropperInstance) return;
    const canvas = cropperInstance.getCroppedCanvas({
      maxWidth: 1600,
      maxHeight: 1600,
      imageSmoothingQuality: 'high'
    });

    if (!canvas) {
      showToast('이미지 자르기에 실패했습니다.', 'error');
      return;
    }

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    closeModal(imageCropperModal);

    if (onCropCompleteCallback) {
      onCropCompleteCallback(croppedDataUrl);
      onCropCompleteCallback = null;
    }
  });

  // 포스터 패닝 인터랙션 변수
  const detailPosterWrap = document.getElementById('detailPosterWrap');
  const posterPanContainer = document.getElementById('posterPanContainer');
  const detailPosterImg = document.getElementById('detailPosterImg');
  const btnFitPoster = document.getElementById('btnFitPoster');
  const btnResetPoster = document.getElementById('btnResetPoster');

  let isPosterPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let currentPanX = 0;
  let currentPanY = 0;
  let posterScale = 1.0;

  function applyPosterTransform() {
    detailPosterImg.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${posterScale})`;
  }

  function resetPosterPan() {
    currentPanX = 0;
    currentPanY = 0;
    posterScale = 1.0;
    applyPosterTransform();
  }

  // 포스터 마우스 드래그 이벤트 (상하좌우 자유 이동)
  posterPanContainer.addEventListener('mousedown', (e) => {
    isPosterPanning = true;
    panStartX = e.clientX - currentPanX;
    panStartY = e.clientY - currentPanY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPosterPanning) return;
    currentPanX = e.clientX - panStartX;
    currentPanY = e.clientY - panStartY;
    applyPosterTransform();
  });

  window.addEventListener('mouseup', () => {
    isPosterPanning = false;
  });

  // 포스터 휠 확대/축소
  posterPanContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.1 : -0.1;
    posterScale = Math.min(Math.max(0.6, posterScale + zoomFactor), 3.5);
    applyPosterTransform();
  }, { passive: false });

  // 전체보기(Fit) 버튼: 1배율 중앙 복귀
  btnFitPoster.addEventListener('click', (e) => {
    e.stopPropagation();
    resetPosterPan();
  });

  // 채우기/확대(Fill) 버튼: 1.5배율로 확대하여 세부 확인
  btnResetPoster.addEventListener('click', (e) => {
    e.stopPropagation();
    currentPanX = 0;
    currentPanY = 0;
    posterScale = 1.5;
    applyPosterTransform();
  });

  // 폼 요소들
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');
  const createPostForm = document.getElementById('createPostForm');
  const applyForm = document.getElementById('applyForm');

  // 링크 전환
  const linkToLogin = document.getElementById('linkToLogin');
  const linkToSignup = document.getElementById('linkToSignup');

  // 슬라이더 인스턴스 초기화
  let currentPosterEditPostId = null;

  const slider = new CardSlider({
    onCardClick: (post) => openDetailModal(post),
    onEditPoster: (post) => triggerPosterEdit(post)
  });

  // ==========================================
  // 1. 초기화 및 인증 상태 동기화
  // ==========================================
  function updateAuthUI() {
    const user = auth.getUser();
    if (auth.isLoggedIn() && user) {
      guestNav.style.display = 'none';
      leaderNav.style.display = 'flex';
      navLeaderName.textContent = user.name || '조장';
    } else {
      guestNav.style.display = 'flex';
      leaderNav.style.display = 'none';
    }
    if (currentPosts && currentPosts.length > 0) {
      slider.render();
    }
  }

  async function loadPosts() {
    // 1) 이전 캐시가 있으면 로딩 대기 없이 0초 만에 화면에 즉시 표시!
    const cached = localStorage.getItem('cached_club_posts');
    if (cached && currentPosts.length === 0) {
      try {
        currentPosts = JSON.parse(cached);
        slider.setPosts(currentPosts);
      } catch (e) {}
    }

    // 2) 백그라운드에서 최신 데이터 가져와 갱신
    try {
      const res = await api.getPosts();
      if (res.success) {
        currentPosts = res.posts;
        slider.setPosts(currentPosts);
        localStorage.setItem('cached_club_posts', JSON.stringify(currentPosts));

        // 상세 모달이 열려 있는 상태라면 상세 정보도 최신화
        if (currentDetailPost && detailModal.style.display === 'flex') {
          const updated = currentPosts.find(p => p.id === currentDetailPost.id);
          if (updated) {
            currentDetailPost = { ...currentDetailPost, ...updated };
            renderDetailModal(currentDetailPost);
          }
        }
      }
    } catch (err) {
      console.error(err);
      if (currentPosts.length === 0) {
        showToast('동아리 목록을 불러오지 못했습니다.', 'error');
      }
    }
  }

  // ==========================================
  // 2. 모달 공통 제어
  // ==========================================
  function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    // 다른 모달이 아직 열려 있지 않으면 스크롤 복원
    const anyOpen = document.querySelector('.modal-backdrop[style*="display: flex"]');
    if (!anyOpen) {
      document.body.style.overflow = '';
    }
  }

  // 모든 닫기 버튼(&times; 및 data-close-modal) 리스너
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-backdrop');
      closeModal(modal);
    });
  });

  // 모달 바깥 배경 클릭 시 닫기
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // ESC 키로 모달 닫기
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal-backdrop[style*="display: flex"]');
      openModals.forEach(modal => closeModal(modal));
    }
  });

  // ==========================================
  // 3. 네비게이션 & 로그인/가입 이벤트
  // ==========================================
  btnOpenLoginModal.addEventListener('click', () => openModal(loginModal));
  btnOpenSignupModal.addEventListener('click', () => openModal(signupModal));
  btnOpenCreatePost.addEventListener('click', () => {
    if (!auth.isLoggedIn()) {
      showToast('조장 로그인 후 동아리를 등록할 수 있습니다.', 'error');
      openModal(loginModal);
      return;
    }
    createPostForm.reset();
    document.getElementById('posterPreviewContainer').style.display = 'none';
    openModal(createPostModal);
  });

  btnLogout.addEventListener('click', () => {
    auth.logout();
    updateAuthUI();
    loadPosts();
    showToast('로그아웃되었습니다.');
  });

  btnLogo.addEventListener('click', () => {
    slider.goToIndex(0);
  });

  linkToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(signupModal);
    openModal(loginModal);
  });

  linkToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(loginModal);
    openModal(signupModal);
  });

  // 조장 회원가입 제출 (PRD: 가입 코드를 아는 조장만 가입)
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inviteCode = document.getElementById('signupInviteCode').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const name = document.getElementById('signupName').value.trim();
    const password = document.getElementById('signupPassword').value;

    try {
      const res = await api.signup({ inviteCode, username, name, password });
      if (res.success) {
        auth.setToken(res.token);
        auth.setUser(res.user);
        updateAuthUI();
        closeModal(signupModal);
        signupForm.reset();
        showToast(res.message || '조장 회원가입이 완료되었습니다!', 'success');
        loadPosts();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // 조장 로그인 제출
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await api.login({ username, password });
      if (res.success) {
        auth.setToken(res.token);
        auth.setUser(res.user);
        updateAuthUI();
        closeModal(loginModal);
        loginForm.reset();
        showToast(res.message || '로그인되었습니다!', 'success');
        loadPosts();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ==========================================
  // 4. 동아리 상세 화면 (PRD: 소개글, 활동 내용, 회원 이름, 신청 버튼)
  // ==========================================
  async function openDetailModal(post) {
    currentDetailPost = post;
    renderDetailModal(post);
    openModal(detailModal);

    // 상세 내용(활동사진 및 상세 본문) 비동기 보강
    try {
      const res = await api.getPost(post.id);
      if (res.success && res.post) {
        currentDetailPost = res.post;
        renderDetailModal(res.post);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function renderDetailModal(post) {
    const isClosed = post.is_closed === 1;
    const currentUser = auth.getUser();
    const isOwner = currentUser && (post.user_id === currentUser.id || post.is_mine);

    // 포스터 및 기본 정보
    const posterImg = document.getElementById('detailPosterImg');
    posterImg.src = post.poster_url;
    posterImg.onerror = () => { posterImg.src = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800'; };

    document.getElementById('detailCategory').textContent = post.category || '일반';
    
    const statusBadge = document.getElementById('detailStatus');
    statusBadge.textContent = isClosed ? '모집마감' : '모집중';
    statusBadge.className = `badge badge-status ${isClosed ? 'closed' : ''}`;

    document.getElementById('detailLeader').textContent = `조장: ${post.leader_name || '동아리장'}`;
    document.getElementById('detailAppCount').textContent = `현재 지원자 ${post.application_count || 0}명`;
    document.getElementById('detailTitle').textContent = post.club_name;
    document.getElementById('detailSummary').textContent = post.summary || '';
    document.getElementById('detailIntro').textContent = post.intro;
    document.getElementById('detailActivities').textContent = post.activities;
    document.getElementById('detailMembers').textContent = post.members;

    // 포스터 패닝 위치 초기화
    resetPosterPan();

    // 활동사진 갤러리 렌더링
    const galleryContainer = document.getElementById('detailPhotoGallery');
    galleryContainer.innerHTML = '';

    // 활동사진 추가 버튼 항상 표시 (비로그인 시 로그인 유도)
    btnAddActivityPhoto.style.display = 'inline-flex';

    const photoUrls = (post.activity_photos || '')
      .split(/[,\n]/)
      .map(url => url.trim())
      .filter(url => url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'));

    if (photoUrls.length === 0) {
      galleryContainer.innerHTML = `<p class="empty-photos-text">등록된 동아리 활동사진이 없습니다.</p>`;
    } else {
      photoUrls.forEach(url => {
        const item = document.createElement('div');
        item.className = 'photo-gallery-item';
        item.innerHTML = `
          <img src="${escapeHtml(url)}" alt="동아리 활동사진" onerror="this.parentElement.style.display='none'">
          <div class="photo-gallery-overlay">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          </div>
        `;
        item.addEventListener('click', () => {
          lightboxImg.src = url;
          openModal(photoLightboxModal);
        });
        galleryContainer.appendChild(item);
      });
    }

    // 학생용 지원하기 버튼 설정
    const btnOpenApply = document.getElementById('btnOpenApplyForm');
    if (isClosed) {
      btnOpenApply.disabled = true;
      btnOpenApply.innerHTML = `<span>모집이 마감되었습니다</span>`;
    } else {
      btnOpenApply.disabled = false;
      btnOpenApply.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        <span>지원 신청하기</span>
      `;
    }

    // 해당 동아리 조장 전용 도구 영역 표시/숨김
    const leaderControls = document.getElementById('leaderDetailControls');
    const btnEditPosterOverlay = document.getElementById('btnEditPosterOverlay');
    const btnChangePoster = document.getElementById('btnChangePoster');

    if (isOwner) {
      leaderControls.style.display = 'block';
      if (btnEditPosterOverlay) btnEditPosterOverlay.style.display = 'inline-flex';
      if (btnChangePoster) btnChangePoster.style.display = 'inline-flex';
      document.getElementById('leaderPendingBadge').textContent = post.pending_count !== undefined ? post.pending_count : (post.application_count || 0);
      document.getElementById('closeToggleText').textContent = isClosed ? '모집 재개하기' : '모집 마감하기';
    } else {
      leaderControls.style.display = 'none';
      if (btnEditPosterOverlay) btnEditPosterOverlay.style.display = 'none';
      if (btnChangePoster) btnChangePoster.style.display = 'none';
    }
  }

  // 지원 신청 모달 열기
  document.getElementById('btnOpenApplyForm').addEventListener('click', () => {
    if (!currentDetailPost) return;
    if (currentDetailPost.is_closed === 1) {
      showToast('모집이 마감되어 지원할 수 없습니다.', 'error');
      return;
    }
    document.getElementById('applyClubName').textContent = currentDetailPost.club_name;
    applyForm.reset();
    openModal(applyModal);
  });

  // 지원서 제출 (학생용: 로그인 불필요)
  applyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentDetailPost) return;

    const payload = {
      department: document.getElementById('applyDept').value.trim(),
      grade: document.getElementById('applyGrade').value,
      name: document.getElementById('applyName').value.trim(),
      student_id: document.getElementById('applyStudentId').value.trim(),
      message: document.getElementById('applyMessage').value.trim()
    };

    try {
      const res = await api.apply(currentDetailPost.id, payload);
      if (res.success) {
        closeModal(applyModal);
        applyForm.reset();
        showToast(res.message || '지원서가 정상적으로 제출되었습니다!', 'success');
        loadPosts();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ==========================================
  // 5. 조장 전용 기능: 동아리 모집 마감 및 삭제
  // ==========================================
  // 마감 / 재개 토글
  document.getElementById('btnToggleClosePost').addEventListener('click', async () => {
    if (!currentDetailPost) return;
    try {
      const res = await api.toggleClosePost(currentDetailPost.id);
      if (res.success) {
        showToast(res.message, 'success');
        await loadPosts();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // 동아리 삭제
  document.getElementById('btnDeletePost').addEventListener('click', async () => {
    if (!currentDetailPost) return;
    if (!confirm(`정말로 '${currentDetailPost.club_name}' 동아리 모집글을 삭제하시겠습니까?\n모든 지원자 내역도 함께 삭제됩니다.`)) {
      return;
    }

    try {
      const res = await api.deletePost(currentDetailPost.id);
      if (res.success) {
        showToast(res.message || '동아리 공고가 삭제되었습니다.', 'success');
        closeModal(detailModal);
        currentDetailPost = null;
        loadPosts();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ==========================================
  // 6. 조장 전용 기능: 지원자 명단 관리 및 승인/거절
  // ==========================================
  document.getElementById('btnViewApplications').addEventListener('click', async () => {
    if (!currentDetailPost) return;
    await loadApplications(currentDetailPost.id);
    openModal(applicationsModal);
  });

  async function loadApplications(postId) {
    try {
      const res = await api.getApplications(postId);
      if (res.success) {
        currentApplications = res.applications;
        document.getElementById('appManageClubName').textContent = res.club_name || currentDetailPost.club_name;
        renderApplicantList();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function renderApplicantList() {
    const listContainer = document.getElementById('applicantList');
    listContainer.innerHTML = '';

    // 카운트 업데이트
    const total = currentApplications.length;
    const pending = currentApplications.filter(a => a.status === '대기').length;
    const approved = currentApplications.filter(a => a.status === '승인').length;
    const rejected = currentApplications.filter(a => a.status === '거절').length;

    document.getElementById('countAll').textContent = total;
    document.getElementById('countPending').textContent = pending;
    document.getElementById('countApproved').textContent = approved;
    document.getElementById('countRejected').textContent = rejected;

    const filtered = currentFilter === 'all' 
      ? currentApplications 
      : currentApplications.filter(a => a.status === currentFilter);

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding: 30px;">
          <p style="color: #64748b; font-weight: 600;">해당 상태의 지원자가 없습니다.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(app => {
      const item = document.createElement('div');
      item.className = 'applicant-card';

      let statusBadgeClass = 'badge-pending';
      if (app.status === '승인') statusBadgeClass = 'badge-approved';
      if (app.status === '거절') statusBadgeClass = 'badge-rejected';

      item.innerHTML = `
        <div class="applicant-header">
          <div class="applicant-info-title">
            <span class="applicant-name">${escapeHtml(app.name)}</span>
            <span class="applicant-badge ${statusBadgeClass}">${app.status}</span>
          </div>
          <span style="font-size: 0.76rem; color: #94a3b8;">${new Date(app.created_at).toLocaleDateString()}</span>
        </div>

        <div class="applicant-subinfo">
          <span>🎓 ${escapeHtml(app.department)}</span> · <span>${escapeHtml(app.grade)}</span> · <span>학번: ${escapeHtml(app.student_id)}</span>
        </div>

        ${app.message ? `<div class="applicant-message">"${escapeHtml(app.message)}"</div>` : ''}

        <div class="applicant-controls">
          <button class="btn btn-outline btn-sm" data-action="status" data-status="대기" data-id="${app.id}">대기</button>
          <button class="btn btn-primary btn-sm" data-action="status" data-status="승인" data-id="${app.id}">승인</button>
          <button class="btn btn-danger-outline btn-sm" data-action="status" data-status="거절" data-id="${app.id}">거절</button>
        </div>
      `;

      item.querySelectorAll('[data-action="status"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const newStatus = btn.dataset.status;
          const appId = btn.dataset.id;
          try {
            const res = await api.updateApplicationStatus(appId, newStatus);
            if (res.success) {
              showToast(res.message, 'success');
              await loadApplications(currentDetailPost.id);
              await loadPosts();
            }
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      });

      listContainer.appendChild(item);
    });
  }

  // 지원자 필터 탭
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderApplicantList();
    });
  });

  // ==========================================
  // 7. 조장 전용 기능: 동아리 모집 공고 등록
  // ==========================================
  // 추천 샘플 포스터 태그 클릭 시 URL 자동 입력
  document.querySelectorAll('.btn-sample-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const url = tag.dataset.url;
      const input = document.getElementById('newPosterUrl');
      input.value = url;
      updatePosterPreview(url);
    });
  });

  // 포스터 URL 입력 시 실시간 미리보기
  const inputPoster = document.getElementById('newPosterUrl');
  if (inputPoster) {
    inputPoster.addEventListener('input', () => {
      const url = inputPoster.value.trim();
      updatePosterPreview(url);
    });
  }

  const btnPreviewPoster = document.getElementById('btnPreviewPoster');
  if (btnPreviewPoster) {
    btnPreviewPoster.addEventListener('click', () => {
      const url = document.getElementById('newPosterUrl').value.trim();
      if (url) {
        updatePosterPreview(url);
      }
    });
  }

  function updatePosterPreview(url) {
    const box = document.getElementById('posterPreviewContainer');
    const img = document.getElementById('posterPreviewImg');
    if (url) {
      img.src = url;
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  }

  // 1) 상세 화면: 조장 활동사진 추가 & 자르기
  btnAddActivityPhoto.addEventListener('click', () => {
    if (!auth.isLoggedIn()) {
      showToast('조장 로그인 후 활동사진을 추가할 수 있습니다.', 'error');
      openModal(loginModal);
      return;
    }
    const currentUser = auth.getUser();
    if (!currentDetailPost || (currentDetailPost.user_id !== currentUser.id && !currentDetailPost.is_mine)) {
      showToast('해당 동아리의 조장만 활동사진을 추가할 수 있습니다.', 'error');
      return;
    }
    fileInputActivityPhoto.value = '';
    fileInputActivityPhoto.click();
  });

  // 1-1) 조장 전용: 동아리 대표사진(포스터) 변경 및 자르기 트리거 함수
  function triggerPosterEdit(post) {
    if (!auth.isLoggedIn()) {
      showToast('조장 로그인 후 대표사진을 변경할 수 있습니다.', 'error');
      openModal(loginModal);
      return;
    }
    const currentUser = auth.getUser();
    if (!post || (post.user_id !== currentUser.id && !post.is_mine)) {
      showToast('해당 동아리의 조장만 대표사진을 변경할 수 있습니다.', 'error');
      return;
    }
    currentPosterEditPostId = post.id;
    const fileInput = document.getElementById('fileInputChangePoster');
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }

  // 대표사진 변경 버튼들 바인딩
  const btnEditPosterOverlay = document.getElementById('btnEditPosterOverlay');
  if (btnEditPosterOverlay) {
    btnEditPosterOverlay.addEventListener('click', () => {
      if (currentDetailPost) triggerPosterEdit(currentDetailPost);
    });
  }

  const btnChangePoster = document.getElementById('btnChangePoster');
  if (btnChangePoster) {
    btnChangePoster.addEventListener('click', () => {
      if (currentDetailPost) triggerPosterEdit(currentDetailPost);
    });
  }

  // 대표사진 파일 선택 시 자르기 모달 열기 & 서버 저장
  const fileInputChangePoster = document.getElementById('fileInputChangePoster');
  if (fileInputChangePoster) {
    fileInputChangePoster.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      openCropper(file, async (croppedDataUrl) => {
        const targetId = currentPosterEditPostId || (currentDetailPost && currentDetailPost.id);
        if (!targetId) return;

        try {
          showToast('대표사진을 저장하는 중...', 'normal');
          const res = await api.updatePostPoster(targetId, croppedDataUrl);
          if (res.success) {
            showToast('동아리 대표사진(포스터)이 성공적으로 변경되었습니다!', 'success');

            // 1) 현재 열린 상세 모달이 있다면 즉시 교체
            if (currentDetailPost && currentDetailPost.id === targetId) {
              currentDetailPost.poster_url = croppedDataUrl;
              const detailPosterImg = document.getElementById('detailPosterImg');
              if (detailPosterImg) detailPosterImg.src = croppedDataUrl;
            }

            // 2) 홈 카드 슬라이더 목록 즉시 교체
            const found = currentPosts.find(p => p.id === targetId);
            if (found) {
              found.poster_url = croppedDataUrl;
              slider.setPosts(currentPosts);
              localStorage.setItem('cached_club_posts', JSON.stringify(currentPosts));
            }

            // 3) 백그라운드 동기화
            await loadPosts();
          }
        } catch (err) {
          showToast(err.message, 'error');
        }
      }, 0.75); // 포스터 3:4 세로 비율 추천 (크롭 모달에서 1:1, 16:9, 자유비율 선택 가능)
    });
  }

  fileInputActivityPhoto.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    openCropper(file, async (croppedDataUrl) => {
      if (!currentDetailPost) return;
      try {
        showToast('활동사진을 추가하는 중...', 'normal');
        const res = await api.addPostPhoto(currentDetailPost.id, croppedDataUrl);
        if (res.success) {
          showToast('활동사진이 성공적으로 추가되었습니다!', 'success');
          currentDetailPost.activity_photos = res.activity_photos;
          renderDetailModal(currentDetailPost);
          await loadPosts();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }, 1.7777777778); // 활동사진 기본 16:9 비율 추천
  });

  // 2) 동아리 등록 화면: 내 컴퓨터 포스터 사진 파일 선택 & 자르기
  btnUploadPosterFile.addEventListener('click', () => {
    fileInputPoster.value = '';
    fileInputPoster.click();
  });

  fileInputPoster.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    openCropper(file, (croppedDataUrl) => {
      document.getElementById('newPosterUrl').value = croppedDataUrl;
      updatePosterPreview(croppedDataUrl);
      showToast('포스터 사진이 크기에 맞게 잘려서 적용되었습니다!', 'success');
    }, 0.75); // 포스터 3:4 세로 비율 추천
  });

  // 3) 동아리 등록 화면: 내 컴퓨터 활동사진 파일 선택 & 자르기
  btnUploadActivityPhotoFile.addEventListener('click', () => {
    fileInputCreatePhotos.value = '';
    fileInputCreatePhotos.click();
  });

  fileInputCreatePhotos.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    openCropper(file, (croppedDataUrl) => {
      const textarea = document.getElementById('newPhotos');
      const current = textarea.value.trim();
      textarea.value = current ? current + '\n' + croppedDataUrl : croppedDataUrl;
      showToast('활동사진이 크기에 맞게 잘려서 추가되었습니다!', 'success');
    }, 1.7777777778); // 활동사진 16:9 와이드 추천
  });

  // 동아리 등록 폼 제출
  createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      club_name: document.getElementById('newClubName').value.trim(),
      category: document.getElementById('newCategory').value,
      poster_url: document.getElementById('newPosterUrl').value.trim(),
      summary: document.getElementById('newSummary').value.trim(),
      intro: document.getElementById('newIntro').value.trim(),
      activities: document.getElementById('newActivities').value.trim(),
      members: document.getElementById('newMembers').value.trim(),
      activity_photos: document.getElementById('newPhotos') ? document.getElementById('newPhotos').value.trim() : ''
    };

    try {
      const res = await api.createPost(payload);
      if (res.success) {
        showToast(res.message || '동아리가 등록되었습니다!', 'success');
        closeModal(createPostModal);
        createPostForm.reset();
        document.getElementById('posterPreviewContainer').style.display = 'none';
        await loadPosts();
        slider.goToIndex(0); // 새로 등록된 첫 번째 카드로 이동
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ==========================================
  // 초기 기동
  // ==========================================
  updateAuthUI();
  loadPosts();
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
