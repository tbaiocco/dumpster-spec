import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';
import {
  DumpService,
  CreateDumpRequest,
  DumpProcessingResult,
} from '../services/dump.service';
import { Dump } from '../../../entities/dump.entity';
import type { ApiResponse } from '../../../common/interfaces/api-response.interface';

export class CreateDumpDto {
  @IsString()
  userId: string;

  @IsString()
  content: string;

  @IsString()
  @IsIn(['text', 'voice', 'image', 'document'])
  contentType: 'text' | 'voice' | 'image' | 'document';

  @IsOptional()
  @IsString()
  originalText?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    source: 'telegram' | 'whatsapp' | 'email' | 'api';
    messageId?: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    chatId?: string;
  };
}

export class DumpSearchDto {
  userId?: string;
  category?: string;
  contentType?: string;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
}

export class UpdateDumpDto {
  @IsOptional()
  @IsString()
  raw_content?: string;

  @IsOptional()
  @IsString()
  ai_summary?: string;

  @IsOptional()
  @IsString()
  category?: string; // Category name, will be resolved to category_id

  @IsOptional()
  @IsObject()
  extracted_entities?: any;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

@Controller('api/dumps')
export class DumpController {
  constructor(private readonly dumpService: DumpService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) createDumpDto: CreateDumpDto,
  ): Promise<ApiResponse<DumpProcessingResult>> {
    return this.createEnhanced(createDumpDto);
  }

