# LifeOS Web

Frontend Next.js do LifeOS. A aplicacao usa um BFF interno para manter access e refresh tokens em cookies HttpOnly e encaminhar requisicoes autenticadas ao backend.

## Setup

1. Copie `.env.example` para `.env.local`.
2. Defina `API_URL` com a URL publica da API, sem barra final.
3. Instale as dependencias com `npm install`.

## Scripts

```bash
npm run typecheck
npm run lint
npm run build
```

## Estrutura

- `src/app/api`: BFF, login e logout.
- `src/lib/api`: contratos TypeScript e clientes de todos os dominios da API.
- `src/lib/server`: comunicacao server-to-server e gestao de cookies de sessao.
- `src/app/sw.ts`: cache PWA de leituras recentes via Serwist.

O service worker usa `NetworkFirst` em leituras `GET /api/**`. Escritas exigem conexao e nunca sao enfileiradas offline.
