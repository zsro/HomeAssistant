# S3 候选线上测试发布说明

发布范围为日本地图v47、十五种policy及S3 Web/Chrome候选。入口`/modules/richman`使用现有真实登录鉴权；测试脚本的登录fixture不进入产品鉴权。没有新增数据库迁移/存档，刷新或离开仍会丢失当前临时对局。原版差异、未测设备与未触发音频场景见S3-05c矩阵。

## 素材包

39个运行文件的路径、字节数与SHA256登记于`scripts/richman/release-assets.json`。包括地图/头像/精灵、音乐/效果/语音和对象动画；原安装包不上传。二进制仍由`.gitignore`排除，不进入Git源码库。

发布顺序：先提交/推送，再确认服务器`/var/HomeAssistant`位于main、HEAD与推送提交相同且干净；将本地已核验的39文件同步到该目录的`frontend/public/richman/generated`（忽略目录），执行`node scripts/richman/check-release-assets.cjs`。不要从本机上传整个工作区或.env。素材来源变化后应重新核验并明确更新清单，不绕过检查。

`deploy.sh`在创建新release、安装依赖或修改服务之前验证该清单，缺失/大小或哈希错误立即失败。校验通过后沿既定流程构建，Vite会把public素材复制到静态发布目录。可在构建后再次执行：

```bash
node scripts/richman/check-release-assets.cjs frontend/dist/richman/generated
```

服务器部署完成后对实际静态根再次校验39文件，并检查PM2、health/ready、Nginx和HTTPS下游戏资源状态/Content-Type及前端hash。资源目录受Git忽略不表示可以省略同步；旧图片/声音不能与当前清单混用。最终服务器Git工作区仍须干净。

本文件描述发布方式，不代替本次运行结果；提交哈希、部署结果和访问地址由实际发布报告给出。

发布前扩大界面检查发现两条旧模式说明测试仍匹配S3-05a之前文案；现改为断言同一历史范围的现行说明，不改产品或游戏语义。全量历史长局生成测试未完成、已停止，不计通过；发布相关界面回归单列。

本次提交前：319项/44文件非领域长局的前端回归、前端lint/build、素材39文件校验和缺失包拒绝检查通过；部署脚本bash语法检查通过。
