import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';

export interface JwtPayload {
  sub: string;
  phone_number: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    console.log('[JwtStrategy] Initializing with secret:', secret.substring(0, 10) + '...');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const { sub } = payload;

    console.log('[JwtStrategy] Validating token for user:', sub);

    const user = await this.userRepository.findOne({
      where: { id: sub },
    });

    if (!user) {
      console.log('[JwtStrategy] User not found:', sub);
      throw new UnauthorizedException('Invalid token');
    }

    console.log('[JwtStrategy] User found:', { id: user.id, phone: user.phone_number, verified_at: user.verified_at });

    if (!user.verified_at) {
      console.log('[JwtStrategy] User phone number not verified');
      throw new UnauthorizedException('Phone number not verified');
    }

    console.log('[JwtStrategy] Validation successful');
    return user;
  }
}
