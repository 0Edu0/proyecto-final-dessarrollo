import axios from 'axios';

export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';

// El access token vive solo en memoria (el refresh token va en cookie httpOnly)
let accessToken = null;
let onSessionExpired = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

export const api = axios.create({ baseURL: `${API_ORIGIN}/api`, withCredentials: true });

// Instancia sin interceptores para el refresh (evita bucles)
const bare = axios.create({ baseURL: `${API_ORIGIN}/api`, withCredentials: true });

// Una sola llamada a /auth/refresh en vuelo: todas las peticiones que reciben 401 mientras
// tanto esperan esta misma promesa (equivale a una cola) y se reintentan al resolverse.
let refreshPromise = null;

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = bare
      .post('/auth/refresh')
      .then(({ data }) => {
        accessToken = data.accessToken;
        return data.user;
      })
      .catch((err) => {
        accessToken = null;
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || !config || config._retry || NO_REFRESH.includes(config.url)) {
      return Promise.reject(error);
    }
    config._retry = true; // reintenta una sola vez
    try {
      await refreshSession();
    } catch {
      onSessionExpired();
      return Promise.reject(error);
    }
    return api(config);
  },
);

// Mensaje legible a partir del formato { error: { code, message, details? } }
export function getErrorMessage(err) {
  return err?.response?.data?.error?.message ?? 'No se pudo conectar con el servidor';
}
