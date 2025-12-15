import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * User data from authentication
 */
export interface UserData {
  id: string;
  phone_number: string;
  role: string;
  verified_at: Date;
  chat_id_telegram: string | null;
  chat_id_whatsapp: string | null;
  timezone: string;
  language: string;
}

/**
 * API Client Service for Admin Dashboard
 * Provides centralized HTTP client with authentication, error handling, and retry logic
 */
class ApiService {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private userData: UserData | null = null;

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || process.env.REACT_APP_API_URL || 'http://localhost:3000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 errors - attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (this.refreshToken) {
            try {
              const { data } = await this.client.post('/auth/refresh', {
                refreshToken: this.refreshToken,
              });

              this.setTokens({
                accessToken: data.accessToken,
                refreshToken: data.refreshToken || this.refreshToken,
              });

              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
              }
              return this.client(originalRequest);
            } catch (refreshError) {
              // Refresh failed - clear tokens and redirect to login
              this.clearTokens();
              window.location.href = '/login';
              return Promise.reject(refreshError);
            }
          } else {
            // No refresh token - redirect to login
            this.clearTokens();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );

    // Load tokens from localStorage on initialization
    this.loadTokens();
  }

  /**
   * Set authentication tokens and user data
   */
  public setTokens(tokens: AuthTokens, user?: UserData): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken || null;
    this.userData = user || null;

    // Persist to localStorage
    localStorage.setItem('accessToken', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
    if (user) {
      localStorage.setItem('userData', JSON.stringify(user));
    }
  }

  /**
   * Clear authentication tokens and user data
   */
  public clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.userData = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  }

  /**
   * Load tokens and user data from localStorage
   */
  private loadTokens(): void {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      try {
        this.userData = JSON.parse(storedUser);
      } catch (e) {
        console.error('Failed to parse stored user data:', e);
        this.userData = null;
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Check if authenticated user is an admin
   */
  public isAdmin(): boolean {
    return this.userData?.role === 'ADMIN';
  }

  /**
   * Get current user data
   */
  public getCurrentUser(): UserData | null {
    return this.userData;
  }

  /**
   * Generic GET request
   */
  public async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(url, config);
      return this.handleSuccess(response.data);
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  /**
   * Generic POST request
   */
  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data, config);
      return this.handleSuccess(response.data);
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  /**
   * Generic PUT request
   */
  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(url, data, config);
      return this.handleSuccess(response.data);
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  /**
   * Generic PATCH request
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch(url, data, config);
      return this.handleSuccess(response.data);
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  /**
   * Generic DELETE request
   */
  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(url, config);
      return this.handleSuccess(response.data);
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  /**
   * Handle successful response
   */
  private handleSuccess<T>(data: any): ApiResponse<T> {
    // Backend already returns { success, data, message } format
    // Just pass it through
    if (data && typeof data === 'object' && 'success' in data) {
      return data;
    }
    
    // Fallback for non-standard responses
    return {
      success: true,
      data: data,
      meta: data.meta,
    };
  }

  /**
   * Handle error response
   */
  private handleError(error: AxiosError): ApiResponse {
    const response = error.response?.data as any;
    
    return {
      success: false,
      error: {
        message: response?.message || error.message || 'An error occurred',
        code: response?.code || error.code,
        details: response?.details,
      },
    };
  }

  // ============================================================================
  // ADMIN-SPECIFIC ENDPOINTS
  // ============================================================================

  /**
   * Authentication
   */
  public async sendVerificationCode(phoneNumber: string) {
    return this.post('/auth/send-code', { phone_number: phoneNumber });
  }

  public async login(phoneNumber: string, verificationCode: string) {
    return this.post('/auth/login', { phone_number: phoneNumber, verification_code: verificationCode });
  }

  public async logout() {
    this.clearTokens();
    return { success: true };
  }

  /**
   * Users Management
   */
  public async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    return this.get('/users', { params });
  }

  public async getUser(userId: string) {
    return this.get(`/users/${userId}`);
  }

  public async updateUser(userId: string, data: any) {
    return this.patch(`/users/${userId}`, data);
  }

  public async deleteUser(userId: string) {
    return this.delete(`/users/${userId}`);
  }

  /**
   * Dump Management
   */
  public async getDumps(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    categoryId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.get('/admin/dumps', { params });
  }

  public async getDump(dumpId: string) {
    return this.get(`/api/dumps/${dumpId}`);
  }

  public async updateDump(dumpId: string, data: any) {
    return this.patch(`/api/dumps/${dumpId}`, data);
  }

  public async deleteDump(dumpId: string) {
    return this.delete(`/api/dumps/${dumpId}`);
  }

  /**
   * Review Management (Flagged Content)
   */
  public async getReviews(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
  }) {
    return this.get('/review/flagged', { params });
  }

  public async getReview(dumpId: string) {
    return this.get(`/review/flagged/${dumpId}`);
  }

  public async approveReview(
    dumpId: string,
    data?: {
      raw_content?: string;
      category?: string;
      notes?: string;
    }
  ) {
    return this.post(`/review/${dumpId}/approve`, data);
  }

  public async rejectReview(dumpId: string, reason: string, notes?: string) {
    return this.post(`/review/${dumpId}/reject`, { reason, notes });
  }

  /**
   * Categories
   */
  public async getCategories() {
    return this.get('/admin/categories');
  }

  /**
   * Analytics
   */
  public async getSystemMetrics() {
    return this.get('/admin/analytics/system');
  }

  public async getSearchMetrics(params?: { startDate?: string; endDate?: string }) {
    return this.get('/admin/analytics/search', { params });
  }

  public async getAIMetrics(params?: { startDate?: string; endDate?: string }) {
    return this.get('/admin/analytics/ai', { params });
  }

  public async getUserStats() {
    return this.get('/admin/analytics/users');
  }

  public async getFeatureStats() {
    return this.get('/admin/analytics/features');
  }

  /**
   * Feedback Management
   */
  public async getAllFeedback(params?: {
    type?: string;
    status?: string;
    priority?: string;
    userId?: string;
    dumpId?: string;
    tags?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.get('/feedback', { params });
  }

  public async getFeedback(feedbackId: string) {
    return this.get(`/feedback/${feedbackId}`);
  }

  public async getUserFeedback(userId: string) {
    return this.get(`/feedback/user/${userId}`);
  }

  public async updateFeedbackStatus(
    feedbackId: string,
    status: string,
    resolution?: string,
    userId?: string
  ) {
    return this.put(`/feedback/${feedbackId}/status`, { status, resolution }, { params: { userId } });
  }

  public async addFeedbackNote(feedbackId: string, note: string) {
    return this.post(`/feedback/${feedbackId}/notes`, { note });
  }

  public async upvoteFeedback(feedbackId: string) {
    return this.post(`/feedback/${feedbackId}/upvote`);
  }

  public async getFeedbackStats() {
    return this.get('/feedback/stats/overview');
  }

  public async getFeedbackMetadata() {
    return this.get('/feedback/options/metadata');
  }

  /**
   * Admin Operations
   */
  public async recreateVectorIndex() {
    return this.post('/admin/recreate-vector-index');
  }

  public async getVectorHealth() {
    return this.get('/admin/vector-health');
  }

  public async cleanDumps(daysOld: number) {
    return this.post('/admin/clean-dumps', { daysOld });
  }

  public async testClaude(text: string) {
    return this.post('/admin/test-claude', { text });
  }

  public async checkEnvironment() {
    return this.get('/admin/env-check');
  }
}

// Export singleton instance
export const apiService = new ApiService();

export default apiService;
