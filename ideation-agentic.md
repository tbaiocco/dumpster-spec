# 🧠 Ideation & Brainstorming: Evolução para Agentic AI
**Projeto:** App "Saco Sem Fundo" (Gestão de Conhecimento Pessoal/Familiar)  
**Objetivo:** Transformar um repositório passivo de dados em um Sistema de Assistência Ativa.

---

## 1. O Conceito Central
A transição de **Automação** para **Agência**.

* **Estado Atual (O "Saco Sem Fundo"):**
    * *Modelo:* Input -> Processamento (Classificação/IA) -> Armazenamento -> Busca.
    * *Valor:* Centralização e Organização. "Eu lembro para você."
* **Estado Futuro (O "Mordomo Executivo"):**
    * *Modelo:* Percepção -> Raciocínio -> Ação Autônoma -> Feedback.
    * *Valor:* Resolução e Antecipação. "Eu resolvo e planejo para você."

---

## 2. Personas de Agentes (Feature Ideas)
Como a IA pode atuar em diferentes contextos dentro do app.

### 🤖 1. O Agente "Concierge" (Execução)
Focado em reduzir a fricção de tarefas burocráticas e financeiras. A ideia é ir além do lembrete e facilitar a ação final.

* **O Gatilho:** Upload de boleto, foto de fatura ou nota fiscal.
* **A Lógica:** Extração de dados (OCR/LLM) + Verificação de Data + Formatação para Pagamento.
* **Cenário de Uso:**
    > Usuário envia PDF da conta de luz. O Agente lê, identifica o vencimento e, no dia correto, envia via WhatsApp: *"Bom dia! Aqui está o código de barras da luz para você copiar e pagar. Posso marcar como 'pago' no sistema?"*

### ⚖️ 2. O Agente "Mediador" (Resolução de Conflitos)
Atua como guardião do tempo, cruzando intenções com a realidade da agenda.

* **O Gatilho:** Nova entrada de evento/compromisso via áudio ou texto.
* **A Lógica:** Verificação cruzada com Calendários (Google/Outlook) + Detecção de sobreposição ou "tempo de deslocamento" insuficiente.
* **Cenário de Uso:**
    > Usuário manda áudio: "Dentista terça às 14h". O Agente checa a agenda e responde: *"Salvei o dentista. Mas atenção: você tem uma call importante às 13:30. Se atrasar, vai encavalar. Quer que eu sugira outro horário?"*

### 📚 3. O Agente "Preparador" (Enriquecimento Contextual)
Garante que o usuário nunca chegue despreparado a um evento.

* **O Gatilho:** Tempo (ex: 30 min antes de um evento).
* **A Lógica:** Recuperação de Entidades (RAG - Retrieval Augmented Generation) baseada no título/participantes do evento.
* **Cenário de Uso:**
    > Antes de uma reunião com "Cliente X", o agente busca no histórico do app e envia um *Flash Digest*: *"Reunião com Cliente X em breve. Lembre-se: mês passado você anotou que precisava cobrar a proposta Y deles."*

### 🏠 4. O Agente "Gerente Doméstico" (Coordenação de Grupo)
Para contas de casal ou família, atua na logística compartilhada.

* **O Gatilho:** Detecção de eventos simultâneos ou conflitantes entre membros do grupo.
* **A Lógica:** Cruzamento de agendas de múltiplos usuários + Identificação de gargalos logísticos.
* **Cenário de Uso:**
    > *"Notei que o Pedro tem natação e a Ana tem médico na mesma manhã. Vocês já definiram quem leva o Pedro ou precisam chamar um Uber?"*

### 🩺 5. O Agente de "Insights de Vida" (Reconhecimento de Padrões)
Transforma dados soltos em sabedoria e bem-estar.

* **O Gatilho:** Análise periódica (semanal/mensal) do banco de dados vetorial.
* **A Lógica:** Identificação de repetições semânticas e análise de sentimento ao longo do tempo.
* **Cenário de Uso:**
    > *"Oi! Fiz uma análise dos seus 'dumps' do mês. Você mencionou 'dor de cabeça' 6 vezes e 'estresse' 4 vezes. Talvez seja um padrão. Quer que eu resgate aquela indicação de neurologista que você salvou ano passado?"*

---

## 3. Modos de Acionamento (Arquitetura)

Para que os agentes funcionem, eles precisam de "Gatilhos":

1.  **Event-Driven (Baseado em Eventos):**
    * *Imediato.* Ocorre assim que o usuário envia uma mensagem ou o sistema detecta uma mudança (ex: Agente Concierge e Mediador).
2.  **Time-Based (Agendado):**
    * *Rotina.* Ocorre em horários fixos (ex: Digest matinal, Agente Preparador checando a agenda do dia).
3.  **Polling (Sondagem):**
    * *Monitoramento.* O agente verifica APIs externas periodicamente (ex: Rastrear preço de passagem ou status de encomenda).

---

## 4. Roadmap de Implementação Sugerido

### Fase 1: Integração Passiva (Fundação)
* **Objetivo:** Dar "olhos" ao sistema fora do chat.
* **Features:**
    * Integração bidirecional com Google Calendar/Outlook (Ler e Gravar).
    * Parser de E-mails (Forward para o app).

### Fase 2: Proatividade (A Mudança de Paradigma)
* **Objetivo:** O Bot inicia a conversa.
* **Features:**
    * Configurar *Cron Jobs* para gatilhos de tempo.
    * Implementar lógica de detecção de conflitos na ingestão de dados.
    * Envio de mensagens ativas no WhatsApp/Telegram (Notificações inteligentes, não apenas spam).

### Fase 3: Tool Use & Agentes Autônomos (Avançado)
* **Objetivo:** O Agente executa ações no mundo real.
* **Tech Stack:** LangChain ou Semantic Kernel.
* **Features:**
    * Pesquisa na Web (Search Tool) para enriquecer notas.
    * Integrações via API (Trello, Notion, Apps Financeiros).

---

## 5. Ideia Bônus: "The Killer Feature"

### 🎯 Modo Foco Inteligente
Um filtro dinâmico no Dashboard Web.
* **Problema:** O "Saco sem fundo" pode ficar caótico com mistura de vida pessoal, trabalho e ideias.
* **Solução:** Um botão que reconfigura a UI.
    * *Modo Trabalho:* Oculta compras, escola das crianças e memes. Mostra apenas deadlines, reuniões e notas de projetos.
    * *Modo Fim de Semana:* Oculta projetos e tarefas, mostra eventos sociais, lista de compras e ideias de lazer.

---

## 6. Próximos Passos
1.  **Validar:** Qual dessas personas resolve a maior dor do seu usuário atual?
2.  **Prototipar:** Tentar criar *um* fluxo simples (ex: O "Mediador" de agenda) usando a integração atual.
3.  **Arquitetura:** Estudar como manter o contexto (memória) do agente para que ele aprenda as preferências do usuário (ex: "O usuário odeia reuniões antes das 09h").
