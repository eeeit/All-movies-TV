# 归档说明

此目录存放已归档的部署配置，**不再维护**。项目当前唯一维护的部署主线是 **Cloudflare Workers**（见根目录 [wrangler.jsonc](../../wrangler.jsonc) + [open-next.config.ts](../../open-next.config.ts)）。

## 归档内容

| 文件                                                  | 原用途                        | 归档日期   |
| ----------------------------------------------------- | ----------------------------- | ---------- |
| Dockerfile                                            | Docker 镜像构建（ECS 自托管） | 2026-08-29 |
| docker-compose.ecs.yml / docker-compose.ecs.local.yml | ECS/本地 Docker 编排          | 2026-08-29 |
| deploy/nginx/moontv.conf                              | ECS 前置 Nginx 反代           | 2026-08-29 |
| vercel.json                                           | Vercel 部署                   | 2026-08-29 |
| proxy.worker.js                                       | 独立 Cloudflare Worker 代理   | 2026-08-29 |

## 注意事项

- Docker 路径依赖 Redis 存储适配器（[src/lib/redis.db.ts](../../src/lib/redis.db.ts)），代码仍保留但不再验证。
- `deploy_stage/` 打包脚本（[scripts/build-deploy-stage.js](../../scripts/build-deploy-stage.js)）同样仅服务于 Docker/包上传路径，如需彻底清理可后续删除。
- 恢复任一路径时，需重新验证依赖版本（Next.js、OpenNext、pnpm 均有演进）。
