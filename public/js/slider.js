/**
 * Campus Clubs - 70% Width Center Card Slider Engine
 * PRD 명시: "카드를 약 70% 크기로 보여주고 좌우로 넘긴다", "카드 1장을 중앙에 약 70% 크기로 표시하고 좌우 슬라이드로 넘긴다"
 */

class CardSlider {
  constructor(options = {}) {
    this.stage = document.getElementById('sliderStageContainer');
    this.track = document.getElementById('sliderTrack');
    this.prevBtn = document.getElementById('sliderPrevBtn');
    this.nextBtn = document.getElementById('sliderNextBtn');
    this.dotsContainer = document.getElementById('sliderDots');
    this.counterEl = document.getElementById('sliderCounter');
    
    this.currentIndex = 0;
    this.items = [];
    this.onCardClick = options.onCardClick || (() => {});

    this.isDragging = false;
    this.startX = 0;
    this.currentTranslate = 0;
    this.prevTranslate = 0;

    this.initEvents();
  }

  setPosts(posts) {
    this.items = posts;
    this.currentIndex = 0;
    this.render();
  }

  render() {
    if (!this.items || this.items.length === 0) {
      this.track.innerHTML = `
        <div class="empty-state">
          <p style="font-size: 1.1rem; font-weight: 700; color: #475569; margin-bottom: 6px;">등록된 동아리가 없습니다.</p>
          <p style="font-size: 0.88rem; color: #94a3b8;">조장 로그인 후 첫 번째 동아리 공고를 등록해보세요!</p>
        </div>
      `;
      this.counterEl.textContent = '0 / 0';
      this.dotsContainer.innerHTML = '';
      return;
    }

    this.track.innerHTML = '';
    this.dotsContainer.innerHTML = '';

    this.items.forEach((post, idx) => {
      // 슬라이드 카드 생성 (약 70% 너비)
      const slide = document.createElement('div');
      slide.className = `club-card-slide ${idx === this.currentIndex ? 'active' : ''}`;
      slide.dataset.index = idx;
      slide.dataset.id = post.id;

      const isClosed = post.is_closed === 1;

      slide.innerHTML = `
        <div class="club-card" role="button" tabindex="0">
          <div class="card-poster-area">
            <img class="card-poster-img" src="${post.poster_url}" alt="${post.club_name} 포스터" onerror="this.src='https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800'">
            <div class="card-overlay-gradient"></div>
            
            <div class="card-header-meta">
              <div style="display:flex; gap:6px; align-items:center;">
                <span class="badge badge-category">${escapeHtml(post.category || '일반')}</span>
                ${post.activity_photos ? `<span class="badge badge-photos" style="background:rgba(79,70,229,0.9); color:#fff;">📸 활동사진</span>` : ''}
              </div>
              <span class="badge badge-status ${isClosed ? 'closed' : ''}">
                ${isClosed ? '모집마감' : '모집중'}
              </span>
            </div>

            <div class="card-poster-info">
              <h2 class="card-club-name">${escapeHtml(post.club_name)}</h2>
              <p class="card-summary">${escapeHtml(post.summary || '')}</p>
            </div>
          </div>

          <div class="card-content-area">
            <div class="card-quick-preview">
              <div class="preview-row">
                <span class="preview-label">👤 동아리장</span>
                <span class="preview-value">${escapeHtml(post.leader_name || '조장')}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">👥 구성원</span>
                <span class="preview-value">${escapeHtml(post.members || '미지정')}</span>
              </div>
            </div>

            <div class="card-footer-action">
              <span class="card-applicant-stat">
                ${post.application_count > 0 ? `🔥 지원자 ${post.application_count}명` : '✨ 첫 지원자가 되어보세요!'}
              </span>
              <span class="card-view-btn">
                상세보기
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </span>
            </div>
          </div>
        </div>
      `;

      slide.addEventListener('click', (e) => {
        // 현재 활성 카드가 아닐 때 클릭하면 해당 카드로 이동
        if (idx !== this.currentIndex) {
          this.goToIndex(idx);
        } else {
          // 활성 카드 클릭 시 상세 모달 오픈
          this.onCardClick(post);
        }
      });

      this.track.appendChild(slide);

      // 도트 인디케이터
      const dot = document.createElement('div');
      dot.className = `dot ${idx === this.currentIndex ? 'active' : ''}`;
      dot.addEventListener('click', () => this.goToIndex(idx));
      this.dotsContainer.appendChild(dot);
    });

    this.updatePosition();
  }

