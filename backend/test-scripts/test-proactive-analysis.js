/**
 * Test script for proactive analysis service
 * 
 * This script tests if the proactive service can identify reminder opportunities
 * from user dumps, specifically testing with a car repair call reminder.
 * 
 * Run with: npm run build && node test-scripts/test-proactive-analysis.js
 */

async function testProactiveAnalysis() {
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/src/app.module');
  
  console.log('='.repeat(80));
  console.log('PROACTIVE ANALYSIS TEST');
  console.log('='.repeat(80));
  console.log('');

  let app;
  try {
    // Create NestJS application
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    const { ProactiveService } = require('../dist/src/modules/notifications/proactive.service');
    const { getRepositoryToken } = require('@nestjs/typeorm');
    const { Dump } = require('../dist/src/entities/dump.entity');
    
    const proactiveService = app.get(ProactiveService);
    const dumpRepository = app.get(getRepositoryToken(Dump));

    // Find recent dumps for testing
    // You can replace this with a specific user ID
    const userId = process.env.TEST_USER_ID || '8c957ba9-b0f4-4a80-bdba-3c8e72e2c08a';

    console.log(`Testing proactive analysis for user: ${userId}`);
    console.log('-'.repeat(80));
    console.log('');

    // Get recent dumps to see what we're analyzing
    const recentDumps = await dumpRepository
      .createQueryBuilder('dump')
      .leftJoinAndSelect('dump.category', 'category')
      .where('dump.user_id = :userId', { userId })
      .orderBy('dump.created_at', 'DESC')
      .take(10)
      .getMany();

    console.log(`Found ${recentDumps.length} recent dumps to analyze:`);
    console.log('');

    for (let index = 0; index < recentDumps.length; index++) {
      const dump = recentDumps[index];
      console.log(`[${index + 1}] Dump ${dump.id.substring(0, 8)}...`);
      console.log(`    Category: ${dump.category?.name || 'None'}`);
      console.log(`    Created: ${dump.created_at.toISOString()}`);
      console.log(`    Content: ${dump.raw_content?.substring(0, 100)}...`);
      console.log(`    AI Summary: ${dump.ai_summary?.substring(0, 100)}...`);
      
      // Check for entities
      if (dump.extracted_entities?.entities) {
        const entities = dump.extracted_entities.entities;
        const hasDate = entities.dates && entities.dates.length > 0;
        const hasTime = entities.times && entities.times.length > 0;
        const hasPerson = entities.people && entities.people.length > 0;
        
        console.log(`    Entities: ${hasDate ? '📅 Date' : ''} ${hasTime ? '⏰ Time' : ''} ${hasPerson ? '👤 Person' : ''}`);
        
        if (hasDate) {
          console.log(`      Dates: ${entities.dates.join(', ')}`);
        }
        if (hasTime) {
          console.log(`      Times: ${entities.times.join(', ')}`);
        }
        if (hasPerson) {
          console.log(`      People: ${entities.people.join(', ')}`);
        }
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('RUNNING PROACTIVE ANALYSIS');
    console.log('='.repeat(80));
    console.log('');

    // Run the analysis with different confidence thresholds
    const thresholds = ['low', 'medium', 'high'];
    
    for (const threshold of thresholds) {
      console.log(`\nAnalyzing with confidence threshold: ${threshold.toUpperCase()}`);
      console.log('-'.repeat(80));

      const result = await proactiveService.analyzeUserContent(userId, {
        lookbackDays: 7,
        maxDumps: 20,
        confidenceThreshold: threshold,
      });

      console.log(`\nAnalysis completed in ${result.processingTimeMs}ms`);
      console.log(`Summary: ${result.summary}`);
      console.log('');

      if (result.insights.length > 0) {
        console.log(`Found ${result.insights.length} insights:`);
        console.log('');

        for (let i = 0; i < result.insights.length; i++) {
          const insight = result.insights[i];
          console.log(`[${i + 1}] ${insight.type.toUpperCase()} - ${insight.confidence} confidence`);
          console.log(`    Title: ${insight.title}`);
          console.log(`    Description: ${insight.description}`);
          console.log(`    Suggested Date: ${insight.suggestedDate.toISOString()}`);
          console.log(`    Related Dumps: ${insight.relatedDumpIds.length} dumps`);
          console.log(`    Reasoning: ${insight.reasoning}`);
          console.log('');
        }
      } else {
        console.log('❌ No insights found with this threshold');
        console.log('');
      }
    }

    console.log('='.repeat(80));
    console.log('QUICK CHECK TEST (Pattern-based detection)');
    console.log('='.repeat(80));
    console.log('');

    // Test quick check on the most recent dump
    if (recentDumps.length > 0) {
      const recentDump = recentDumps[0];
      console.log(`Testing quick check on: ${recentDump.raw_content?.substring(0, 100)}...`);
      console.log('');

      const quickInsight = await proactiveService.quickCheckDump(recentDump);
      
      if (quickInsight) {
        console.log('✅ Quick check found an opportunity:');
        console.log(`    Type: ${quickInsight.type}`);
        console.log(`    Title: ${quickInsight.title}`);
        console.log(`    Description: ${quickInsight.description}`);
        console.log(`    Confidence: ${quickInsight.confidence}`);
      } else {
        console.log('❌ Quick check did not find any opportunities');
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('DIAGNOSIS');
    console.log('='.repeat(80));
    console.log('');
    console.log('Expected behavior:');
    console.log('  - Dumps with action items + dates/times should be detected as follow-up opportunities');
    console.log('  - "Call Gilson tomorrow morning" should be a follow-up reminder');
    console.log('  - Date: 2025-12-04, Time: 09:00 should be extracted');
    console.log('');
    console.log('If no insights were found, possible reasons:');
    console.log('  1. AI prompt may need adjustment to better detect action items');
    console.log('  2. Content summary format may not provide enough context');
    console.log('  3. AI may be too conservative in confidence scoring');
    console.log('  4. Date/time in future but not flagged as follow-up opportunity');
    console.log('');

  } catch (error) {
    console.error('Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    if (app) {
      await app.close();
    }
  }
}

// Run the test
testProactiveAnalysis()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
