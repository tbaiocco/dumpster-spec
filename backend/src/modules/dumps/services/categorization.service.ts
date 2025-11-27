import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../../entities/category.entity';
import { Dump } from '../../../entities/dump.entity';
import { ClaudeService } from '../../ai/claude.service';

export interface CategorySuggestion {
  name: string;
  confidence: number;
  reasoning: string;
  isExisting: boolean;
  existingCategory?: Category;
}

export interface CategorizationRequest {
  content: string;
  userId?: string;
  contentType?: 'text' | 'voice' | 'image' | 'document';
  context?: {
    source: 'telegram' | 'whatsapp';
    timestamp: Date;
    previousCategories?: string[];
  };
}

export interface CategorizationResult {
  primaryCategory: CategorySuggestion;
  alternativeCategories: CategorySuggestion[];
  autoApplied: boolean;
  confidence: number;
  reasoning: string;
}

export interface CategoryAnalytics {
  topCategories: Array<{
    category: Category;
    dumpCount: number;
    percentage: number;
    avgConfidence: number;
  }>;
  recentTrends: Array<{
    category: string;
    growth: number;
    period: 'day' | 'week' | 'month';
  }>;
  suggestions: Array<{
    suggestedName: string;
    frequency: number;
    similarContent: string[];
  }>;
}

@Injectable()
export class CategorizationService {
  private readonly logger = new Logger(CategorizationService.name);

