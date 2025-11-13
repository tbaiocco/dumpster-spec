import { AppDataSource } from '../../data-source';

async function testVectorDimensions() {
  try {
    await AppDataSource.initialize();
    console.log('🔧 Testing vector dimensions...\n');

    // Test different vector dimensions
    const dimensions = [384, 1536];
    
    for (const dim of dimensions) {
      try {
        const testVector = new Array(dim).fill(0.1);
        await AppDataSource.query('SELECT $1::vector', [JSON.stringify(testVector)]);
        console.log(`✅ ${dim}-dimensional vectors: SUPPORTED`);
      } catch (error) {
        console.log(`❌ ${dim}-dimensional vectors: FAILED - ${(error as Error).message}`);
      }
    }

    // Check current dumps table vector column constraint
    console.log('\n🔍 Checking table structure...');
    const tableStructure = await AppDataSource.query(`
      SELECT 
        column_name,
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'dumps' 
      AND column_name = 'content_vector'
    `);
    console.log('Vector column:', tableStructure);

  } catch (error) {
    console.error('Error:', (error as Error).message);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void testVectorDimensions();