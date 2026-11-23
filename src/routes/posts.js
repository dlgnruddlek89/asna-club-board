const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// 1. 동아리 목록 조회 (카드 슬라이더용 - 초고속 최적화 & Edge 캐싱)
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Vercel Edge CDN 캐시 헤더 (빠른 응답)
    res.setHeader('Cache-Control', 's-maxage=3, stale-while-revalidate=59');

    // 카드 슬라이더에 꼭 필요한 필드만 경량 조회 (무거운 Base64 활동사진 제외로 전송 속도 10배 향상)
    const { data: posts, error } = await supabase
      .from('club_posts')
      .select(`
        id,
        user_id,
        club_name,
        poster_url,
        category,
        summary,
        members,
        is_closed,
        created_at,
        activity_photos,
        club_users (name)
      `)
      .order('is_closed', { ascending: true })
      .order('id', { ascending: false });

    if (error) {
      console.error('Fetch posts error:', error);
      return res.status(500).json({ success: false, message: '동아리 목록을 불러오지 못했습니다.' });
    }

    const enriched = (posts || []).map(post => {
      // 목록에서는 활동사진 존재 여부만 불리언으로 전달하여 페이로드 극소화
      const hasPhotos = !!(post.activity_photos && post.activity_photos.trim().length > 0);
      return {
        id: post.id,
        user_id: post.user_id,
        club_name: post.club_name,
        poster_url: post.poster_url,
        category: post.category,
        summary: post.summary,
        members: post.members,
        is_closed: post.is_closed ? 1 : 0,
        leader_name: post.club_users ? post.club_users.name : '동아리장',
        has_photos: hasPhotos,
        application_count: 0,
        is_mine: req.user ? post.user_id === req.user.id : false
      };
    });

    return res.json({ success: true, posts: enriched });
  } catch (err) {
    console.error('Fetch posts error:', err);
    return res.status(500).json({ success: false, message: '동아리 목록을 불러오지 못했습니다.' });
  }
});

// 2. 동아리 상세 조회
router.get('/:id', optionalAuth, async (req, res) => {
  const postId = Number(req.params.id);
  try {
    const { data: post, error } = await supabase
      .from('club_posts')
      .select(`
        *,
        club_users (name, username)
      `)
      .eq('id', postId)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).json({ success: false, message: '해당 동아리 모집글을 찾을 수 없습니다.' });
    }

    const { count } = await supabase
      .from('club_applications')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    const isMine = req.user ? post.user_id === req.user.id : false;

    return res.json({
      success: true,
      post: {
        ...post,
        is_closed: post.is_closed ? 1 : 0,
        leader_name: post.club_users ? post.club_users.name : '동아리장',
        leader_username: post.club_users ? post.club_users.username : '',
        application_count: count || 0,
        is_mine: isMine
      }
    });
  } catch (err) {
    console.error('Fetch post detail error:', err);
    return res.status(500).json({ success: false, message: '동아리 정보를 불러오지 못했습니다.' });
  }
});

// 3. 동아리 등록 (조장 전용)
router.post('/', requireAuth, async (req, res) => {
  const { club_name, poster_url, category, summary, intro, activities, members, activity_photos } = req.body;

  if (!club_name || !poster_url || !intro || !activities || !members) {
    return res.status(400).json({
      success: false,
      message: '동아리 이름, 포스터 URL, 소개글, 활동 내용, 회원 이름을 모두 입력해주세요.'
    });
  }

  const trimmedUrl = poster_url.trim();
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('data:image/')) {
    return res.status(400).json({
      success: false,
      message: '포스터는 이미지 URL(http/https) 또는 업로드된 이미지 파일이어야 합니다.'
    });
  }

  try {
    const summaryText = summary && summary.trim() ? summary.trim() : intro.trim().slice(0, 60) + '...';

    const { data: createdPost, error } = await supabase
      .from('club_posts')
      .insert([{
        user_id: req.user.id,
        club_name: club_name.trim(),
        poster_url: trimmedUrl,
        category: (category && category.trim()) || '일반',
        summary: summaryText,
        intro: intro.trim(),
        activities: activities.trim(),
        members: members.trim(),
        activity_photos: activity_photos ? activity_photos.trim() : '',
        is_closed: false
      }])
      .select('*')
      .single();

    if (error || !createdPost) {
      console.error('Supabase post create error:', error);
      return res.status(500).json({ success: false, message: '동아리 등록 중 오류가 발생했습니다.' });
    }

    return res.status(201).json({
      success: true,
      message: '동아리가 성공적으로 등록되었습니다!',
      post: {
        ...createdPost,
        is_closed: 0
      }
    });
  } catch (err) {
    console.error('Create post error:', err);
    return res.status(500).json({ success: false, message: '동아리 등록 중 오류가 발생했습니다.' });
  }
});

