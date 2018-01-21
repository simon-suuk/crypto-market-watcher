import express from 'express';

const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const db = require('../db');
const ccxt = require('ccxt');

const router = express.Router();

// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new Strategy(
  ((username, password, cb) => {
    db.users.findByUsername(username, (err, user) => {
      if (err) {
        return cb(err);
      }
      if (!user) {
        return cb(null, false);
      }
      if (user.password !== password) {
        return cb(null, false);
      }
      return cb(null, user);
    });
  })));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser((id, cb) => {
  db.users.findById(id, (err, user) => {
    if (err) {
      return cb(err);
    }
    cb(null, user);
  });
});

// routes.
router.get('/',
  (req, res) => {
    res.render('index', { user: req.user, title: 'login', message: 'welcome Crypto Knight!' });
  });

router.post('/login',
  passport.authenticate('local', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  });

router.get('/signup',
  (req, res) => {
    res.render('signup', { title: 'signup', message: 'welcome Crypto Knight!' });
  });

router.post('/signup',
  passport.authenticate('local', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  });

router.get('/logout',
  (req, res) => {
    req.logout();
    res.redirect('/');
  });

router.get('/home',
  require('connect-ensure-login').ensureLoggedIn(),
  (req, res) => {
    res.render('home', { user: req.user });
  });

const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };

router.get('/crypto', asyncMiddleware(async (req, res, next) => {
  const kraken = new ccxt.kraken();
  const bitfinex = new ccxt.bitfinex({ verbose: true });
  const okcoinusd = new ccxt.okcoinusd({
    apiKey: 'YOUR_PUBLIC_API_KEY',
    secret: 'YOUR_SECRET_PRIVATE_KEY',
  });

  const kr = await (kraken.fetchTicker('BTC/USD'));
  const bf = await (bitfinex.fetchTicker('BTC/USD'));
  const okc = await (okcoinusd.fetchTicker('BTC/USD'));

  res.render('crypto', { title: 'suuk', kr_data: kr, bf_data: bf, okc_data: okc });
}));

export default router;
