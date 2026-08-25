# LifeOS Web

Frontend do LifeOS, uma aplicação pessoal para organizar finanças, hábitos, treinos, metas e gamificação. O projeto usa Next.js como interface e BFF para proteger a sessão, concentrando os fluxos diários em uma experiência responsiva, instalável e orientada a baixo atrito.

O sistema atende a um único proprietário criado pela rota de configuração inicial da API. Cadastro público, colaboração e multi-tenancy não fazem parte do escopo atual.

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
Browser -> Next.js App Router + Client Components -> BFF /bff/** -> ServiceLifeOS API
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
2. O cliente requisita apenas rotas internas em `/bff/**`.
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

O frontend nunca chama a API pública diretamente no navegador. Todos os clientes usam o prefixo interno `/bff`, encaminhado pelo BFF para `API_URL`. O prefixo público `/api` permanece reservado ao proxy da API na VPS.

| Área | Cliente | Rotas internas principais |
| --- | --- | --- |
| Autenticação | `src/lib/api/auth.ts` | `/bff/auth/login`, `/bff/auth/logout`, `/bff/auth/me` |
| Painel | `src/lib/api/dashboard.ts` | `/bff/dashboard` |
| Hábitos | `src/lib/api/habits.ts` | `/bff/habits`, conclusões, progresso e histórico |
| Finanças | `src/lib/api/finances.ts` | `/bff/finances/**` |
| Treinos | `src/lib/api/workouts.ts` | `/bff/workouts/**` |
| Gamificação | `src/lib/api/gamification.ts` | `/bff/gamification/**` |

Mensagens técnicas da API são localizadas no cliente antes de serem exibidas. Mensagens sem tradução específica usam uma resposta genérica em português para não expor detalhes internos do backend à interface.

## PWA e Offline

O projeto gera o service worker em builds de produção. Em desenvolvimento ele é intencionalmente desabilitado para evitar cache desatualizado durante a implementação.

- Arquivos estáticos são pré-cacheados pelo Serwist.
- Leituras `GET /bff/**` usam `NetworkFirst` e podem usar dados recentes em cache.
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
2. Defina `API_URL` com a URL base da API, sem barra final. Para usar a API da VPS, utilize `https://lifeos.ianfelps.mywire.org/api`.
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
| `API_URL` | Sim | URL pública ou local da API ServiceLifeOS, sem barra final. Em produção Docker, use `http://api:8080`. |

## Segurança e Operação

- Tokens de sessão são armazenados em cookies `HttpOnly` pelo BFF.
- O frontend envia requisições apenas para a própria origem; `API_URL` não é exposta ao
  cliente como variável `NEXT_PUBLIC_*`.
- O BFF renova o access token após uma resposta `401` e tenta a requisição original uma vez.
- Falhas definitivas de sessão removem cookies e exigem novo login.
- O cache offline armazena apenas leituras recentes; operações de escrita nunca são
  executadas fora de conexão.

Em produção, publique o frontend em HTTPS. Service workers e instalações PWA dependem de contexto seguro em navegadores comuns.

## Produção

O frontend é publicado em `https://lifeos.ianfelps.mywire.org/`. O Nginx encerra TLS e encaminha a origem para o container Next.js em `127.0.0.1:3002`; o prefixo `/api/` permanece encaminhado para a API em `127.0.0.1:3001`.

```text
Internet HTTPS -> Nginx -> /api/ -> 127.0.0.1:3001 -> API:8080
                         -> /     -> 127.0.0.1:3002 -> Web:3000
```

O BFF do frontend usa `API_URL=http://api:8080` dentro da rede Docker externa `lifeos-api_default`. A URL não é exposta ao navegador e os tokens continuam somente em cookies `HttpOnly`.

O deploy é disparado quando uma pull request interna de `development` para `main` é mesclada. O GitHub Actions instala dependências, valida tipos, lint e build, publica uma imagem ARM64 imutável no GHCR e a atualiza por SSH na VPS.

Configure no repositório os secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_PORT`, `VPS_SSH_PRIVATE_KEY` e `VPS_SSH_KNOWN_HOSTS`. O `VPS_USER` deve ser o usuário restrito `lifeos-web-deploy`, com diretório `/opt/lifeos-web` e uma chave SSH exclusiva.

Consulte [`docs/production.md`](docs/production.md) para o provisionamento da VPS, Nginx e diagnóstico.

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
- [`docs/production.md`](docs/production.md): implantação e configuração operacional do frontend.
