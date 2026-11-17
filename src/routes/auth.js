const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');

// 조장 회원가입 (가입 코드 필수 검증)
router.post('/signup', async (req, res) => {
  const { inviteCode, username, password, name } = req.body;

  if (!inviteCode || !username || !password || !name) {
    return res.status(400).json({
      success: false,
      message: '가입 코드, 아이디, 비밀번호, 이름을 모두 입력해주세요.'
    });
  }

  // 가입 코드 검증
  if (inviteCode.trim() !== config.signupInviteCode.trim()) {
    return res.status(403).json({
      success: false,
      message: '조장 가입 코드가 올바르지 않습니다. 관리자에게 문의하세요.'
    });
  }

  try {
    // 아이디 중복 확인
    const { data: existingUser } = await supabase
      .from('club_users')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '이미 존재하는 아이디입니다. 다른 아이디를 입력해주세요.'
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const { data: newUser, error: insertError } = await supabase
      .from('club_users')
      .insert([{
        username: username.trim(),
        password_hash: passwordHash,
        name: name.trim()
      }])
      .select('id, username, name')
      .single();

    if (insertError || !newUser) {
      console.error('Supabase user insert error:', insertError);
      return res.status(500).json({ success: false, message: '회원가입 처리 중 오류가 발생했습니다.' });
    }

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, name: newUser.name },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: '조장 회원가입이 완료되었습니다!',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, message: '회원가입 처리 중 오류가 발생했습니다.' });
  }
});

// 조장 로그인
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '아이디와 비밀번호를 입력해주세요.'
    });
  }

  try {
    const { data: user, error } = await supabase
      .from('club_users')
      .select('*')
      .eq('username', username.trim())
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: `${user.name}님 환영합니다!`,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// 내 정보 확인
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
