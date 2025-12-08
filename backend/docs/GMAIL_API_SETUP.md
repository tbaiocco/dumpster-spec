# Gmail API Integration for Email Ingestion

This guide explains how to integrate Gmail API to process emails arriving in your Gmail inbox as dumps in Dumpster.

## Overview

Since you're using a free Gmail account and don't have a custom domain, you can use Gmail's API to:
- Poll your inbox for new emails
- Process them through the EmailProcessorService
- Create dumps automatically

This is an alternative to SendGrid's Inbound Parse webhook.

## Prerequisites

1. Gmail account (you already have this)
2. Google Cloud Project
3. Gmail API enabled
4. OAuth 2.0 credentials

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Create Project" or select existing project
3. Name it "Dumpster Email Integration"
4. Click "Create"

### 2. Enable Gmail API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Desktop app" or "Web application"
4. For Web app:
   - **Authorized redirect URIs**: 
     - `http://localhost:3000/api/email/gmail/callback`
     - `https://api.theclutter.app/api/email/gmail/callback`
5. Click "Create"
6. Download the JSON file (client_secret.json)

### 4. Get Refresh Token

You need to authorize the app once to get a refresh token:

**Run this authorization script:**

```typescript
// scripts/authorize-gmail.ts
import { google } from 'googleapis';
import * as readline from 'readline';
import * as fs from 'fs';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = 'config/gmail-token.json';
const CREDENTIALS_PATH = 'config/gmail-credentials.json';

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Generate auth URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this url:', authUrl);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      
      // Save token
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      console.log('Token stored to', TOKEN_PATH);
      console.log('Refresh token:', token.refresh_token);
    });
  });
}

authorize();
```

**Run it:**
```bash
cd backend
npm install googleapis
ts-node scripts/authorize-gmail.ts
```

### 5. Add Environment Variables

Add to your `.env`:
```bash
# Gmail API Configuration
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_POLLING_ENABLED=true
GMAIL_POLLING_INTERVAL_MINUTES=5
GMAIL_LABEL_FILTER=INBOX # Optional: filter by label
```

### 6. Install Dependencies

```bash
npm install googleapis @google-cloud/local-auth
```

## Implementation

### Create Gmail Service

