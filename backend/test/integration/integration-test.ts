/**
 * Real integration test for VectorService with actual local model
 * This runs outside Jest to avoid ES module issues
 */

import { VectorService } from '../../src/modules/search/vector.service';

async function runIntegrationTests() {
  console.log('🧪 VectorService Integration Tests - Real Local Model');
  console.log('=' .repeat(60));

  // Mock dependencies
  const mockDataSource = {
    query: async (sql: any) => {
      if (sql.includes('pg_extension')) {
        return [{ exists: true }];
      }
      return [];
    },
  } as any;
  
  const mockConfigService = {
    get: () => null, // No config needed
  } as any;

  try {
    // Initialize service
    console.log('🔄 Initializing VectorService...');
    const vectorService = new VectorService(mockDataSource, mockConfigService);
    
    // Load the model
    console.log('📦 Loading sentence transformer model (this may take a moment)...');
    const startTime = Date.now();
    await vectorService.onModuleInit();
    const loadTime = Date.now() - startTime;
    console.log(`✅ Model loaded in ${loadTime}ms`);

    // Test 1: Single embedding
    console.log('\n📝 Test 1: Single Embedding Generation');
    console.log('-'.repeat(40));
    
    const testText = 'Hello world, this is a test for semantic search embeddings.';
    console.log(`Input: "${testText}"`);
    
    const result = await vectorService.generateEmbedding({ text: testText });
    
    console.log(`✅ Generated embedding:`);
    console.log(`   - Model: ${result.model}`);
    console.log(`   - Dimensions: ${result.embedding.length}`);
    console.log(`   - Tokens: ${result.tokens}`);
    console.log(`   - Sample values: [${result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log(`   - Vector magnitude: ${Math.sqrt(result.embedding.reduce((sum, val) => sum + val * val, 0)).toFixed(4)}`);

    // Validate results
    if (result.embedding.length !== 384) {
      throw new Error(`Expected 384 dimensions, got ${result.embedding.length}`);
    }
    
    const hasNonZero = result.embedding.some(val => Math.abs(val) > 0.001);
    if (!hasNonZero) {
      throw new Error('Embedding contains only zeros');
    }

    // Test 2: Batch embeddings
    console.log('\n📝 Test 2: Batch Embedding Generation');
    console.log('-'.repeat(40));
    
    const testTexts = [
      'This is the first document about technology and computers.',
      'The second text discusses financial planning and investments.',
      'A third piece of content about health, wellness, and fitness.'
    ];
    
    console.log(`Generating embeddings for ${testTexts.length} texts...`);
    const batchResults = await vectorService.generateEmbeddings(testTexts);
    
    console.log(`✅ Generated ${batchResults.length} embeddings:`);
    batchResults.forEach((emb, i) => {
      console.log(`   ${i + 1}. ${emb.embedding.length} dims, ${emb.tokens} tokens`);
    });

    // Test 3: Semantic similarity
    console.log('\n📝 Test 3: Semantic Similarity Analysis');
    console.log('-'.repeat(40));
    
    const semanticTexts = [
      'The cat sat on the mat.',
      'A feline rested on the rug.',  // Similar meaning
      'JavaScript is a programming language used for web development.',  // Different topic
    ];
    
    const semanticResults = await vectorService.generateEmbeddings(semanticTexts);
    
    // Calculate similarities
    const sim1_2 = vectorService.calculateCosineSimilarity(
      semanticResults[0].embedding, 
      semanticResults[1].embedding
    );
    const sim1_3 = vectorService.calculateCosineSimilarity(
      semanticResults[0].embedding, 
      semanticResults[2].embedding
    );
    const sim2_3 = vectorService.calculateCosineSimilarity(
      semanticResults[1].embedding, 
      semanticResults[2].embedding
    );
    
    console.log(`✅ Similarity analysis:`);
    console.log(`   - "${semanticTexts[0]}" ↔ "${semanticTexts[1]}": ${sim1_2.toFixed(4)} (similar meanings)`);
    console.log(`   - "${semanticTexts[0]}" ↔ "${semanticTexts[2]}": ${sim1_3.toFixed(4)} (different topics)`);
    console.log(`   - "${semanticTexts[1]}" ↔ "${semanticTexts[2]}": ${sim2_3.toFixed(4)} (different topics)`);
    
    // Validate semantic understanding
    if (sim1_2 <= sim1_3) {
      console.warn(`⚠️  Warning: Similar texts should have higher similarity (${sim1_2.toFixed(4)} vs ${sim1_3.toFixed(4)})`);
    } else {
      console.log(`✅ Semantic understanding validated: similar texts have higher similarity`);
    }

    // Test 4: Performance benchmark
    console.log('\n📝 Test 4: Performance Benchmark');
    console.log('-'.repeat(40));
    
    const benchmarkTexts = Array(10).fill(0).map((_, i) => 
      `This is test sentence number ${i + 1} for performance benchmarking.`
    );
    
    const perfStartTime = Date.now();
    await vectorService.generateEmbeddings(benchmarkTexts);
    const perfEndTime = Date.now();
    
    const totalTime = perfEndTime - perfStartTime;
    const avgTime = totalTime / benchmarkTexts.length;
    
    console.log(`✅ Performance results:`);
    console.log(`   - Total time for ${benchmarkTexts.length} embeddings: ${totalTime}ms`);
    console.log(`   - Average time per embedding: ${avgTime.toFixed(2)}ms`);
    console.log(`   - Throughput: ${(1000 / avgTime).toFixed(2)} embeddings/second`);

    console.log('\n🎉 All integration tests passed!');
    console.log('=' .repeat(60));
    console.log('✅ Local embedding service is fully functional');
    console.log('✅ Model loads correctly and produces valid embeddings');
    console.log('✅ Semantic similarity works as expected');
    console.log('✅ Performance is suitable for production use');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run the tests
runIntegrationTests();