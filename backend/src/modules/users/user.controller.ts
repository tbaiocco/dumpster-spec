import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  ValidationPipe,
} from '@nestjs/common';
import type {
  CreateUserDto,
  UpdateUserDto,
  UserSearchDto,
} from './user.service';
import { UserService } from './user.service';
import { User } from '../../entities/user.entity';
import type { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
  ): Promise<ApiResponse<User>> {
    const user = await this.userService.create(createUserDto);
    return {
      success: true,
      data: user,
      message: 'User created successfully',
    };
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<
    ApiResponse<{
      users: User[];
      total: number;
      page: number;
      totalPages: number;
    }>
  > {
    const pageNum = Number.parseInt(page, 10);
    const limitNum = Number.parseInt(limit, 10);

    const result = await this.userService.findAll(pageNum, limitNum);
    return {
      success: true,
      data: result,
      message: 'Users retrieved successfully',
    };
  }

  @Get('search')
  async search(
    @Query(ValidationPipe) searchDto: UserSearchDto,
  ): Promise<ApiResponse<User[]>> {
    const users = await this.userService.search(searchDto);
    return {
      success: true,
      data: users,
      message: 'Users found successfully',
    };
  }

  @Get('active')
  async getActiveUsers(
    @Query('days') days: string = '30',
  ): Promise<ApiResponse<User[]>> {
    const daysBack = Number.parseInt(days, 10);
    const users = await this.userService.getActiveUsers(daysBack);
    return {
      success: true,
      data: users,
      message: 'Active users retrieved successfully',
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<User>> {
    const user = await this.userService.findOne(id);
    return {
      success: true,
      data: user,
      message: 'User retrieved successfully',
    };
  }

  @Get(':id/stats')
  async getUserStats(@Param('id') id: string): Promise<
    ApiResponse<{
      totalDumps: number;
      totalReminders: number;
      memberSince: Date;
      lastActive: Date | null;
    }>
  > {
    const stats = await this.userService.getUserStats(id);
    return {
      success: true,
      data: stats,
      message: 'User stats retrieved successfully',
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<User>> {
    const user = await this.userService.update(id, updateUserDto);
    return {
      success: true,
      data: user,
      message: 'User updated successfully',
    };
  }

  @Patch(':id/link-chat')
  async linkChatId(
    @Param('id') id: string,
    @Body('chatId') chatId: string,
    @Body('platform') platform: 'telegram' | 'whatsapp',
  ): Promise<ApiResponse<User>> {
    const user = await this.userService.linkChatId(id, chatId, platform);
    return {
      success: true,
      data: user,
      message: `${platform} chat linked successfully`,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.userService.remove(id);
  }
}
