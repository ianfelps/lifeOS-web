# Produção

## Arquitetura

O frontend executa em uma VPS Ubuntu ARM64. O GitHub Actions valida o projeto, publica uma imagem Docker ARM64 no GitHub Container Registry (GHCR) e atualiza o container por SSH. O Nginx encerra TLS em `https://lifeos.ianfelps.mywire.org` e encaminha a origem para o frontend em `127.0.0.1:3002`.

O Nginx preserva o prefixo `/api/` para a API em `127.0.0.1:3001`. O BFF do Next.js alcança o container da API pela rede Docker privada, usando `http://api:8080`. A porta do frontend não é exposta publicamente.

```text
Browser -> Nginx -> 127.0.0.1:3002 -> Web:3000 -> API:8080
                 -> 127.0.0.1:3001 -> API:8080
```

## Variáveis de ambiente

Crie `/opt/lifeos-web/.env.production` somente na VPS, com permissão `600` e propriedade de `lifeos-web-deploy`.

| Variável | Valor de produção | Uso |
| --- | --- | --- |
| `API_URL` | `http://api:8080` | URL privada da API consumida pelo BFF. |

Não use uma variável `NEXT_PUBLIC_*` para a API. Ela exporia a URL ao navegador e contornaria o BFF e os cookies `HttpOnly`.

## GitHub Actions

O workflow `CI / test` executa `npm ci`, typecheck, lint e build em pull requests para `development` e `main`, além de pushes para `development`. Configure esse check como obrigatório nas regras de proteção dessas branches.

O deploy ocorre somente quando uma pull request interna de `development` para `main` é mesclada. Ele repete as validações, publica `ghcr.io/OWNER/lifeos-web:COMMIT_SHA` para ARM64 e atualiza a VPS.

Configure estes secrets no repositório do frontend:

| Secret | Uso |
| --- | --- |
| `VPS_HOST` | IP público ou hostname da VPS. |
| `VPS_USER` | Usuário restrito `lifeos-web-deploy`. |
| `VPS_SSH_PORT` | Porta SSH da VPS. |
| `VPS_SSH_PRIVATE_KEY` | Chave privada exclusiva do deploy do frontend. |
| `VPS_SSH_KNOWN_HOSTS` | Chave pública ED25519 da VPS, validada pela fingerprint. |

O `GITHUB_TOKEN` temporário faz login no GHCR durante o deploy. Nenhum token de registry é persistido na VPS.

## Nginx

Adicione o encaminhamento da origem ao bloco HTTPS existente. O `location /api/` atual deve permanecer antes ou ao lado desta configuração; o Nginx prioriza o prefixo mais específico.

```nginx
location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
}
```

## Operação

O deploy cria `/opt/lifeos-web/.deployment.env` com a tag atualmente ativa. Use-o para consultar o runtime:

```bash
sudo -u lifeos-web-deploy -H docker compose \
  --env-file /opt/lifeos-web/.deployment.env \
  --env-file /opt/lifeos-web/.env.production \
  -f /opt/lifeos-web/docker-compose.production.yml ps
```

```bash
sudo -u lifeos-web-deploy -H docker compose \
  --env-file /opt/lifeos-web/.deployment.env \
  --env-file /opt/lifeos-web/.env.production \
  -f /opt/lifeos-web/docker-compose.production.yml logs --tail 100
```

Após cada deploy, o workflow valida `GET /` por `http://127.0.0.1:3002/`. A validação externa é `https://lifeos.ianfelps.mywire.org/`.