  // Built-in system categories for common use cases
  private readonly systemCategories = [
    {
      name: 'work',
      keywords: [
        'meeting',
        'project',
        'deadline',
        'task',
        'office',
        'client',
        'business',
        'email',
      ],
      description: 'Work-related content and professional activities',
    },
    {
      name: 'personal',
      keywords: [
        'family',
        'friend',
        'hobby',
        'vacation',
        'health',
        'exercise',
        'shopping',
      ],
      description: 'Personal activities and relationships',
    },
    {
      name: 'finance',
      keywords: [
        'money',
        'bank',
        'payment',
        'bill',
        'budget',
        'investment',
        'expense',
        'income',
      ],
      description: 'Financial transactions and planning',
    },
    {
      name: 'health',
      keywords: [
        'doctor',
        'medicine',
        'appointment',
        'symptoms',
        'exercise',
        'diet',
        'wellness',
      ],
      description: 'Health and medical information',
    },
    {
      name: 'travel',
      keywords: [
        'flight',
        'hotel',
        'vacation',
        'trip',
        'destination',
        'booking',
        'passport',
      ],
      description: 'Travel plans and experiences',
    },
    {
      name: 'education',
      keywords: [
        'study',
        'course',
        'exam',
        'school',
        'university',
        'learning',
        'research',
      ],
      description: 'Educational content and learning',
    },
    {
      name: 'entertainment',
      keywords: [
        'movie',
        'book',
        'music',
        'game',
        'show',
        'concert',
        'sport',
        'fun',
      ],
      description: 'Entertainment and leisure activities',
    },
    {
      name: 'food',
      keywords: [
        'recipe',
        'restaurant',
        'cooking',
        'meal',
        'ingredient',
        'diet',
        'nutrition',
      ],
      description: 'Food-related content and dining',
    },
    {
      name: 'home',
      keywords: [
        'house',
        'apartment',
        'furniture',
        'repair',
        'cleaning',
        'decoration',
        'utility',
      ],
      description: 'Home and living arrangements',
    },
    {
      name: 'ideas',
      keywords: [
        'note',
        'thought',
        'idea',
        'inspiration',
        'brainstorm',
        'concept',
        'plan',
      ],
      description: 'Ideas, thoughts, and creative content',
    },
  ];

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
    private readonly claudeService: ClaudeService,
  ) {}

  async categorizeContent(
    request: CategorizationRequest,
  ): Promise<CategorizationResult> {
    this.logger.log(
      `Categorizing content: ${request.content.substring(0, 100)}...`,
    );

    try {
      // Get existing categories for user context
      const existingCategories = await this.getUserCategories(request.userId);

      // Get AI-powered categorization
      const aiCategorization = await this.getAiCategorization(
        request,
        existingCategories,
      );

      // Apply rule-based enhancements
      const enhancedResults = await this.enhanceWithRules(
        request,
        aiCategorization,
      );

      // Check for auto-application based on confidence
      const autoApplied = enhancedResults.primaryCategory.confidence >= 0.8;

      this.logger.log(
        `Categorization complete. Primary: ${enhancedResults.primaryCategory.name} (${enhancedResults.primaryCategory.confidence})`,
      );

      return {
        ...enhancedResults,
        autoApplied,
      };
    } catch (error) {
      this.logger.error('Error in categorization:', error);

      // Fallback to simple keyword-based categorization
      return this.getFallbackCategorization(request);
    }
  }

  async findOrCreateCategory(
    categoryName: string,
    userId?: string,
  ): Promise<Category> {
    // Try to find existing category (case-insensitive)
    let category = await this.categoryRepository.findOne({
      where: { name: categoryName.toLowerCase() },
    });

    if (!category) {
      // Create new category with smart defaults
      const defaults = this.getCategoryDefaults(categoryName);

      category = this.categoryRepository.create({
        name: categoryName.toLowerCase(),
        description: defaults.description,
        color: defaults.color,
        icon: defaults.icon,
        is_active: true,
        sort_order: await this.getNextSortOrder(),
      });

      category = await this.categoryRepository.save(category);
      this.logger.log(`Created new category: ${category.name}`);
    }

    return category;
  }

  async getCategoryAnalytics(userId?: string): Promise<CategoryAnalytics> {
    const queryBuilder = this.dumpRepository
      .createQueryBuilder('dump')
      .leftJoinAndSelect('dump.category', 'category')
      .where('dump.category_id IS NOT NULL');

    if (userId) {
      queryBuilder.andWhere('dump.user_id = :userId', { userId });
    }

    const dumps = await queryBuilder.getMany();

    // Calculate top categories
    const categoryStats = new Map<
      string,
      {
        category: Category;
        count: number;
        totalConfidence: number;
      }
    >();

    for (const dump of dumps) {
      if (dump.category) {
        const existing = categoryStats.get(dump.category.id);
        if (existing) {
          existing.count++;
          existing.totalConfidence += dump.ai_confidence || 0;
        } else {
          categoryStats.set(dump.category.id, {
            category: dump.category,
            count: 1,
            totalConfidence: dump.ai_confidence || 0,
          });
        }
      }
    }

    const totalDumps = dumps.length;
    const topCategories = Array.from(categoryStats.values())
      .map((stats) => ({
        category: stats.category,
        dumpCount: stats.count,
        percentage: (stats.count / totalDumps) * 100,
        avgConfidence: stats.totalConfidence / stats.count,
      }))
      .sort((a, b) => b.dumpCount - a.dumpCount)
      .slice(0, 10);

    // Calculate recent trends (simplified - would need time-based analysis in production)
    const recentTrends = topCategories.slice(0, 5).map((cat) => ({
      category: cat.category.name,
      growth: Math.random() * 20 - 10, // Placeholder - would calculate actual growth
      period: 'week' as const,
    }));

    // Generate category suggestions based on uncategorized content
    const suggestions = await this.generateCategorySuggestions(userId);

    return {
      topCategories,
      recentTrends,
      suggestions,
    };
  }

  async suggestCategories(
    content: string,
    limit = 3,
  ): Promise<CategorySuggestion[]> {
    const keywords = this.extractKeywords(content.toLowerCase());
    const suggestions: CategorySuggestion[] = [];

    // Check system categories
    for (const sysCategory of this.systemCategories) {
      const matchScore = this.calculateKeywordMatch(
        keywords,
        sysCategory.keywords,
      );
      if (matchScore > 0) {
        const existingCategory = await this.categoryRepository.findOne({
          where: { name: sysCategory.name },
        });

        suggestions.push({
          name: sysCategory.name,
          confidence: matchScore,
          reasoning: `Matched keywords: ${keywords.filter((k) => sysCategory.keywords.includes(k)).join(', ')}`,
          isExisting: !!existingCategory,
          existingCategory: existingCategory || undefined,
        });
      }
    }

    // Sort by confidence and return top suggestions
    suggestions.sort((a, b) => b.confidence - a.confidence);
    return suggestions.slice(0, limit);
  }

  private async getUserCategories(userId?: string): Promise<Category[]> {
    if (!userId) {
      return this.categoryRepository.find({
        where: { is_active: true },
        order: { sort_order: 'ASC' },
      });
    }

    // Get categories used by this user's dumps
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .innerJoin('category.dumps', 'dump')
      .where('dump.user_id = :userId', { userId })
      .andWhere('category.is_active = :active', { active: true })
      .groupBy('category.id')
      .orderBy('COUNT(dump.id)', 'DESC')
      .addOrderBy('category.sort_order', 'ASC')
      .getMany();

    return categories;
  }

  private async getAiCategorization(
    request: CategorizationRequest,
    existingCategories: Category[],
  ): Promise<Omit<CategorizationResult, 'autoApplied'>> {
    const categoryNames = existingCategories.map((c) => c.name);

    // Create enhanced prompt for AI categorization
    const prompt = this.buildCategorizationPrompt(request, categoryNames);

    const analysis = await this.claudeService.analyzeContent({
      content: prompt,
      contentType: 'text',
      context: {
        source: request.context?.source || 'telegram',
        userId: request.userId || 'unknown',
        timestamp: request.context?.timestamp || new Date(),
      },
    });

    // Parse AI response and create suggestions
    const primaryCategory = await this.parseAiCategory(
      analysis.category,
      existingCategories,
    );
    const alternativeCategories = await this.generateAlternatives(
      request,
      existingCategories,
      primaryCategory.name,
    );

    return {
      primaryCategory,
      alternativeCategories,
      confidence: analysis.confidence,
      reasoning: analysis.summary,
    };
  }

  private async enhanceWithRules(
    request: CategorizationRequest,
    aiResult: Omit<CategorizationResult, 'autoApplied'>,
  ): Promise<Omit<CategorizationResult, 'autoApplied'>> {
    // Apply business rules to enhance AI categorization
    const keywordSuggestions = await this.suggestCategories(request.content);

    // If keyword matching has high confidence, boost or override AI suggestion
    const topKeywordMatch = keywordSuggestions[0];
    if (topKeywordMatch && topKeywordMatch.confidence > 0.7) {
      if (topKeywordMatch.confidence > aiResult.primaryCategory.confidence) {
        // Override with keyword-based suggestion
        return {
          primaryCategory: topKeywordMatch,
          alternativeCategories: [
            aiResult.primaryCategory,
            ...aiResult.alternativeCategories,
          ],
          confidence: Math.max(topKeywordMatch.confidence, aiResult.confidence),
          reasoning: `Keyword-based override: ${topKeywordMatch.reasoning}`,
        };
      }
    }

    return aiResult;
  }

  private getFallbackCategorization(
    request: CategorizationRequest,
  ): CategorizationResult {
    // Note: In a real implementation, we'd await this, but for fallback we use sync keyword matching
    const syncSuggestions = this.getSystemCategorySuggestions(request.content);

    const primary = syncSuggestions[0] || {
      name: 'uncategorized',
      confidence: 0.3,
      reasoning: 'No clear category match found',
      isExisting: false,
    };

    return {
      primaryCategory: primary,
      alternativeCategories: syncSuggestions.slice(1),
      autoApplied: false,
      confidence: primary.confidence,
      reasoning: 'Fallback categorization using keyword matching',
    };
  }

  private getSystemCategorySuggestions(content: string): CategorySuggestion[] {
    const keywords = this.extractKeywords(content.toLowerCase());
    const suggestions: CategorySuggestion[] = [];

    // Check system categories synchronously
    for (const sysCategory of this.systemCategories) {
      const matchScore = this.calculateKeywordMatch(
        keywords,
        sysCategory.keywords,
      );
      if (matchScore > 0) {
        suggestions.push({
          name: sysCategory.name,
          confidence: matchScore,
          reasoning: `Matched keywords: ${keywords.filter((k) => sysCategory.keywords.includes(k)).join(', ')}`,
          isExisting: false, // We don't check DB in fallback mode
        });
      }
    }

    suggestions.sort((a, b) => b.confidence - a.confidence);
    return suggestions.slice(0, 3);
  }

  private buildCategorizationPrompt(
    request: CategorizationRequest,
    existingCategories: string[],
  ): string {
    return `
      Content to categorize: "${request.content}"
      Content type: ${request.contentType || 'unknown'}
      Source: ${request.context?.source || 'unknown'}
      
      Existing categories: ${existingCategories.join(', ')}
      
      Please categorize this content. If it fits an existing category, use that. 
      If not, suggest a new appropriate category name.
      Consider the content type and context when categorizing.
    `;
  }

  private async parseAiCategory(
    categoryName: string,
    existingCategories: Category[],
  ): Promise<CategorySuggestion> {
    const existing = existingCategories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
    );

    return {
      name: categoryName.toLowerCase(),
      confidence: 0.8, // AI categorization has high base confidence
      reasoning: 'AI-powered categorization',
      isExisting: !!existing,
      existingCategory: existing,
    };
  }

  private async generateAlternatives(
    request: CategorizationRequest,
    existingCategories: Category[],
    primaryCategoryName: string,
  ): Promise<CategorySuggestion[]> {
    const keywordSuggestions = await this.suggestCategories(request.content, 5);

    return keywordSuggestions
      .filter((s) => s.name !== primaryCategoryName)
      .slice(0, 3);
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    return text
      .toLowerCase()
      .replaceAll(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .filter(
        (word) =>
          ![
            'the',
            'and',
            'for',
            'are',
            'but',
            'not',
            'you',
            'all',
            'can',
            'had',
            'her',
            'was',
            'one',
            'our',
            'out',
            'day',
            'get',
            'has',
            'him',
            'his',
            'how',
            'man',
            'new',
            'now',
            'old',
            'see',
            'two',
            'way',
            'who',
            'boy',
            'did',
            'its',
            'let',
            'put',
            'say',
            'she',
            'too',
            'use',
          ].includes(word),
      );
  }

  private calculateKeywordMatch(
    contentKeywords: string[],
    categoryKeywords: string[],
  ): number {
    const matches = contentKeywords.filter((word) =>
      categoryKeywords.some(
        (catWord) => word.includes(catWord) || catWord.includes(word),
      ),
    );

    if (matches.length === 0) return 0;

    return Math.min((matches.length / contentKeywords.length) * 2, 1);
  }

  private getCategoryDefaults(categoryName: string): {
    description: string;
    color: string;
    icon: string;
  } {
    const sysCategory = this.systemCategories.find(
      (c) => c.name === categoryName.toLowerCase(),
    );

    if (sysCategory) {
      return {
        description: sysCategory.description,
        color: this.getDefaultColor(categoryName),
        icon: this.getDefaultIcon(categoryName),
      };
    }

    return {
      description: `User-defined category: ${categoryName}`,
      color: this.generateRandomColor(),
      icon: '📂',
    };
  }

  private getDefaultColor(categoryName: string): string {
    const colorMap: Record<string, string> = {
      work: '#4F46E5',
      personal: '#10B981',
      finance: '#F59E0B',
      health: '#EF4444',
      travel: '#8B5CF6',
      education: '#3B82F6',
      entertainment: '#F97316',
      food: '#84CC16',
      home: '#6B7280',
      ideas: '#EC4899',
    };

    return colorMap[categoryName.toLowerCase()] || this.generateRandomColor();
  }

  private getDefaultIcon(categoryName: string): string {
    const iconMap: Record<string, string> = {
      work: '💼',
      personal: '👤',
      finance: '💰',
      health: '🏥',
      travel: '✈️',
      education: '📚',
      entertainment: '🎬',
      food: '🍽️',
      home: '🏠',
      ideas: '💡',
    };

    return iconMap[categoryName.toLowerCase()] || '📂';
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

  private async getNextSortOrder(): Promise<number> {
    const result = await this.categoryRepository
      .createQueryBuilder('category')
      .select('MAX(category.sort_order)', 'maxOrder')
      .getRawOne();

    return (result?.maxOrder || 0) + 1;
  }

  private async generateCategorySuggestions(userId?: string): Promise<
    Array<{
      suggestedName: string;
      frequency: number;
      similarContent: string[];
    }>
  > {
    // This would analyze uncategorized content and suggest new categories
    // For now, return empty array - would be implemented based on content analysis
    return [];
  }
}
