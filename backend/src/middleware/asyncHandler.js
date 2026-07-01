/**
 * Wrapper pour gérer les erreurs async des routes
 * Élimine le besoin de try-catch dans chaque route
 * @param {Function} fn - Fonction async à exécuter
 * @returns {Function} Fonction Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
