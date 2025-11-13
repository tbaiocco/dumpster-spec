import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { VectorService } from './vector.service';

// Integration tests with real model (NO MOCKS for transformers library)
// This file tests the actual model loading and embedding generation

describe.skip('VectorService - Real Local Model Integration Test', () => {
  let service: VectorService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => null), // No config needed for local embeddings
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn()
              .mockResolvedValueOnce([{ exists: true }]) // pgvector extension check
              .mockResolvedValueOnce([]), // pgvector test query
          },
        },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
    
    // Initialize the service - this will load the actual model
    console.log('🔄 Loading sentence transformer model...');
    await service.onModuleInit();
    console.log('✅ Model loaded successfully for integration testing');
  }, 120000); // 2 minutes for model loading

  it('should generate real embedding using local model', async () => {
    console.log('🧪 Testing real local model embedding generation...');
    
    const testText = 'Hello world, this is a test for semantic search embeddings.';
    
    try {
      const result = await service.generateEmbedding({ text: testText });
      
      console.log('✅ Local embedding generated:');
      console.log(`- Model: ${result.model}`);
      console.log(`- Embedding dimensions: ${result.embedding.length}`);
      console.log(`- Token estimate: ${result.tokens}`);
      console.log(`- First 5 embedding values: ${result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}`);
      
      expect(result.embedding).toBeDefined();
      expect(Array.isArray(result.embedding)).toBe(true);
      expect(result.embedding.length).toBe(384); // all-MiniLM-L6-v2 dimensions
      expect(result.model).toBe('Xenova/all-MiniLM-L6-v2');
      expect(result.tokens).toBeGreaterThan(0);
      
      // Verify embedding values are reasonable (not all zeros, reasonable range)
      const hasNonZero = result.embedding.some(val => Math.abs(val) > 0.001);
      expect(hasNonZero).toBe(true);
      
      const allInRange = result.embedding.every(val => Math.abs(val) < 10); // Reasonable range for normalized embeddings
      expect(allInRange).toBe(true);
      
      console.log('✅ All local embedding validations passed!');
      
    } catch (error) {
      console.error('❌ Local embedding generation failed:', error);
      throw error;
    }
  }, 30000); // 30 second timeout for local processing

  it('should handle batch embeddings with local model', async () => {
    console.log('🧪 Testing batch local embedding generation...');
    
    const testTexts = [
      'This is the first document about technology.',
      'The second text discusses financial planning.',
      'A third piece of content about health and wellness.'
    ];
    
    try {
      const results = await service.generateEmbeddings(testTexts);
      
      console.log(`✅ Generated ${results.length} local embeddings for batch`);
      
      expect(results).toHaveLength(3);
      
      for (const [index, result] of results.entries()) {
        expect(result.embedding).toBeDefined();
        expect(result.embedding.length).toBe(384);
        console.log(`- Text ${index + 1}: ${result.embedding.length} dimensions, ${result.tokens} tokens`);
      }
      
      // Verify embeddings are different (semantic similarity working)
      const embedding1 = results[0].embedding;
      const embedding2 = results[1].embedding;
      
      const areDifferent = embedding1.some((val, i) => Math.abs(val - embedding2[i]) > 0.001);
      expect(areDifferent).toBe(true);
      
      console.log('✅ Batch local embeddings validated - different texts produce different vectors!');
      
    } catch (error) {
      console.error('❌ Batch local embedding failed:', error);
      throw error;
    }
  }, 45000); // 45 second timeout for batch processing

  it('should demonstrate semantic similarity with local embeddings', async () => {
    console.log('🧪 Testing semantic similarity with local model...');
    
    const texts = [
      'The cat sat on the mat.',
      'A feline rested on the rug.',  // Similar meaning
      'JavaScript is a programming language.',  // Different topic
    ];
    
    try {
      const results = await service.generateEmbeddings(texts);
      
      // Calculate cosine similarities
      const sim1_2 = service.calculateCosineSimilarity(results[0].embedding, results[1].embedding);
      const sim1_3 = service.calculateCosineSimilarity(results[0].embedding, results[2].embedding);
      
      console.log(`✅ Semantic similarity results:`);
      console.log(`- Similarity between "${texts[0]}" and "${texts[1]}": ${sim1_2.toFixed(4)}`);
      console.log(`- Similarity between "${texts[0]}" and "${texts[2]}": ${sim1_3.toFixed(4)}`);
      
      // Similar sentences should have higher similarity than unrelated ones
      expect(sim1_2).toBeGreaterThan(sim1_3);
      expect(sim1_2).toBeGreaterThan(0.5); // Should be reasonably similar
      expect(sim1_3).toBeLessThan(0.8); // Should be less similar
      
      console.log('✅ Semantic similarity validation passed - local model understands meaning!');
      
    } catch (error) {
      console.error('❌ Semantic similarity test failed:', error);
      throw error;
    }
  }, 30000);
});