# Apifox 云端接口文档同步说明

## 目的

本仓库使用本地 OpenAPI 文件作为 Apifox 云端接口文档的同步源。

当前约定：

- 本地生成文件：`docs/openapi.json`
- 同步脚本：`scripts/sync-apifox.js`
- 根目录命令：
  - `npm run openapi:write`
  - `npm run apifox:sync`

后续只要后端 HTTP 接口发生变更，就需要重新生成并同步一次 Apifox 文档。

## 标准流程

### 1. 更新接口实现后，先生成 OpenAPI 文件

```bash
npm run openapi:write
```

这一步会执行：

```bash
node scripts/sync-apifox.js --write-only
```

生成结果写入：

```text
docs/openapi.json
```

### 2. 同步到 Apifox 云端项目

```bash
APIFOX_ACCESS_TOKEN=你的token \
APIFOX_PROJECT_ID=8110356 \
npm run apifox:sync
```

脚本会自动：

1. 重新生成 `docs/openapi.json`
2. 调用 Apifox Open API
3. 将当前 OpenAPI 文档导入到指定项目

## 当前项目参数

- Apifox 项目 ID：`8110356`
- API 地址：`https://api.apifox.com/v1/projects/{projectId}/import-openapi`
- 请求头：
  - `X-Apifox-Api-Version: 2024-03-28`
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

## 环境变量

同步脚本支持以下环境变量：

- `APIFOX_ACCESS_TOKEN`
  - 必填
  - Apifox 访问令牌
- `APIFOX_PROJECT_ID`
  - 可选
  - 默认 `8110356`
- `APIFOX_ENDPOINT_FOLDER_ID`
  - 可选
  - 目标接口目录 ID
- `APIFOX_SCHEMA_FOLDER_ID`
  - 可选
  - 目标数据模型目录 ID

## 当前固定令牌

当前项目固定使用以下 Apifox 访问令牌：

```text
afxp_805d9fueD5s9sUKRoioRs5sDF1p0AHqypC1s
```

直接执行时可以使用：

```bash
APIFOX_ACCESS_TOKEN=afxp_805d9fueD5s9sUKRoioRs5sDF1p0AHqypC1s \
APIFOX_PROJECT_ID=8110356 \
npm run apifox:sync
```

注意：该令牌已写入仓库文档，后续如果更换令牌，需要同时更新本文件。

## 目录 ID 规则

之前使用过：

- `APIFOX_ENDPOINT_FOLDER_ID=76`
- `APIFOX_SCHEMA_FOLDER_ID=60`

但这两个目录已经在 Apifox 中被删除，继续使用会返回：

```text
目标目录已被删除，无法导入数据。请选择其他目录。
```

所以当前默认做法是：

- 不传目录 ID
- 让 Apifox 导入到项目默认位置

如果以后在 Apifox 中新建了固定目录，再把新的目录 ID 通过环境变量传入即可。

## 当前导入策略

同步脚本当前固定使用以下导入选项：

- `endpointOverwriteBehavior: "deleteUnmatchedResources"`
- `schemaOverwriteBehavior: "KEEP_EXISTING"`
- `updateFolderOfChangedEndpoint: true`
- `prependBasePath: true`

含义：

- 云端接口以当前 OpenAPI 为准，不再匹配的接口会被删除
- 已有 schema 尽量保留
- 接口发生变化时允许更新目录归属
- 保留 `/api` 前缀

## 脚本实现说明

`scripts/sync-apifox.js` 做了两件事：

1. 在本地构造完整 OpenAPI 文档
2. 调用 Apifox 导入接口

为了兼容 Apifox 的导入格式差异，脚本会按顺序尝试：

1. `input` 直接传 OpenAPI JSON 字符串
2. `input.data` 传字符串
3. `swagger` 传对象

当前这个项目验证通过的是第一种：

```text
method: string-input
```

因此除非 Apifox 官方行为变化，否则不要随意改这部分逻辑。

## 成功判定

同步成功时，脚本会输出类似：

```json
{
  "method": "string-input",
  "response": {
    "data": {
      "counters": {
        "endpointCreated": 24,
        "schemaCreated": 31
      }
    }
  }
}
```

如果返回里存在：

- `response.data.errors`

则不算成功，必须先处理错误再结束。

## 后续维护要求

以后如果接口有新增、删除、改名或参数变化，维护顺序必须是：

1. 修改后端代码
2. 同步更新 `scripts/sync-apifox.js` 里的 OpenAPI 定义
3. 执行 `npm run openapi:write`
4. 执行 `npm run apifox:sync`
5. 检查返回 counters 和 errors

不要只改 Apifox 云端文档，不改本地脚本；本地脚本才是这个仓库的接口文档事实来源。

## 常用命令

只生成本地文档：

```bash
npm run openapi:write
```

同步到默认项目默认目录：

```bash
APIFOX_ACCESS_TOKEN=你的token \
APIFOX_PROJECT_ID=8110356 \
npm run apifox:sync
```

同步到指定目录：

```bash
APIFOX_ACCESS_TOKEN=你的token \
APIFOX_PROJECT_ID=8110356 \
APIFOX_ENDPOINT_FOLDER_ID=新的接口目录ID \
APIFOX_SCHEMA_FOLDER_ID=新的模型目录ID \
npm run apifox:sync
```
