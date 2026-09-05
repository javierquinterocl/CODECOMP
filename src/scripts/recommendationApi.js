const API_URL = '/api/recommendations';

export const getRecommendations = async (user, limit = 5) => {
  if (!user) return [];
  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'No se pudieron cargar las recomendaciones.');
  return data.problems || [];
};