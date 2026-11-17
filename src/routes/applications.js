const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// 지원자 승인 / 거절 / 대기 상태 변경 (해당 동아리 조장만 가능)
router.patch('/:id/status', requireAuth, async (req, res) => {
  const applicationId = Number(req.params.id);
  const { status } = req.body;

  if (!status || !['대기', '승인', '거절'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "지원 상태는 '대기', '승인', '거절' 중 하나여야 합니다."
    });
  }

  try {
    const { data: appData, error } = await supabase
      .from('club_applications')
      .select(`
        *,
        club_posts (user_id, club_name)
      `)
      .eq('id', applicationId)
      .maybeSingle();

    if (error || !appData) {
      return res.status(404).json({ success: false, message: '지원서를 찾을 수 없습니다.' });
    }

    if (!appData.club_posts || appData.club_posts.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '해당 동아리의 조장만 지원자를 승인/거절할 수 있습니다.'
      });
    }

    const { error: updateError } = await supabase
      .from('club_applications')
      .update({ status })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Update status error:', updateError);
      return res.status(500).json({ success: false, message: '지원자 상태 변경 중 오류가 발생했습니다.' });
    }

    return res.json({
      success: true,
      message: `[${appData.name}] 지원자의 상태가 '${status}'(으)로 변경되었습니다.`,
      application_id: applicationId,
      status
    });
  } catch (err) {
    console.error('Update application status error:', err);
    return res.status(500).json({ success: false, message: '지원자 상태 변경 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
