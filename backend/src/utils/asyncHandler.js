// Envuelve handlers async para que los errores lleguen al middleware central
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
