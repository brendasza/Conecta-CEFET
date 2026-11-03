# Conecta CEFET

Plataforma de divulgação e gestão de projetos de extensão, monitoria e iniciação científica
do CEFET/RJ - Campus Nova Iguaçu. React + Vite (front), Node/Express (back), MySQL.

## Como rodar

1. **Banco**: no MySQL, rode o script original do banco e, **depois**, `Backend/migracao.sql`
   (cria `atividade_post`, `atividade_seguidor` e o administrador inicial; pode rodar mais de uma vez).
   > Se o script original der erro de sintaxe logo no início, é porque ele tem espaços "invisíveis"
   > (U+00A0, vindos de copiar/colar). Troque-os por espaços normais.
2. **Back**: `cd Backend && cp .env.example .env` (preencha), `npm install`, `npm run dev` (porta 3000).
3. **Front**: `cd Frontend && npm install && npm run dev` (porta 5173).

**Administrador inicial:** `admin@conecta.cefet` / `Admin@123` — entre e troque a senha por "Esqueci minha senha".
(O administrador não cria outros administradores nem redefine senha de outros usuários.)

> O arquivo `.env` NÃO deve ir para o GitHub (já está no `.gitignore`). Como a senha do banco e o
> `JWT_SECRET` já circularam, troque os dois.

## O que cada perfil faz

**Aluno** — cadastro/login, editar perfil (interesses e habilidades), feed com busca e filtros
(área, tipo, vagas abertas, acompanhando), candidatar-se com carta de apresentação, acompanhar
candidaturas (pendente/aprovado/reprovado + justificativa), cancelar candidatura pendente,
ativar notificações de um projeto, notificações reais (com contador), agenda (calendário + prazos),
histórico de participação e download de certificados em PDF.

**Professor** — criar/editar/encerrar/excluir projetos (vagas, período de inscrição, requisitos, critérios),
publicar no feed com fotos e vídeos, listar candidatos e ver perfil/carta, aprovar ou reprovar com justificativa
(respeitando o limite de vagas), adicionar alunos e coordenadores, emitir certificado (só para aprovados).

**Administrador** — dashboard (usuários, projetos, candidaturas, vagas, certificados), gerenciar usuários
(ativar/desativar), moderar/remover projetos e publicações,
mural de avisos (com fixar) e eventos do calendário acadêmico.

## Regras de negócio no código

RN001/RN002 login + perfis (JWT, e a conta precisa estar ativa) · RN003 só professor cria/edita ·
RN004 vagas e prazo obrigatórios · RN005 candidatura só em projeto ativo e dentro do prazo ·
RN006 candidatura duplicada bloqueada · RN007 limite de vagas na aprovação (com trava de transação) ·
RN008 só o professor coordenador do projeto decide (nem o administrador) · RN010 histórico ·
RN011 notificações (nova candidatura, decisão, publicação, atualização, certificado, prazo próximo) ·
RN012 certificado só para aprovados.

## Fora desta versão (para "Perspectivas futuras")

App mobile (React Native), recuperação de
senha por e-mail logs de atividade (RNF004), testes automatizados.

## Novidades desta versão (requisitos do documento por telas)

> Rode **de novo** o `Backend/migracao.sql` (ele é idempotente): cria `ano_letivo`, `periodo_letivo` e `agenda_pessoal`.

- **Terminologia:** "Projeto" só para Projetos de Extensão; as demais produções aparecem como **Atividade Acadêmica**.
  "Funcionário" deixou de aparecer: use sempre **Professor**.
- **Busca universal** (barra do topo, todas as telas e todos os perfis): atividades acadêmicas, professores e outros usuários
  (`GET /api/busca?q=`). No feed, o texto continua filtrando as publicações.
- **Perfil público:** qualquer usuário logado vê o perfil de qualquer pessoa (inclusive administradores), com nome, foto/iniciais,
  e-mail de contato, bio e curso. **Matrícula, SIAPE, CPF e senha nunca são enviados.**
- **Painel ADM:** alterar **nível de acesso** (`nivel_acesso` 1–3) do usuário; aba **Ano letivo** (início/fim das aulas,
  semestres e recessos); "Destaque da Semana" no feed lê `feed_noticias` (notícia fixada, senão a mais recente da semana).
- **Calendário:** o verde fixo foi removido; os pontos agora têm cor por tipo (evento do ADM, início/fim das aulas, semestre, recesso,
  prazo de atividade e lembrete pessoal).
- **Aluno:** agenda pessoal (lembretes próprios por dia, `GET/POST/PUT/DELETE /api/me/agenda`), sem alterar o calendário oficial.
- **Logs (RNF004):** além dos logs já existentes do painel, um middleware de auditoria registra automaticamente as ações que alteram
  dados (login, falhas de login, cadastro, candidaturas, atividades etc.).

## Atualização: inscrições opcionais, linha do tempo editável e agenda do professor

> Rode o `Backend/atualizacao_bd.sql` (depois do script do banco): cria `atividade_historico` e `evento_autor`. Se o seu banco já veio do script completo, **não** rode o `migracao.sql`.

- **Inscrições opcionais:** criar uma atividade acadêmica não exige mais vagas, período de inscrição, requisitos ou critérios.
  Essa parte agora tem lugar próprio no perfil da atividade (card **Inscrições**, só para coordenadores): `PUT /api/projetos/:id/inscricoes`.
  Sem vagas = sem inscrição. Também é possível fechar as inscrições. (Corrigido: os *critérios de seleção* não eram gravados.)
- **Linha do tempo editável:** deixou de registrar automaticamente cada alteração. O coordenador adiciona, edita e remove itens
  com **ano** + **o que aconteceu** (`POST/PUT/DELETE /api/projetos/:id/historico`). A tabela antiga `atividade_timeline` foi mantida, mas não é mais alimentada.
- **Agenda do professor:** passa a ter os **lembretes pessoais** (como o aluno) e pode cadastrar **eventos institucionais**
  (`POST/PUT/DELETE /api/me/eventos`), que aparecem no calendário de todos. Cada professor só remove os eventos que criou.

## Atualização: administrador com funções de professor

> Rode o banco de novo com `conecta_cefet_completo.sql` (ou, num banco já existente, o `Backend/atualizacao_bd.sql`).
> Ele troca 2 chaves estrangeiras (`atividade_academica.id_professor` e `atividade_coordenador.id_usuario`) para apontar para `usuario`
> em vez de `professor`; sem isso o administrador não consegue criar atividades.

- **Administrador = professor + painel:** cria e edita atividades acadêmicas, abre inscrições, edita a linha do tempo, publica, decide candidaturas,
  emite certificados, tem lembretes e cadastra eventos na agenda. Continua com o painel e os dashboards gerais.
- **Desativar / ativar:** no painel (e na página da atividade) o administrador **desativa** a atividade em vez de remover, e pode **ativar** de novo
  (`DELETE /api/projetos/:id` desativa; `POST /api/projetos/:id/ativar` reativa). Desativada = status `cancelado` (some para os usuários).
- **Painel:** a coluna "Nível de acesso" saiu da tela de usuários (as rotas de nível continuam no servidor).
