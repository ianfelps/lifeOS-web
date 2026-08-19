# LifeOS Web

Frontend do LifeOS, uma aplicação pessoal para organizar finanças, hábitos, treinos, metas e gamificação. O projeto usa Next.js como interface e BFF para proteger a sessão, concentrando os fluxos diários em uma experiência responsiva, instalável e orientada a baixo atrito.

O sistema atende a um único proprietário provisionado pelo ambiente. Cadastro público, colaboração e multi-tenancy não fazem parte do escopo atual.

## Módulos

| Módulo | Estado | Responsabilidade principal |
| --- | --- | --- |
| Autenticação | Disponível | Login, encerramento de sessão e recuperação transparente de tokens. |
| Painel | Disponível | Resumo financeiro, hábitos pendentes, treinos recentes e gamificação. |
| Hábitos | Disponível | Criação, edição, pausa, retomada, arquivamento, conclusões e correções de histórico. |
| Finanças | Em breve | Lançamentos, categorias, orçamentos, recorrências e relatórios. |
| Treinos | Em breve | Exercícios, fichas, sessões e progressão. |
| Metas | Em breve | Metas pessoais e automáticas, XP, badges e progressão. |
| Perfil | Em breve | Preferências, senha e gerenciamento de sessões. |

## Arquitetura

```text
Browser -> Next.js App Router + Client Components -> BFF /api/** -> ServiceLifeOS API
```

```text
src/app/                 Rotas, layouts, metadados, BFF e service worker
src/app/(app)/           Área autenticada: painel, hábitos e futuras áreas do produto
src/components/          Componentes compartilhados, como a navegação autenticada
src/lib/api/             Contratos TypeScript e clientes HTTP por domínio
src/lib/server/          Comunicação server-to-server e gestão de cookies de sessão
public/                  Manifesto, ícone e artefatos públicos da PWA
```

### Direção do fluxo

1. A interface chama um cliente em `src/lib/api`.
2. O cliente requisita apenas rotas internas em `/api/**`.
3. O BFF lê tokens em cookies `HttpOnly` e encaminha a requisição à API.
4. Se o access token expirar, o BFF tenta renovar a sessão uma vez com o refresh token.
5. Em falhas de autenticação, os cookies são removidos e a área autenticada direciona ao login.
6. A API continua sendo a fonte de verdade das regras de negócio e dos cálculos derivados.

Essa separação evita expor tokens ao JavaScript do navegador, elimina dependência de CORS no cliente e preserva o frontend como consumidor de contratos HTTP bem definidos.

## Decisões Técnicas

- **Next.js 16 e React 19:** App Router, rotas de servidor e componentes de cliente.
- **BFF interno:** access e refresh tokens ficam em cookies `HttpOnly`; o navegador não
  acessa tokens diretamente.
- **Contratos TypeScript:** `src/lib/api/contracts.ts` representa as respostas da API e
  reduz divergências entre telas e backend.
- **Pixelarticons e CSS próprio:** ícones em grade e uma linguagem visual inspirada em
  interfaces portáteis, sem usar artes ou marcas de terceiros.
- **PWA com Serwist:** precache de arquivos estáticos e estratégia `NetworkFirst` para
  leituras recentes da API.
- **Datas de negócio:** conclusões de hábitos usam `America/Sao_Paulo`, em conformidade
  com o backend.

## Jornadas Principais

| Jornada | Ação do usuário | Resultado esperado |
| --- | --- | --- |
| Entrar | Informa nome de usuário e senha | BFF cria cookies de sessão e redireciona ao painel. |
| Consultar painel | Abre `/dashboard` | Carrega resumo financeiro, hábitos, treinos e gamificação. |
| Concluir hábito | Usa a ação na lista ou no painel | API atualiza progresso, ofensiva, XP e badges derivados. |
| Corrigir | Remove uma conclusão no histórico. | API reverte efeitos em até sete dias. |
| Encerrar sessão | Usa a navegação autenticada | Cookies de sessão são removidos e o usuário volta ao login. |

As regras completas de cada jornada estão em [`../lifeOS-api/docs/user-flows.md`](../lifeOS-api/docs/user-flows.md).

