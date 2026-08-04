const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refreshSession(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const result = await authService.logout(req.accessToken);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
      },
      profile: req.profile,
    },
  });
}

module.exports = { register, login, refresh, logout, me };
