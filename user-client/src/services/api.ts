import axios, { type AxiosInstance, AxiosError, type AxiosRequestConfig } from 'axios';

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
 * API Client Service for User Frontend
 * Provides centralized HTTP client with authentication, error handling, and retry logic
 */
class ApiService {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || import.meta.env.VITE_API_URL || 'http://localhost:3001',
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
   * Handle successful responses
   */
  private handleSuccess<T>(data: any): ApiResponse<T> {
    // If backend returns ApiResponse format, use it directly
    if (data && typeof data === 'object' && 'success' in data) {
      return data;
    }

    // Otherwise wrap in ApiResponse format
    return {
      success: true,
      data,
    };
  }

  /**
   * Handle error responses
   */
  private handleError(error: AxiosError): ApiResponse {
    const response = error.response?.data as any;

    return {
      success: false,
      error: {
        message: response?.message || error.message || 'An unexpected error occurred',
        code: response?.code || error.code,
        details: response?.details,
      },
    };
  }

  // ============================================================================
  // USER-SPECIFIC AUTHENTICATION ENDPOINTS
  // ============================================================================

  /**
   * Send verification code to phone
   */
  public async sendVerificationCode(phoneNumber: string) {
    return this.post('/auth/send-code', { phone_number: phoneNumber });
  }

  /**
   * User login with phone and verification code
   * Returns: { access_token: string, user: { id, phone_number, verified_at, chat_id_telegram, chat_id_whatsapp, timezone, language } }
   */
  public async login(phoneNumber: string, verificationCode: string) {
    return this.post('/auth/login', { 
      phone_number: phoneNumber, 
      verification_code: verificationCode 
    });
  }

  /**
   * User logout
   */
  public async logout() {
    this.clearTokens();
    return { success: true };
  }
}

// Export singleton instance
export const apiService = new ApiService();

export default apiService;
