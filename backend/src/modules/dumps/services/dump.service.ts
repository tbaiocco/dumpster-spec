import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Dump,
  ContentType,
  ProcessingStatus,
} from '../../../entities/dump.entity';
import { Category } from '../../../entities/category.entity';
import {
  ClaudeService,
  type ContentAnalysisResponse,
} from '../../ai/claude.service';
import { SpeechService } from '../../ai/speech.service';
import { VisionService } from '../../ai/vision.service';
import { VectorService } from '../../search/vector.service';
import { UserService } from '../../users/user.service';
import { DatabaseInitService } from '../../../database/database-init.service';
import {
  ContentRouterService,
  ContentType as RouterContentType,
} from '../content-router.service';
import { ScreenshotProcessorService } from '../../ai/screenshot-processor.service';
import { DocumentProcessorService } from '../../ai/document-processor.service';
import { HandwritingService } from '../../ai/handwriting.service';
import { EntityExtractionService } from '../../ai/extraction.service';
import { CategorizationService } from './categorization.service';
import { MetricsService } from '../../metrics/metrics.service';
import { AIOperationType } from '../../../entities/ai-metric.entity';
import { FeatureType } from '../../../entities/feature-usage.entity';

export interface CreateDumpRequest {
  userId: string;
  content: string;
  contentType: 'text' | 'voice' | 'image' | 'document';
  originalText?: string;
  metadata?: {
    source: 'telegram' | 'whatsapp' | 'email' | 'api';
    messageId?: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    chatId?: string;
    language?: string;
  };
  mediaBuffer?: Buffer;
}

export interface DumpProcessingResult {
  dump: Dump;
  analysis: ContentAnalysisResponse;
  processingSteps: string[];
  errors?: string[];
}

export interface DumpSearchFilters {
  userId?: string;
  categoryId?: string;
  contentType?: 'text' | 'voice' | 'image' | 'document';
  source?: 'telegram' | 'whatsapp' | 'email' | 'api';
  dateFrom?: Date;
  dateTo?: Date;
  minConfidence?: number;
  tags?: string[];
}

export interface DumpListResult {
  dumps: Dump[];
  total: number;
  page?: number;
  totalPages?: number;
}