```typescript
// src/modules/email/gmail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  private oauth2Client: OAuth2Client;
  private gmail;
  private lastProcessedMessageId: string | null = null;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    const clientId = this.configService.get<string>('GMAIL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GMAIL_CLIENT_SECRET');
    const refreshToken = this.configService.get<string>('GMAIL_REFRESH_TOKEN');

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Poll inbox for new messages
   */
  async pollInbox(): Promise<any[]> {
    try {
      const query = this.buildQuery();
      
      // List messages
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10, // Process 10 at a time
      });

      const messages = response.data.messages || [];
      
      if (messages.length === 0) {
        this.logger.debug('No new messages found');
        return [];
      }

      this.logger.log(`Found ${messages.length} new message(s)`);

      // Fetch full message details
      const fullMessages = await Promise.all(
        messages.map(msg => this.getMessage(msg.id))
      );

      return fullMessages.filter(msg => msg !== null);
    } catch (error) {
      this.logger.error(`Failed to poll inbox: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get full message details
   */
  private async getMessage(messageId: string): Promise<any> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      return this.parseMessage(response.data);
    } catch (error) {
      this.logger.error(`Failed to get message ${messageId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse Gmail message to standard format
   */
  private parseMessage(message: any): any {
    const headers = message.payload.headers;
    const getHeader = (name: string) => 
      headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract body
    let textBody = '';
    let htmlBody = '';

    if (message.payload.body.data) {
      textBody = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          textBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.mimeType === 'text/html' && part.body.data) {
          htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    // Extract attachments
    const attachments = [];
    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.filename && part.body.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            attachmentId: part.body.attachmentId,
            size: part.body.size,
          });
        }
      }
    }

    return {
      id: message.id,
      threadId: message.threadId,
      messageId: getHeader('Message-ID'),
      from: getHeader('From'),
      to: getHeader('To').split(',').map(e => e.trim()),
      cc: getHeader('Cc').split(',').filter(Boolean).map(e => e.trim()),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      textBody,
      htmlBody,
      attachments,
      labels: message.labelIds || [],
      snippet: message.snippet,
      internalDate: new Date(parseInt(message.internalDate)),
    };
  }

  /**
   * Build search query
   */
  private buildQuery(): string {
    const queries = [];
    
    // Only unread messages
    queries.push('is:unread');
    
    // Optional: filter by label
    const labelFilter = this.configService.get<string>('GMAIL_LABEL_FILTER');
    if (labelFilter && labelFilter !== 'INBOX') {
      queries.push(`label:${labelFilter}`);
    }
    
    // Newer than last processed (if available)
    if (this.lastProcessedMessageId) {
      queries.push(`after:${this.lastProcessedMessageId}`);
    }

    return queries.join(' ');
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
      this.logger.debug(`Marked message ${messageId} as read`);
    } catch (error) {
      this.logger.error(`Failed to mark message as read: ${error.message}`);
    }
  }

  /**
   * Add label to message
   */
  async addLabel(messageId: string, labelName: string): Promise<void> {
    try {
      // Get or create label
      const labels = await this.gmail.users.labels.list({ userId: 'me' });
      let label = labels.data.labels.find(l => l.name === labelName);

      if (!label) {
        const created = await this.gmail.users.labels.create({
          userId: 'me',
          requestBody: { name: labelName },
        });
        label = created.data;
      }

      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [label.id],
        },
      });
      
      this.logger.debug(`Added label ${labelName} to message ${messageId}`);
    } catch (error) {
      this.logger.error(`Failed to add label: ${error.message}`);
    }
  }

  /**
   * Download attachment
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId,
      });

      return Buffer.from(response.data.data, 'base64');
    } catch (error) {
      this.logger.error(`Failed to get attachment: ${error.message}`);
      return null;
    }
  }
}
```

### Create Polling Service

```typescript
// src/modules/email/gmail-poller.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GmailService } from './gmail.service';
import { EmailProcessorService } from './email-processor.service';
import { DumpService } from '../dumps/services/dump.service';

@Injectable()
export class GmailPollerService implements OnModuleInit {
  private readonly logger = new Logger(GmailPollerService.name);
  private isProcessing = false;

  constructor(
    private configService: ConfigService,
    private gmailService: GmailService,
    private emailProcessor: EmailProcessorService,
    private dumpService: DumpService,
  ) {}

  onModuleInit() {
    const enabled = this.configService.get<boolean>('GMAIL_POLLING_ENABLED');
    if (enabled) {
      this.logger.log('Gmail polling service initialized');
      // Run immediately on startup
      this.pollAndProcess();
    }
  }

  /**
   * Poll every 5 minutes (configurable)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollAndProcess() {
    const enabled = this.configService.get<boolean>('GMAIL_POLLING_ENABLED');
    if (!enabled || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.logger.log('Starting Gmail polling...');

    try {
      // Fetch new messages
      const messages = await this.gmailService.pollInbox();

      if (messages.length === 0) {
        this.logger.debug('No new messages to process');
        return;
      }

      // Process each message
      for (const message of messages) {
        await this.processMessage(message);
      }

      this.logger.log(`Successfully processed ${messages.length} message(s)`);
    } catch (error) {
      this.logger.error(`Gmail polling failed: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single Gmail message
   */
  private async processMessage(message: any): Promise<void> {
    try {
      this.logger.log(`Processing email: ${message.subject} from ${message.from}`);

      // Convert to internal email format
      const emailMessage = {
        id: message.messageId,
        from: message.from,
        to: message.to,
        cc: message.cc || [],
        bcc: [],
        subject: message.subject,
        textBody: message.textBody,
        htmlBody: message.htmlBody,
        attachments: [], // Fetch separately if needed
        receivedDate: message.internalDate,
        headers: {},
      };

      // Process email
      const processedEmail = await this.emailProcessor.processEmail(emailMessage);

      // Create dump
      const dump = await this.createDumpFromEmail(processedEmail, message.from);

      this.logger.log(`Created dump ${dump.id} from email ${message.messageId}`);

      // Mark as read and add label
      await this.gmailService.markAsRead(message.id);
      await this.gmailService.addLabel(message.id, 'Dumpster/Processed');

    } catch (error) {
      this.logger.error(`Failed to process message: ${error.message}`, error.stack);
      // Add error label
      await this.gmailService.addLabel(message.id, 'Dumpster/Failed');
    }
  }

  /**
   * Create dump from processed email
   */
  private async createDumpFromEmail(processedEmail: any, fromAddress: string): Promise<any> {
    const content = processedEmail.extractedText;
    const metadata = {
      source: 'gmail',
      sender: processedEmail.metadata.sender,
      timestamp: processedEmail.metadata.timestamp,
      hasAttachments: processedEmail.metadata.hasAttachments,
      attachmentCount: processedEmail.metadata.attachmentCount,
      priority: processedEmail.metadata.priority,
    };

    const dumpRequest = {
      userId: '1', // You'll need to map email to user
      content,
      contentType: 'text' as const,
      metadata: {
        ...metadata,
        source: 'gmail' as any,
      },
    };

    return await this.dumpService.createDumpEnhanced(dumpRequest);
  }
}
```

### Update Module

```typescript
// src/modules/email/email.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailController } from './email.controller';
import { EmailProcessorService } from './email-processor.service';
import { GmailService } from './gmail.service';
import { GmailPollerService } from './gmail-poller.service';
import { DumpsModule } from '../dumps/dumps.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable cron jobs
    DumpsModule,
  ],
  controllers: [EmailController],
  providers: [
    EmailProcessorService,
    GmailService,
    GmailPollerService,
  ],
  exports: [EmailProcessorService, GmailService],
})
export class EmailModule {}
```

## Testing

### 1. Send Test Email

Send an email to your Gmail inbox from another account.

### 2. Check Logs

Watch the logs for polling activity:
```bash
railway logs --tail
```

You should see:
```
[GmailPollerService] Starting Gmail polling...
[GmailPollerService] Found 1 new message(s)
[GmailPollerService] Processing email: Test Subject from sender@example.com
[GmailPollerService] Created dump 123 from email message-id
[GmailPollerService] Successfully processed 1 message(s)
```

### 3. Verify in Gmail

Check your Gmail:
- Message should be marked as read
- Label "Dumpster/Processed" should be added

### 4. Verify in Database

Check that a dump was created:
```sql
SELECT * FROM dumps WHERE extracted_entities->>'source' = 'gmail' ORDER BY created_at DESC LIMIT 1;
```

## Configuration Options

### Polling Interval

Change polling frequency in `.env`:
```bash
# Every 1 minute (for testing)
GMAIL_POLLING_INTERVAL_MINUTES=1

