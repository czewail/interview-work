# Form — 电子产品选购演示

根据 `docs/product-selection-prd-v0.2.md` 实现的英文 / USD / 游客购物应用。Next.js App Router + React + TypeScript，静态导出，无数据库服务器、商品 API 或支付接口。

## 启动与交付

环境：Node.js 20.9+，npm。已验证 Node.js 20.19.2。

```sh
npm ci
npm run dev
```

生产构建与静态预览：

```sh
npm run build
PORT=3017 npm start
```

打开 `http://localhost:3017`。`npm start` 只提供 `out/` 中的静态文件，不运行 Next.js 服务端逻辑。也可以把 `out/` 整个目录部署到支持嵌套 `index.html` 和 `404.html` 的静态托管平台。生产站点使用 HTTPS；本地使用 localhost。默认未发布到外网。

页面：`/`、`/products/[slug]/`、`/cart/`、`/checkout/`、`/order/?id=demo-…`、`/demo-info/`。36 个商品详情在构建时预生成，未知路径返回 404。

## 功能

- 固定 JSON 目录：36 个商品、93 个 SKU，四类电子产品；含缺货、归档、唯一规格和多规格。默认可发现 34 个商品，另 2 个保留不可售详情。
- 搜索规范化、品牌多选、分类、价格与库存 AND 过滤；同一 SKU 同时满足价格与库存条件；稳定排序、每页 12 件、URL 还原、列表返回位置。
- 本地产品插画、图集与放大、规格联动、库存与购物车共同限购；缺选项和非法数量的就近提示。
- 购物车数量编辑、规格修改和原子合并、删除与 5 秒撤销、20 行上限、价格变化提示、失效行处理。
- 美国演示地址、50 州与 DC、内存草稿、Standard / Express、整数美分运税费计算。
- Success / Declined / Technical error / Timeout 四种模拟支付；提交锁定、刷新续办、取消、重复回调去重、复核变价；只在成功后扣库存并清车。
- IndexedDB 单对象 readwrite 事务；订单、库存、购物车和 attempt 同时提交。BroadcastChannel 通知和聚焦重读；30 天过期、版本迁移、损坏重置、存储失败回滚与临时模式。
- 最近 20 笔订单快照；姓名、地址、邮箱不写入持久存储、URL 或事件。
- 响应式布局、移动底部操作栏、原生 dialog 焦点管理、键盘操作、live region、减少动态效果。

所有品牌、商品、图片、参数、库存和费用均为虚构演示资料。不会扣款、发货或发送邮件。

## 代码结构

| 路径 | 职责 |
| --- | --- |
| `app/` | 静态路由、布局、设计 token 和响应式样式 |
| `components/` | 列表、详情、购物车、结账、订单与通用交互组件 |
| `lib/catalog-data.json` | 构建时固定商品目录 |
| `lib/catalog.ts` | 目录契约校验、分类与品牌 |
| `lib/query.ts` | URL 解析、搜索、SKU 级过滤、排序、分页 |
| `lib/commerce.ts` | 金额、购物车、报价、模拟支付、表单校验 |
| `lib/persistence.ts` | IndexedDB 原子事务、数据恢复与内存降级 |
| `lib/fixtures.ts` | BASE / PAGES / LIMIT / CONTENT / EMPTY 测试目录 |
| `lib/events.ts` | 无个人信息的本地开发事件 |
| `scripts/` | 目录和本地插画生成、静态服务器、浏览器检查 |
| `tests/` | 业务与事务测试、浏览器端到端测试 |
| `artifacts/` | 页面截图和浏览器检查结果 |

`npm run build` 首先校验目录；无效价格、重复 ID / slug / 规格、缺失引用、超限字段等会阻止构建。修改演示种子后执行 `node --import tsx scripts/generate-catalog.ts` 更新 JSON。重新生成插画用 `node scripts/generate-assets.mjs`。图片和 DM Sans 字体随静态包提供，不从第三方域名加载。

## 验证

```sh
npm run typecheck
npm test
npm run build
PORT=3017 npm start
# 另开终端；默认使用本机 Chrome 的独立测试浏览器
npm run test:e2e
node scripts/inspect-browser.mjs
```

`PLAYWRIGHT_BASE_URL` 可以覆盖端到端测试地址。无 Chrome 时，可安装 Playwright Chromium 并把 `playwright.config.ts` 的 `channel` 删除。测试不会访问个人浏览器配置。

已执行的检查及尚未覆盖的人工验收见 `docs/implementation-report.md`。不能将自动化通过等同于完整浏览器矩阵、真实手机或读屏验收通过。

## 开发故障夹具

仅 `npm run dev` 或显式设置 `NEXT_PUBLIC_DEMO_TESTING=1` 的测试构建暴露 `window.__demo`；普通生产构建不暴露工程入口。消费页面只显示明确标注的支付 Demo controls。

在开发页面控制台中：

```js
await __demo.fixture('BASE');     // 9 个基础测试商品，列表可见 7 个
await __demo.fixture('PAGES');    // 25 商品，12 / 12 / 1 分页
await __demo.fixture('LIMIT');    // 500 商品 / 3000 SKU
await __demo.fixture('EMPTY');
await __demo.fixture('CONTENT');  // 恢复正式演示目录
__demo.catalogError(true);        // 目录错误；界面 Retry 可恢复
__demo.failWrite();               // 下一次写入失败，回滚后进入临时模式
await __demo.advance(8000);       // 推进模拟时间，完成到期的 pending
await __demo.patchCatalog(c => {
  c.skus.find(s => s.id === 'UC-1').priceCents = 2499;
});
await __demo.patchCatalog(c => {
  c.products[0].images[0] = '/products/missing.webp';
});
await __demo.patchState(s => { s.schemaVersion = 99; });
await __demo.advance(30 * 24 * 60 * 60 * 1000); // 演示过期
__demo.read();                    // 已提交状态，无个人字段
__demo.events();                  // 仅本地，不包含自由搜索文本或地址
await __demo.reset();
```

夹具目录只在当前页面会话生效；刷新恢复随包目录。夹具生成的 `fixture-N` slug 用于列表测试，不是预生成商品详情路由。生产深链接使用正式目录 slug。工程 API 的 `patchState` 是故意绕过业务规则的测试入口，不供正常购物调用。

存储降级后，本次失败操作不算成功；用户可在临时模式重试。刷新可能恢复最后一次成功持久化的快照，包括此前已保存的 pending；临时订单不会伪装成已持久化订单。演示说明页的重置需要明确确认。