@Injectable()
export class DumpService {
  private readonly logger = new Logger(DumpService.name);

  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly claudeService: ClaudeService,
    private readonly speechService: SpeechService,
    private readonly visionService: VisionService,
    private readonly userService: UserService,
    private readonly vectorService: VectorService,
    private readonly databaseInitService: DatabaseInitService,
    private readonly contentRouterService: ContentRouterService,
    private readonly screenshotProcessorService: ScreenshotProcessorService,
    private readonly documentProcessorService: DocumentProcessorService,
    private readonly handwritingService: HandwritingService,
    private readonly entityExtractionService: EntityExtractionService,
    private readonly categorizationService: CategorizationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Enhanced version using ContentRouterService for intelligent content processing
   */
  async createDumpEnhanced(
    request: CreateDumpRequest,
  ): Promise<DumpProcessingResult> {
    this.logger.log(
      `Processing enhanced dump for user ${request.userId}, type: ${request.contentType}`,
    );

    const processingSteps: string[] = [];
    const errors: string[] = [];

    try {
      // Step 1: Validate user exists
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${request.userId} not found`);
      }
      processingSteps.push('User validated');

      // Step 2: Analyze content using ContentRouterService if media buffer exists
      let processedContent: string;
      let confidence = 0.8;
      let routingResult: any = null;

      if (request.mediaBuffer) {
        // Use ContentRouterService for intelligent content analysis
        const contentAnalysis = await this.contentRouterService.analyzeContent(
          request.mediaBuffer,
          request.metadata?.mimeType,
          request.metadata?.fileName,
        );

        const routingDecision =
          await this.contentRouterService.routeContent(contentAnalysis);
        routingResult = { analysis: contentAnalysis, routing: routingDecision };

        processingSteps.push(
          `Content analyzed: ${contentAnalysis.contentType} (confidence: ${Math.round(contentAnalysis.confidence * 100)}%)`,
        );

        // Route to appropriate processor based on content analysis
        switch (routingDecision.primaryProcessor) {
          case 'screenshot_processor': {
            const screenshotResult =
              await this.screenshotProcessorService.processScreenshot(
                request.mediaBuffer,
                request.metadata?.mimeType || 'image/png',
              );
            processedContent =
              screenshotResult.extractedText || 'Screenshot processed';
            confidence = screenshotResult.confidence;
            processingSteps.push('Screenshot processed with text extraction');
            break;
          }

          case 'voice_processor': {
            // Use speech service with automatic language detection
            const originalMimeType = request.metadata?.mimeType || 'audio/wav';
            const fixedMimeType = this.getProperMimeType(
              contentAnalysis.contentType,
              originalMimeType,
              request.metadata?.fileName,
            );

            const transcriptionResult =
              await this.speechService.transcribeWithLanguageDetection(
                request.mediaBuffer,
                fixedMimeType,
              );
            processedContent = transcriptionResult.transcript;
            confidence = transcriptionResult.confidence;
            const detectedLang =
              transcriptionResult.detectedLanguage || 'unknown';
            processingSteps.push(
              `Voice message transcribed with language detection (${detectedLang}, confidence: ${Math.round(confidence * 100)}%)`,
            );
            break;
          }

          case 'image_processor': {
            // Fall back to vision service for image processing
            const ocrResult = await this.visionService.extractTextFromImage(
              request.mediaBuffer,
              request.metadata?.mimeType || 'image/jpeg',
            );
            processedContent = ocrResult.text || 'Image processed';
            confidence = ocrResult.confidence;
            processingSteps.push('Image processed with advanced analysis');
            break;
          }

          case 'handwriting_processor': {
            const handwritingResult =
              await this.handwritingService.recognizeHandwriting(
                request.mediaBuffer,
                request.metadata?.mimeType || 'image/jpeg',
              );
            processedContent =
              handwritingResult.extractedText || 'Handwriting processed';
            confidence = handwritingResult.confidence;
            processingSteps.push('Handwriting extracted and processed');
            break;
          }

          case 'document_processor': {
            const documentResult =
              await this.documentProcessorService.processDocument(
                request.mediaBuffer,
                request.metadata?.mimeType || 'application/pdf',
              );
            processedContent =
              documentResult.extractedText || 'Document processed';
            confidence = documentResult.confidence;
            processingSteps.push(
              `Document processed (type: ${documentResult.documentType}, confidence: ${Math.round(confidence * 100)}%)`,
            );
            // Store structured document data for later use in extracted_entities
            // This will be merged into the dump's extracted_entities field
            break;
          }

          default:
            // Fall back to original processing logic
            processedContent = await this.processContentFallback(
              request,
              processingSteps,
            );
        }
      } else {
        // Process text content directly
        processedContent = request.content;
        processingSteps.push('Text content processed');
      }

      // Step 3: Analyze content with Claude
      const startTimeAnalysis = performance.now();
      const analysis = await this.claudeService.analyzeContent({
        content: processedContent,
        contentType: 'text',
        context: {
          source: request.metadata?.source || 'telegram',
          userId: request.userId,
          timestamp: new Date(),
        },
      });
      const latencyAnalysis = performance.now() - startTimeAnalysis;
      processingSteps.push('Content analysis completed');

      // TRACK CONTENT ANALYSIS (Fire-and-Forget)
      this.metricsService.fireAndForget(() =>
        this.metricsService.trackAI({
          operationType: AIOperationType.CONTENT_ANALYSIS,
          latencyMs: latencyAnalysis,
          success: true,
          userId: request.userId,
          confidenceScore: Math.round(analysis.confidence * 100),
        }),
      );

      // Use AI summary for subsequent processing steps (better quality, standardized format)
      const contentForProcessing = analysis.summary || processedContent;

      // Step 4: Extract entities from AI summary
      let entityExtractionResult;
      try {
        const startTimeExtraction = performance.now();
        entityExtractionResult =
          await this.entityExtractionService.extractEntities({
            content: contentForProcessing,
            contentType: request.contentType,
            context: {
              source: request.metadata?.source || 'telegram',
              userId: request.userId,
              timestamp: new Date(),
            },
          });
        const latencyExtraction = performance.now() - startTimeExtraction;
        processingSteps.push(
          `Entity extraction completed: ${entityExtractionResult.summary.totalEntities} entities found`,
        );
        this.logger.debug(
          `Extracted entities: ${JSON.stringify(entityExtractionResult.structuredData)}`,
        );

        // TRACK EXTRACTION (Fire-and-Forget)
        this.metricsService.fireAndForget(() =>
          this.metricsService.trackAI({
            operationType: AIOperationType.EXTRACTION,
            latencyMs: latencyExtraction,
            success: true,
            userId: request.userId,
            metadata: {
              entitiesExtracted: entityExtractionResult.summary.totalEntities,
            },
          }),
        );
      } catch (error) {
        this.logger.warn(`Entity extraction failed: ${error.message}`);
        errors.push(`Entity extraction failed: ${error.message}`);
        // Continue with empty entity result
        entityExtractionResult = {
          entities: [],
          summary: {
            totalEntities: 0,
            entitiesByType: {},
            averageConfidence: 0,
          },
          structuredData: {
            dates: [],
            times: [],
            locations: [],
            people: [],
            organizations: [],
            amounts: [],
            contacts: { phones: [], emails: [], urls: [] },
          },
        };
      }

      // Step 5: Categorize content using AI summary
      let categorizationResult;
      try {
        const startTimeCategorization = performance.now();
        categorizationResult =
          await this.categorizationService.categorizeContent({
            content: contentForProcessing,
            userId: request.userId,
            contentType: request.contentType,
            context: {
              source: request.metadata?.source || 'telegram',
              timestamp: new Date(),
            },
          });
        const latencyCategorization =
          performance.now() - startTimeCategorization;
        processingSteps.push(
          `Categorization completed: ${categorizationResult.primaryCategory.name} (confidence: ${categorizationResult.confidence})`,
        );
        this.logger.debug(
          `Categorization result: ${JSON.stringify(categorizationResult)}`,
        );

        // TRACK CATEGORIZATION (Fire-and-Forget)
        this.metricsService.fireAndForget(() =>
          this.metricsService.trackAI({
            operationType: AIOperationType.CATEGORIZATION,
            latencyMs: latencyCategorization,
            success: true,
            userId: request.userId,
            confidenceScore: Math.round(categorizationResult.confidence * 100),
            metadata: {
              categoryAssigned: categorizationResult.primaryCategory.name,
              reasoning: categorizationResult.reasoning,
            },
          }),
        );
      } catch (error) {
        this.logger.warn(
          `Categorization failed: ${error.message}, falling back to Claude category`,
        );
        errors.push(`Categorization failed: ${error.message}`);
        // Fallback to Claude's category
        categorizationResult = {
          primaryCategory: {
            name: analysis.category,
            confidence: analysis.categoryConfidence || 0.5,
            reasoning: 'Fallback to Claude categorization',
            isExisting: false,
          },
          alternativeCategories: [],
          autoApplied: false,
          confidence: analysis.categoryConfidence || 0.5,
          reasoning: 'Fallback to Claude categorization',
        };
      }

      // Step 6: Find or create category using categorization service result
      const category = await this.categorizationService.findOrCreateCategory(
        categorizationResult.primaryCategory.name,
        request.userId,
      );
      processingSteps.push(`Category assigned: ${category.name}`);

      // Step 7: Map content type to entity enum
      const entityContentType = this.mapContentType(
        request.contentType,
        routingResult?.analysis?.contentType,
      );

      // Step 8: Create dump entity with enhanced entity extraction and categorization data
      const dump = this.dumpRepository.create({
        user_id: user.id,
        raw_content: processedContent,
        content_type: entityContentType,
        ai_summary: analysis.summary,
        ai_confidence: Math.round(
          Math.min(confidence, analysis.confidence) * 100,
        ),
        category_id: category.id,
        urgency_level: this.mapUrgencyToNumber(analysis.urgency || 'low'),
        processing_status: ProcessingStatus.PROCESSING,
        extracted_entities: {
          // Enhanced entity extraction from dedicated service
          entities: entityExtractionResult.structuredData,
          entityDetails: entityExtractionResult.entities, // Full entity details with confidence
          entitySummary: entityExtractionResult.summary,
          // AI analysis data
          actionItems: analysis.actionItems || [],
          sentiment: analysis.sentiment || 'neutral',
          urgency: analysis.urgency || 'low',
          // Enhanced categorization data
          categoryConfidence: Math.round(categorizationResult.confidence * 100), // Use categorization service confidence
          categoryReasoning: categorizationResult.reasoning,
          alternativeCategories: categorizationResult.alternativeCategories.map(
            (c) => c.name,
          ),
          autoApplied: categorizationResult.autoApplied,
          metadata: {
            ...request.metadata,
            routingInfo: routingResult,
            enhancedProcessing: true,
          },
        },
      });

      const savedDump = await this.dumpRepository.save(dump);
      processingSteps.push('Dump saved to database');

      // TRACK DUMP CREATION FEATURE (Fire-and-Forget)
      this.metricsService.fireAndForget(() =>
        this.metricsService.trackFeature({
          featureType: FeatureType.DUMP_CREATED,
          detail: request.contentType,
          userId: request.userId,
          dumpId: savedDump.id,
          metadata: {
            source: request.metadata?.source,
            hasMedia: !!request.mediaBuffer,
          },
        }),
      );

      // Step 9: Generate content vector for semantic search
      try {
        const contentToEmbed = savedDump.ai_summary || savedDump.raw_content;
        if (contentToEmbed) {
          this.logger.debug(`Generating embedding for dump ${savedDump.id}`);
          const embeddingResponse = await this.vectorService.generateEmbedding({
            text: contentToEmbed,
          });

          // Update the dump with the generated vector
          await this.dumpRepository.update(savedDump.id, {
            content_vector: embeddingResponse.embedding,
          });

          processingSteps.push('Content vector generated');
          this.logger.debug(
            `Vector generated successfully for dump ${savedDump.id}`,
          );

          // Trigger vector index creation if it doesn't exist
          try {
            await this.databaseInitService.ensureVectorIndex();
            this.logger.debug(
              'Vector index ensured after embedding generation',
            );
          } catch (error) {
            this.logger.warn('Failed to ensure vector index:', error.message);
            // Try to recreate index as fallback
            try {
              this.logger.log('Attempting to recreate vector index...');
              await this.databaseInitService.recreateVectorIndex();
              this.logger.log('✅ Vector index recreated successfully');
            } catch (recreateError) {
              this.logger.error(
                '❌ Failed to recreate vector index:',
                recreateError.message,
              );
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to generate vector for dump ${savedDump.id}:`,
          error,
        );
        errors.push(`Vector generation failed: ${error.message}`);
        // Continue processing even if vector generation fails
      }

