import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FallbackConfig {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerResetTimeMs: number;
}

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryCondition?: (error: Error) => boolean;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}

export interface FallbackResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  fallbackUsed: boolean;
  attempts: number;
  totalTime: number;
  circuitBreakerTriggered: boolean;
}

@Injectable()
export class FallbackHandlerService {
  private readonly logger = new Logger(FallbackHandlerService.name);
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
  
  private readonly defaultConfig: FallbackConfig = {
    maxRetries: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
    circuitBreakerResetTimeMs: 60000,
  };

  constructor(private readonly configService: ConfigService) {}

  /**
   * Execute a function with retry logic and fallback handling
   */
  async executeWithFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
    serviceName: string,
    options: RetryOptions = {}
  ): Promise<FallbackResult<T>> {
    const startTime = Date.now();
    const config = this.getConfigForService(serviceName);
    
    let attempts = 0;
    let lastError: Error | undefined;
    let circuitBreakerTriggered = false;

    // Check circuit breaker state
    if (config.enableCircuitBreaker && this.isCircuitBreakerOpen(serviceName)) {
      this.logger.warn(`Circuit breaker OPEN for ${serviceName}, using fallback immediately`);
      
      try {
        const fallbackData = await this.executeWithTimeout(fallbackFn, config.timeoutMs);
        return {
          success: true,
          data: fallbackData,
          fallbackUsed: true,
          attempts: 0,
          totalTime: Date.now() - startTime,
          circuitBreakerTriggered: true,
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: fallbackError as Error,
          fallbackUsed: true,
          attempts: 0,
          totalTime: Date.now() - startTime,
          circuitBreakerTriggered: true,
        };
      }
    }

    // Try primary function with retries
    const maxRetries = options.maxRetries ?? config.maxRetries;
    const baseDelay = options.delayMs ?? config.retryDelayMs;
    const backoffMultiplier = options.backoffMultiplier ?? 2;
    const maxDelay = options.maxDelayMs ?? 30000;

    for (attempts = 1; attempts <= maxRetries + 1; attempts++) {
      try {
        this.logger.debug(`Attempting ${serviceName} (attempt ${attempts}/${maxRetries + 1})`);
        
        const result = await this.executeWithTimeout(primaryFn, config.timeoutMs);
        
        // Success - record it and reset circuit breaker
        this.recordSuccess(serviceName);
        
        return {
          success: true,
          data: result,
          fallbackUsed: false,
          attempts,
          totalTime: Date.now() - startTime,
          circuitBreakerTriggered,
        };

      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`${serviceName} attempt ${attempts} failed: ${lastError.message}`);
        
        // Record failure for circuit breaker
        this.recordFailure(serviceName);
        
        // Check if we should retry
        const shouldRetry = this.shouldRetry(lastError, attempts, maxRetries, options.retryCondition);
        
        if (!shouldRetry) {
          break;
        }

        // Calculate delay with exponential backoff
        if (attempts <= maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempts - 1), maxDelay);
          this.logger.debug(`Waiting ${delay}ms before retry ${attempts + 1}`);
          await this.delay(delay);
        }
      }
    }

    // Primary function failed, try fallback
    this.logger.warn(`${serviceName} failed after ${attempts} attempts, using fallback`);
    
    try {
      const fallbackData = await this.executeWithTimeout(fallbackFn, config.timeoutMs);
      
      return {
        success: true,
        data: fallbackData,
        fallbackUsed: true,
        attempts,
        totalTime: Date.now() - startTime,
        circuitBreakerTriggered,
      };

    } catch (fallbackError) {
      this.logger.error(`Fallback also failed for ${serviceName}: ${(fallbackError as Error).message}`);
      
      return {
        success: false,
        error: lastError || (fallbackError as Error),
        fallbackUsed: true,
        attempts,
        totalTime: Date.now() - startTime,
        circuitBreakerTriggered,
      };
    }
  }

  /**
   * Execute function with retry logic only (no fallback)
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    serviceName: string,
    options: RetryOptions = {}
  ): Promise<FallbackResult<T>> {
    const fallbackFn = async (): Promise<T> => {
      throw new Error('No fallback available');
    };

    return this.executeWithFallback(fn, fallbackFn, serviceName, options);
  }

  /**
   * Get circuit breaker state for a service
   */
  getCircuitBreakerState(serviceName: string): CircuitBreakerState {
    return this.circuitBreakers.get(serviceName) || {
      state: 'CLOSED',
      failureCount: 0,
    };
  }

  /**
   * Manually reset circuit breaker for a service
   */
  resetCircuitBreaker(serviceName: string): void {
    this.circuitBreakers.set(serviceName, {
      state: 'CLOSED',
      failureCount: 0,
      lastSuccessTime: new Date(),
    });
    this.logger.log(`Circuit breaker reset for ${serviceName}`);
  }

  /**
   * Get fallback statistics for monitoring
   */
  getStats(): Record<string, {
    circuitBreakerState: CircuitBreakerState;
    isHealthy: boolean;
  }> {
    const stats: Record<string, any> = {};
    
    for (const [serviceName, state] of this.circuitBreakers.entries()) {
      stats[serviceName] = {
        circuitBreakerState: state,
        isHealthy: state.state === 'CLOSED' && state.failureCount < 3,
      };
    }
    
    return stats;
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([fn(), timeoutPromise]);
  }

  private shouldRetry(
    error: Error, 
    attempts: number, 
    maxRetries: number, 
    retryCondition?: (error: Error) => boolean
  ): boolean {
    if (attempts > maxRetries) {
      return false;
    }

    // Check custom retry condition
    if (retryCondition && !retryCondition(error)) {
      return false;
    }

    // Default retry conditions
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'timeout',
      'network',
      'rate limit',
      'throttle',
    ];

    const errorMessage = error.message.toLowerCase();
    const isRetryable = retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );

    // Also retry on 5xx HTTP errors
    if (error.message.includes('status code')) {
      const statusRegex = /status code (\d+)/;
      const statusMatch = statusRegex.exec(error.message);
      if (statusMatch) {
        const statusCode = Number.parseInt(statusMatch[1], 10);
        return statusCode >= 500 && statusCode < 600;
      }
    }

    return isRetryable;
  }

  private isCircuitBreakerOpen(serviceName: string): boolean {
    const state = this.getCircuitBreakerState(serviceName);
    const config = this.getConfigForService(serviceName);

    if (state.state === 'OPEN') {
      // Check if we should transition to HALF_OPEN
      if (state.lastFailureTime) {
        const timeSinceLastFailure = Date.now() - state.lastFailureTime.getTime();
        if (timeSinceLastFailure >= config.circuitBreakerResetTimeMs) {
          this.setCircuitBreakerState(serviceName, 'HALF_OPEN');
          return false; // Allow one request through
        }
      }
      return true;
    }

    return false;
  }

  private recordSuccess(serviceName: string): void {
    const state = this.getCircuitBreakerState(serviceName);
    
    if (state.state === 'HALF_OPEN') {
      // Transition back to CLOSED
      this.setCircuitBreakerState(serviceName, 'CLOSED');
      this.logger.log(`Circuit breaker CLOSED for ${serviceName} after successful request`);
    }

    this.circuitBreakers.set(serviceName, {
      ...state,
      failureCount: 0,
      lastSuccessTime: new Date(),
    });
  }

  private recordFailure(serviceName: string): void {
    const state = this.getCircuitBreakerState(serviceName);
    const config = this.getConfigForService(serviceName);
    
    const newFailureCount = state.failureCount + 1;
    const newState = { ...state, failureCount: newFailureCount, lastFailureTime: new Date() };

    if (state.state === 'HALF_OPEN') {
      // Transition back to OPEN
      this.setCircuitBreakerState(serviceName, 'OPEN');
      this.logger.warn(`Circuit breaker OPEN for ${serviceName} after failed half-open attempt`);
    } else if (state.state === 'CLOSED' && newFailureCount >= config.circuitBreakerThreshold) {
      // Transition to OPEN
      newState.state = 'OPEN';
      this.logger.warn(`Circuit breaker OPEN for ${serviceName} after ${newFailureCount} failures`);
    }

    this.circuitBreakers.set(serviceName, newState);
  }

  private setCircuitBreakerState(serviceName: string, newState: CircuitBreakerState['state']): void {
    const state = this.getCircuitBreakerState(serviceName);
    this.circuitBreakers.set(serviceName, {
      ...state,
      state: newState,
    });
  }

  private getConfigForService(serviceName: string): FallbackConfig {
    // In a real implementation, you might have service-specific configurations
    return this.defaultConfig;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create common fallback functions for different AI services
   */
  createAIServiceFallback<T>(defaultResponse: T, serviceName: string): () => Promise<T> {
    return async (): Promise<T> => {
      this.logger.warn(`Using fallback response for ${serviceName}`);
      return defaultResponse;
    };
  }

  createTextAnalysisFallback() {
    return this.createAIServiceFallback({
      summary: 'Content received but analysis temporarily unavailable.',
      category: 'other',
      sentiment: 'neutral' as const,
      confidence: 0.1,
      extractedEntities: {
        people: [],
        organizations: [],
        locations: [],
        dates: [],
        times: [],
        amounts: [],
      },
      urgency: 'normal' as const,
    }, 'text-analysis');
  }

  createImageAnalysisFallback() {
    return this.createAIServiceFallback({
      description: 'Image received but analysis temporarily unavailable.',
      objects: [],
      text: [],
      faces: [],
      landmarks: [],
      colors: [],
    }, 'image-analysis');
  }

  createVoiceTranscriptionFallback() {
    return this.createAIServiceFallback({
      text: 'Voice message received but transcription temporarily unavailable.',
      confidence: 0.1,
      language: 'en-US',
    }, 'voice-transcription');
  }

  createEntityExtractionFallback() {
    return this.createAIServiceFallback({
      entities: [],
      summary: {
        totalEntities: 0,
        entitiesByType: {},
        averageConfidence: 0,
      },
      structuredData: {
        dates: [],
        times: [],
        locations: [],
        people: [],
        organizations: [],
        amounts: [],
        contacts: {
          phones: [],
          emails: [],
          urls: [],
        },
      },
    }, 'entity-extraction');
  }
}