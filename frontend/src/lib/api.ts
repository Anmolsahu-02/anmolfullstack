const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth methods
  async signUp(email: string, name: string, password: string) {
    const data = await this.post<{ data: { token: string; user: { id: string; name: string } } }>(
      '/auth/register',
      { email, name, password }
    );
    this.setToken(data.data.token);
    return data;
  }

  async signIn(email: string, password: string) {
    const data = await this.post<{ data: { token: string; user: { id: string; name: string } } }>(
      '/auth/login',
      { email, password }
    );
    this.setToken(data.data.token);
    return data;
  }

  async signOut() {
    this.clearToken();
  }

  // Content methods
  async getContent(id: string) {
    return this.get(`/content/${id}`);
  }

  async createContent(content: {
    title: string;
    genre: string;
    language: string;
    contentType: string;
    quillDelta: unknown;
    tags?: string[];
  }) {
    return this.post('/content', content);
  }

  async searchContent(query: string) {
    return this.get(`/content/search?q=${encodeURIComponent(query)}`);
  }

  async getTrending() {
    return this.get('/content/trending');
  }

  async getContentByLanguage(lang: string) {
    return this.get(`/content/by-language?lang=${lang}`);
  }

  async bookmarkContent(contentId: string) {
    return this.post(`/content/${contentId}/bookmark`, {});
  }

  async unbookmarkContent(contentId: string) {
    return this.post(`/content/${contentId}/unbookmark`, {});
  }

  async rateContent(contentId: string, score: number) {
    return this.post(`/content/${contentId}/rate`, { score });
  }

  // User methods
  async getUser(userId: string) {
    return this.get(`/users/${userId}`);
  }

  async updateUser(userId: string, data: unknown) {
    return this.patch(`/users/${userId}`, data);
  }
}

export const apiClient = new APIClient();
