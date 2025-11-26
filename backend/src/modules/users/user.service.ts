import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

export interface CreateUserDto {
  phone_number: string;
  email?: string;
  timezone?: string;
  language?: string;
}

export interface UpdateUserDto {
  email?: string;
  timezone?: string;
  language?: string;
  digest_time?: string;
  notification_preferences?: Record<string, any>;
  chat_id_telegram?: string;
  chat_id_whatsapp?: string;
}

export interface UserSearchDto {
  phone_number?: string;
  email?: string;
  chat_id_telegram?: string;
  chat_id_whatsapp?: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { phone_number: createUserDto.phone_number },
    });

    if (existingUser) {
      throw new BadRequestException(
        'User with this phone number already exists',
      );
    }

    const user = this.userRepository.create({
      ...createUserDto,
      verified_at: new Date(),
    });

    return this.userRepository.save(user);
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['dumps', 'reminders'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { phone_number: phoneNumber },
    });
  }

  async findByChatId(
    chatId: string,
    platform: 'telegram' | 'whatsapp',
  ): Promise<User | null> {
    const whereCondition =
      platform === 'telegram'
        ? { chat_id_telegram: chatId }
        : { chat_id_whatsapp: chatId };

    return this.userRepository.findOne({
      where: whereCondition,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async search(searchDto: UserSearchDto): Promise<User[]> {
    const query = this.userRepository.createQueryBuilder('user');

    if (searchDto.phone_number) {
      query.andWhere('user.phone_number ILIKE :phone', {
        phone: `%${searchDto.phone_number}%`,
      });
    }

    if (searchDto.email) {
      query.andWhere('user.email ILIKE :email', {
        email: `%${searchDto.email}%`,
      });
    }

    if (searchDto.chat_id_telegram) {
      query.andWhere('user.chat_id_telegram = :telegram', {
        telegram: searchDto.chat_id_telegram,
      });
    }

    if (searchDto.chat_id_whatsapp) {
      query.andWhere('user.chat_id_whatsapp = :whatsapp', {
        whatsapp: searchDto.chat_id_whatsapp,
      });
    }

    return query.getMany();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);
    user.updated_at = new Date();

    return this.userRepository.save(user);
  }

  async linkChatId(
    userId: string,
    chatId: string,
    platform: 'telegram' | 'whatsapp',
  ): Promise<User> {
    const user = await this.findOne(userId);

    if (platform === 'telegram') {
      // Check if chat ID is already linked to another user
      const existingUser = await this.userRepository.findOne({
        where: { chat_id_telegram: chatId },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException(
          'Telegram chat ID is already linked to another user',
        );
      }

      user.chat_id_telegram = chatId;
    } else {
      // Check if chat ID is already linked to another user
      const existingUser = await this.userRepository.findOne({
        where: { chat_id_whatsapp: chatId },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException(
          'WhatsApp chat ID is already linked to another user',
        );
      }

      user.chat_id_whatsapp = chatId;
    }

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async getActiveUsers(daysBack: number = 30): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    return this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.dumps', 'dump')
      .where('dump.created_at >= :cutoffDate', { cutoffDate })
      .orWhere('user.created_at >= :cutoffDate', { cutoffDate })
      .groupBy('user.id')
      .getMany();
  }

  async getUserStats(userId: string): Promise<{
    totalDumps: number;
    totalReminders: number;
    memberSince: Date;
    lastActive: Date | null;
  }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.dumps', 'dump')
      .leftJoinAndSelect('user.reminders', 'reminder')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const lastDump =
      user.dumps.length > 0
        ? user.dumps.toSorted(
            (a, b) => b.created_at.getTime() - a.created_at.getTime(),
          )[0]
        : null;

    return {
      totalDumps: user.dumps.length,
      totalReminders: user.reminders.length,
      memberSince: user.created_at,
      lastActive: lastDump?.created_at || null,
    };
  }
}
