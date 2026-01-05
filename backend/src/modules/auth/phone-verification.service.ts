import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { TwilioService } from './twilio.service';
import { RedisService } from '../../shared/redis.service';

@Injectable()
export class PhoneVerificationService {
  private readonly verificationCodes = new Map<
    string,
    { code: string; expiresAt: Date }
  >();
  private readonly logger = new Logger(PhoneVerificationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly twilioService?: TwilioService,
    private readonly redisService?: RedisService,
  ) {}

  async sendVerificationCode(
    phoneNumber: string,
  ): Promise<{ message: string }> {
    // Validate phone number format (basic E.164 check)
    if (!this.isValidPhoneNumber(phoneNumber)) {
      throw new BadRequestException('Invalid phone number format');
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Store verification code (prefer Redis for cross-instance consistency)
    const redisKey = `verify:${phoneNumber}`;
    const ttlSeconds = 60 * 10; // 10 minutes
    if (this.redisService && this.redisService.isAvailable()) {
      await this.redisService.setEx(redisKey, ttlSeconds, code);
    } else {
      // Fallback to in-memory map for single-instance or until Redis is available
      this.verificationCodes.set(phoneNumber, { code, expiresAt });
    }

    // NOTE: In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`Verification code for ${phoneNumber}: ${code}`);

    // Build the message using the project's template.
    const message = `Hello from The Clutter App! Your verification code is: ${code}`;

    // Fire-and-forget send via Twilio (do not block if not configured)
    try {
      if (this.twilioService) {
        await this.twilioService.sendSms(phoneNumber, message);
      } else {
        this.logger.log('TwilioService not available; SMS skipped.');
      }
    } catch (err) {
      // Log the error but do not fail the request — code is still valid in server memory.
      this.logger.error('Failed to send verification SMS', err as any);
    }

    return {
      message: 'Verification code sent successfully',
    };
  }

  async verifyCode(
    phoneNumber: string,
    code: string,
  ): Promise<{ isValid: boolean; user?: User }> {
    const redisKey = `verify:${phoneNumber}`;
    let storedCode: string | null = null;

    if (this.redisService && this.redisService.isAvailable()) {
      storedCode = await this.redisService.get(redisKey);
      if (!storedCode) return { isValid: false };
      if (storedCode !== code) return { isValid: false };
      await this.redisService.del(redisKey);
    } else {
      const stored = this.verificationCodes.get(phoneNumber);
      if (!stored) return { isValid: false };
      if (new Date() > stored.expiresAt) {
        this.verificationCodes.delete(phoneNumber);
        return { isValid: false };
      }
      if (stored.code !== code) return { isValid: false };
      this.verificationCodes.delete(phoneNumber);
    }

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { phone_number: phoneNumber },
    });

    if (user) {
      // Update verification timestamp
      user.verified_at = new Date();
      user = await this.userRepository.save(user);
    } else {
      user = this.userRepository.create({
        phone_number: phoneNumber,
        verified_at: new Date(),
      });
      user = await this.userRepository.save(user);
    }

    return { isValid: true, user };
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  async linkChatId(
    userId: string,
    chatId: string,
    platform: 'telegram' | 'whatsapp',
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (platform === 'telegram') {
      user.chat_id_telegram = chatId;
    } else {
      user.chat_id_whatsapp = chatId;
    }

    return this.userRepository.save(user);
  }
}
