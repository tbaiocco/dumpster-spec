import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

/**
 * Admin Controller
 * Provides analytics and management endpoints for the admin dashboard
 */
@Controller('admin')
@UseGuards(AuthGuard('jwt')) // Require authentication for all admin endpoints
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get system-wide analytics and metrics
   * Used by: AnalyticsPage (T083)
   */
  @Get('analytics/system')
  async getSystemMetrics() {
    const metrics = await this.adminService.getSystemMetrics();

    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * Get search analytics and performance metrics
   * Used by: SearchMetricsPage (T086)
   */
  @Get('analytics/search')
  async getSearchMetrics() {
    const metrics = await this.adminService.getSearchMetrics();

    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * Get AI processing metrics and confidence statistics
   * Used by: AIMetricsPage (T087)
   */
  @Get('analytics/ai')
  async getAIMetrics() {
    const metrics = await this.adminService.getAIMetrics();

    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * Get user statistics and activity metrics
   */
  @Get('analytics/users')
  async getUserStats() {
    const stats = await this.adminService.getUserStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get all dumps for admin overview
   * Used by: DumpsPage (T082)
   */
  @Get('dumps')
  async getAllDumps(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
  ) {
    const pageNum = Number.parseInt(page, 10);
    const limitNum = Number.parseInt(limit, 10);

    const result = await this.adminService.getAllDumps(
      pageNum,
      limitNum,
      search,
    );

    return {
      success: true,
      data: result,
    };
  }
}