  @Post('enhanced')
  @HttpCode(HttpStatus.CREATED)
  async createEnhanced(
    @Body(ValidationPipe) createDumpDto: CreateDumpDto,
  ): Promise<ApiResponse<DumpProcessingResult>> {
    const request: CreateDumpRequest = {
      userId: createDumpDto.userId,
      content: createDumpDto.content,
      contentType: createDumpDto.contentType,
      originalText: createDumpDto.originalText,
      metadata: {
        source:
          (createDumpDto.metadata?.source as
            | 'telegram'
            | 'whatsapp'
            | 'email'
            | 'api') || 'telegram',
        messageId: createDumpDto.metadata?.messageId,
        fileName: createDumpDto.metadata?.fileName,
        mimeType: createDumpDto.metadata?.mimeType,
        fileSize: createDumpDto.metadata?.fileSize,
        chatId: createDumpDto.metadata?.chatId,
      },
    };

    const result = await this.dumpService.createDumpEnhanced(request);

    return {
      success: true,
      data: result,
      message: 'Content processed with enhanced AI services',
    };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadAndProcess(
    @UploadedFile() file: any,
    @Body('userId') userId: string,
    @Body('contentType') contentType: 'voice' | 'image' | 'document',
    @Body('metadata') metadataJson?: string,
  ): Promise<ApiResponse<DumpProcessingResult>> {
    const metadata = metadataJson ? JSON.parse(metadataJson) : {};

    const request: CreateDumpRequest = {
      userId,
      content: file.originalname || 'Uploaded file',
      contentType,
      metadata: {
        source: metadata.source || 'telegram',
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        ...metadata,
      },
      mediaBuffer: file.buffer,
    };

    // Use enhanced processing that leverages ContentRouterService
    const result = await this.dumpService.createDumpEnhanced(request);

    return {
      success: true,
      data: result,
      message: 'File processed successfully with enhanced AI analysis',
    };
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const result = await this.dumpService.findByUserId(userId, undefined);

    return {
      success: true,
      data: result,
      message: 'User dumps retrieved successfully',
    };
  }

  @Get('user/:userId/stats')
  async getUserDumpStats(
    @Param('userId') userId: string,
  ): Promise<ApiResponse<any>> {
    const stats = await this.dumpService.getDumpStatistics(userId);

    return {
      success: true,
      data: stats,
      message: 'User dump stats retrieved successfully',
    };
  }

  @Get('user/:userId/recent')
  async getUserRecentDumps(
    @Param('userId') userId: string,
    @Query('limit') limit: string = '5',
  ): Promise<ApiResponse<Dump[]>> {
    const limitNum = Number.parseInt(limit, 10) || 5;
    const dumps = await this.dumpService.getRecentByUser(userId, limitNum);

    return {
      success: true,
      data: dumps,
      message: 'Recent dumps retrieved successfully',
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<Dump | null>> {
    const dump = await this.dumpService.findById(id);

    return {
      success: true,
      data: dump,
      message: 'Dump retrieved successfully',
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDumpDto: UpdateDumpDto,
  ): Promise<ApiResponse<Dump>> {
    // Build the updates object
    const updates: Partial<Dump> = {};

    if (updateDumpDto.raw_content !== undefined) {
      updates.raw_content = updateDumpDto.raw_content;
    }

    if (updateDumpDto.ai_summary !== undefined) {
      updates.ai_summary = updateDumpDto.ai_summary;
    }

    if (updateDumpDto.extracted_entities !== undefined) {
      updates.extracted_entities = updateDumpDto.extracted_entities;
    }

    // Handle category update - convert category name to category_id
    if (updateDumpDto.category !== undefined) {
      // First, get the dump to get the userId
      const existingDump = await this.dumpService.findById(id);
      if (!existingDump) {
        return {
          success: false,
          message: 'Dump not found',
          data: null as any,
        };
      }

      // Find or create category
      const category = await this.dumpService[
        'categorizationService'
      ].findOrCreateCategory(updateDumpDto.category, existingDump.user_id);
      updates.category_id = category.id;
    }

    // Merge metadata if provided
    if (updateDumpDto.metadata !== undefined) {
      const existingDump = await this.dumpService.findById(id);
      if (existingDump?.extracted_entities) {
        updates.extracted_entities = {
          ...existingDump.extracted_entities,
          metadata: {
            ...(existingDump.extracted_entities as any).metadata,
            ...updateDumpDto.metadata,
          },
        };
      }
    }

    const updatedDump = await this.dumpService.updateDump(id, updates);

    return {
      success: true,
      data: updatedDump,
      message: 'Dump updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.dumpService.deleteDump(id);
  }

  @Post('generate-vectors')
  async generateMissingVectors(): Promise<
    ApiResponse<{ processed: number; errors: number }>
  > {
    const result = await this.dumpService.generateMissingVectors();

    return {
      success: true,
      data: result,
      message: `Vector generation completed: ${result.processed} processed, ${result.errors} errors`,
    };
  }

  @Post('screenshot')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async processScreenshot(
    @UploadedFile() file: any,
    @Body('userId') userId: string,
    @Body('metadata') metadataJson?: string,
  ): Promise<ApiResponse<DumpProcessingResult>> {
    const metadata = metadataJson ? JSON.parse(metadataJson) : {};

    const request: CreateDumpRequest = {
      userId,
      content: file.originalname || 'Screenshot',
      contentType: 'image',
      metadata: {
        source: metadata.source || 'telegram',
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        isScreenshot: true,
        ...metadata,
      },
      mediaBuffer: file.buffer,
    };

    const result = await this.dumpService.createDumpEnhanced(request);

    return {
      success: true,
      data: result,
      message: 'Screenshot processed with text extraction',
    };
  }

  @Post('voice')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async processVoice(
    @UploadedFile() file: any,
    @Body('userId') userId: string,
    @Body('language') language?: string,
    @Body('metadata') metadataJson?: string,
  ): Promise<ApiResponse<DumpProcessingResult>> {
    const metadata = metadataJson ? JSON.parse(metadataJson) : {};

    const request: CreateDumpRequest = {
      userId,
      content: file.originalname || 'Voice message',
      contentType: 'voice',
      metadata: {
        source: metadata.source || 'telegram',
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        language: language || metadata.language || 'auto',
        ...metadata,
      },
      mediaBuffer: file.buffer,
    };

    const result = await this.dumpService.createDumpEnhanced(request);

    return {
      success: true,
      data: result,
      message: 'Voice message transcribed and analyzed',
    };
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async processDocument(
    @UploadedFile() file: any,
    @Body('userId') userId: string,
    @Body('metadata') metadataJson?: string,
  ): Promise<ApiResponse<DumpProcessingResult>> {
    const metadata = metadataJson ? JSON.parse(metadataJson) : {};

    const request: CreateDumpRequest = {
      userId,
      content: file.originalname || 'Document',
      contentType: 'document',
      metadata: {
        source: metadata.source || 'telegram',
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        ...metadata,
      },
      mediaBuffer: file.buffer,
    };

    const result = await this.dumpService.createDumpEnhanced(request);

    return {
      success: true,
      data: result,
      message: 'Document processed and analyzed',
    };
  }
}
