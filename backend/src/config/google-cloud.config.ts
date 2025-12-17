import { registerAs } from '@nestjs/config';
import * as fs from 'node:fs';

export default registerAs('googleCloud', () => {
  // If base64 encoded credentials are provided (Railway/production deployment)
  if (process.env.GOOGLE_CLOUD_KEY_JSON_BASE64) {
    try {
      const credentials = JSON.parse(
        Buffer.from(
          process.env.GOOGLE_CLOUD_KEY_JSON_BASE64,
          'base64',
        ).toString('utf-8'),
      );

      return {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentials,
      };
    } catch (error) {
      console.error(
        'Failed to parse Google Cloud credentials from base64:',
        error,
      );
      throw new Error('Invalid Google Cloud credentials format');
    }
  }

  // Otherwise use file path (local development)
  const keyFilePath = process.env.GOOGLE_CLOUD_KEY_FILE;
  if (keyFilePath) {
    if (fs.existsSync(keyFilePath)) {
      return {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: keyFilePath,
      };
    } else {
      console.warn(`Google Cloud key file not found: ${keyFilePath}`);
    }
  }

  // Allow running without Google Cloud credentials if not required
  console.warn(
    'Google Cloud credentials not configured. Some features may be unavailable.',
  );
  return {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentials: null,
  };
});
