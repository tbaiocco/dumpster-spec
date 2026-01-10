import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';

/**
 * Centralized Google Cloud authentication service
 * Handles authentication using environment variables instead of JSON key files
 * 
 * Required environment variables:
 * - GOOGLE_CLOUD_PROJECT_ID: The GCP project ID
 * - GOOGLE_CLOUD_CLIENT_EMAIL: Service account email
 * - GOOGLE_CLOUD_PRIVATE_KEY: Service account private key (with newlines)
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly projectId: string;
  private readonly clientEmail: string;
  private readonly privateKey: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.projectId =
      this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || '';
    this.clientEmail =
      this.configService.get<string>('GOOGLE_CLOUD_CLIENT_EMAIL') || '';
    
    // Get private key and normalize newlines
    const rawPrivateKey =
      this.configService.get<string>('GOOGLE_CLOUD_PRIVATE_KEY') || '';
    this.privateKey = this.normalizePrivateKey(rawPrivateKey);

    this.isConfigured =
      !!this.projectId && !!this.clientEmail && !!this.privateKey;

    if (!this.isConfigured) {
      this.logger.warn(
        'Google Cloud service account not configured. Missing one or more environment variables: GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_CLIENT_EMAIL, GOOGLE_CLOUD_PRIVATE_KEY',
      );
    } else {
      this.logger.log(
        `Google Cloud service account configured for project: ${this.projectId}`,
      );
    }
  }

  /**
   * Normalize private key format to handle various input formats
   * Handles both escaped newlines (\n) and actual newlines
   */
  private normalizePrivateKey(key: string): string {
    if (!key) return '';

    // Trim whitespace
    let normalized = key.trim();

    // Remove wrapping quotes (handles both single and double quotes)
    // This fixes the issue when users copy quotes from .env to deployment platforms
    if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
        (normalized.startsWith("'") && normalized.endsWith("'"))) {
      normalized = normalized.slice(1, -1);
    }

    // Replace escaped newlines with actual newlines
    normalized = normalized.replace(/\\n/g, '\n');

    // Ensure proper BEGIN/END markers exist
    if (!normalized.includes('-----BEGIN PRIVATE KEY-----')) {
      this.logger.warn('Private key missing BEGIN marker - check if quotes were accidentally included');
    }
    if (!normalized.includes('-----END PRIVATE KEY-----')) {
      this.logger.warn('Private key missing END marker - check if quotes were accidentally included');
    }

    return normalized;
  }

  /**
   * Get an access token for Google Cloud APIs
   * @param scopes - Optional array of OAuth scopes. Defaults to cloud-platform scope
   * @returns Access token string
   * @throws Error if authentication fails or credentials are not configured
   */
  async getAccessToken(
    scopes: string[] = ['https://www.googleapis.com/auth/cloud-platform'],
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error(
        'Google Cloud credentials not configured. Set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_CLIENT_EMAIL, and GOOGLE_CLOUD_PRIVATE_KEY environment variables',
      );
    }

    try {
      this.logger.debug('Authenticating with Google Cloud service account');
      this.logger.debug(`Project ID: ${this.projectId}`);
      this.logger.debug(`Client Email: ${this.clientEmail}`);

      // Validate private key format
      if (!this.privateKey.includes('-----BEGIN PRIVATE KEY-----') ||
          !this.privateKey.includes('-----END PRIVATE KEY-----')) {
        throw new Error('Invalid private key format. Must include BEGIN and END markers.');
      }

      // Log private key info for debugging (without exposing the key)
      const keyLines = this.privateKey.split('\n');
      this.logger.debug(`Private key has ${keyLines.length} lines`);
      this.logger.debug(`First line: ${keyLines[0]}`);
      this.logger.debug(`Last line: ${keyLines[keyLines.length - 1]}`);

      // Create credentials object from environment variables
      const credentials = {
        type: 'service_account',
        project_id: this.projectId,
        client_email: this.clientEmail,
        private_key: this.privateKey,
      };

      // Create Google Auth client with credentials
      const auth = new GoogleAuth({
        credentials,
        projectId: this.projectId,
        scopes,
      });

      this.logger.debug(
        'Google Auth client created, requesting access token...',
      );

      // Get access token
      const accessToken = await auth.getAccessToken();

      if (!accessToken) {
        throw new Error('No access token returned from Google Cloud');
      }

      this.logger.debug('Access token obtained successfully');
      return accessToken;
    } catch (error) {
      this.logger.error('Error getting access token:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId: this.projectId,
        clientEmail: this.clientEmail,
        privateKeyFormat: this.privateKey ? `${this.privateKey.substring(0, 30)}...` : 'empty',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(
        `Failed to authenticate with Google Cloud service account: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if Google Cloud credentials are properly configured
   * @returns true if all required credentials are present
   */
  isAuthenticated(): boolean {
    return this.isConfigured;
  }

  /**
   * Get the configured project ID
   * @returns Google Cloud project ID
   */
  getProjectId(): string {
    return this.projectId;
  }

  /**
   * Get the configured client email
   * @returns Service account email
   */
  getClientEmail(): string {
    return this.clientEmail;
  }
}
