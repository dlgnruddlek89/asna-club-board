require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-club-board',
  signupInviteCode: process.env.SIGNUP_INVITE_CODE || 'CLUB2026!',
  supabaseUrl: process.env.SUPABASE_URL || 'https://yoazuudwhdyagqzdmjaf.supabase.co',
  supabaseKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvYXp1dWR3aGR5YWdxemRtamFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NzMxMzQsImV4cCI6MjEwOTI0OTEzNH0.m9FcYApmCY0iQqEMZ65Aj8IbTt_eb2nhJiUWF_JN3ak'
};
