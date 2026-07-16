const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

function getToken(): string | null {
  return localStorage.getItem('animplay_token');
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  auth: {
    register: (username: string, email: string, password: string) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
    login: (login: string, password: string) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
    me: () => request('/auth/me'),
  },
  quizzes: {
    list: () => request('/quizzes'),
    get: (id: number) => request(`/quizzes/${id}`),
    create: (title: string, description?: string) =>
      request('/quizzes', { method: 'POST', body: JSON.stringify({ title, description }) }),
    update: (id: number, data: { title?: string; description?: string }) =>
      request(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request(`/quizzes/${id}`, { method: 'DELETE' }),
    addQuestion: (quizId: number, question: any) =>
      request(`/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify(question) }),
    updateQuestion: (quizId: number, questionId: number, question: any) =>
      request(`/quizzes/${quizId}/questions/${questionId}`, { method: 'PUT', body: JSON.stringify(question) }),
    deleteQuestion: (quizId: number, questionId: number) =>
      request(`/quizzes/${quizId}/questions/${questionId}`, { method: 'DELETE' }),
  },
  games: {
    start: (quizId: number) =>
      request('/games/start', { method: 'POST', body: JSON.stringify({ quizId }) }),
    get: (pin: string) => request(`/games/${pin}`),
    getResults: (pin: string) => request(`/games/${pin}/results`),
  },
};
