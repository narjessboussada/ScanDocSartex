const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const authValidator = require('../validators/authValidator');

router.post('/login',         authValidator.validateLogin,      authController.login);
router.post('/register',      authValidator.validateRegister,   authController.register);
router.get('/me',             verifyToken,                      authController.me);

router.get('/users',          verifyToken, authController.getAllUsers);
router.get('/users/:id',      verifyToken, authController.getUserById);
router.put('/users/:id',      verifyToken, authValidator.validateUpdateUser, authController.updateUser);
router.delete('/users/:id',   verifyToken, authController.deleteUser);

module.exports = router;