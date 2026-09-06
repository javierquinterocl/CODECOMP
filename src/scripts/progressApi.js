import { rutaApi } from './apiBase';

const API_URL = import.meta.env.VITE_PROGRESS_API_URL || rutaApi('progress');

export const getProgress = async (user) => {
  if (!user) return null;
  const response = await fetch(API_URL, {
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudo cargar el progreso.');
  return data;
};