  initEvents() {
    // 화살표 버튼 이벤트
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());

    // 키보드 방향키
    window.addEventListener('keydown', (e) => {
      // 모달이 열려있지 않을 때만 키보드 탐색
      const isAnyModalOpen = document.querySelector('.modal-backdrop[style*="display: flex"]');
      if (isAnyModalOpen) return;

      if (e.key === 'ArrowLeft') {
        this.prev();
      } else if (e.key === 'ArrowRight') {
        this.next();
      }
    });

    // 리사이즈 시 중앙 정렬 재계산
    window.addEventListener('resize', () => {
      this.updatePosition(false);
    });

    // 터치 및 드래그 스와이프
    this.stage.addEventListener('mousedown', (e) => this.dragStart(e));
    this.stage.addEventListener('touchstart', (e) => this.dragStart(e), { passive: true });

    window.addEventListener('mousemove', (e) => this.dragMove(e));
    window.addEventListener('touchmove', (e) => this.dragMove(e), { passive: true });

    window.addEventListener('mouseup', () => this.dragEnd());
    window.addEventListener('touchend', () => this.dragEnd());
  }

  dragStart(e) {
    if (this.items.length <= 1) return;
    this.isDragging = true;
    this.startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    this.track.style.transition = 'none';
  }

  dragMove(e) {
    if (!this.isDragging) return;
    const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const diff = currentX - this.startX;

    // 약간의 실시간 텐션 효과
    const offset = this.calculateOffsetForIndex(this.currentIndex) + diff;
    this.track.style.transform = `translateX(${offset}px)`;
  }

  dragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.track.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';

    const computedStyle = window.getComputedStyle(this.track);
    const matrix = new DOMMatrixReadOnly(computedStyle.transform);
    const currentTranslateX = matrix.m41;
    const standardOffset = this.calculateOffsetForIndex(this.currentIndex);
    const diff = currentTranslateX - standardOffset;

    const threshold = 60; // 60px 이상 스와이프 시 다음/이전 슬라이드
    if (diff > threshold) {
      this.prev();
    } else if (diff < -threshold) {
      this.next();
    } else {
      this.updatePosition();
    }
  }

  prev() {
    if (this.items.length === 0) return;
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = this.items.length - 1; // 루프
    }
    this.updatePosition();
  }

  next() {
    if (this.items.length === 0) return;
    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0; // 루프
    }
    this.updatePosition();
  }

  goToIndex(index) {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex = index;
      this.updatePosition();
    }
  }

  calculateOffsetForIndex(index) {
    const slides = this.track.querySelectorAll('.club-card-slide');
    if (!slides || slides.length === 0 || !slides[index]) return 0;

    const stageWidth = this.stage.clientWidth;
    const targetSlide = slides[index];
    const slideWidth = targetSlide.offsetWidth;
    const slideOffsetLeft = targetSlide.offsetLeft;

    // 중앙 정렬: stage의 가운데와 카드의 가운데 일치
    return (stageWidth / 2) - (slideOffsetLeft + (slideWidth / 2));
  }

  updatePosition(animate = true) {
    if (this.items.length === 0) return;

    if (!animate) {
      this.track.style.transition = 'none';
    } else {
      this.track.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
    }

    const offset = this.calculateOffsetForIndex(this.currentIndex);
    this.track.style.transform = `translateX(${offset}px)`;

    // Active 클래스 갱신
    const slides = this.track.querySelectorAll('.club-card-slide');
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === this.currentIndex);
    });

    // 도트 인디케이터 갱신
    const dots = this.dotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === this.currentIndex);
    });

    // 카운터 갱신
    this.counterEl.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
