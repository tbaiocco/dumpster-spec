# Email Service Configuration Guide

## Overview
The email service supports multiple providers for maximum flexibility. Choose the one that best fits your needs.

## Quick Start (Gmail for Development)

### Method 1: Gmail OAuth2 (Recommended - No App Password Needed)

If App Passwords are not available, use OAuth2:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Desktop app)
5. Download the credentials JSON
6. Run the OAuth flow once to get refresh token

**Note**: This requires initial manual OAuth flow. See detailed instructions below.

### Method 2: Gmail App Password (If Available)

1. Create a dedicated Gmail account or use an existing one
2. Enable 2-Factor Authentication on the account
3. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - If you see "The setting you are looking for is not available", use Method 1 (OAuth2) or Method 3 (Alternative provider)
   - Create a new app password for "Mail"
   - Copy the 16-character password

4. Add to your `.env`:
```bash
# Email Configuration - Gmail with App Password
EMAIL_PROVIDER=gmail
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME="Dumpster Notifications"
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
```

### Method 3: Use SendGrid or Resend Instead (Easiest)

**This is the recommended approach if Gmail App Passwords don't work.**

SendGrid or Resend are simpler to set up and more reliable for production use:

#### SendGrid Setup (5 minutes):
1. Sign up at https://sendgrid.com
2. Verify your email address (no domain required for testing)
3. Create an API key (Settings → API Keys)
4. Add to your `.env`:

```bash
# Email Configuration - SendGrid (No Gmail needed!)
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=your-verified-email@gmail.com  # Or any verified email
EMAIL_FROM_NAME="Dumpster Notifications"
SENDGRID_API_KEY=your-sendgrid-api-key
```

## Production Setup (Recommended)

### Option 1: SendGrid (Best for production)

**Free Tier**: 100 emails/day permanently free

1. Sign up at https://sendgrid.com
2. Verify your sender email or domain
3. Create an API key
4. Add to your `.env`:

```bash
# Email Configuration - SendGrid
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME="Dumpster Notifications"
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Option 2: Resend (Modern alternative)

**Free Tier**: 100 emails/day, 3,000 emails/month

1. Sign up at https://resend.com
2. Verify your domain
3. Create an API key
4. Add to your `.env`:

```bash
# Email Configuration - Resend
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME="Dumpster Notifications"
RESEND_API_KEY=your-resend-api-key
```

### Option 3: Amazon SES (Most cost-effective at scale)

**Pricing**: $0.10 per 1,000 emails

1. Set up AWS account and SES
2. Verify your domain or email
3. Create SMTP credentials
4. Add to your `.env`:

```bash
# Email Configuration - Amazon SES
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME="Dumpster Notifications"
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

### Option 4: Custom SMTP Server

```bash
# Email Configuration - Custom SMTP
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME="Dumpster Notifications"
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false  # true for port 465, false for 587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

## Setting up a "no-reply" Email

### For Gmail (Development)
- Use a dedicated Gmail like `dumpster-noreply@gmail.com`
- Set `EMAIL_FROM=dumpster-noreply@gmail.com`

### For Production (with custom domain)
1. **Verify your domain** with your chosen provider (SendGrid, Resend, etc.)
2. **Add DNS records** as instructed by the provider (SPF, DKIM, DMARC)
3. **Set up noreply email**: Most providers let you send from `noreply@yourdomain.com` without creating an actual mailbox
4. **Update EMAIL_FROM**: `EMAIL_FROM=noreply@yourdomain.com`

## Testing the Configuration

Once configured, you can test the email service:

```bash
# In your NestJS application
# The service will log whether initialization was successful

# Check logs for:
# "Email service initialized with provider: gmail"
# "Email configuration verified successfully"
```

Or use the verify endpoint (if you create one):

```typescript
// In a controller
@Get('email/verify')
async verifyEmail() {
  const configured = await this.emailService.verifyConnection();
  return { configured };
}
```

## Troubleshooting

### Gmail Issues
- **"The setting you are looking for is not available"**: 
  - App Passwords may be disabled for your account type
  - **Solution 1**: Use SendGrid or Resend instead (recommended, easier setup)
  - **Solution 2**: Use Gmail OAuth2 (requires more setup)
  - **Solution 3**: Try a different personal Gmail account (not Workspace)
- **"Invalid credentials"**: Make sure you're using an App Password, not your regular password
- **"Less secure app access"**: This is no longer needed with App Passwords
- **2FA required**: You must enable 2-Factor Authentication to create App Passwords

### SendGrid Issues
- **"Sender not verified"**: Verify your email or domain in SendGrid dashboard
- **"Invalid API key"**: Check that the API key has "Mail Send" permissions

### General Issues
- **Connection timeout**: Check your SMTP_HOST and SMTP_PORT
- **TLS errors**: Try toggling SMTP_SECURE (true/false)
- **Authentication failed**: Verify your SMTP_USER and SMTP_PASS

## Email Limits by Provider

| Provider | Free Tier | Paid Plans |
|----------|-----------|------------|
| Gmail | 500/day | Not for bulk email |
| SendGrid | 100/day | Starting at $15/mo for 40k/mo |
| Resend | 3,000/month | Starting at $20/mo for 50k/mo |
| Amazon SES | First 62k free (from EC2) | $0.10 per 1,000 |
| Postmark | 100/month | Starting at $10/mo for 10k/mo |

## Best Practices

1. **Use a dedicated no-reply address**: `noreply@yourdomain.com`
2. **Set proper SPF/DKIM records**: Improves deliverability and reduces spam flags
3. **Monitor bounce rates**: Keep below 5% to maintain good sender reputation
4. **Implement unsubscribe links**: Required by law for marketing emails
5. **Rate limiting**: Don't send too many emails too quickly
6. **Use HTML templates**: Provides better user experience
7. **Test before going live**: Send test emails to multiple providers (Gmail, Outlook, etc.)

## Current Implementation Features

✅ Multiple provider support (Gmail, SendGrid, Resend, Custom SMTP)
✅ Automatic HTML conversion from plain text
✅ Basic formatting (bold, italic)
✅ Configurable sender name and email
✅ Connection verification
✅ Error handling and logging
✅ Bulk email support

## Future Enhancements

- [ ] HTML email templates
- [ ] Attachment support
- [ ] Email tracking (opens, clicks)
- [ ] Bounce handling
- [ ] Unsubscribe management
- [ ] Queue for large batches
- [ ] Retry logic for failed sends
