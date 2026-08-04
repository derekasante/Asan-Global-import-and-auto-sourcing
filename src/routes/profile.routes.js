const { Router } = require('express');
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateProfileSchema } = require('../validators/schemas');

const router = Router();

router.use(authenticate);

router.get('/', profileController.getProfile);
router.put('/', validate(updateProfileSchema), profileController.updateProfile);

module.exports = router;
