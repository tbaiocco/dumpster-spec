import { AppDataSource } from '../../data-source';
import { VectorService } from '../../src/modules/search/vector.service';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import {
  Dump,
  ContentType,
  ProcessingStatus,
} from '../../src/entities/dump.entity';
import { User } from '../../src/entities/user.entity';

/**
 * Supabase Integration Test
 *
 * This script tests real database operations with pgvector:
 * 1. Database connection to Supabase
 * 2. Vector storage and retrieval
 * 3. Semantic similarity search
 * 4. Performance benchmarking
 */

async function testSupabaseIntegration() {
  console.log('🚀 Starting Supabase Integration Test...\n');

  let dataSource: DataSource | undefined;
  let vectorService: VectorService | undefined;
  let dumpRepository: Repository<Dump> | undefined;
  let userRepository: Repository<User> | undefined;
  let testUser: User | undefined;

  try {
    // 1. Test Database Connection
    console.log('📡 Testing database connection...');
    dataSource = AppDataSource;
    await dataSource.initialize();
    console.log('✅ Database connection successful');

    // 2. Initialize Services
    console.log('\n🔧 Initializing services...');
    const configService = new ConfigService();
    vectorService = new VectorService(dataSource, configService);

    // Initialize the VectorService (load the model)
    await vectorService.onModuleInit();

    dumpRepository = dataSource.getRepository(Dump);
    userRepository = dataSource.getRepository(User);

    // 3. Create Test User
    console.log('\n👤 Creating test user...');
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    testUser = userRepository.create({
      phone_number: `+123456${timestamp}`,
      verified_at: new Date(),
      timezone: 'UTC',
    });
    await userRepository.save(testUser);
    console.log(`✅ Test user created: ${testUser.id}`);

    // 4. Test Vector Generation
    console.log('\n🧮 Testing local embedding generation...');
    const testTexts = [
      'electricity bill payment due next month',
      'doctor appointment scheduled for Friday',
      'grocery shopping list for weekend',
      'meeting notes from client call',
      'restaurant reservation confirmation',
    ];

    const embeddings: number[][] = [];
    for (const text of testTexts) {
      const start = Date.now();
      const response = await vectorService.generateEmbedding({ text });
      const duration = Date.now() - start;

      console.log(
        `  - "${text}": ${response.embedding.length}D vector (${duration}ms)`,
      );
      embeddings.push(response.embedding);
    }
    console.log('✅ Embedding generation successful');

    // 5. Test Vector Storage
    console.log('\n💾 Testing vector storage in Supabase...');
    const testDumps: Dump[] = [];

    for (let i = 0; i < testTexts.length; i++) {
      const dump = dumpRepository.create({
        user_id: testUser.id,
        raw_content: testTexts[i],
        content_type: ContentType.TEXT,
        processing_status: ProcessingStatus.COMPLETED,
        content_vector: embeddings[i],
        ai_confidence: 95,
      });

      const savedDump = await dumpRepository.save(dump);
      testDumps.push(savedDump);
      console.log(`  - Stored: "${testTexts[i]}" (ID: ${savedDump.id})`);
    }
    console.log('✅ Vector storage successful');

    // 6. Test Semantic Search
    console.log('\n🔍 Testing semantic similarity search...');

    const searchQueries = [
      'power bill payment',
      'medical appointment',
      'buy food items',
    ];

    for (const query of searchQueries) {
      console.log(`\n🔎 Searching for: "${query}"`);

      const queryResponse = await vectorService.generateEmbedding({
        text: query,
      });
      const queryEmbedding = queryResponse.embedding;

      // Perform cosine similarity search
      const searchStart = Date.now();
      const results = await dataSource.query(
        `
        SELECT 
          id,
          raw_content,
          1 - (content_vector <=> $1::vector) as similarity_score
        FROM dumps 
        WHERE user_id = $2
          AND content_vector IS NOT NULL
        ORDER BY content_vector <=> $1::vector
        LIMIT 3
      `,
        [JSON.stringify(queryEmbedding), testUser.id],
      );
      const searchDuration = Date.now() - searchStart;

      console.log(`  Search completed in ${searchDuration}ms:`);
      for (const [index, result] of results.entries()) {
        console.log(
          `    ${index + 1}. "${result.raw_content}" (${(result.similarity_score * 100).toFixed(2)}% match)`,
        );
      }
    }
    console.log('✅ Semantic search successful');

    // 7. Performance Benchmarking
    console.log('\n⚡ Running performance benchmarks...');

    // Test embedding generation speed
    const embeddingTests = 10;
    const embeddingStart = Date.now();
    for (let i = 0; i < embeddingTests; i++) {
      await vectorService.generateEmbedding({ text: `test embedding ${i}` });
    }
    const embeddingAvg = (Date.now() - embeddingStart) / embeddingTests;
    console.log(
      `  - Average embedding generation: ${embeddingAvg.toFixed(2)}ms`,
    );

    // Test search speed
    const searchTests = 10;
    const searchStart = Date.now();
    const testQueryResponse = await vectorService.generateEmbedding({
      text: 'test query',
    });
    const testQuery = testQueryResponse.embedding;

    for (let i = 0; i < searchTests; i++) {
      await dataSource.query(
        `
        SELECT id, raw_content
        FROM dumps 
        WHERE user_id = $1 AND content_vector IS NOT NULL
        ORDER BY content_vector <=> $2::vector
        LIMIT 5
      `,
        [testUser.id, JSON.stringify(testQuery)],
      );
    }
    const searchAvg = (Date.now() - searchStart) / searchTests;
    console.log(`  - Average search query: ${searchAvg.toFixed(2)}ms`);
    console.log('✅ Performance benchmarking complete');

    // 8. Test Vector Health Status
    console.log('\n🏥 Testing vector service health status...');
    const healthStatus = await vectorService.getHealthStatus();
    console.log('  Health Status:', JSON.stringify(healthStatus, null, 2));

    console.log('\n🎉 Supabase Integration Test PASSED! 🎉');
    console.log('\n📊 Summary:');
    console.log(`  - Database: Connected to Supabase PostgreSQL`);
    console.log(`  - pgvector: Operational with 384D embeddings`);
    console.log(`  - Embedding: ${embeddingAvg.toFixed(2)}ms average`);
    console.log(`  - Search: ${searchAvg.toFixed(2)}ms average`);
    console.log(`  - Test data: ${testDumps.length} dumps created`);
  } catch (error) {
    console.error('\n❌ Supabase Integration Test FAILED!');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    // Cleanup
    if (testUser && dumpRepository && userRepository) {
      console.log('\n🧹 Cleaning up test data...');
      try {
        await dumpRepository.delete({ user_id: testUser.id });
        await userRepository.delete({ id: testUser.id });
        console.log('✅ Test data cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup error:', (cleanupError as Error).message);
      }
    }

    if (dataSource?.isInitialized) {
      await dataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the test
void testSupabaseIntegration();
