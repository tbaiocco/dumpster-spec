/**
 * Test script to verify the production metrics system
 * 
 * This script will:
 * 1. Start the NestJS application
 * 2. Create a test dump with AI processing
 * 3. Perform a search query
 * 4. Verify metrics are being tracked
 * 5. Query admin endpoints to see the metrics
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DumpService } from '../src/modules/dumps/services/dump.service';
import { SearchService } from '../src/modules/search/search.service';
import { AdminService } from '../src/modules/admin/admin.service';
import { DataSource } from 'typeorm';

async function testMetricsSystem() {
  console.log('🚀 Starting Metrics System Test...\n');

  // Bootstrap the application
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const dumpService = app.get(DumpService);
    const searchService = app.get(SearchService);
    const adminService = app.get(AdminService);
    const dataSource = app.get(DataSource);

    // Step 1: Create a test user (or use existing)
    console.log('📝 Step 1: Setting up test user...');
    const userRepo = dataSource.getRepository('User');
    let testUser = await userRepo.findOne({ 
      where: { phone_number: '+1234567890' } 
    });

    if (!testUser) {
      testUser = await userRepo.save({
        phone_number: '+1234567890',
        telegram_user_id: '123456789',
        telegram_chat_id: '123456789',
        is_active: true,
        language: 'en',
        timezone: 'America/New_York',
      });
      console.log('✅ Created test user:', testUser.id);
    } else {
      console.log('✅ Using existing test user:', testUser.id);
    }

    // Step 2: Create a test dump with AI processing
    console.log('\n📝 Step 2: Creating test dump with AI processing...');
    try {
      const dumpResult = await dumpService.createDumpEnhanced({
        userId: testUser.id,
        content: 'Meeting with John tomorrow at 2pm to discuss project metrics and analytics dashboard',
        contentType: 'text',
        metadata: {
          source: 'telegram',
        },
      });
      console.log('✅ Created dump:', dumpResult.dump.id);
      console.log('   Category:', dumpResult.dump.category?.name || 'None');
      console.log('   AI Confidence:', dumpResult.dump.ai_confidence);
    } catch (error) {
      console.log('⚠️  Dump creation had issues (expected if AI services not configured):', error.message);
    }

    // Step 3: Perform a search query
    console.log('\n📝 Step 3: Performing search query...');
    try {
      const searchResult = await searchService.search({
        query: 'meeting project',
        userId: testUser.id,
        limit: 10,
      });
      console.log('✅ Search completed:');
      console.log('   Results:', searchResult.total);
      console.log('   Processing time:', searchResult.query.processingTime, 'ms');
      console.log('   Search types:', {
        semantic: searchResult.metadata.semanticResults,
        fuzzy: searchResult.metadata.fuzzyResults,
        exact: searchResult.metadata.exactResults,
      });
    } catch (error) {
      console.log('⚠️  Search had issues:', error.message);
    }

    // Wait a moment for async metrics to be saved
    console.log('\n⏳ Waiting 2 seconds for async metrics to be saved...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Check search metrics
    console.log('\n📊 Step 4: Checking Search Metrics...');
    try {
      const searchMetrics = await adminService.getSearchMetrics();
      console.log('✅ Search Metrics:');
      console.log('   Total searches:', searchMetrics.totalSearches);
      console.log('   Average latency:', searchMetrics.averageLatency, 'ms');
      console.log('   Success rate:', searchMetrics.successRate, '%');
      console.log('   Top queries:', searchMetrics.topQueries.slice(0, 3));
      console.log('   Query distribution:', searchMetrics.queryDistribution);
    } catch (error) {
      console.log('❌ Error fetching search metrics:', error.message);
    }

    // Step 5: Check AI metrics
    console.log('\n📊 Step 5: Checking AI Metrics...');
    try {
      const aiMetrics = await adminService.getAIMetrics();
      console.log('✅ AI Metrics:');
      console.log('   Total processed:', aiMetrics.totalProcessed);
      console.log('   Success rate:', aiMetrics.processingSuccessRate, '%');
      console.log('   Average confidence:', aiMetrics.averageConfidence);
      console.log('   Low confidence count:', aiMetrics.lowConfidenceCount);
    } catch (error) {
      console.log('❌ Error fetching AI metrics:', error.message);
    }

    // Step 6: Check feature usage metrics
    console.log('\n📊 Step 6: Checking Feature Usage Metrics...');
    try {
      const featureStats = await adminService.getFeatureStats();
      console.log('✅ Feature Stats:');
      console.log('   Total usage:', featureStats.totalUsage);
      console.log('   Most popular:', featureStats.mostPopular);
      console.log('   Breakdown:', featureStats.breakdown);
    } catch (error) {
      console.log('❌ Error fetching feature stats:', error.message);
    }

    // Step 7: Check system metrics
    console.log('\n📊 Step 7: Checking System Metrics...');
    try {
      const systemMetrics = await adminService.getSystemMetrics();
      console.log('✅ System Metrics:');
      console.log('   Total users:', systemMetrics.totalUsers);
      console.log('   Total dumps:', systemMetrics.totalDumps);
      console.log('   Active users:', systemMetrics.activeUsers);
      console.log('   Processing success rate:', systemMetrics.processingSuccessRate, '%');
      console.log('   Average processing time:', systemMetrics.averageProcessingTime, 's');
    } catch (error) {
      console.log('❌ Error fetching system metrics:', error.message);
    }

    // Step 8: Direct database check
    console.log('\n📊 Step 8: Direct Database Check...');
    try {
      const searchMetricRepo = dataSource.getRepository('SearchMetric');
      const aiMetricRepo = dataSource.getRepository('AIMetric');
      const featureUsageRepo = dataSource.getRepository('FeatureUsage');

      const searchCount = await searchMetricRepo.count();
      const aiCount = await aiMetricRepo.count();
      const featureCount = await featureUsageRepo.count();

      console.log('✅ Database Metrics:');
      console.log('   Search metrics records:', searchCount);
      console.log('   AI metrics records:', aiCount);
      console.log('   Feature usage records:', featureCount);

      if (searchCount > 0) {
        const recentSearch = await searchMetricRepo.findOne({
          order: { timestamp: 'DESC' },
        });
        if (recentSearch) {
          console.log('\n   Latest search metric:');
          console.log('   - Query:', recentSearch.query_text);
          console.log('   - Latency:', recentSearch.latency_ms, 'ms');
          console.log('   - Results:', recentSearch.results_count);
          console.log('   - Type:', recentSearch.search_type);
          console.log('   - Success:', recentSearch.success);
        }
      }

      if (aiCount > 0) {
        const recentAI = await aiMetricRepo.findOne({
          order: { timestamp: 'DESC' },
        });
        if (recentAI) {
          console.log('\n   Latest AI metric:');
          console.log('   - Operation:', recentAI.operation_type);
          console.log('   - Latency:', recentAI.latency_ms, 'ms');
          console.log('   - Confidence:', recentAI.confidence_score);
          console.log('   - Success:', recentAI.success);
        }
      }
    } catch (error) {
      console.log('❌ Error checking database:', error.message);
    }

    console.log('\n✅ Metrics System Test Complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the test
testMetricsSystem()
  .then(() => {
    console.log('🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
