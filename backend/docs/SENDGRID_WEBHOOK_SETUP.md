# SendGrid Inbound Parse Webhook Setup Guide

This guide explains how to configure SendGrid's Inbound Parse webhook to forward emails to your Dumpster application.

## Overview

SendGrid's Inbound Parse feature allows you to receive emails at a custom domain/subdomain and have them forwarded to your application as HTTP POST requests.

## Prerequisites

1. **SendGrid Account**: Sign up at [sendgrid.com](https://sendgrid.com)
2. **Domain Access**: You need access to your domain's DNS settings
3. **Deployed Application**: Your backend must be accessible via HTTPS

## Configuration Steps

### 1. Get Your Webhook URL

Your webhook endpoint is:
```
https://your-domain.com/api/email/webhook/sendgrid
```

**For Railway deployment:**
```
https://api.theclutter.app/api/email/webhook/sendgrid
```

### 2. Configure DNS Records

#### Option A: Subdomain (Recommended)
Set up a subdomain like `inbox.yourdomain.com`:

1. Go to your DNS provider (Cloudflare, GoDaddy, etc.)
2. Add an MX record:
   - **Host/Name**: `inbox` (or your chosen subdomain)
   - **Value/Points to**: `mx.sendgrid.net`
   - **Priority**: `10`
   - **TTL**: `3600` (or Auto)

**Example DNS Record:**
```
Type: MX
Name: inbox
Priority: 10
Value: mx.sendgrid.net
TTL: 3600
```

#### Option B: Root Domain
To use your root domain (e.g., `@yourdomain.com`):

1. Add MX record:
   - **Host/Name**: `@` or leave blank
   - **Value**: `mx.sendgrid.net`
   - **Priority**: `10`

⚠️ **Warning**: This will route ALL emails to your domain through SendGrid.

### 3. Configure SendGrid Inbound Parse

1. **Login to SendGrid**:
   - Go to [sendgrid.com](https://app.sendgrid.com)
   - Navigate to **Settings** → **Inbound Parse**

2. **Add New Host & URL**:
   - Click **"Add Host & URL"**

3. **Fill in the form**:
   - **Domain**: Your subdomain (e.g., `inbox.yourdomain.com`) or root domain
   - **URL**: Your webhook endpoint
     ```
     https://api.theclutter.app/api/email/webhook/sendgrid
     ```
   - **Spam Check**: ✅ Enable (Recommended)
   - **Send Raw**: ❌ Disable (we process parsed data)
   - **POST the raw, full MIME message**: ❌ Disable

4. **Save Configuration**

### 4. Verify DNS Propagation

Check if your MX record is properly configured:

```bash
# Check MX records
dig MX inbox.yourdomain.com

# Or use nslookup
nslookup -type=mx inbox.yourdomain.com
```

Expected output should include:
```
inbox.yourdomain.com.    3600    IN    MX    10 mx.sendgrid.net.
```

DNS propagation can take 24-48 hours, but usually completes within a few hours.

### 5. Test the Integration

#### Method 1: Send a Test Email
Send an email to your configured address:
```
To: anything@inbox.yourdomain.com
Subject: Test Email
Body: This is a test message for Dumpster integration
```

#### Method 2: Use SendGrid's Event Webhook Tester
1. In SendGrid dashboard, go to **Inbound Parse** settings
2. Click on your configured webhook
3. Use the **Test Your Integration** feature

#### Method 3: Manual Webhook Test
Use curl to simulate SendGrid's webhook:

```bash
curl -X POST https://api.theclutter.app/api/email/webhook/sendgrid \
  -H "Content-Type: application/json" \
  -d '{
    "headers": "From: test@example.com\nTo: inbox@yourdomain.com\nSubject: Test\n",
    "from": "test@example.com",
    "to": "inbox@yourdomain.com",
    "subject": "Test Email",
    "text": "This is a test email body",
    "html": "<p>This is a test email body</p>",
    "messageId": "test-message-123",
    "timestamp": "2025-12-02T10:00:00Z"
  }'
```

### 6. Monitor Webhook Activity

#### Check Application Logs
Monitor your Railway/backend logs for incoming webhooks:

```bash
# Railway CLI
railway logs

# Or check Railway dashboard
https://railway.app/project/[your-project]/deployments
```

Look for log entries like:
```
[EmailController] Received SendGrid email webhook
[EmailController] Successfully processed email test-message-123 as dump [dump-id]
```

#### SendGrid Activity Feed
1. Go to SendGrid dashboard → **Activity**
2. Filter by **Inbound Parse**
3. Check for successful/failed webhook deliveries

## SendGrid Webhook Payload Format

SendGrid sends the following data structure (the controller converts it automatically):

```json
{
  "headers": "Received: from mail.example.com...",
  "dkim": "{@example.com : pass}",
  "email": "test@example.com",
  "to": "inbox@yourdomain.com",
  "cc": "",
  "from": "Test User <test@example.com>",
  "sender_ip": "1.2.3.4",
  "spam_report": "Spam detection score: 0.0",
  "envelope": "{\"to\":[\"inbox@yourdomain.com\"],\"from\":\"test@example.com\"}",
  "subject": "Test Email",
  "spam_score": "0.0",
  "charsets": "{\"to\":\"UTF-8\",\"html\":\"UTF-8\",\"subject\":\"UTF-8\",\"from\":\"UTF-8\",\"text\":\"UTF-8\"}",
  "SPF": "pass",
  "attachments": "0",
  "text": "This is the plain text body",
  "html": "<p>This is the HTML body</p>",
  "attachment-info": "{}"
}
```

## Security Considerations

### 1. Add Webhook Authentication

Update your environment variables to include an API key:

```bash
# .env
SENDGRID_WEBHOOK_SECRET=your-secure-random-string
```

Then modify the `validateWebhookSignature` method to check this:

```typescript
private async validateWebhookSignature(
  headers: Record<string, string>,
  payload: any,
): Promise<void> {
  const apiKey = headers['x-api-key'];
  const expectedKey = process.env.SENDGRID_WEBHOOK_SECRET;

  if (!apiKey || apiKey !== expectedKey) {
    throw new UnauthorizedException('Invalid webhook signature');
  }
}
```

In SendGrid, add the header when configuring the webhook:
- **Custom Headers**: `X-API-Key: your-secure-random-string`

### 2. Enable HTTPS Only
- Ensure your webhook URL uses HTTPS (Railway provides this automatically)
- Never accept webhooks over HTTP in production

### 3. IP Whitelist (Optional)
SendGrid sends webhooks from specific IP ranges. You can whitelist these in your firewall:

SendGrid IP ranges:
- `167.89.0.0/17`
- `167.89.96.0/20`
- `167.89.112.0/20`

## Troubleshooting

### Issue: Emails Not Arriving

**Check 1: DNS Propagation**
```bash
dig MX inbox.yourdomain.com
```

**Check 2: SendGrid Configuration**
- Verify the domain matches your MX record
- Ensure the webhook URL is correct and accessible

**Check 3: Email Routing**
- Check spam folders
- Verify the sending domain isn't blacklisted

### Issue: Webhook Returns Errors

**Check Application Logs:**
```bash
railway logs --tail
```

**Common Errors:**
- `400 Bad Request`: Payload validation failed
- `500 Internal Server Error`: Application error (check logs)
- `401 Unauthorized`: Webhook signature validation failed

**Debug Mode:**
Add more logging to the controller:
```typescript
this.logger.debug(`Raw payload: ${JSON.stringify(payload)}`);
this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
```

### Issue: Attachments Not Working

SendGrid attachments require additional configuration:
1. Enable "POST the raw, full MIME message" in SendGrid (increases payload size)
2. Update NestJS body parser limits in `main.ts`:

```typescript
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

## Advanced Configuration

### Multiple Email Addresses

You can create multiple inbound parse rules for different purposes:

1. **General Inbox**: `inbox@yourdomain.com` → `/api/email/webhook/sendgrid`
2. **Support**: `support@yourdomain.com` → `/api/email/webhook/sendgrid`
3. **Tasks**: `tasks@yourdomain.com` → `/api/email/webhook/sendgrid`

The controller can differentiate based on the `to` field in the payload.

### Subdomain Routing

To route different subdomains to different handlers:

```typescript
private async createDumpFromEmail(processedEmail: any): Promise<any> {
  const recipient = processedEmail.metadata.recipient;
  
  // Route based on recipient
  if (recipient.includes('tasks@')) {
    // Mark as task
    metadata.category = 'tasks';
  } else if (recipient.includes('notes@')) {
    // Mark as note
    metadata.category = 'notes';
  }
  
  // ... rest of the logic
}
```

## Testing Checklist

- [ ] DNS MX record configured
- [ ] SendGrid Inbound Parse webhook created
- [ ] Webhook URL is correct and accessible
- [ ] SSL/HTTPS is enabled
- [ ] Authentication/API key configured (optional but recommended)
- [ ] Test email sent and received
- [ ] Application logs show successful processing
- [ ] Dump created in database
- [ ] Attachments handling tested (if needed)

## Support Resources

- **SendGrid Docs**: https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
- **SendGrid Support**: https://support.sendgrid.com/
- **Railway Docs**: https://docs.railway.app/

## Example Email Addresses

Once configured, emails to any address at your subdomain will be captured:

```
anything@inbox.yourdomain.com
user123@inbox.yourdomain.com
test.email@inbox.yourdomain.com
my-tasks-2024@inbox.yourdomain.com
```

All will be forwarded to your webhook and processed as dumps in the Dumpster application.

## Next Steps

1. Configure the webhook as described above
2. Send a test email
3. Verify it appears in your application logs
4. Check that a dump was created in the database
5. Implement user mapping (currently uses default user ID 1)
6. Add attachment processing if needed
7. Set up monitoring/alerts for webhook failures
