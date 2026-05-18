const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const REQUEST_TIMEOUT = 10000; // 10 seconds

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

// AbortController timeout helper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return promise
    .finally(() => clearTimeout(timeout))
    .catch((err) => {
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${ms}ms`);
      }
      throw err;
    });
}

interface QuillDelta {
  ops: Array<{
    insert?: string;
    attributes?: Record<string, unknown>;
  }>;
}

interface Content {
  _id: string;
  id?: string;
  title: string;
  genre: string;
  language: string;
  contentType: 'lyrics' | 'story' | 'poem' | 'screenplay';
  category?: string;
  quillDelta: QuillDelta;
  authorId: string;
  tags: string[];
  bookmarkCount: number;
  ratingSum: number;
  ratingCount: number;
  status: 'draft' | 'published';
  rating?: number;
  excerpt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  versions?: Array<{ versionId: string; label?: string; editedAt: string }>;
  isDeleted: boolean;
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
    console.log('[API] Request to:', url, 'method:', options.method || 'GET');

    const fetchPromise = fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    try {
      const response = await withTimeout(fetchPromise, REQUEST_TIMEOUT);
      console.log('[API] Response from:', endpoint, 'status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json() as Promise<T>;
    } catch (err) {
      console.error('[API] Error:', endpoint, err);
      throw err;
    }
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
  async signUp(email: string, name: string, password: string, role: 'writer' | 'reader' = 'writer') {
    const data = await this.post<{ data: { token: string; user: { id: string; name: string; role: 'writer' | 'reader' } } }>(
      '/auth/register',
      { email, name, password, role }
    );
    this.setToken(data.data.token);
    return data;
  }

  async signIn(email: string, password: string) {
    const data = await this.post<{ data: { token: string; user: { id: string; name: string; role: 'writer' | 'reader' } } }>(
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
  async getContent(id: string): Promise<{ data: Content }> {
    return this.get(`/content/${id}`);
  }

  async createContent(content: {
    title: string;
    genre: string;
    language: string;
    contentType: 'lyrics' | 'story' | 'poem' | 'screenplay';
    quillDelta: QuillDelta;
    tags?: string[];
  }): Promise<{ data: Content }> {
    return this.post('/content', content);
  }

  async updateAutosave(
    contentId: string,
    delta: QuillDelta
  ): Promise<{ data: { saved: boolean; updatedAt: string } }> {
    return this.patch(`/content/${contentId}/autosave`, { delta });
  }

  async updateMeta(
    contentId: string,
    meta: { title?: string; genre?: string; language?: string; contentType?: string }
  ): Promise<{ data: Content }> {
    return this.patch(`/content/${contentId}/meta`, meta);
  }

  async saveVersion(
    contentId: string,
    data: { delta: QuillDelta; label?: string }
  ): Promise<{ data: Content }> {
    return this.post(`/content/${contentId}/versions`, data);
  }

  async listVersions(contentId: string): Promise<{ data: { embedded: unknown[]; archived: unknown[] } }> {
    return this.get(`/content/${contentId}/versions`);
  }

  async restoreVersion(
    contentId: string,
    versionId: string
  ): Promise<{ success: boolean; data: unknown }> {
    return this.post(`/content/${contentId}/restore/${versionId}`, {});
  }

  async deleteContent(contentId: string): Promise<{ success: boolean; deleted: boolean }> {
    return this.delete(`/content/${contentId}`);
  }

  async browseContent(params?: {
    genre?: string;
    language?: string;
    contentType?: string;
    sort?: 'latest' | 'bookmarks' | 'rating';
    cursor?: string;
  }): Promise<{ success: boolean; data: Content[] }> {
    const p = new URLSearchParams();
    if (params?.genre) p.append('genre', params.genre);
    if (params?.language) p.append('language', params.language);
    if (params?.contentType) p.append('contentType', params.contentType);
    if (params?.sort) p.append('sort', params.sort);
    if (params?.cursor) p.append('cursor', params.cursor);
    const qs = p.toString();
    return this.get(`/content${qs ? `?${qs}` : ''}`);
  }

  async getDrafts(): Promise<{ success: boolean; data: Content[] }> {
    return this.get('/content/drafts');
  }

  async getMyPublished(): Promise<{ success: boolean; data: Content[] }> {
    return this.get('/content/my-published');
  }

  async getMyBookmarks(): Promise<{ success: boolean; data: Content[] }> {
    return this.get('/content/my-bookmarks');
  }

  async publishContent(contentId: string): Promise<{ success: boolean; data: Content }> {
    return this.post(`/content/${contentId}/publish`, {});
  }

  async unpublishContent(contentId: string): Promise<{ success: boolean; data: Content }> {
    return this.post(`/content/${contentId}/unpublish`, {});
  }

  async searchContent(
    query: string,
    language?: string,
    genre?: string
  ): Promise<{ data: Content[] }> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (language) params.append('language', language);
    if (genre) params.append('genre', genre);
    return this.get(`/content/search?${params.toString()}`);
  }

  async getTrendingContent(): Promise<{ data: Content[] }> {
    return this.get('/content/trending');
  }

  async getLanguageStats(): Promise<{ data: unknown[] }> {
    return this.get('/content/stats/language');
  }

  async getContentByLanguage(lang: string, sort?: string): Promise<{ data: Content[] }> {
    const params = new URLSearchParams({ lang });
    if (sort) params.append('sort', sort);
    return this.get(`/content/by-language?${params.toString()}`);
  }

  async toggleBookmark(contentId: string): Promise<{ success: boolean; data: { bookmarked: boolean; count: number } }> {
    return this.post(`/content/${contentId}/bookmark`, {});
  }

  async rateContent(contentId: string, score: number): Promise<{ data: { rated: boolean; avg: number; count: number } }> {
    return this.post(`/content/${contentId}/rate`, { score });
  }

  async getRating(contentId: string): Promise<{ data: { avg: number; count: number } }> {
    return this.get(`/content/${contentId}/rating`);
  }

  // User methods
  async getUser(userId: string): Promise<{ data: { id: string; name: string; email: string } }> {
    return this.get(`/users/${userId}`);
  }

  async updateUser(
    userId: string,
    data: Record<string, unknown>
  ): Promise<{ data: { id: string; name: string; email: string } }> {
    return this.patch(`/users/${userId}`, data);
  }

  async getProfileStats(userId: string): Promise<{ data: { byGenre: unknown[]; byLanguage: unknown[]; topContent: unknown[] } }> {
    return this.get(`/users/${userId}/profile-stats`);
  }
}

export const apiClient = new APIClient();
