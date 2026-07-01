const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB, sql } = require('../config/db'); // ← connectDB au lieu de getPool

const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const authService = {

  async login(email, password) {
    const pool = await connectDB(); // ← await connectDB()
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');

    const user = result.recordset[0];
    if (!user) throw createError('Invalid email or password', 401);

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw createError('Invalid email or password', 401);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return {
      token,
      user: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        first_name: user.first_name,
        last_name:  user.last_name,
      },
    };
  },

  async register({ email, password, first_name, last_name, role = 'user' }) {
    const pool = await connectDB();

    const exists = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM users WHERE email = @email');

    if (exists.recordset.length > 0)
      throw createError('Email already in use', 409);

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.request()
      .input('email',      sql.NVarChar, email)
      .input('password',   sql.NVarChar, hashedPassword)
      .input('first_name', sql.NVarChar, first_name || null)
      .input('last_name',  sql.NVarChar, last_name  || null)
      .query(`
        INSERT INTO users (email, password, first_name, last_name)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.first_name, INSERTED.last_name, INSERTED.created_at
        VALUES (@email, @password, @first_name, @last_name)
      `);

    return result.recordset[0];
  },

  async getAllUsers() {
    const pool = await connectDB();
    const result = await pool.request()
      .query('SELECT id, email, created_at FROM users ORDER BY created_at DESC');
    return result.recordset;
  },

  async getUserById(id) {
    const pool = await connectDB();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, email, created_at FROM users WHERE id = @id');

    const user = result.recordset[0];
    if (!user) throw createError('User not found', 404);
    return user;
  },

  async updateUser(id, { email, password }) {
    const pool = await connectDB();

    const exists = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM users WHERE id = @id');

    if (exists.recordset.length === 0)
      throw createError('User not found', 404);

    if (email) {
      const emailTaken = await pool.request()
        .input('email', sql.NVarChar, email)
        .input('id',    sql.Int,      id)
        .query('SELECT id FROM users WHERE email = @email AND id != @id');

      if (emailTaken.recordset.length > 0)
        throw createError('Email already in use', 409);
    }

    let hashedPassword = null;
    if (password) hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.request()
      .input('id',       sql.Int,      id)
      .input('email',    sql.NVarChar, email          || null)
      .input('password', sql.NVarChar, hashedPassword || null)
      .query(`
        UPDATE users
        SET
          email    = COALESCE(@email,    email),
          password = COALESCE(@password, password)
        WHERE id = @id;
        SELECT id, email, created_at FROM users WHERE id = @id
      `);

    return result.recordset[0];
  },

  async deleteUser(id) {
    const pool = await connectDB();

    const exists = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM users WHERE id = @id');

    if (exists.recordset.length === 0)
      throw createError('User not found', 404);

    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        DELETE FROM extracted_data
        WHERE scan_id IN (SELECT id FROM scans WHERE user_id = @id)
      `);

    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM scans WHERE user_id = @id');

    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM users WHERE id = @id');

    return { id };
  },
};

module.exports = authService;