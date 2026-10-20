const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('./database');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const { rows } = await query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [profile.id, email]
    );

    if (rows.length) {
      const user = rows[0];
      if (!user.google_id) {
        await query('UPDATE users SET google_id = $1, avatar_url = $2 WHERE id = $3',
          [profile.id, profile.photos[0]?.value, user.id]);
      }
      return done(null, user);
    }

    const { rows: newUser } = await query(
      `INSERT INTO users (name, email, google_id, avatar_url, is_verified, role)
       VALUES ($1, $2, $3, $4, true, 'customer') RETURNING *`,
      [profile.displayName, email, profile.id, profile.photos[0]?.value]
    );
    return done(null, newUser[0]);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  done(null, rows[0]);
});

module.exports = passport;
