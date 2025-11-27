import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ReminderService } from './reminder.service';
import type {
  CreateReminderRequest,
  UpdateReminderRequest,
} from './reminder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../../entities/user.entity';
import {
  Reminder,
  ReminderStatus,
  ReminderType,
} from '../../entities/reminder.entity';

@Controller('api/reminders')
@UseGuards(JwtAuthGuard)
export class ReminderController {
  private readonly logger = new Logger(ReminderController.name);

  constructor(private readonly reminderService: ReminderService) {}

  /**
   * Create a new reminder
   * POST /api/reminders
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReminder(
    @GetUser() user: User,
    @Body() createRequest: CreateReminderRequest,
  ): Promise<{
    success: boolean;
    reminder: Reminder;
    message: string;
  }> {
    this.logger.log(`Creating reminder for user ${user.id}`);

    // Ensure userId matches authenticated user
    const request = { ...createRequest, userId: user.id };

    const reminder = await this.reminderService.createReminder(request);

    return {
      success: true,
      reminder,
      message: `Reminder created successfully for ${reminder.scheduled_for.toLocaleString()}`,
    };
  }

  /**
   * Get all reminders for authenticated user with optional filters
   * GET /api/reminders
   */
  @Get()
  async getUserReminders(
    @GetUser() user: User,
    @Query('status') status?: ReminderStatus,
    @Query('type') reminderType?: ReminderType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeRecurring') includeRecurring?: string,
  ): Promise<{
    success: boolean;
    reminders: Reminder[];
    count: number;
  }> {
    this.logger.log(`Getting reminders for user ${user.id}`);

    const filters = {
      userId: user.id,
      status,
      reminderType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      includeRecurring: includeRecurring !== 'false',
    };

    const reminders = await this.reminderService.getUserReminders(
      user.id,
      filters,
    );

    return {
      success: true,
      reminders,
      count: reminders.length,
    };
  }

  /**
   * Get upcoming reminders for authenticated user
   * GET /api/reminders/upcoming
   */
  @Get('upcoming')
  async getUpcomingReminders(
    @GetUser() user: User,
    @Query('hours') hours?: string,
  ): Promise<{
    success: boolean;
    reminders: Reminder[];
    hoursAhead: number;
  }> {
    const hoursAhead = hours ? Number.parseInt(hours, 10) : 24;

    this.logger.log(
      `Getting upcoming reminders for user ${user.id} (${hoursAhead}h ahead)`,
    );

    const reminders = await this.reminderService.getUpcomingReminders(
      user.id,
      hoursAhead,
    );

    return {
      success: true,
      reminders,
      hoursAhead,
    };
  }

  /**
   * Get reminder statistics for authenticated user
   * GET /api/reminders/stats
   */
  @Get('stats')
  async getReminderStats(@GetUser() user: User): Promise<{
    success: boolean;
    stats: any;
  }> {
    this.logger.log(`Getting reminder stats for user ${user.id}`);

    const stats = await this.reminderService.getReminderStats(user.id);

    return {
      success: true,
      stats,
    };
  }

  /**
   * Get a specific reminder by ID
   * GET /api/reminders/:id
   */
  @Get(':id')
  async getReminderById(
    @GetUser() user: User,
    @Param('id') reminderId: string,
  ): Promise<{
    success: boolean;
    reminder: Reminder;
  }> {
    this.logger.log(`Getting reminder ${reminderId}`);

    const reminder = await this.reminderService.getReminderById(reminderId);

    // Ensure reminder belongs to authenticated user
    if (reminder.user_id !== user.id) {
      throw new Error('Unauthorized access to reminder');
    }

    return {
      success: true,
      reminder,
    };
  }

  /**
   * Update a reminder
   * PUT /api/reminders/:id
   */
  @Put(':id')
  async updateReminder(
    @GetUser() user: User,
    @Param('id') reminderId: string,
    @Body() updates: UpdateReminderRequest,
  ): Promise<{
    success: boolean;
    reminder: Reminder;
    message: string;
  }> {
    this.logger.log(`Updating reminder ${reminderId}`);

    // Verify ownership
    const existing = await this.reminderService.getReminderById(reminderId);
    if (existing.user_id !== user.id) {
      throw new Error('Unauthorized access to reminder');
    }

    const reminder = await this.reminderService.updateReminder(
      reminderId,
      updates,
    );

    return {
      success: true,
      reminder,
      message: 'Reminder updated successfully',
    };
  }

  /**
   * Snooze a reminder
   * POST /api/reminders/:id/snooze
   */
  @Post(':id/snooze')
  async snoozeReminder(
    @GetUser() user: User,
    @Param('id') reminderId: string,
    @Body('minutes') minutes: number = 30,
  ): Promise<{
    success: boolean;
    reminder: Reminder;
    message: string;
  }> {
    this.logger.log(`Snoozing reminder ${reminderId} for ${minutes} minutes`);

    // Verify ownership
    const existing = await this.reminderService.getReminderById(reminderId);
    if (existing.user_id !== user.id) {
      throw new Error('Unauthorized access to reminder');
    }

    const reminder = await this.reminderService.snoozeReminder(
      reminderId,
      minutes,
    );

    return {
      success: true,
      reminder,
      message: `Reminder snoozed for ${minutes} minutes`,
    };
  }

  /**
   * Dismiss a reminder
   * POST /api/reminders/:id/dismiss
   */
  @Post(':id/dismiss')
  async dismissReminder(
    @GetUser() user: User,
    @Param('id') reminderId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Dismissing reminder ${reminderId}`);

    // Verify ownership
    const existing = await this.reminderService.getReminderById(reminderId);
    if (existing.user_id !== user.id) {
      throw new Error('Unauthorized access to reminder');
    }

    await this.reminderService.dismissReminder(reminderId);

    return {
      success: true,
      message: 'Reminder dismissed successfully',
    };
  }

  /**
   * Mark reminder as sent (used by notification service)
   * POST /api/reminders/:id/mark-sent
   */
  @Post(':id/mark-sent')
  async markReminderAsSent(
    @GetUser() user: User,
    @Param('id') reminderId: string,
  ): Promise<{
    success: boolean;
    reminder: Reminder;
  }> {
    this.logger.log(`Marking reminder ${reminderId} as sent`);

    // Verify ownership
    const existing = await this.reminderService.getReminderById(reminderId);
    if (existing.user_id !== user.id) {
      throw new Error('Unauthorized access to reminder');
    }

    const reminder = await this.reminderService.markReminderAsSent(reminderId);

    return {
      success: true,
      reminder,
    };
  }

  /**
   * Delete a reminder
   * DELETE /api/reminders/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReminder(
    @GetUser() user: User,
    @Param('id') reminderId: string,
  ): Promise<void> {
    this.logger.log(`Deleting reminder ${reminderId}`);

    // Verify ownership
    const existing = await this.reminderService.getReminderById(reminderId);
    if (existing.user_id !== user.id) {
      throw new Error('Unauthorized access to reminder');
    }

    await this.reminderService.deleteReminder(reminderId);
  }
}
