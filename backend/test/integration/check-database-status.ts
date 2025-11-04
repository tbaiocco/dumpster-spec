import { AppDataSource } from '../../data-source';

async function checkDatabaseStatus() {
  console.log('🔍 Checking database status...\n');

  try {
    // Initialize connection
    console.log('📡 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database successfully');

    // Check pgvector extension
    console.log('\n🧮 Checking pgvector extension...');
    const extensionResult = await AppDataSource.query(`
      SELECT installed_version 
      FROM pg_available_extensions 
      WHERE name = 'vector'
    `);
    console.log('pgvector status:', extensionResult);

    // Check dumps table structure
    console.log('\n📋 Checking dumps table structure...');
    const tableInfo = await AppDataSource.query(`
      SELECT column_name, data_type, character_maximum_length, column_default
      FROM information_schema.columns 
      WHERE table_name = 'dumps' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log('Dumps table columns:', tableInfo);

    // Check vector column specifically
    console.log('\n🎯 Checking vector column details...');
    const vectorInfo = await AppDataSource.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'dumps' 
      AND column_name = 'content_vector'
      AND table_schema = 'public'
    `);
    console.log('Vector column info:', vectorInfo);

    // Check vector index
    console.log('\n📊 Checking vector indexes...');
    const indexInfo = await AppDataSource.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'dumps' 
      AND indexname LIKE '%vector%'
    `);
    console.log('Vector indexes:', indexInfo);

    // Check sample data count
    console.log('\n📈 Checking data counts...');
    const counts = await AppDataSource.query(`
      SELECT 
        COUNT(*) as total_dumps,
        COUNT(content_vector) as dumps_with_vectors
      FROM dumps
    `);
    console.log('Data counts:', counts);

    console.log('\n🎉 Database status check completed!');

  } catch (error) {
    console.error('\n❌ Database status check failed!');
    console.error('Error:', (error as Error).message);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

void checkDatabaseStatus();