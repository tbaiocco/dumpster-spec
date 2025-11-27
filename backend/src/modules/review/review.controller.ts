import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Review Controller
 * Handles content moderation and review workflows
 * Used by: ReviewPage (T089a)
 */
@Controller('review')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get all flagged content for review
   */
  @Get('flagged')
  async getFlaggedContent(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? Number.parseInt(limit, 10) : 50;
    const flagged = await this.adminService.getFlaggedContent(
      status,
      priority,
      limitNum,
    );

    return {
      success: true,
      data: flagged,
      meta: {
        total: flagged.length,
        limit: limitNum,
      },
    };
  }

  /**
   * Get details for a specific flagged item
   */
  @Get('flagged/:dumpId')
  async getFlaggedItem(@Param('dumpId') dumpId: string) {
    const flagged = await this.adminService.getFlaggedContent();
    const item = flagged.find((f) => f.id === dumpId);

    if (!item) {
      return {
        success: false,
        error: {
          message: 'Flagged content not found',
          code: 'NOT_FOUND',
        },
      };
    }

    return {
      success: true,
      data: item,
    };
  }

  /**
   * Approve a flagged dump
   */
  @Post(':dumpId/approve')
  async approveDump(
    @Param('dumpId') dumpId: string,
    @Body() body: { notes?: string },
  ) {
    const result = await this.adminService.approveDump(dumpId, body.notes);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Reject a flagged dump
   */
  @Post(':dumpId/reject')
  async rejectDump(
    @Param('dumpId') dumpId: string,
    @Body() body: { reason: string; notes?: string },
  ) {
    const result = await this.adminService.rejectDump(
      dumpId,
      body.reason,
      body.notes,
    );

    return {
      success: true,
      data: result,
    };
  }
}
