import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Patch,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { LoginDto, SendCodeDto, AuthResponse } from './auth.service';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';

interface AuthRequest extends Request {
  user: User;
}

interface UpdateProfileDto {
  timezone?: string;
  language?: string;
  digest_time?: string;
  notification_preferences?: Record<string, any>;
}

interface LinkChatDto {
  chat_id: string;
  platform: 'telegram' | 'whatsapp';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  async sendVerificationCode(
    @Body() sendCodeDto: SendCodeDto,
  ): Promise<{ message: string }> {
    return this.authService.sendVerificationCode(sendCodeDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req: AuthRequest): Promise<User> {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  async updateProfile(
    @Request() req: AuthRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    return this.authService.updateUserProfile(req.user.id, updateProfileDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('link-chat')
  async linkChatId(
    @Request() req: AuthRequest,
    @Body() linkChatDto: LinkChatDto,
  ): Promise<User> {
    return this.authService.linkChatId(
      req.user.id,
      linkChatDto.chat_id,
      linkChatDto.platform,
    );
  }
}
