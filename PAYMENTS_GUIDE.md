# Guia de Implementação de Pagamentos (SaaS B2C)
**Projeto:** Clutter.AI
**Contexto:** Cobrança recorrente (Assinatura/Subscrição)

Este guia cobre a arquitetura, modelagem de dados e fluxo de integração para monetizar o Clutter.AI de forma segura e escalável.

---

## 1. Escolha do Provedor (Payment Provider)

Para startups modernas, evite implementar gateways bancários diretos. Use um provedor que gerencie a complexidade de segurança (PCI Compliance) e assinaturas.

### Opção A: Stripe (Recomendado pela Flexibilidade)
* **Modelo:** Payment Gateway & Subscription Management.
* **Custo:** ~2.9% + $0.30 por transação.
* **Prós:** Documentação padrão ouro, controle total da UX, taxas menores.
* **Contras:** Você é o responsável legal por coletar e remeter impostos (VAT/IVA) em cada país onde vender (ferramentas como Stripe Tax ajudam).

### Opção B: Lemon Squeezy (Recomendado pela Simplicidade)
* **Modelo:** Merchant of Record (MoR).
* **Custo:** ~5% + $0.50 por transação.
* **Prós:** Eles agem como "revendedor". Eles cobram, calculam e pagam os impostos globais. Você recebe um único pagamento ("payout") limpo no final do mês.
* **Contras:** Taxa mais alta por transação.

---

## 2. Arquitetura de Banco de Dados

**Regra de Ouro:** Nunca armazene números de cartão de crédito. Armazene o **estado da relação** entre o usuário e o provedor de pagamento.

### Alterações na Tabela `users` (ou nova tabela `subscriptions`)

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `stripe_customer_id` | `String` | O ID do cliente no provedor (ex: `cus_Kj9...`). Chave para futuras cobranças. |
| `subscription_id` | `String` | O ID da assinatura ativa (ex: `sub_1Mk...`). Útil para cancelamentos/updates. |
| `plan_status` | `Enum/String` | O estado atual. Valores: `active`, `past_due` (devendo), `canceled`, `trialing`. |
| `current_period_end` | `DateTime` | **CRÍTICO.** A data de validade do acesso. Se `Data Atual < current_period_end`, o usuário é Premium. |
| `plan_tier` | `String` | O identificador do plano (ex: `pro_monthly`, `hobby_yearly`). |

---

## 3. O Fluxo de Integração (Lifecycle)

A integração moderna não acontece inteira no seu site. Ela usa páginas hospedadas (Hosted Checkout) e comunicação assíncrona (Webhooks).

### Passo 1: O Checkout (Início)
1.  Usuário clica em "Assinar Pro" no seu site.
2.  Seu Frontend chama seu Backend: `POST /api/checkout { priceId: 'price_123' }`.
3.  Seu Backend chama a API do Stripe/Lemon Squeezy e cria uma **Checkout Session**.
4.  A API retorna uma URL (ex: `checkout.stripe.com/c/pay/...`).
5.  Seu Frontend redireciona o usuário para essa URL.

### Passo 2: A Confirmação (Webhook de Ativação)
*O usuário digita o cartão e paga no ambiente seguro do provedor.*

1.  O pagamento é confirmado lá.
2.  O Provedor envia um **Webhook (POST)** para o seu servidor: `https://api.clutter.ai/webhooks/stripe`.
3.  **Evento:** `checkout.session.completed`.
4.  **Sua Ação:**
    * Receber o JSON.
    * Verificar a assinatura criptográfica (para garantir que veio do Stripe mesmo).
    * Ler o `customer_email` ou `metadata.userId`.
    * Atualizar o banco: `UPDATE users SET plan_status = 'active', stripe_customer_id = '...'`.

### Passo 3: A Renovação Automática (Mês seguinte)
*Você não precisa fazer nada. O Stripe tenta cobrar sozinho.*

1.  **Sucesso:** O Stripe envia webhook `invoice.payment_succeeded`.
    * **Ação:** Atualizar `current_period_end` para +1 mês.
2.  **Falha (Cartão sem saldo):** O Stripe envia webhook `invoice.payment_failed`.
    * **Ação:** Mudar status para `past_due`.
    * *No App:* Bloquear novas ações até o pagamento ser regularizado.

### Passo 4: Gestão e Cancelamento (Customer Portal)
Não crie telas de "Editar Cartão" ou "Cancelar".
1.  O Stripe fornece um **Billing Portal** pronto.
2.  Crie um endpoint `POST /api/portal`.
3.  Quando chamado, gere um link para esse portal e redirecione o usuário. Lá ele baixa faturas e cancela o plano.

---

## 4. Checklist para Desenvolvedores

Para operacionalizar isso, você precisará implementar no Backend:

1.  [ ] **Conta no Stripe/Lemon Squeezy:** Criar conta e pegar as chaves de API (`Publishable Key` e `Secret Key`).
2.  [ ] **Produtos:** Cadastrar seus planos (Ex: "Monthly Plan - $9.00") no dashboard do provedor e copiar os `price_ids`.
3.  [ ] **Rota `POST /checkout`:** Cria a sessão e devolve a URL de redirecionamento.
4.  [ ] **Rota `POST /portal`:** Cria a sessão do portal de cliente e devolve a URL.
5.  [ ] **Rota `POST /webhook`:** O endpoint público que recebe os eventos. **(O mais importante)**.
6.  [ ] **CLI para Testes:** Instalar a CLI do Stripe para testar webhooks localmente (`localhost`) sem precisar fazer deploy.

---

### Dica de Segurança
Nunca confie no Frontend para dizer que o pagamento foi feito. Sempre aguarde o **Webhook** no Backend para liberar o acesso Premium.