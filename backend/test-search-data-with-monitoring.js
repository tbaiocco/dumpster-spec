const { DataSource } = require('typeorm');

const testData = [
  {
    content: "Fatura da energia elétrica: R$ 89,50. Prazo para pagamento: 20/11/2025. Casa nova gastou menos.",
    category: "finance"
  },
  {
    content: "Electrisity bill received today $45.30 due December 1st. Usage was normal this month.",
    category: "finance"
  },
  {
    content: "Power bill $67.89 - payment due Nov 25th. Need to pay online soon.",
    category: "finance"
  },
  {
    content: "Factura de electricidad €78,90. Vencimiento 22 noviembre. Consumo bajo este mes.",
    category: "finance"
  },
  {
    content: "Facture électricité EDF 89,45€. Échéance 15 novembre. Consommation normale.",
    category: "finance"
  },
  // Add work-related content
  {
    content: "Meeting with client ABC Corp tomorrow 10am. Prepare presentation slides.",
    category: "work"
  },
  {
    content: "Reunião equipe marketing 14h hoje. Discutir campanha Black Friday.",
    category: "work"
  },
  {
    content: "Conference call with suppliers 3pm. Check inventory levels first.",
    category: "work"
  },
  // Add shopping content
  {
    content: "Comprar leite, pão, ovos. Mercado fecha às 18h hoje.",
    category: "shopping"
  },
  {
    content: "Comprar regalos navidad: hermana (perfume), papá (camisa), mamá (libro).",
    category: "shopping"
  },
  // Add health content
  {
    content: "Consulta médica dr Silva 16h quinta. Levar exames sangue.",
    category: "health"
  },
  {
    content: "Dentist appointment Dr Johnson 2pm Friday. Bring insurance card.",
    category: "health"
  },
  {
    content: "Recordatorio: tomar medicación presión arterial 8h mañana y 20h noche.",
    category: "health"
  }
];

async function createTestDataWithMonitoring() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'dumpster_user',
    password: 'dumpster_pass',
    database: 'dumpster_db',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // Check initial state
    console.log('\n📊 Initial Database State:');
    const initialState = await checkDatabaseState(dataSource);
    console.log(initialState);

    const userId = 'e1fd947b-8d35-45dd-b9aa-a6458457521b';
    let createdCount = 0;

    for (const data of testData) {
      try {
        const response = await fetch('http://localhost:3000/api/dumps', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: data.content,
            userId: userId,
            contentType: 'text',
          }),
        });

        if (response.ok) {
          createdCount++;
          console.log(`✅ Created dump ${createdCount}/${testData.length}: "${data.content.substring(0, 50)}..."`);
          
          // Check database state every 5 dumps
          if (createdCount % 5 === 0) {
            console.log(`\n📊 Database State after ${createdCount} dumps:`);
            const currentState = await checkDatabaseState(dataSource);
            console.log(currentState);
          }
        } else {
          const error = await response.text();
          console.error(`❌ Failed to create dump: ${error}`);
        }
      } catch (error) {
        console.error(`❌ Error creating dump:`, error.message);
      }

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final state check
    console.log('\n📊 Final Database State:');
    const finalState = await checkDatabaseState(dataSource);
    console.log(finalState);

    console.log(`\n🎉 Test data creation completed: ${createdCount}/${testData.length} dumps created`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

async function checkDatabaseState(dataSource) {
  try {
    // Check total dumps
    const totalDumps = await dataSource.query('SELECT COUNT(*) as count FROM dumps');
    
    // Check dumps with vectors
    const vectorDumps = await dataSource.query('SELECT COUNT(*) as count FROM dumps WHERE content_vector IS NOT NULL');
    
    // Check vector index existence
    const vectorIndex = await dataSource.query(`
      SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) as size
      FROM pg_indexes 
      WHERE tablename = 'dumps' 
      AND indexname = 'idx_dumps_content_vector'
    `);

    // Check pgvector extension
    const pgvectorExt = await dataSource.query("SELECT * FROM pg_extension WHERE extname = 'vector'");

    return {
      totalDumps: parseInt(totalDumps[0].count),
      dumpsWithVectors: parseInt(vectorDumps[0].count),
      vectorCoverage: `${((parseInt(vectorDumps[0].count) / Math.max(parseInt(totalDumps[0].count), 1)) * 100).toFixed(1)}%`,
      vectorIndexExists: vectorIndex.length > 0,
      vectorIndexSize: vectorIndex.length > 0 ? vectorIndex[0].size : 'N/A',
      pgvectorEnabled: pgvectorExt.length > 0
    };
  } catch (error) {
    return { error: error.message };
  }
}

createTestDataWithMonitoring();