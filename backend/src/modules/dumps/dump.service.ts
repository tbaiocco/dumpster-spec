import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump, ContentType, ProcessingStatus } from '../../entities/dump.entity';
import { Category } from '../../entities/category.entity';
import { ClaudeService, type ContentAnalysisResponse } from '../ai/claude.service';
import { SpeechService } from '../ai/speech.service';
import { VisionService } from '../ai/vision.service';
import { UserService } from '../users/user.service';
import { VectorService } from '../search/vector.service';
import { DatabaseInitService } from '../../database/database-init.service';

export interface CreateDumpRequest {
  userId: string;
  content: string;
  contentType: 'text' | 'voice' | 'image' | 'document';
  originalText?: string;
  metadata?: {
    source: 'telegram' | 'whatsapp';
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
  source?: 'telegram' | 'whatsapp';
  dateFrom?: Date;
  dateTo?: Date;
  minConfidence?: number;
  tags?: string[];
}

export interface DumpListResult {
  dumps: Dump[];
  total: number;
  page: number;
  totalPages: number;
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
  ) {}

  async createDump(request: CreateDumpRequest): Promise<DumpProcessingResult> {
    this.logger.log(`Processing new dump for user ${request.userId}, type: ${request.contentType}`);
    
    const processingSteps: string[] = [];
    const errors: string[] = [];

    try {
      // Step 1: Validate user exists
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${request.userId} not found`);
      }
      processingSteps.push('User validated');

      // Step 2: Process content based on type
      let processedContent: string;
      let confidence = 0.8;

      switch (request.contentType) {
        case 'voice':
          if (request.mediaBuffer) {
            // Extract language from metadata, default to Portuguese for now if not specified
            const languageCode = request.metadata?.language || 'pt-BR';
            
            this.logger.debug(`Transcribing audio with language: ${languageCode}`);
            
            const transcriptionResult = await this.speechService.transcribeAudio({
              audioBuffer: request.mediaBuffer,
              mimeType: request.metadata?.mimeType || 'audio/wav',
              languageCode: languageCode,
              enableAutomaticPunctuation: true,
              enableWordTimeOffsets: true,
              maxAlternatives: 2,
            });
            processedContent = transcriptionResult.transcript;
            confidence = transcriptionResult.confidence;
            processingSteps.push(`Audio transcribed (${languageCode})`);
          } else {
            errors.push('Voice content requires media buffer');
            processedContent = request.originalText || 'Voice message (transcription failed)';
          }
          break;

        case 'image':
          if (request.mediaBuffer) {
            const ocrResult = await this.visionService.extractTextFromImage(
              request.mediaBuffer,
              request.metadata?.mimeType || 'image/jpeg',
            );
            processedContent = ocrResult.text || 'Image with no readable text';
            confidence = ocrResult.confidence;
            processingSteps.push('Image OCR completed');
          } else {
            errors.push('Image content requires media buffer');
            processedContent = request.originalText || 'Image (OCR failed)';
          }
          break;

        case 'document':
          // For now, treat documents as text content
          // In the future, we could add document parsing here
          processedContent = request.content;
          processingSteps.push('Document content processed');
          break;

        case 'text':
        default:
          processedContent = request.content;
          processingSteps.push('Text content processed');
          break;
      }

      // Step 3: Analyze content with Claude
      const analysis = await this.claudeService.analyzeContent({
        content: processedContent,
        contentType: 'text',
        context: {
          source: request.metadata?.source || 'telegram',
          userId: request.userId,
          timestamp: new Date(),
        },
      });
      processingSteps.push('Content analysis completed');

      // Step 4: Find or create category
      const category = await this.findOrCreateCategory(analysis.category, request.userId);
      processingSteps.push(`Category assigned: ${category.name}`);

      // Step 5: Map content type to enum
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
          entityContentType = ContentType.EMAIL; // Using EMAIL as closest match for document
          break;
        default:
          entityContentType = ContentType.TEXT;
      }

      // Step 6: Create dump entity with correct field names
      const dump = this.dumpRepository.create({
        user_id: user.id,
        raw_content: processedContent,
        content_type: entityContentType,
        ai_summary: analysis.summary,
        ai_confidence: Math.round(Math.min(confidence, analysis.confidence) * 100), // Convert decimal to percentage integer
        category_id: category.id,
        urgency_level: this.mapUrgencyToNumber(analysis.urgency || 'low'),
        processing_status: ProcessingStatus.PROCESSING,
        extracted_entities: {
          entities: analysis.extractedEntities || {},
          actionItems: analysis.actionItems || [],
          sentiment: analysis.sentiment || 'neutral',
          urgency: analysis.urgency || 'low',
          categoryConfidence: Math.round((analysis.categoryConfidence || 0.8) * 100), // Convert decimal to percentage integer
          metadata: request.metadata || {},
        },
      });

      const savedDump = await this.dumpRepository.save(dump);
      processingSteps.push('Dump saved to database');

      // Step 7: Generate content vector for semantic search
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
          this.logger.debug(`Vector generated successfully for dump ${savedDump.id}`);
          
          // Trigger vector index creation if it doesn't exist
          try {
            await this.databaseInitService.ensureVectorIndex();
            this.logger.debug('Vector index ensured after embedding generation');
          } catch (error) {
            this.logger.warn('Failed to ensure vector index:', error.message);
            // Try to recreate index as fallback
            try {
              this.logger.log('Attempting to recreate vector index...');
              await this.databaseInitService.recreateVectorIndex();
              this.logger.log('✅ Vector index recreated successfully');
            } catch (recreateError) {
              this.logger.error('❌ Failed to recreate vector index:', recreateError.message);
            }
          }
        }
      } catch (error) {
        this.logger.error(`Failed to generate vector for dump ${savedDump.id}:`, error);
        errors.push(`Vector generation failed: ${error.message}`);
        // Continue processing even if vector generation fails
      }

      // Step 8: Update processing status
      await this.dumpRepository.update(savedDump.id, {
        processing_status: ProcessingStatus.COMPLETED,
        processed_at: new Date(),
      });

      this.logger.log(`Dump created successfully: ${savedDump.id}`);

      return {
        dump: savedDump,
        analysis,
        processingSteps,
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      this.logger.error('Error creating dump:', error);
      
      // Create a fallback dump with minimal processing
      const fallbackDump = await this.createFallbackDump(request, error.message);
      
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

  private async findOrCreateCategory(categoryName: string, userId?: string): Promise<Category> {
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

  private async createFallbackDump(request: CreateDumpRequest, errorMessage: string): Promise<Dump> {
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
          error: errorMessage,
          metadata: request.metadata || {},
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
    page = 1,
    limit = 20,
  ): Promise<DumpListResult> {
    const queryBuilder = this.dumpRepository.createQueryBuilder('dump')
      .leftJoinAndSelect('dump.user', 'user')
      .leftJoinAndSelect('dump.category', 'category')
      .where('dump.user_id = :userId', { userId });

    // Apply filters
    if (filters) {
      if (filters.categoryId) {
        queryBuilder.andWhere('dump.category_id = :categoryId', { categoryId: filters.categoryId });
      }
      
      if (filters.contentType) {
        const entityContentType = this.mapContentTypeToEnum(filters.contentType);
        queryBuilder.andWhere('dump.content_type = :contentType', { contentType: entityContentType });
      }
      
      if (filters.dateFrom) {
        queryBuilder.andWhere('dump.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
      }
      
      if (filters.dateTo) {
        queryBuilder.andWhere('dump.created_at <= :dateTo', { dateTo: filters.dateTo });
      }
      
      if (filters.minConfidence) {
        queryBuilder.andWhere('dump.ai_confidence >= :minConfidence', { minConfidence: filters.minConfidence });
      }
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
    
    // Order by creation date (newest first)
    queryBuilder.orderBy('dump.created_at', 'DESC');

    const [dumps, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      dumps,
      total,
      page,
      totalPages,
    };
  }

  async searchDumps(
    query: string,
    userId?: string,
    filters?: DumpSearchFilters,
    page = 1,
    limit = 20,
  ): Promise<DumpListResult> {
    const queryBuilder = this.dumpRepository.createQueryBuilder('dump')
      .leftJoinAndSelect('dump.user', 'user')
      .leftJoinAndSelect('dump.category', 'category')
      .where('(dump.raw_content ILIKE :query OR dump.ai_summary ILIKE :query)', { 
        query: `%${query}%` 
      });

    if (userId) {
      queryBuilder.andWhere('dump.user_id = :userId', { userId });
    }

    // Apply additional filters
    if (filters) {
      if (filters.categoryId) {
        queryBuilder.andWhere('dump.category_id = :categoryId', { categoryId: filters.categoryId });
      }
      
      if (filters.contentType) {
        const entityContentType = this.mapContentTypeToEnum(filters.contentType);
        queryBuilder.andWhere('dump.content_type = :contentType', { contentType: entityContentType });
      }
      
      if (filters.dateFrom) {
        queryBuilder.andWhere('dump.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
      }
      
      if (filters.dateTo) {
        queryBuilder.andWhere('dump.created_at <= :dateTo', { dateTo: filters.dateTo });
      }
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
    
    // Order by relevance (could be improved with full-text search)
    queryBuilder.orderBy('dump.ai_confidence', 'DESC')
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

    const processingDumps = dumps.filter(d => d.processing_status === ProcessingStatus.PROCESSING).length;
    const failedDumps = dumps.filter(d => d.processing_status === ProcessingStatus.FAILED).length;

    const avgConfidence = totalDumps > 0 
      ? dumps.reduce((sum, dump) => sum + (dump.ai_confidence || 0), 0) / totalDumps
      : 0;

    const typeDistribution = dumps.reduce((acc, dump) => {
      const type = dump.content_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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
  async generateMissingVectors(): Promise<{ processed: number; errors: number }> {
    this.logger.log('Starting to generate missing vectors for existing dumps...');

    // Find dumps without vectors
    const dumpsWithoutVectors = await this.dumpRepository
      .createQueryBuilder('dump')
      .where('dump.content_vector IS NULL')
      .andWhere('dump.processing_status = :status', { status: ProcessingStatus.COMPLETED })
      .getMany();

    this.logger.log(`Found ${dumpsWithoutVectors.length} dumps without vectors`);

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
            this.logger.log(`Generated vectors for ${processed}/${dumpsWithoutVectors.length} dumps`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to generate vector for dump ${dump.id}:`, error);
        errors++;
      }
    }

    this.logger.log(`Vector generation completed: ${processed} processed, ${errors} errors`);
    return { processed, errors };
  }

  private generateRandomColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
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
}