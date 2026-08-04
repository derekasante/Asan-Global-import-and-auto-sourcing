const profileService = require('../services/profile.service');

async function getProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const profile = await profileService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile };
