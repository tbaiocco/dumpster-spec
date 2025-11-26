#!/bin/bash

# Script to create test dumps for search functionality testing
# Tests different languages, typos, and similar content variations

API_BASE="http://localhost:3000"
TEST_USER_ID="e1fd947b-8d35-45dd-b9aa-a6458457521b"

echo "🚀 Creating test data for search functionality..."
echo ""

# Function to create a dump
create_dump() {
    local content="$1"
    local description="$2"
    local response=$(curl -s -X POST "$API_BASE/api/dumps" \
        -H "Content-Type: application/json" \
        -d "{
            \"userId\": \"$TEST_USER_ID\",
            \"content\": \"$content\",
            \"contentType\": \"text\",
            \"metadata\": {\"source\": \"api\", \"description\": \"$description\"}
        }")
    
    if echo "$response" | grep -q "\"success\":true"; then
        echo "✅ Created: $(echo "$content" | cut -c1-50)..."
    else
        echo "❌ Failed: $(echo "$content" | cut -c1-50)..."
        echo "   Response: $response"
    fi
}

echo "📝 Creating sample dumps..."
echo ""

# Portuguese electricity bills
create_dump "Conta de luz chegou hoje, R\$ 150,00 vencimento em 15/11. Consumo foi alto este mês." "Portuguese electricity bill"
create_dump "Fatura da energia elétrica: R\$ 89,50. Prazo para pagamento: 20/11/2025. Casa nova gastou menos." "Portuguese energy bill variant"
create_dump "Boleto energia elétrica R\$ 203,00. Vence dia 18. Ar condicionado ligado demais." "Portuguese electricity payment slip"

# English electricity bills (with typos)
create_dump "Electrisity bill received today \$45.30 due December 1st. Usage was normal this month." "English electricity bill with typo"
create_dump "Power bill \$67.89 - payment due Nov 25th. Need to pay online soon." "English power bill"
create_dump "Electric utility bill: \$123.45. Due date: November 30th. Higher usage due to heating." "English utility bill"

# Spanish electricity bills  
create_dump "Factura de electricidad €78,90. Vencimiento 22 noviembre. Consumo bajo este mes." "Spanish electricity bill"
create_dump "Recibo de luz €156,30. Pagar antes del 28 de noviembre. Calefacción cara." "Spanish light bill"

# French electricity bills
create_dump "Facture électricité EDF 89,45€. Échéance 15 novembre. Consommation normale." "French electricity bill"

# Urgent items
create_dump "URGENT: Doctor appointment tomorrow at 2pm. Cannot reschedule!" "Urgent medical appointment"
create_dump "URGENTE: Prazo final projeto entrega amanhã 9h. Ainda falta revisar." "Urgent project deadline Portuguese"
create_dump "Important deadline: Submit tax documents by Friday or face penalty." "Important tax deadline"

# Work/Meeting related
create_dump "Meeting with client ABC Corp tomorrow 10am. Prepare presentation slides." "Business meeting"
create_dump "Reunião equipe marketing 14h hoje. Discutir campanha Black Friday." "Team meeting Portuguese"
create_dump "Conference call with suppliers 3pm. Check inventory levels first." "Supplier conference call"

# Shopping/Tasks
create_dump "Comprar leite, pão, ovos. Mercado fecha às 18h hoje." "Shopping list Portuguese"
create_dump "Buy groceries: milk, bread, eggs, cheese. Store closes at 6pm." "Shopping list English"
create_dump "Comprar regalos navidad: hermana (perfume), papá (camisa), mamá (libro)." "Christmas shopping Spanish"

# Health/Medical
create_dump "Consulta médica dr Silva 16h quinta. Levar exames sangue." "Medical appointment Portuguese"
create_dump "Dentist appointment Dr Johnson 2pm Friday. Bring insurance card." "Dental appointment English"
create_dump "Recordatorio: tomar medicación presión arterial 8h mañana y 20h noche." "Medication reminder Spanish"

echo ""
echo "🎉 Test data creation completed!"
echo ""
echo "🔍 Now you can test search with:"
echo "curl -X POST http://localhost:3000/api/search -H \"Content-Type: application/json\" -d '{\"query\":\"contas de luz\", \"userId\":\"$TEST_USER_ID\"}'"
echo "curl -X POST http://localhost:3000/api/search -H \"Content-Type: application/json\" -d '{\"query\":\"electrisity bill\", \"userId\":\"$TEST_USER_ID\"}'"
echo "curl -X POST http://localhost:3000/api/search -H \"Content-Type: application/json\" -d '{\"query\":\"urgent\", \"userId\":\"$TEST_USER_ID\"}'"
echo "curl -X POST http://localhost:3000/api/search -H \"Content-Type: application/json\" -d '{\"query\":\"meeting tomorrow\", \"userId\":\"$TEST_USER_ID\"}'"