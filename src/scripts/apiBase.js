// Sin VITE_API_BASE se usan rutas relativas /api/*, que resuelve el proxy de Vite.

export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

export const rutaApi = (camino) => `${API_BASE}/${String(camino).replace(/^\//, '')}`;
