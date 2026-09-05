# 归档说明

此目录存放已归档的部署配置，**不再维护**。

> 2026-09-05 更新：Docker / docker-compose / Nginx 反代 / ECS 部署文档已迁回仓库根目录（[Dockerfile](../../Dockerfile)、[docker-compose.yml](../../docker-compose.yml)、[docker-compose.local.yml](../../docker-compose.local.yml)、[nginx/moontv.conf](../../nginx/moontv.conf)、[DEPLOYMENT.md](../../DEPLOYMENT.md)），成为新的部署主线。Cloudflare Workers 部署配置（wrangler.jsonc、open-next.config.ts）与 D1 初始化文档已迁入本目录，不再维护。

## 归档内容

| 文件                | 原用途                         | 归档日期   |
| ------------------- | ------------------------------ | ---------- |
| wrangler.jsonc      | Cloudflare Workers 部署配置    | 2026-09-05 |
| open-next.config.ts | OpenNext Cloudflare 适配器配置 | 2026-09-05 |
| D1 初始化.md/.sql   | Cloudflare D1 建表脚本         | 2026-09-05 |
| vercel.json         | Vercel 部署                    | 2026-08-29 |
| proxy.worker.js     | 独立 Cloudflare Worker 代理    | 2026-08-29 |

## 注意事项

- Docker 路径依赖 Redis 存储适配器（[src/lib/redis.db.ts](../../src/lib/redis.db.ts)），代码仍保留但需重新验证。
- D1 存储实现（原 `src/lib/d1.db.ts`）已于 2026-09-05 随本次 Cloudflare 解耦一并删除，代码库中不再存在 `D1Storage`；`NEXT_PUBLIC_STORAGE_TYPE=d1` 不再是受支持的取值。如需在 Cloudflare 上恢复 D1 支持，需从 git 历史中找回该文件并重新接入 wrangler.jsonc 的 D1 绑定。
- `deploy_stage/` 打包脚本（[scripts/build-deploy-stage.js](../../scripts/build-deploy-stage.js)）仅服务于历史包上传路径，如需彻底清理可后续删除。
- 恢复任一路径时，需重新验证依赖版本（Next.js、OpenNext、pnpm 均有演进）。
