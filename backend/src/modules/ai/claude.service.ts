import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ContentAnalysisRequest {
  content: string;
  contentType: 'text' | 'transcription' | 'ocr_text';
  context?: {
    source: 'telegram' | 'whatsapp';
    userId: string;
    timestamp: Date;
  };
}

export interface ContentAnalysisResponse {
  summary: string;
  category: string;
  categoryConfidence: number;
  extractedEntities: {
    dates?: string[];
    times?: string[];
    locations?: string[];
    people?: string[];
    organizations?: string[];
    amounts?: string[];
    tags?: string[];
  };
  actionItems?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  urgency?: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  system?: string;
  temperature?: number;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.anthropic.com/v1/messages';
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CLAUDE_API_KEY') || '';
    this.model =
      this.configService.get<string>('CLAUDE_MODEL') ||
      'claude-3-haiku-20240307';

    if (!this.apiKey) {
      this.logger.warn('Claude API key not configured');
    }
  }

  async analyzeContent(
    request: ContentAnalysisRequest,
  ): Promise<ContentAnalysisResponse> {
    this.logger.log(
      `Analyzing content: ${request.content.substring(0, 100)}...`,
    );

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(request);

      const response = await this.callClaude({
        model: this.model,
        max_tokens: 1000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const analysis = this.parseAnalysisResponse(response.content[0].text);

      this.logger.log(
        `Analysis completed with confidence: ${analysis.confidence}`,
      );
      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing content with Claude:', error);

      // Return fallback analysis
      return this.getFallbackAnalysis(request.content);
    }
  }

  async generateSummary(
    content: string,
    maxLength: number = 100,
  ): Promise<string> {
    this.logger.log('Generating content summary');

    try {
      const response = await this.callClaude({
        model: this.model,
        max_tokens: 200,
        temperature: 0.2,
        system: 'You are a helpful assistant that creates concise summaries.',
        messages: [
          {
            role: 'user',
            content: `Please create a concise summary of the following content in ${maxLength} characters or less:\n\n${content}`,
          },
        ],
      });

      const summary = response.content[0].text.trim();
      return summary.length > maxLength
        ? `${summary.substring(0, maxLength - 3)}...`
        : summary;
    } catch (error) {
      this.logger.error('Error generating summary:', error);
      return content.length > maxLength
        ? `${content.substring(0, maxLength - 3)}...`
        : content;
    }
  }

  async categorizeContent(
    content: string,
  ): Promise<{ category: string; confidence: number }> {
    this.logger.log('Categorizing content');

    try {
      const systemPrompt = `You are a content categorization expert. Categorize content into one of these categories:
- Personal
- Work
- Shopping
- Health
- Finance
- Travel
- Education
- Entertainment
- Home
- Relationships
- Goals
- General

Respond with only the category name and confidence (0-1) in this format: "CATEGORY|CONFIDENCE"`;

      const response = await this.callClaude({
        model: this.model,
        max_tokens: 50,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Categorize this content: ${content}`,
          },
        ],
      });

      const result = response.content[0].text.trim();
      const [category, confidenceStr] = result.split('|');

      return {
        category: category || 'General',
        confidence: Number.parseFloat(confidenceStr || '0.5'),
      };
    } catch (error) {
      this.logger.error('Error categorizing content:', error);
      return { category: 'General', confidence: 0.5 };
    }
  }

  async extractEntities(
    content: string,
  ): Promise<ContentAnalysisResponse['extractedEntities']> {
    this.logger.log('Extracting entities from content');

    try {
      const systemPrompt = `Extract structured information from the given content. Return only a JSON object with these fields:
{
  "dates": ["date strings found"],
  "times": ["time strings found"],
  "locations": ["location names"],
  "people": ["person names"],
  "organizations": ["company/org names"],
  "amounts": ["monetary amounts"],
  "tags": ["relevant keywords/topics"]
}

Return empty arrays for categories with no matches. Be conservative and only include clear matches.`;

      const response = await this.callClaude({
        model: this.model,
        max_tokens: 300,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: content,
          },
        ],
      });

      const jsonText = response.content[0].text.trim();
      const entities = JSON.parse(
        jsonText,
      ) as ContentAnalysisResponse['extractedEntities'];

      return entities;
    } catch (error) {
      this.logger.error('Error extracting entities:', error);
      return {};
    }
  }

  /**
   * Send a custom prompt to Claude and get raw response
   */
  async queryWithCustomPrompt(prompt: string): Promise<string> {
    this.logger.log(`Sending custom prompt to Claude: ${prompt.substring(0, 100)}...`);

    try {
      const response = await this.callClaude({
        model: this.model,
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const result = response.content[0].text;
      this.logger.log(`Claude custom response: ${result}`);
      return result;
    } catch (error) {
      this.logger.error('Error in custom Claude query:', error);
      throw error;
    }
  }

  private async callClaude(request: ClaudeRequest): Promise<ClaudeResponse> {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<ClaudeResponse>;
  }

  private buildSystemPrompt(): string {
    return `You are an AI assistant that analyzes content for a personal life management system. Your job is to:

1. Categorize content into one of: Personal, Work, Shopping, Health, Finance, Travel, Education, Entertainment, Home, Relationships, Goals, General
2. Extract key information (dates, times, people, places, amounts, etc.)
3. Identify action items or next steps
4. Assess urgency and sentiment
5. Provide a brief summary

Respond with a JSON object in this exact format:
{
  "summary": "Brief summary of the content",
  "category": "One of the predefined categories",
  "categoryConfidence": 0.95,
  "extractedEntities": {
    "dates": ["any dates found"],
    "times": ["any times found"],
    "locations": ["any locations"],
    "people": ["any people mentioned"],
    "organizations": ["any organizations"],
    "amounts": ["any monetary amounts"],
    "tags": ["relevant keywords"]
  },
  "actionItems": ["any action items or tasks"],
  "sentiment": "positive/neutral/negative",
  "urgency": "low/medium/high",
  "confidence": 0.85
}

Be conservative with confidence scores. Use "General" category if unsure.`;
  }

  private buildUserPrompt(request: ContentAnalysisRequest): string {
    let prompt = `Analyze this ${request.contentType} content:\n\n${request.content}`;

    if (request.context) {
      prompt += `\n\nContext:`;
      prompt += `\n- Source: ${request.context.source}`;
      prompt += `\n- Timestamp: ${request.context.timestamp.toISOString()}`;
    }

    return prompt;
  }

  private parseAnalysisResponse(responseText: string): ContentAnalysisResponse {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(responseText) as ContentAnalysisResponse;

      // Validate required fields
      return {
        summary: parsed.summary || 'Content processed',
        category: parsed.category || 'General',
        categoryConfidence: Math.min(
          Math.max(parsed.categoryConfidence || 0.5, 0),
          1,
        ),
        extractedEntities: parsed.extractedEntities || {},
        actionItems: parsed.actionItems || [],
        sentiment: parsed.sentiment || 'neutral',
        urgency: parsed.urgency || 'low',
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
      };
    } catch (parseError) {
      this.logger.warn(
        'Failed to parse Claude response as JSON, using fallback:',
        parseError,
      );

      // Extract what we can from plain text
      return {
        summary: responseText.substring(0, 200),
        category: 'General',
        categoryConfidence: 0.3,
        extractedEntities: {},
        actionItems: [],
        sentiment: 'neutral',
        urgency: 'low',
        confidence: 0.3,
      };
    }
  }

  private getFallbackAnalysis(content: string): ContentAnalysisResponse {
    this.logger.log('Using fallback analysis');

    return {
      summary:
        content.length > 100 ? `${content.substring(0, 97)}...` : content,
      category: 'General',
      categoryConfidence: 0.5,
      extractedEntities: {
        tags: [content.split(' ').slice(0, 3).join(' ')],
      },
      actionItems: [],
      sentiment: 'neutral',
      urgency: 'low',
      confidence: 0.2,
    };
  }
}
