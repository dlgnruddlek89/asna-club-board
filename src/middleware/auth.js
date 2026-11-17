const jwt = require('jsonwebtoken');
const config = require('../config');
const supabase = require('../supabase');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '조장 로그인이 필요한 기능입니다.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const { data: user, error } = await supabase
      .from('club_users')
      .select('id, username, name')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, message: '유효하지 않은 계정입니다.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: '인증 토큰이 만료되었거나 올바르지 않습니다.' });
  }
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const { data: user } = await supabase
      .from('club_users')
      .select('id, username, name')
      .eq('id', decoded.id)
      .single();

    if (user) {
      req.user = user;
    }
  } catch (err) {
    // 무시
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
