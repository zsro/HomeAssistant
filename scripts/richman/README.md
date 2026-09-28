# Richman 技术验证资源工具

本目录只负责离线转换用户提供的游戏资源；Web 端不加载或执行 Windows EXE。

## 生成素材

需要 C 编译器、Python 3、Pillow 和 NumPy。安装目录参数指向包含 `Data.mkf`、`map.mkf`、`MapDat.MKF` 的 `Game` 子目录：

```sh
python3 scripts/richman/export_assets.py --game /path/to/rich4/Game
```

默认生成 `frontend/public/richman/generated/`，包含：

- 日本地图 WebP、缩略图。
- 四个头像、344 个精灵帧的 WebP 图集。
- 地图节点、精灵矩形、原始锚点、动画分组、来源 SHA256 的 JSON 清单。

当前转换器针对本次核验的四地图本体文件。资料片的资源编号不同，不支持直接混用。建筑等级和部分地标用于显示验证，不代表对原版初始场景的逐项复刻。人物使用八方向站立和行走序列，帧锚点保留原始坐标。

生成物被 Git 忽略，原安装目录只读；完整资源与音频包不进入源码仓库。当前功能仅用于本地技术验证，发布前需另外确定素材分发及构建流程，避免部署只有代码而没有资源的页面。转换所需的游戏文件不包含在这个仓库中。

## 依赖出处

`vendor/mkf_decompress.c` 与 `.h` 来自 https://github.com/mytbk/rich4/tree/master/csrc/mkf 。该项目的 GPL-3.0 许可文件保留为 `vendor/COPYING`。解压库仅在本机转换时编译成临时动态库，不编译或链接进网页。原版素材不适用该工具的代码许可证。

## 前端验证

```sh
npm --prefix frontend run test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run dev
```

入口 `/modules/richman` 受现有登录鉴权保护。当前没有新增数据库模式或存档表；浏览器只维护临时的移动体验状态，刷新页面重新开始。
