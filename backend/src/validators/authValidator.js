const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const authValidator = {

 validateRegister(req, res, next) {
    const { email, password, first_name, last_name } = req.body;

    if (!email || !password || !first_name || !last_name)
      return next(createError('Email, password, first name and last name are required', 400));

    if (first_name.length < 2)
      return next(createError('First name must be at least 2 characters', 400));

    if (last_name.length < 2)
      return next(createError('Last name must be at least 2 characters', 400));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return next(createError('Invalid email format', 400));

    if (password.length < 8)
      return next(createError('Password must be at least 8 characters', 400));

    if (!/[A-Z]/.test(password))
      return next(createError('Password must contain at least one uppercase letter', 400));

    if (!/[0-9]/.test(password))
      return next(createError('Password must contain at least one number', 400));

    next();
},

  validateLogin(req, res, next) {
    const { email, password } = req.body;

    if (!email || !password)
      return next(createError('Email and password are required', 400));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return next(createError('Invalid email format', 400));

    next();
  },

  validateUpdateUser(req, res, next) {
    const { email, password } = req.body;

    if (!email && !password)
      return next(createError('At least one field required (email or password)', 400));

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email))
        return next(createError('Invalid email format', 400));
    }

    if (password) {
      if (password.length < 8)
        return next(createError('Password must be at least 8 characters', 400));

      if (!/[A-Z]/.test(password))
        return next(createError('Password must contain at least one uppercase letter', 400));

      if (!/[0-9]/.test(password))
        return next(createError('Password must contain at least one number', 400));
    }

    next();
  },
};

module.exports = authValidator;