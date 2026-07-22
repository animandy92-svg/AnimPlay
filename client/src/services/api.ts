const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

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

  if (!response.ok) {
    let errorText = '';
    try {
      const errData = await response.json();
      errorText = errData?.error || errData?.message || JSON.stringify(errData);
    } catch {
      errorText = await response.text();
    }
    throw new Error(errorText || 'Request failed');
  }

  const data = await response.json();
  return data;
}

export const api = {
  auth: {
    register: (username: string, email: string, password: string) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
    login: (login: string, password: string) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
    google: (idToken: string) =>
      request('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
    me: () => request('/auth/me'),
  },
  quizzes: {
    list: (tab?: string, folderId?: number) => {
      const params = new URLSearchParams();
      if (tab) params.set('tab', tab);
      if (folderId) params.set('folderId', folderId.toString());
      const qs = params.toString();
      return request(`/quizzes${qs ? `?${qs}` : ''}`);
    },
    get: (id: number) => request(`/quizzes/${id}`),
    create: (title: string, description?: string) =>
      request('/quizzes', { method: 'POST', body: JSON.stringify({ title, description }) }),
    update: (id: number, data: { title?: string; description?: string; is_favorite?: number; status?: string; is_public?: boolean; folderId?: number | null }) =>
      request(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request(`/quizzes/${id}`, { method: 'DELETE' }),
    permanentDelete: (id: number) =>
      request(`/quizzes/${id}?permanent=true`, { method: 'DELETE' }),
    restore: (id: number) =>
      request(`/quizzes/${id}/restore`, { method: 'POST' }),
    clone: (id: number) =>
      request(`/quizzes/${id}/clone`, { method: 'POST' }),
    addQuestion: (quizId: number, question: any) =>
      request(`/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify(question) }),
    updateQuestion: (quizId: number, questionId: number, question: any) =>
      request(`/quizzes/${quizId}/questions/${questionId}`, { method: 'PUT', body: JSON.stringify(question) }),
    deleteQuestion: (quizId: number, questionId: number) =>
      request(`/quizzes/${quizId}/questions/${questionId}`, { method: 'DELETE' }),
    aiGenerate: (topic: string, audience: string, count: number) =>
      request('/quizzes/ai-generate', {
        method: 'POST',
        body: JSON.stringify({ topic, audience, count }),
      }),
  },
  games: {
    start: (quizId: number, gameMode?: 'classic' | 'team') =>
      request('/games/start', { method: 'POST', body: JSON.stringify({ quizId, gameMode: gameMode || 'classic' }) }),
    get: (pin: string) => request(`/games/${pin}`),
    getResults: (pin: string) => request(`/games/${pin}/results`),
  },
  discover: {
    categories: () => request('/discover/categories'),
    quizzes: (params: { search?: string; category?: string; sort?: string }) => {
      const sp = new URLSearchParams();
      if (params.search) sp.set('search', params.search);
      if (params.category) sp.set('category', params.category);
      if (params.sort) sp.set('sort', params.sort);
      const qs = sp.toString();
      return request(`/discover/quizzes${qs ? `?${qs}` : ''}`);
    },
    play: (quizId: number) =>
      request(`/discover/${quizId}/play`, { method: 'POST' }),
  },
  folders: {
    list: () => request('/folders'),
    create: (name: string) =>
      request('/folders', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id: number) =>
      request(`/folders/${id}`, { method: 'DELETE' }),
  },
  groups: {
    list: (tab: 'joined' | 'owned' = 'joined') =>
      request(`/groups?tab=${tab}`),
    create: (name: string, description?: string) =>
      request('/groups', { method: 'POST', body: JSON.stringify({ name, description }) }),
    join: (inviteCode: string) =>
      request('/groups/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
    delete: (id: number) =>
      request(`/groups/${id}`, { method: 'DELETE' }),
  },
  reports: {
    list: () => request('/reports'),
    detail: (gameId: number) => request(`/reports/${gameId}`),
  },
  learning: {
    assignments: (tab: 'todo' | 'completed' | 'expired' = 'todo') =>
      request(`/learning/assignments?tab=${tab}`),
    complete: (id: number, score?: number) =>
      request(`/learning/assignments/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ score: score || 0 }),
      }),
    createAssignment: (groupId: number, quizId: number, title?: string, dueDate?: string) =>
      request(`/learning/groups/${groupId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({ quizId, title, dueDate }),
      }),
  },
};
