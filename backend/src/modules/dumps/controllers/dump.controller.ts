import {
  Controller,
  Get,
  Post,
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
    source: 'telegram' | 'whatsapp' | 'api';
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

@Controller('api/dumps')
export class DumpController {
  constructor(private readonly dumpService: DumpService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) createDumpDto: CreateDumpDto,
  ): Promise<ApiResponse<DumpProcessingResult>> {
    const request: CreateDumpRequest = {
      userId: createDumpDto.userId,
      content: createDumpDto.content,
      contentType: createDumpDto.contentType,
      originalText: createDumpDto.originalText,
      metadata: {
        source:
          (createDumpDto.metadata?.source as 'telegram' | 'whatsapp') ||
          'telegram',
        messageId: createDumpDto.metadata?.messageId,
        fileName: createDumpDto.metadata?.fileName,
        mimeType: createDumpDto.metadata?.mimeType,
        fileSize: createDumpDto.metadata?.fileSize,
        chatId: createDumpDto.metadata?.chatId,
      },
    };

    const result = await this.dumpService.createDump(request);

    return {
      success: true,
      data: result,
      message: 'Content processed successfully',
    };
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
          (createDumpDto.metadata?.source as 'telegram' | 'whatsapp') ||
          'telegram',
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
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<ApiResponse<any>> {
    const pageNum = Number.parseInt(page, 10);
    const limitNum = Number.parseInt(limit, 10);

    const result = await this.dumpService.findByUserId(
      userId,
      undefined,
      pageNum,
      limitNum,
    );

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

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<Dump | null>> {
    const dump = await this.dumpService.findById(id);

    return {
      success: true,
      data: dump,
      message: 'Dump retrieved successfully',
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
