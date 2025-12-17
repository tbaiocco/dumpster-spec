import { Controller, Get, Post, Body } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';
import { DatabaseInitService } from './database/database-init.service';
import { QueryEnhancementService } from './modules/search/query-enhancement.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseInitService: DatabaseInitService,
    private readonly queryEnhancementService: QueryEnhancementService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('admin/recreate-vector-index')
  async recreateVectorIndex() {
    await this.databaseInitService.recreateVectorIndex();
    return { success: true, message: 'Vector index recreated successfully' };
  }

  @Get('admin/vector-index-info')
  async getVectorIndexInfo() {
    const info = await this.databaseInitService.getIndexInfo();
    return { success: true, data: info };
  }

  @Get('admin/vector-health')
  async getVectorHealth() {
    const health = await this.databaseInitService.getVectorHealthStatus();
    return { success: true, data: health };
  }

  @Post('admin/ensure-vector-index')
  async ensureVectorIndex() {
    try {
      await this.databaseInitService.ensureVectorIndex();
      const health = await this.databaseInitService.getVectorHealthStatus();
      return { success: true, message: 'Vector index ensured', data: health };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('admin/clean-dumps')
  async cleanAllDumps() {
    try {
      // Delete all dumps (this will also remove vectors)
      const result = await this.dataSource.query('DELETE FROM dumps');

      // Get health status after cleaning
      const health = await this.databaseInitService.getVectorHealthStatus();

      return {
        success: true,
        message: `Deleted all dumps successfully. Removed ${result[1]} records.`,
        health: health,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('admin/test-claude')
  async testClaude(@Body() body: { query: string }) {
    try {
      const result = await this.queryEnhancementService.enhanceQuery({
        originalQuery: body.query,
        userId: 'test-user',
        context: {},
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message, stack: error.stack };
    }
  }

  @Get('admin/env-check')
  checkEnvironment() {
    return {
      success: true,
      data: {
        NODE_ENV: process.env.NODE_ENV,
        CLAUDE_API_KEY_EXISTS: !!process.env.CLAUDE_API_KEY,
        CLAUDE_API_KEY_LENGTH: process.env.CLAUDE_API_KEY?.length || 0,
        CLAUDE_API_KEY_PREFIX:
          process.env.CLAUDE_API_KEY?.substring(0, 10) || 'NOT_SET',
        DATABASE_HOST: process.env.DATABASE_HOST || 'NOT_SET',
        PWD: process.env.PWD,
      },
    };
  }
}