## Integração com a API

O frontend nunca chama a API pública diretamente no navegador. Todos os clientes usam o prefixo interno `/api`, encaminhado pelo BFF para `API_URL`.

| Área | Cliente | Rotas internas principais |
| --- | --- | --- |
| Autenticação | `src/lib/api/auth.ts` | `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` |
| Painel | `src/lib/api/dashboard.ts` | `/api/dashboard` |
| Hábitos | `src/lib/api/habits.ts` | `/api/habits`, conclusões, progresso e histórico |
| Finanças | `src/lib/api/finances.ts` | `/api/finances/**` |
| Treinos | `src/lib/api/workouts.ts` | `/api/workouts/**` |
| Gamificação | `src/lib/api/gamification.ts` | `/api/gamification/**` |

Mensagens técnicas da API são localizadas no cliente antes de serem exibidas. Mensagens sem tradução específica usam uma resposta genérica em português para não expor detalhes internos do backend à interface.

## PWA e Offline

O projeto gera o service worker em builds de produção. Em desenvolvimento ele é intencionalmente desabilitado para evitar cache desatualizado durante a implementação.

- Arquivos estáticos são pré-cacheados pelo Serwist.
- Leituras `GET /api/**` usam `NetworkFirst` e podem usar dados recentes em cache.
- Escritas, como concluir um hábito ou registrar uma transação, exigem conexão e não são
  enfileiradas offline.
- A instalação exige uma origem HTTPS em produção.

O manifesto atual define nome, modo `standalone`, cores e ícone SVG. Alguns navegadores, incluindo versões do Firefox para Android, podem criar apenas um atalho ou ignorar ícones SVG. Ícones PNG em múltiplas resoluções são necessários para a compatibilidade máxima de instalação.

## Requisitos Locais

- Node.js compatível com a versão atual do Next.js.
- npm.
- Uma API ServiceLifeOS acessível por HTTPS ou rede local, configurada em `API_URL`.
- Um arquivo `.env.local` criado a partir de `.env.example`.

Não versione `.env.local`, URLs privadas, credenciais, tokens ou outros segredos.

## Configuração

1. Copie `.env.example` para `.env.local`.
2. Defina `API_URL` com a URL base da API, sem barra final.
3. Instale dependências:

```bash
npm install
```

4. Execute o ambiente de desenvolvimento:

```bash
npm run dev
```

Variável relevante:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `API_URL` | Sim | URL pública ou local da API ServiceLifeOS, sem barra final. |

## Segurança e Operação

- Tokens de sessão são armazenados em cookies `HttpOnly` pelo BFF.
- O frontend envia requisições apenas para a própria origem; `API_URL` não é exposta ao
  cliente como variável `NEXT_PUBLIC_*`.
- O BFF renova o access token após uma resposta `401` e tenta a requisição original uma vez.
- Falhas definitivas de sessão removem cookies e exigem novo login.
- O cache offline armazena apenas leituras recentes; operações de escrita nunca são
  executadas fora de conexão.

Em produção, publique o frontend em HTTPS. Service workers e instalações PWA dependem de contexto seguro em navegadores comuns.

## Qualidade

Execute antes de enviar alterações:

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run build` também valida tipos e gera o service worker de produção. O projeto ainda não possui uma suíte própria de testes de interface; validações de comportamento devem ser adicionadas junto de componentes com lógica isolada ou fluxos críticos.

## Documentação Relacionada

- [`../lifeOS-api/README.md`](../lifeOS-api/README.md): visão geral, arquitetura e operação da API.
- [`../lifeOS-api/docs/requirements.md`](../lifeOS-api/docs/requirements.md): escopo e regras de negócio.
- [`../lifeOS-api/docs/user-flows.md`](../lifeOS-api/docs/user-flows.md): jornadas e integração por domínio.
- [`../lifeOS-api/docs/habits.md`](../lifeOS-api/docs/habits.md): agendas, conclusões, ofensivas e correções.
- [`../lifeOS-api/docs/production.md`](../lifeOS-api/docs/production.md): implantação e configuração operacional.
