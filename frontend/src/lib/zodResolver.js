// Resolver mínimo Zod → React Hook Form (evita una dependencia extra); un mensaje por campo
export const zodResolver = (schema) => async (values) => {
  const result = schema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) errors[key] = { type: issue.code, message: issue.message };
  }
  return { values: {}, errors };
};

// Pinta en cada campo los errores de validación que devuelve el backend (error.details)
export function applyServerErrors(err, setError) {
  const details = err?.response?.data?.error?.details;
  if (!details) return false;
  for (const [field, messages] of Object.entries(details)) {
    setError(field, { type: 'server', message: [].concat(messages).join(', ') });
  }
  return true;
}
