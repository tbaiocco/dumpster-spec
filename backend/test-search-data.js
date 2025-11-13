#!/usr/bin/env node
/**
 * Script to create test dumps for search functionality testing
 * Tests different languages, typos, and similar content variations
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000';

// Test user ID (you'll need to replace this with an actual user ID)
const TEST_USER_ID = 'e1fd947b-8d35-45dd-b9aa-a6458457521b';

const sampleDumps = [
  // Portuguese electricity bills
  {
    userId: TEST_USER_ID,
    content: 'Conta de luz chegou hoje, R$ 150,00 vencimento em 15/11. Consumo foi alto este mês.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Portuguese electricity bill' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Fatura da energia elétrica: R$ 89,50. Prazo para pagamento: 20/11/2025. Casa nova gastou menos.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Portuguese energy bill variant' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Boleto energia elétrica R$ 203,00. Vence dia 18. Ar condicionado ligado demais.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Portuguese electricity payment slip' }
  },

  // English electricity bills (with typos)
  {
    userId: TEST_USER_ID,
    content: 'Electrisity bill received today $45.30 due December 1st. Usage was normal this month.',
    contentType: 'text',
    metadata: { source: 'api', description: 'English electricity bill with typo' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Power bill $67.89 - payment due Nov 25th. Need to pay online soon.',
    contentType: 'text',
    metadata: { source: 'api', description: 'English power bill' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Electric utility bill: $123.45. Due date: November 30th. Higher usage due to heating.',
    contentType: 'text',
    metadata: { source: 'api', description: 'English utility bill' }
  },

  // Spanish electricity bills
  {
    userId: TEST_USER_ID,
    content: 'Factura de electricidad €78,90. Vencimiento 22 noviembre. Consumo bajo este mes.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Spanish electricity bill' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Recibo de luz €156,30. Pagar antes del 28 de noviembre. Calefacción cara.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Spanish light bill' }
  },

  // French electricity bills
  {
    userId: TEST_USER_ID,
    content: 'Facture électricité EDF 89,45€. Échéance 15 novembre. Consommation normale.',
    contentType: 'text',
    metadata: { source: 'api', description: 'French electricity bill' }
  },

  // Urgent items
  {
    userId: TEST_USER_ID,
    content: 'URGENT: Doctor appointment tomorrow at 2pm. Cannot reschedule!',
    contentType: 'text',
    metadata: { source: 'api', description: 'Urgent medical appointment' }
  },
  {
    userId: TEST_USER_ID,
    content: 'URGENTE: Prazo final projeto entrega amanhã 9h. Ainda falta revisar.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Urgent project deadline Portuguese' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Important deadline: Submit tax documents by Friday or face penalty.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Important tax deadline' }
  },

  // Work/Meeting related
  {
    userId: TEST_USER_ID,
    content: 'Meeting with client ABC Corp tomorrow 10am. Prepare presentation slides.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Business meeting' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Reunião equipe marketing 14h hoje. Discutir campanha Black Friday.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Team meeting Portuguese' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Conference call with suppliers 3pm. Check inventory levels first.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Supplier conference call' }
  },

  // Shopping/Tasks
  {
    userId: TEST_USER_ID,
    content: 'Comprar leite, pão, ovos. Mercado fecha às 18h hoje.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Shopping list Portuguese' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Buy groceries: milk, bread, eggs, cheese. Store closes at 6pm.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Shopping list English' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Comprar regalos navidad: hermana (perfume), papá (camisa), mamá (libro).',
    contentType: 'text',
    metadata: { source: 'api', description: 'Christmas shopping Spanish' }
  },

  // Health/Medical
  {
    userId: TEST_USER_ID,
    content: 'Consulta médica dr Silva 16h quinta. Levar exames sangue.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Medical appointment Portuguese' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Dentist appointment Dr Johnson 2pm Friday. Bring insurance card.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Dental appointment English' }
  },
  {
    userId: TEST_USER_ID,
    content: 'Recordatorio: tomar medicación presión arterial 8h mañana y 20h noche.',
    contentType: 'text',
    metadata: { source: 'api', description: 'Medication reminder Spanish' }
  }
];

async function createUser() {
  try {
    const userData = {
      phoneNumber: '+1234567890',
      timezone: 'UTC',
      language: 'en'
    };
    
    const response = await axios.post(`${API_BASE}/users`, userData);
    console.log('✅ User created:', response.data);
    return response.data.data.id;
  } catch (error) {
    if (error.response?.status === 409 || error.response?.status === 400) {
      console.log('ℹ️ User already exists, using existing user');
      return TEST_USER_ID; // Continue with test user ID
    }
    console.error('❌ Failed to create user:', error.response?.data || error.message);
    return null;
  }
}

async function createDump(dumpData, index) {
  try {
    const response = await axios.post(`${API_BASE}/api/dumps`, dumpData);
    console.log(`✅ Dump ${index + 1}/${sampleDumps.length} created:`, dumpData.content.substring(0, 50) + '...');
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to create dump ${index + 1}:`, error.response?.data || error.message);
    console.error('   Content:', dumpData.content.substring(0, 50) + '...');
    return null;
  }
}

async function main() {
  console.log('🚀 Creating test data for search functionality...\n');

  // Create user first
  const userId = await createUser();
  if (!userId) {
    console.error('Failed to create or get user, aborting...');
    return;
  }

  console.log(`\n📝 Creating ${sampleDumps.length} sample dumps...\n`);

  // Update all dumps with the actual user ID
  const dumpsToCreate = sampleDumps.map(dump => ({
    ...dump,
    userId: userId
  }));

  // Create dumps with delay to avoid overwhelming the server
  for (let i = 0; i < dumpsToCreate.length; i++) {
    await createDump(dumpsToCreate[i], i);
    
    // Small delay between requests
    if (i < dumpsToCreate.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log('\n🎉 Test data creation completed!');
  console.log('\n🔍 Now you can test search with:');
  console.log('curl -X POST http://localhost:3000/api/search -H "Content-Type: application/json" -d \'{"query":"contas de luz", "userId":"' + userId + '"}\'');
  console.log('curl -X POST http://localhost:3000/api/search -H "Content-Type: application/json" -d \'{"query":"electrisity bill", "userId":"' + userId + '"}\'');
  console.log('curl -X POST http://localhost:3000/api/search -H "Content-Type: application/json" -d \'{"query":"urgent", "userId":"' + userId + '"}\'');
  console.log('curl -X POST http://localhost:3000/api/search -H "Content-Type: application/json" -d \'{"query":"meeting tomorrow", "userId":"' + userId + '"}\'');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sampleDumps, createUser, createDump };

// search example:
// curl -X POST http://localhost:3000/api/search -H "Content-Type: application/json" -d '{"query":"contas de luz", "userId":"e1fd947b-8d35-45dd-b9aa-a6458457521b"}'