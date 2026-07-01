const authService = require('../services/authService');
const { success, created } = require('../utils/response');

const authController = {

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return success(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async register(req, res, next) {
    try {
      const { email, password, first_name, last_name } = req.body;
      const user = await authService.register({ email, password, first_name, last_name });
      return created(res, user, 'User created successfully');
    } catch (err) {
      next(err);
    }
  },

  me(req, res) {
    return success(res, { user: req.user });
  },

  // ─── CRUD ───────────────────────────────────

  async getAllUsers(req, res, next) {
    try {
      const users = await authService.getAllUsers();
      return success(res, { users });
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      const user = await authService.getUserById(id);
      return success(res, { user });
    } catch (err) {
      next(err);
    }
  },

  async updateUser(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      const { email, password, first_name, last_name } = req.body;
      const user = await authService.updateUser(id, { email, password, first_name, last_name });
      return success(res, { user }, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      await authService.deleteUser(id);
      return success(res, null, 'User deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;