# Every 15 minutes (production)
GMAIL_POLLING_INTERVAL_MINUTES=15
```

Update the cron expression in `gmail-poller.service.ts`:
```typescript
@Cron('*/1 * * * *') // Every 1 minute
// or
@Cron(CronExpression.EVERY_15_MINUTES)
```

### Filter by Label

Only process emails with specific label:
```bash
GMAIL_LABEL_FILTER=ToDumpster
```

Then create a Gmail filter to auto-label incoming emails.

### Filter by Sender

Modify the query in `GmailService`:
```typescript
private buildQuery(): string {
  const queries = ['is:unread'];
  
  // Only from specific sender
  queries.push('from:specific@example.com');
  
  return queries.join(' ');
}
```

## Advantages Over Webhook

- ✅ No domain required
- ✅ Works with free Gmail
- ✅ Can filter by labels, senders, etc.
- ✅ Can mark as read, add labels
- ✅ Access to full Gmail features

## Disadvantages

- ❌ Not real-time (5-minute delay)
- ❌ More complex setup (OAuth)
- ❌ Needs background job/cron
- ❌ API rate limits (but generous for personal use)

## Next Steps

1. Complete OAuth setup
2. Get refresh token
3. Add environment variables
4. Deploy to Railway
5. Test with real emails

Once you have a domain, you can switch to SendGrid webhooks for real-time processing!
