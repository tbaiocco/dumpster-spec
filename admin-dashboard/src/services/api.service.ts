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
 * API Client Service for Admin Dashboard
 * Provides centralized HTTP client with authentication, error handling, and retry logic
 */
class ApiService {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

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
   * Set authentication tokens
   */
  public setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken || null;

    // Persist to localStorage
    localStorage.setItem('accessToken', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  }

  /**
   * Clear authentication tokens
   */
  public clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Load tokens from localStorage
   */
  private loadTokens(): void {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.accessToken;
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
  public async login(phoneNumber: string, verificationCode: string) {
    return this.post('/auth/login', { phoneNumber, verificationCode });
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
   * Dumps Management
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
    return this.get('/dumps', { params });
  }

  public async getDump(dumpId: string) {
    return this.get(`/dumps/${dumpId}`);
  }

  public async updateDump(dumpId: string, data: any) {
    return this.patch(`/dumps/${dumpId}`, data);
  }

  public async deleteDump(dumpId: string) {
    return this.delete(`/dumps/${dumpId}`);
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

  public async approveReview(dumpId: string, notes?: string) {
    return this.post(`/review/${dumpId}/approve`, { notes });
  }

  public async rejectReview(dumpId: string, reason: string, notes?: string) {
    return this.post(`/review/${dumpId}/reject`, { reason, notes });
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