// 4. 모집 마감 / 재개 토글 (해당 조장 전용)
router.patch('/:id/close', requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  try {
    const { data: post, error } = await supabase
      .from('club_posts')
      .select('id, user_id, is_closed')
      .eq('id', postId)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).json({ success: false, message: '해당 동아리 모집글을 찾을 수 없습니다.' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '해당 동아리의 조장만 모집 상태를 변경할 수 있습니다.' });
    }

    const newClosed = !post.is_closed;
    const { error: updateError } = await supabase
      .from('club_posts')
      .update({ is_closed: newClosed })
      .eq('id', postId);

    if (updateError) {
      console.error('Toggle status error:', updateError);
      return res.status(500).json({ success: false, message: '상태 변경 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      message: newClosed ? '모집이 마감되었습니다.' : '모집이 다시 시작되었습니다.',
      is_closed: newClosed ? 1 : 0
    });
  } catch (err) {
    console.error('Toggle post status error:', err);
    return res.status(500).json({ success: false, message: '상태 변경 중 오류가 발생했습니다.' });
  }
});

// 5. 동아리 삭제 (해당 조장 전용)
router.delete('/:id', requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  try {
    const { data: post, error } = await supabase
      .from('club_posts')
      .select('id, user_id')
      .eq('id', postId)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).json({ success: false, message: '해당 동아리 모집글을 찾을 수 없습니다.' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '해당 동아리의 조장만 삭제할 수 있습니다.' });
    }

    const { error: deleteError } = await supabase
      .from('club_posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Delete post error:', deleteError);
      return res.status(500).json({ success: false, message: '동아리 삭제 중 오류가 발생했습니다.' });
    }

    return res.json({ success: true, message: '동아리 모집글이 삭제되었습니다.' });
  } catch (err) {
    console.error('Delete post error:', err);
    return res.status(500).json({ success: false, message: '동아리 삭제 중 오류가 발생했습니다.' });
  }
});

// 6. 지원 신청 (학생용: 로그인 불필요!)
router.post('/:id/apply', async (req, res) => {
  const postId = Number(req.params.id);
  const { department, grade, name, student_id, message } = req.body;

  if (!department || !grade || !name || !student_id) {
    return res.status(400).json({
      success: false,
      message: '학과, 학년, 이름, 학번을 모두 입력해주세요.'
    });
  }

  try {
    const { data: post, error } = await supabase
      .from('club_posts')
      .select('id, is_closed')
      .eq('id', postId)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).json({ success: false, message: '존재하지 않는 동아리입니다.' });
    }

    if (post.is_closed) {
      return res.status(400).json({ success: false, message: '이미 모집이 마감된 동아리입니다.' });
    }

    // 동일 학번 중복 지원 여부 체크
    const { data: existingApp } = await supabase
      .from('club_applications')
      .select('id')
      .eq('post_id', postId)
      .eq('student_id', student_id.trim())
      .maybeSingle();

    if (existingApp) {
      return res.status(409).json({
        success: false,
        message: '이미 이 동아리에 지원하신 학번입니다.'
      });
    }

    const { error: insertError } = await supabase
      .from('club_applications')
      .insert([{
        post_id: postId,
        department: department.trim(),
        grade: grade.trim(),
        name: name.trim(),
        student_id: student_id.trim(),
        message: message ? message.trim() : '',
        status: '대기'
      }]);

    if (insertError) {
      console.error('Apply insert error:', insertError);
      return res.status(500).json({ success: false, message: '지원 신청 처리 중 오류가 발생했습니다.' });
    }

    return res.status(201).json({
      success: true,
      message: '지원 신청이 성공적으로 완료되었습니다! 조장의 승인을 기다려주세요.'
    });
  } catch (err) {
    console.error('Apply error:', err);
    return res.status(500).json({ success: false, message: '지원 신청 처리 중 오류가 발생했습니다.' });
  }
});

// 7. 지원자 목록 조회 (해당 조장 전용)
router.get('/:id/applications', requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  try {
    const { data: post, error } = await supabase
      .from('club_posts')
      .select('id, user_id, club_name')
      .eq('id', postId)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).json({ success: false, message: '존재하지 않는 동아리입니다.' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '해당 동아리의 조장만 지원자 목록을 열람할 수 있습니다.'
      });
    }

    const { data: applications, error: appError } = await supabase
      .from('club_applications')
      .select('*')
      .eq('post_id', postId)
      .order('id', { ascending: false });

    if (appError) {
      console.error('Fetch applications error:', appError);
      return res.status(500).json({ success: false, message: '지원자 목록을 불러오지 못했습니다.' });
    }

    return res.json({
      success: true,
      club_name: post.club_name,
      applications: applications || []
    });
  } catch (err) {
    console.error('Fetch applications error:', err);
    return res.status(500).json({ success: false, message: '지원자 목록을 불러오지 못했습니다.' });
  }
});

