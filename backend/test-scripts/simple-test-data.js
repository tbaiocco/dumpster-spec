// Simple API-only test without direct database connection
const testData = [
  "Fatura da energia elétrica: R$ 89,50. Prazo para pagamento: 20/11/2025. Casa nova gastou menos.",
  "Electrisity bill received today $45.30 due December 1st. Usage was normal this month.",
  "Power bill $67.89 - payment due Nov 25th. Need to pay online soon.",
  "Factura de electricidad €78,90. Vencimiento 22 noviembre. Consumo bajo este mes.",
  "Facture électricité EDF 89,45€. Échéance 15 novembre. Consommation normale."
];

async function createTestData() {
  console.log('🚀 Starting test data creation...\n');

  const userId = 'e1fd947b-8d35-45dd-b9aa-a6458457521b';
  let createdCount = 0;

  for (const content of testData) {
    try {
      const response = await fetch('http://localhost:3000/api/dumps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          userId: userId,
          contentType: 'text',
        }),
      });

      if (response.ok) {
        createdCount++;
        console.log(`✅ Created dump ${createdCount}/${testData.length}: "${content.substring(0, 50)}..."`);
      } else {
        const error = await response.text();
        console.error(`❌ Failed to create dump: ${error}`);
      }
    } catch (error) {
      console.error(`❌ Error creating dump:`, error.message);
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n🎉 Test data creation completed: ${createdCount}/${testData.length} dumps created`);

  // Now check vector health
  console.log('\n📊 Checking vector health...');
  try {
    const healthResponse = await fetch('http://localhost:3000/admin/vector-health');
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('Vector Health Status:', JSON.stringify(health.data, null, 2));
    } else {
      console.error('Failed to get vector health:', await healthResponse.text());
    }
  } catch (error) {
    console.error('Error checking vector health:', error.message);
  }
}

createTestData();