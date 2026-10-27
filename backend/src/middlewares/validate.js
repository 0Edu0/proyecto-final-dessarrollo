// Valida req[source] (body por defecto, también 'query' o 'params') con un esquema Zod
// y lo reemplaza por el resultado parseado
export const validate = (schema, source = 'body') => (req, res, next) => {
  req[source] = schema.parse(req[source]);
  next();
};