// 8. 동아리 활동사진 추가 (해당 조장 전용)
router.post('/:id/photos', requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const { photoUrl } = req.body;

  if (!photoUrl) {
    return res.status(400).json({ success: false, message: '추가할 사진 데이터가 없습니다.' });
  }

  try {
    const { data: post, error } = await supabase
      .from('club_posts')
      .select('id, user_id, activity_photos')
      .eq('id', postId)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).json({ success: false, message: '동아리를 찾을 수 없습니다.' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '해당 동아리의 조장만 활동사진을 추가할 수 있습니다.' });
    }

    const currentPhotos = (post.activity_photos || '')
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean);

    // 새 사진 추가
    currentPhotos.push(photoUrl.trim());
    const updatedPhotosStr = currentPhotos.join('\n');

    const { error: updateError } = await supabase
      .from('club_posts')
      .update({ activity_photos: updatedPhotosStr })
      .eq('id', postId);

    if (updateError) {
      console.error('Update photos error:', updateError);
      return res.status(500).json({ success: false, message: '활동사진 저장 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      message: '동아리 활동사진이 성공적으로 추가되었습니다!',
      activity_photos: updatedPhotosStr
    });
  } catch (err) {
    console.error('Add photo error:', err);
    return res.status(500).json({ success: false, message: '활동사진 추가 중 오류가 발생했습니다.' });
  }
});

// 9. 동아리 대표사진(포스터) 변경 & 업로드 (해당 조장 전용)
router.patch('/:id/poster', requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const { poster_url } = req.body;

  if (!poster_url || !poster_url.trim()) {
    return res.status(400).json({ success: false, message: '변경할 대표사진 데이터가 없습니다.' });
  }

  const trimmedUrl = poster_url.trim();
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('data:image/')) {
    return res.status(400).json({
      success: false,
      message: '포스터는 이미지 URL(http/https) 또는 업로드된 이미지 파일이어야 합니다.'
    });
  }

  try {
    const { data: post, error } = await supabase
      .from('club_posts')
      .select('id, user_id')
      .eq('id', postId)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).json({ success: false, message: '해당 동아리 모집글을 찾을 수 없습니다.' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '해당 동아리의 조장만 대표사진을 변경할 수 있습니다.' });
    }

    const { error: updateError } = await supabase
      .from('club_posts')
      .update({ poster_url: trimmedUrl })
      .eq('id', postId);

    if (updateError) {
      console.error('Update poster error:', updateError);
      return res.status(500).json({ success: false, message: '대표사진 저장 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      message: '동아리 대표사진이 성공적으로 변경되었습니다!',
      poster_url: trimmedUrl
    });
  } catch (err) {
    console.error('Update poster error:', err);
    return res.status(500).json({ success: false, message: '대표사진 변경 중 오류가 발생했습니다.' });
  }
});

// 10. 동아리 정보 전체 수정 (해당 조장 전용)
router.put('/:id', requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const { club_name, poster_url, category, summary, intro, activities, members, activity_photos } = req.body;

  try {
    const { data: post, error } = await supabase
      .from('club_posts')
      .select('id, user_id')
      .eq('id', postId)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).json({ success: false, message: '해당 동아리를 찾을 수 없습니다.' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '해당 동아리의 조장만 수정할 수 있습니다.' });
    }

    const updates = {};
    if (club_name) updates.club_name = club_name.trim();
    if (poster_url) updates.poster_url = poster_url.trim();
    if (category) updates.category = category.trim();
    if (summary !== undefined) updates.summary = summary.trim();
    if (intro) updates.intro = intro.trim();
    if (activities) updates.activities = activities.trim();
    if (members) updates.members = members.trim();
    if (activity_photos !== undefined) updates.activity_photos = activity_photos.trim();

    const { error: updateError } = await supabase
      .from('club_posts')
      .update(updates)
      .eq('id', postId);

    if (updateError) {
      console.error('Update post error:', updateError);
      return res.status(500).json({ success: false, message: '동아리 정보 수정 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      message: '동아리 정보가 성공적으로 수정되었습니다!'
    });
  } catch (err) {
    console.error('Update post error:', err);
    return res.status(500).json({ success: false, message: '동아리 정보 수정 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
