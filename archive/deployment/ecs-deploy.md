# ECS 部署说明

这份说明按 Amazon Linux 2023 编写，适用于阿里云、腾讯云、AWS 等标准 Linux ECS 虚机。

## 推荐方案

### 最省钱组合

- 1 台 Amazon Linux 2023 ECS
- Docker 单容器运行项目
- `NEXT_PUBLIC_STORAGE_TYPE=localstorage`
- Nginx 反向代理
- HTTPS 用 Let's Encrypt 或现有 CDN

适合个人自用、低并发、对服务端同步没有强需求的场景。这是这个项目在 ECS 上成本最低的组合。

### 更实用但仍然省钱的组合

- 1 台 Amazon Linux 2023 ECS
- Docker 运行项目 + 同机 Redis 容器
- `NEXT_PUBLIC_STORAGE_TYPE=redis`
- Nginx 反向代理
- HTTPS 用 Let's Encrypt 或现有 CDN

适合需要多账户、服务端收藏/播放记录同步、后台管理的场景。

### 不建议的高成本组合

- EC2 + ElastiCache
- EC2 + RDS
- 小站点一开始就上 ALB、NAT Gateway 等托管网络组件

如果目标是最低成本，上述托管组件通常都会比项目本身更贵。

不建议继续使用 Cloudflare D1。D1 是 Cloudflare 绑定能力，不能直接搬到 ECS。

## 迁移前确认

1. ECS 安全组至少放行 22、80、443 端口。
2. 如果你暂时不接 Nginx，至少放行应用端口，比如 3000。
3. 如果你当前在 Cloudflare D1 上保存了用户、收藏和播放记录，这个仓库目前没有自动 D1 到 Redis 的迁移脚本，迁移到 ECS 时建议先以新 Redis 存储启动。

## 服务器准备

以 Amazon Linux 2023 为例：

```bash
sudo dnf update -y
sudo dnf install -y dnf-plugins-core git nginx
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo systemctl enable --now nginx
sudo usermod -aG docker ${USER}
```

如果你使用的是 AWS 默认账号，通常是 `ec2-user`；重新登录一次终端，让 docker 用户组生效。

## 实例规格建议

- 如果你要在服务器上直接执行 Docker 构建，建议至少从 `t4g.small` 起步
- 如果只是极低流量测试，`t4g.micro` 也可以尝试，但构建和运行余量会比较紧
- 想压低成本时，优先选 Graviton 机型，再避免使用 ElastiCache、RDS 和 ALB

## 项目启动

### 方案 A：最低成本单机 localstorage

1. 拉取代码到 ECS，例如：

```bash
cd /opt
sudo mkdir -p moontv
sudo chown -R ${USER}:${USER} /opt/moontv
cd /opt/moontv
git clone <your-repo-url> .
```

2. 在项目根目录复制最低成本环境变量示例：

```bash
cp .env.ecs.local.example .env.ecs.local
```

3. 修改 `.env.ecs.local`，至少设置以下值：

- `PASSWORD`

4. 启动服务：

```bash
docker compose --env-file .env.ecs.local -f docker-compose.ecs.local.yml up -d --build
```

5. 查看状态：

```bash
docker compose -f docker-compose.ecs.local.yml ps
docker compose -f docker-compose.ecs.local.yml logs -f app
```

### 方案 B：单机 Redis，同步功能更完整

1. 拉取代码到 ECS，例如：

```bash
cd /opt
sudo mkdir -p moontv
sudo chown -R ${USER}:${USER} /opt/moontv
cd /opt/moontv
git clone <your-repo-url> .
```

2. 在项目根目录复制环境变量示例：

```bash
cp .env.ecs.example .env.ecs
```

3. 修改 `.env.ecs`，至少设置以下值：

- `PASSWORD`
- `USERNAME`
- `NEXT_PUBLIC_STORAGE_TYPE=redis`

4. 启动服务：

```bash
docker compose --env-file .env.ecs -f docker-compose.ecs.yml up -d --build
```

5. 查看状态：

```bash
docker compose -f docker-compose.ecs.yml ps
docker compose -f docker-compose.ecs.yml logs -f app
```

## 域名和反向代理

1. 将域名 A 记录指向 ECS 公网 IP。
2. 将 [deploy/nginx/moontv.conf](../deploy/nginx/moontv.conf) 放到 `/etc/nginx/conf.d/moontv.conf`。
3. 把 `server_name` 改成你的域名。
4. 检查并重载 Nginx：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS

如使用 Let's Encrypt：

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

如果你的环境不方便直接签发 Let's Encrypt，也可以把 HTTPS 放到云厂商负载均衡或 CDN 层处理，Nginx 继续只监听 80 端口。

## 更新发布

### 更新 localstorage 方案

```bash
git pull
docker compose --env-file .env.ecs.local -f docker-compose.ecs.local.yml up -d --build
```

如果你不是在服务器上直接 `git pull`，而是走本地打包再上传，请先在本地重新生成部署产物：

```bash
pnpm run build:deploy-stage
```

这条命令会用当前源码重新构建 Next standalone 输出，并刷新 `deploy_stage/`。不要复用旧的 `deploy_stage` 或旧的压缩包，否则新加的 middleware、CORS 和认证逻辑不会进入远端镜像。

### 更新 Redis 方案

```bash
git pull
docker compose --env-file .env.ecs -f docker-compose.ecs.yml up -d --build
```

如果你走的是本地打包上传，同样先执行：

```bash
pnpm run build:deploy-stage
```

## Amazon Linux 2023 额外说明

- 包管理器使用 `dnf`，不是 `apt`
- Nginx 默认读取 `/etc/nginx/conf.d/*.conf`，不是 Ubuntu 常见的 `sites-available` / `sites-enabled`
- 如果你想直接以 `ec2-user` 运行 docker，执行完 `usermod -aG docker` 后必须重新登录

## 回滚与排障

- localstorage 方案容器未启动：先看 `docker compose -f docker-compose.ecs.local.yml logs app`
- Redis 方案容器未启动：先看 `docker compose -f docker-compose.ecs.yml logs app`
- Redis 未就绪：看 `docker compose -f docker-compose.ecs.yml logs redis`
- 页面能打开但静态资源异常：优先确认 Nginx 反代是否仍指向 3000，且没有缓存旧构建
- 修改 `config.json` 后未生效：重启应用容器，应用会在启动时重新读取挂载的配置文件