      // Step 10: Update processing status
      await this.dumpRepository.update(savedDump.id, {
        processing_status: ProcessingStatus.COMPLETED,
        processed_at: new Date(),
      });

      this.logger.log(`Enhanced dump created successfully: ${savedDump.id}`);

      // Emit event for async tracking detection (non-blocking)
      this.eventEmitter.emit('dump.created', {
        dumpId: savedDump.id,
        userId: savedDump.user_id,
        content: savedDump.raw_content || '',
        contentType: savedDump.content_type,
      });

      return {
        dump: savedDump,
        analysis,
        processingSteps,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error('Error creating enhanced dump:', error);
      // Create a fallback dump with minimal processing
      const fallbackDump = await this.createFallbackDump(
        request,
        error.message,
      );

      return {
        dump: fallbackDump,
        analysis: {
          summary: 'Failed to process content',
          category: 'uncategorized',
          confidence: 0.1,
          extractedEntities: {},
          actionItems: [],
          sentiment: 'neutral',
          urgency: 'low',
          categoryConfidence: 0.1,
        },
        processingSteps,
        errors: [...errors, error.message],
      };
    }
  }

  /**
   * Fallback processing for content when routing fails
   */
  private async processContentFallback(
    request: CreateDumpRequest,
    processingSteps: string[],
  ): Promise<string> {
    if (!request.mediaBuffer) {
      return request.content;
    }

    switch (request.contentType) {
      case 'voice': {
        const originalMimeType = request.metadata?.mimeType || 'audio/wav';
        const fixedMimeType = this.getProperMimeType(
          RouterContentType.VOICE_MESSAGE,
          originalMimeType,
          request.metadata?.fileName,
        );

        // Use automatic language detection for fallback as well
        const transcriptionResult =
          await this.speechService.transcribeWithLanguageDetection(
            request.mediaBuffer,
            fixedMimeType,
          );
        const detectedLang = transcriptionResult.detectedLanguage || 'unknown';
        processingSteps.push(
          `Audio transcribed (fallback, detected: ${detectedLang})`,
        );
        return transcriptionResult.transcript;
      }

      case 'image': {
        const ocrResult = await this.visionService.extractTextFromImage(
          request.mediaBuffer,
          request.metadata?.mimeType || 'image/jpeg',
        );
        processingSteps.push('Image OCR completed (fallback)');
        return ocrResult.text || 'Image with no readable text';
      }

      default:
        return request.content;
    }
  }

  /**
   * Map content types between different type systems
   */
  private mapContentType(
    requestType: string,
    routerType?: RouterContentType,
  ): ContentType {
    // Prioritize router analysis if available
    if (routerType) {
      switch (routerType) {
        case RouterContentType.VOICE_MESSAGE:
          return ContentType.VOICE;
        case RouterContentType.SCREENSHOT:
        case RouterContentType.IMAGE:
          return ContentType.IMAGE;
        case RouterContentType.DOCUMENT:
          return ContentType.EMAIL; // Using EMAIL as closest match
        case RouterContentType.TEXT:
        default:
          return ContentType.TEXT;
      }
    }

    // Fall back to request type
    switch (requestType) {
      case 'voice':
        return ContentType.VOICE;
      case 'image':
        return ContentType.IMAGE;
      case 'document':
        return ContentType.EMAIL;
      case 'text':
      default:
        return ContentType.TEXT;
    }
  }

  /**
   * Generate content vector for semantic search
   */
  private async generateContentVector(
    dump: Dump,
    processingSteps: string[],
    errors: string[],
  ): Promise<void> {
    try {
      const contentToEmbed = dump.ai_summary || dump.raw_content;
      if (contentToEmbed) {
        this.logger.debug(`Generating embedding for dump ${dump.id}`);
        const embeddingResponse = await this.vectorService.generateEmbedding({
          text: contentToEmbed,
        });

        await this.dumpRepository.update(dump.id, {
          content_vector: embeddingResponse.embedding,
        });

        processingSteps.push('Content vector generated');
        this.logger.debug(`Vector generated successfully for dump ${dump.id}`);

        await this.databaseInitService.ensureVectorIndex();
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate vector for dump ${dump.id}:`,
        error,
      );
      errors.push(`Vector generation failed: ${error.message}`);
    }
  }

  private async findOrCreateCategory(
    categoryName: string,
    userId?: string,
  ): Promise<Category> {
    // First try to find an existing category by name
    let category = await this.categoryRepository.findOne({
      where: { name: categoryName.toLowerCase() },
    });

    if (!category) {
      // Create new category
      category = this.categoryRepository.create({
        name: categoryName.toLowerCase(),
        description: `Auto-generated category for ${categoryName}`,
        color: this.generateRandomColor(),
        is_active: true,
        sort_order: 0,
      });
      category = await this.categoryRepository.save(category);
      this.logger.log(`Created new category: ${category.name}`);
    }

    return category;
  }

  private async createFallbackDump(
    request: CreateDumpRequest,
    errorMessage: string,
  ): Promise<Dump> {
    try {
      // Map content type to enum
      let entityContentType: ContentType;
      switch (request.contentType) {
        case 'text':
          entityContentType = ContentType.TEXT;
          break;
        case 'voice':
          entityContentType = ContentType.VOICE;
          break;
        case 'image':
          entityContentType = ContentType.IMAGE;
          break;
        case 'document':
          entityContentType = ContentType.EMAIL;
          break;
        default:
          entityContentType = ContentType.TEXT;
      }

      const fallbackDump = this.dumpRepository.create({
        user_id: request.userId,
        raw_content: request.content || 'Content processing failed',
        content_type: entityContentType,
        ai_summary: `Processing failed: ${errorMessage}`,
        ai_confidence: 0,
        processing_status: ProcessingStatus.FAILED,
        extracted_entities: {
          entities: {
            dates: [],
            times: [],
            locations: [],
            people: [],
            organizations: [],
            amounts: [],
            contacts: { phones: [], emails: [], urls: [] },
          },
          entitySummary: {
            totalEntities: 0,
            entitiesByType: {},
            averageConfidence: 0,
          },
          metadata: {
            ...request.metadata,
            error: errorMessage,
          },
        },
      });

      return this.dumpRepository.save(fallbackDump);
    } catch (fallbackError) {
      this.logger.error('Failed to create fallback dump:', fallbackError);
      throw fallbackError;
    }
  }

  async findById(id: string): Promise<Dump | null> {
    return this.dumpRepository.findOne({
      where: { id },
      relations: ['user', 'category', 'reminders'],
    });
  }

  async findByUserId(
    userId: string,
    filters?: DumpSearchFilters,
  ): Promise<DumpListResult> {
    const queryBuilder = this.dumpRepository
      .createQueryBuilder('dump')
      .leftJoinAndSelect('dump.user', 'user')
      .leftJoinAndSelect('dump.category', 'category')
      .where('dump.user_id = :userId', { userId });

    // Apply filters
    if (filters) {
      if (filters.categoryId) {
        queryBuilder.andWhere('dump.category_id = :categoryId', {
          categoryId: filters.categoryId,
        });
      }

      if (filters.contentType) {
        const entityContentType = this.mapContentTypeToEnum(
          filters.contentType,
        );
        queryBuilder.andWhere('dump.content_type = :contentType', {
          contentType: entityContentType,
        });
      }

      if (filters.dateFrom) {
        queryBuilder.andWhere('dump.created_at >= :dateFrom', {
          dateFrom: filters.dateFrom,
        });
      }

      if (filters.dateTo) {
        queryBuilder.andWhere('dump.created_at <= :dateTo', {
          dateTo: filters.dateTo,
        });
      }

      if (filters.minConfidence) {
        queryBuilder.andWhere('dump.ai_confidence >= :minConfidence', {
          minConfidence: filters.minConfidence,
        });
      }
    }

    // Order by creation date (newest first)
    queryBuilder.orderBy('dump.created_at', 'DESC');

    const [dumps, total] = await queryBuilder.getManyAndCount();

    return {
      dumps,
      total,
    };
  }

  async searchDumps(
    query: string,
    userId?: string,
    filters?: DumpSearchFilters,
    page = 1,
    limit = 20,
  ): Promise<DumpListResult> {
    const queryBuilder = this.dumpRepository
      .createQueryBuilder('dump')
      .leftJoinAndSelect('dump.user', 'user')
      .leftJoinAndSelect('dump.category', 'category')
      .where(
        '(dump.raw_content ILIKE :query OR dump.ai_summary ILIKE :query)',
        {
          query: `%${query}%`,
        },
      );

    if (userId) {
      queryBuilder.andWhere('dump.user_id = :userId', { userId });
    }

    // Apply additional filters
    if (filters) {
      if (filters.categoryId) {
        queryBuilder.andWhere('dump.category_id = :categoryId', {
          categoryId: filters.categoryId,
        });
      }

      if (filters.contentType) {
        const entityContentType = this.mapContentTypeToEnum(
          filters.contentType,
        );
        queryBuilder.andWhere('dump.content_type = :contentType', {
          contentType: entityContentType,
        });
      }

      if (filters.dateFrom) {
        queryBuilder.andWhere('dump.created_at >= :dateFrom', {
          dateFrom: filters.dateFrom,
        });
      }

      if (filters.dateTo) {
        queryBuilder.andWhere('dump.created_at <= :dateTo', {
          dateTo: filters.dateTo,
        });
      }
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Order by relevance (could be improved with full-text search)
    queryBuilder
      .orderBy('dump.ai_confidence', 'DESC')
      .addOrderBy('dump.created_at', 'DESC');

    const [dumps, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      dumps,
      total,
      page,
      totalPages,
    };
  }

  async updateDump(id: string, updates: Partial<Dump>): Promise<Dump> {
    const dump = await this.findById(id);
    if (!dump) {
      throw new NotFoundException(`Dump with ID ${id} not found`);
    }

    await this.dumpRepository.update(id, updates);
    const updatedDump = await this.findById(id);
    if (!updatedDump) {
      throw new Error('Failed to retrieve updated dump');
    }
    return updatedDump;
  }

  async deleteDump(id: string): Promise<void> {
    const result = await this.dumpRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Dump with ID ${id} not found`);
    }
  }

  async getDumpStatistics(userId?: string): Promise<{
    totalDumps: number;
    processingDumps: number;
    failedDumps: number;
    avgConfidence: number;
    typeDistribution: Record<string, number>;
  }> {
    const queryBuilder = this.dumpRepository.createQueryBuilder('dump');

    if (userId) {
      queryBuilder.where('dump.user_id = :userId', { userId });
    }

    const dumps = await queryBuilder.getMany();
    const totalDumps = dumps.length;

    const processingDumps = dumps.filter(
      (d) => d.processing_status === ProcessingStatus.PROCESSING,
    ).length;
    const failedDumps = dumps.filter(
      (d) => d.processing_status === ProcessingStatus.FAILED,
    ).length;

    const avgConfidence =
      totalDumps > 0
        ? dumps.reduce((sum, dump) => sum + (dump.ai_confidence || 0), 0) /
          totalDumps
        : 0;

    const typeDistribution = dumps.reduce(
      (acc, dump) => {
        const type = dump.content_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalDumps,
      processingDumps,
      failedDumps,
      avgConfidence,
      typeDistribution,
    };
  }

  private mapContentTypeToEnum(type: string): ContentType {
    switch (type) {
      case 'text':
        return ContentType.TEXT;
      case 'voice':
        return ContentType.VOICE;
      case 'image':
        return ContentType.IMAGE;
      case 'document':
        return ContentType.EMAIL;
      default:
        return ContentType.TEXT;
    }
  }

  /**
   * Generate vectors for existing dumps that don't have them
   */
  async generateMissingVectors(): Promise<{
    processed: number;
    errors: number;
  }> {
    this.logger.log(
      'Starting to generate missing vectors for existing dumps...',
    );

    // Find dumps without vectors
    const dumpsWithoutVectors = await this.dumpRepository
      .createQueryBuilder('dump')
      .where('dump.content_vector IS NULL')
      .andWhere('dump.processing_status = :status', {
        status: ProcessingStatus.COMPLETED,
      })
      .getMany();

    this.logger.log(
      `Found ${dumpsWithoutVectors.length} dumps without vectors`,
    );

    let processed = 0;
    let errors = 0;

    for (const dump of dumpsWithoutVectors) {
      try {
        const contentToEmbed = dump.ai_summary || dump.raw_content;
        if (contentToEmbed) {
          this.logger.debug(`Generating vector for existing dump ${dump.id}`);

          const embeddingResponse = await this.vectorService.generateEmbedding({
            text: contentToEmbed,
          });

          await this.dumpRepository.update(dump.id, {
            content_vector: embeddingResponse.embedding,
          });

          processed++;

          if (processed % 10 === 0) {
            this.logger.log(
              `Generated vectors for ${processed}/${dumpsWithoutVectors.length} dumps`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to generate vector for dump ${dump.id}:`,
          error,
        );
        errors++;
      }
    }

    this.logger.log(
      `Vector generation completed: ${processed} processed, ${errors} errors`,
    );
    return { processed, errors };
  }

  async getRecentByUser(userId: string, limit = 5): Promise<Dump[]> {
    return this.dumpRepository.find({
      where: { user: { id: userId } },
      relations: ['category', 'user'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private mapUrgencyToNumber(urgency: 'low' | 'medium' | 'high'): number {
    switch (urgency) {
      case 'low':
        return 1;
      case 'medium':
        return 2;
      case 'high':
        return 3;
      default:
        return 1;
    }
  }

  /**
   * Get proper MIME type based on ContentRouter analysis and filename
   */
  private getProperMimeType(
    routerContentType: RouterContentType | string,
    originalMimeType: string,
    filename?: string,
  ): string {
    // If original MIME type is already specific and valid, return as-is
    if (
      originalMimeType &&
      !originalMimeType.includes('octet-stream') &&
      !originalMimeType.includes('binary')
    ) {
      return originalMimeType;
    }

    // Use router analysis to determine proper MIME type
    switch (routerContentType) {
      case RouterContentType.VOICE_MESSAGE:
      case 'VOICE_MESSAGE':
        // Infer audio MIME type from filename extension
        if (filename) {
          const ext = filename.toLowerCase().split('.').pop();
          if (ext) {
            const audioMimeTypes: Record<string, string> = {
              mp3: 'audio/mpeg',
              wav: 'audio/wav',
              ogg: 'audio/ogg',
              m4a: 'audio/m4a',
              aac: 'audio/aac',
              flac: 'audio/flac',
              webm: 'audio/webm',
              opus: 'audio/opus',
            };
            return audioMimeTypes[ext] || 'audio/mpeg'; // Default to MP3
          }
        }
        return 'audio/mpeg';

      case RouterContentType.IMAGE:
      case RouterContentType.SCREENSHOT:
        return 'image/jpeg';

      case RouterContentType.DOCUMENT:
        return 'application/pdf';

      case RouterContentType.VIDEO:
        return 'video/mp4';

      default:
        return originalMimeType || 'application/octet-stream';
    }
  }
}
