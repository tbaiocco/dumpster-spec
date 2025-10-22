import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { PhoneVerificationService } from './phone-verification.service';

export interface LoginDto {
  phone_number: string;
  verification_code: string;
}

export interface SendCodeDto {
  phone_number: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    phone_number: string;
    verified_at: Date;
    chat_id_telegram: string | null;
    chat_id_whatsapp: string | null;
    timezone: string;
    language: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly phoneVerificationService: PhoneVerificationService,
  ) {}

  async sendVerificationCode(
    sendCodeDto: SendCodeDto,
  ): Promise<{ message: string }> {
    return this.phoneVerificationService.sendVerificationCode(
      sendCodeDto.phone_number,
    );
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { phone_number, verification_code } = loginDto;

    const verificationResult = await this.phoneVerificationService.verifyCode(
      phone_number,
      verification_code,
    );

    if (!verificationResult.isValid || !verificationResult.user) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const { user } = verificationResult;

    const payload = {
      sub: user.id,
      phone_number: user.phone_number,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        verified_at: user.verified_at,
        chat_id_telegram: user.chat_id_telegram,
        chat_id_whatsapp: user.chat_id_whatsapp,
        timezone: user.timezone,
        language: user.language,
      },
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
    });
  }

  async linkChatId(
    userId: string,
    chatId: string,
    platform: 'telegram' | 'whatsapp',
  ): Promise<User> {
    return this.phoneVerificationService.linkChatId(userId, chatId, platform);
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<
      Pick<
        User,
        'timezone' | 'language' | 'digest_time' | 'notification_preferences'
      >
    >,
  ): Promise<User> {
    await this.userRepository.update(userId, updates);
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
