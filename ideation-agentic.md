# 🧠 Ideation & Brainstorming: Evolução para Agentic AI (Foco em Neurodivergência e Sobrecarga)
**Projeto:** App "Saco Sem Fundo" (Gestão de Conhecimento Pessoal/Familiar)  
**Público-Alvo:** Pessoas desorganizadas, com TDAH, disfunção executiva ou rotinas familiares/profissionais intensas.
**Objetivo:** Evoluir de um repositório passivo para uma **Prótese Executiva** que remove barreiras de ação.

---

## 1. O Conceito Central
A transição de **"Lembrar"** para **"Facilitar o Início"**.

* **Estado Atual (O "Saco Sem Fundo"):**
    * *Função:* Centralização e Organização. "Onde eu pus aquilo?"
    * *Limitação:* O utilizador sabe o que fazer, mas não consegue começar (*Wall of Awful*).
* **Estado Futuro (A "Prótese Executiva"):**
    * *Função:* Resolução, Decomposição e Estímulo. "Como eu começo isso agora?"
    * *Valor:* Redução da Ansiedade e da Carga Mental.

---

## 2. Personas de Agentes (Feature Ideas)

### 👑 O "Game Changer": Agente Concierge (Execução)
*Prioridade Máxima para este público.*
Reduz a fricção de tarefas burocráticas que geram procrastinação por ansiedade.

* **O Problema:** A "Parede do Terrível" para iniciar tarefas chatas (pagar contas, preencher formulários).
* **A Solução:** O Agente faz o trabalho "braçal".
* **Cenário de Uso:**
    > Usuário envia PDF da conta da luz. Em vez de apenas lembrar, o Agente processa e no dia do vencimento diz: *"Aqui está o código de barras pronto a colar. Só tens de abrir o banco."* (Removeu 3 passos do processo).

### 🔪 1. O Agente "Fatiador" (Task Decomposer)
Combate a paralisia por complexidade.

* **O Problema:** Tarefas vagas como "Organizar aniversário" ou "Arranjar o carro" são assustadoras e levam à inércia.
* **A Solução:** O Agente quebra projetos em micro-passos acionáveis.
* **Cenário de Uso:**
    > Usuário: *"Preciso tratar do Visto."*
    > Agente: *"Ok, 'Visto' é muito grande. Queres que eu crie um plano passo-a-passo? 1. Achar passaporte hoje; 2. Ver site do consulado amanhã..."*

### ⏳ 2. O Agente de "Cegueira Temporal" (Time Blindness Corrector)
Combate o otimismo irrealista sobre o tempo e atrasos crónicos.

* **O Problema:** Achar que "sair de casa" demora 5 minutos, ignorando o trânsito e o tempo de preparação.
* **A Solução:** Traduzir "Hora do Evento" para "Hora de Agir".
* **Cenário de Uso:**
    > Agente: *"A reunião é às 14h. Com trânsito (30m) e banho/vestir (20m), a tua **hora real de saída é 13:10**. Vou mandar um alerta crítico nessa hora, ok?"*

### 🤝 3. O Agente "Body Doubling" (Parceiro de Foco)
Simula a presença de outra pessoa para manter a responsabilidade.

* **O Problema:** Dificuldade em manter o foco numa tarefa iniciada.
* **A Solução:** O Agente atua como um companheiro passivo.
* **Cenário de Uso:**
    > Agente: *"Disseste que ias focar no relatório agora. Vou ficar em silêncio aqui. Daqui a 20 minutos dou um toque para ver se não te distraíste. Podes começar!"*

### ⚖️ 4. O Agente "Mediador" (Gestão de Conflitos e Energia)
Evita o *burnout* e o *overscheduling*.

* **O Problema:** Aceitar compromissos sem perceber que já se está sobrecarregado.
* **A Solução:** Verificação cruzada de agenda e carga de esforço.
* **Cenário de Uso:**
    > Usuário (Audio): *"Marcar dentista terça às 14h".*
    > Agente: *"Salvei. Atenção: tens uma call pesada às 13:30. Vais ter energia e tempo de deslocação? Queres tentar outro dia?"*

### 🍬 5. O Agente de "Dopamina Imediata" (Gamificação Sutil)
Combate o desânimo com listas longas.

* **O Problema:** Ver 50 tarefas pendentes causa fuga e ansiedade.
* **A Solução:** O "Modo Apenas 3 Coisas". Oculta o resto.
* **Cenário de Uso:**
    > Agente: *"Hoje parece caótico. Vamos ignorar o resto e focar só nestas 3 coisas críticas? Se fizeres isto, ganhaste o dia."* (Celebração variável ao concluir).

### 🔍 6. O Agente "Perdidos e Achados" (Memória de Curto Prazo)
Recupera intenções perdidas por distração.

* **O Problema:** Abrir o app para anotar algo, receber uma notificação e esquecer o que ia fazer.
* **A Solução:** Deteção de inatividade após abertura.
* **Cenário de Uso:**
    > Agente (após 5 min): *"Ei, abriste o chat há pouco e não escreveste nada. Lembras-te do que era ou já fugiu?"*

### 🏠 7. O Agente "Gerente Doméstico" (Coordenação Familiar)
Para casais/famílias sobrecarregadas.

* **A Solução:** Cruzamento de agendas de múltiplos utilizadores.
* **Cenário de Uso:**
    > *"Atenção: O Pedro tem natação e a Ana tem médico à mesma hora amanhã. Quem leva quem?"*

---

## 3. Modos de Acionamento (Arquitetura)

1.  **Event-Driven (Baseado em Eventos):**
    * Gatilho imediato na entrada de dados (ex: Agente Fatiador ao receber tarefa grande).
2.  **Time-Based (Agendado/Calculado):**
    * Alertas de "Hora de Saída" (Cegueira Temporal).
    * Digests matinais focados ("Modo 3 Coisas").
3.  **Polling (Monitorização):**
    * Verificar trânsito para ajustar alertas de saída.
    * Verificar e-mails de confirmação.

---

## 4. Estratégia de Roadmap Atualizada

### Fase 1: Fundação & Empatia (O "Saco Sem Fundo" Inteligente)
* **Foco:** Reduzir a carga mental na entrada.
* **Features:**
    * Integração de Calendário (Ler e Escrever).
    * **Agente Fatiador (V1):** Sugerir sub-tarefas simples via chat.
    * **Agente de Dopamina:** Feedback positivo ao completar tarefas ("Boa! Menos uma!").

### Fase 2: A Prótese Temporal (Gestão de Tempo)
* **Foco:** Combater a cegueira temporal e atrasos.
* **Features:**
    * Cálculo de tempo de deslocamento (integração Maps).
    * Alertas de "Hora de Agir" vs "Hora do Evento".
    * Agente Concierge (Leitura de Boletos/Docs simples).

### Fase 3: Agência Proativa (O Mordomo Completo)
* **Foco:** Execução e Manutenção do Foco.
* **Features:**
    * **Modo Body Doubling:** Sessões de foco interativas.
    * **Modo Foco na UI Web:** Esconder distrações/projetos não urgentes.
    * Agente Mediador gerindo conflitos de agenda familiar.

---

## 5. Próximos Passos Práticos
1.  **Validar o "Cálculo de Saída":** Implementar uma lógica simples que subtraia 30-45min do horário de qualquer evento físico e notifique o usuário nessa "nova hora".
2.  **Testar o "Fatiamento":** Quando a IA detetar verbos vagos ("Planear", "Organizar", "Fazer"), devolver uma pergunta: *"Isso parece grande. Queres ajuda para dividir em passos menores?"*
