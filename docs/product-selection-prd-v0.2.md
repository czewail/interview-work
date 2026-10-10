# 海外电子产品选购应用 PRD v0.2

英文界面、美元计价、游客购物的响应式电子产品商店。用户可以从寻找商品、比较规格、管理购物车一直完成模拟结账与查看订单结果。应用使用 Next.js，所有业务数据与模拟交易在浏览器内处理，无需后端服务。

版本：v0.2 评审稿。日期：2026年10月10日。读者：产品、设计、前端与测试。

本版按最新需求替代 v0.1 的范围定义：明确采用 Next.js，品类限定电子产品，模拟下单与支付纳入首版。v0.1 保留作历史记录。本文是产品规则；[配套测试用例](./product-selection-test-cases-v0.2.md)是验收依据。当前交付为需求与测试设计，应用尚未实现，用例尚未执行。

## 1 产品目标与验收范围

### 1.1 用户任务

| 场景 | 用户目标 | 产品结果 |
| --- | --- | --- |
| 按预算选购 | 找到合适的耳机、手机或配件 | 搜索和组合筛选后，结果、规格及价格相符 |
| 确认兼容性 | 知道接口、容量、适用设备、包装内容 | 关键参数可读，规格切换不会造成错购 |
| 调整待购商品 | 修改数量、规格或移除商品 | 金额、库存提示和购物车数量同步变化 |
| 游客体验购买 | 不注册也能完成选购流程 | 填写演示地址、选择配送、模拟支付、查看演示订单 |
| 返回继续购物 | 保留同一浏览器内的购物状态 | 刷新后恢复购物车，成功订单可再次查看 |

以上是本项目的设计假设，不代表已进行用户调研。核心体验验证任务：找到 $150 以下且有货的耳机，选择颜色，加购两件，在购物车改成一件，完成一次模拟购买。

### 1.2 已确定条件与首版默认决策

| 类型 | 决策 | 边界 |
| --- | --- | --- |
| 用户确定 | Next.js，无后端 | 静态文件托管即可运行；不依赖数据库服务器、商品 API 或支付服务 |
| 用户确定 | 英文 / USD / 游客 | 界面、错误提示、邮件格式示例均为英文；文档使用中文；无注册或登录 |
| 用户确定 | 电子产品，兼容移动端和 PC | Phones、Computers、Audio、Accessories 四类，包含平板等 Computers 子类型 |
| 用户确定 | 支付与下单模拟 | 不收款、不发货、不发送邮件，不请求真实银行卡信息 |
| 本版默认 | 单商家、全新商品 | 不支持多店铺、二手成色或订阅商品 |
| 本版默认 | 美国地址演示 | Country 固定 United States；State 支持 50 州及 DC；所有费用均为虚构规则，不代表真实配送或税务能力 |
| 本版默认 | 36 个演示商品，至少 80 个 SKU | 覆盖单规格、多规格、部分缺货、全部缺货、价差、长标题、图片失败等情形 |
| 本版默认 | 浏览器本地保存 30 天 | 无跨设备同步；清理网站数据会丢失本地购物车、订单与库存变动 |
| 本版默认 | 所有有效商品一起结账 | 不支持勾选部分结算；有失效商品时须先处理 |

默认项可在评审后调整，不构成当前设计或开发的阻塞项。

### 1.3 范围与优先级

| 优先级 | 范围 |
| --- | --- |
| P0 必须交付 | 商品列表、搜索、分类、品牌/价格/库存筛选、排序、分页、详情图集、技术参数、SKU 选择与库存 |
| P0 必须交付 | 购物车增改删、规格修改、同 SKU 合并、删除撤销、金额计算、本地持久化 |
| P0 必须交付 | 游客地址表单、配送费用、模拟支付成功/拒付/技术失败/超时、提交恢复与去重、订单结果 |
| P0 必须交付 | 移动端/PC、键盘与读屏关键操作、异常恢复、静态深链接、确定性测试数据和故障开关 |
| P1 后续增强 | 收藏、商品对比、最近浏览、相关推荐、更丰富的参数筛选 |
| 不在首版 | 登录、多语言、多币种、真实交易/退款/物流、优惠券、评论体系、运营后台、跨设备购物车、完整订单中心、PWA 离线安装 |

## 2 信息架构与用户流程

### 2.1 页面与入口

| 页面 | 路径 | 主要内容与动作 |
| --- | --- | --- |
| 商品列表 | / | 搜索、筛选、排序、商品卡片、分页；品牌入口返回此页 |
| 商品详情 | /products/[slug]/ | 图集、名称、价格、核心参数、规格、数量、库存、Add to cart |
| 购物车 | /cart/ | 商品行、编辑、Remove/Undo、费用预估、Checkout |
| 结账 | /checkout/ | 联系信息和地址、配送、费用复核、演示支付、Place demo order |
| 订单结果 | /order/?id=demo-… | 演示订单编号、商品快照、费用与时间、Continue shopping |
| 演示说明 | /demo-info/ | 本地数据、演示配送/保修/退货说明；Reset demo data |
| 未找到 | 静态 404 页面 | 商品或页面不存在，返回购物入口 |

所有页面提供品牌、搜索、购物车入口及“Demo store — no real payments or shipments.”提示。顶部搜索提交后进入列表，不丢失购物车。订单编号位于查询参数而非运行时动态路由，便于纯静态托管。

### 2.2 核心流程

    浏览/搜索 → 筛选与排序 → 商品详情 → 选择 SKU 和数量 → 加入购物车
      → 调整商品 → 结账校验 → 填演示地址 → 选择配送 → 核对总额
      → 模拟支付 → 成功订单 / 失败后重试

列表返回需恢复已提交的查询、页码和滚动位置；从外部直接进入详情后，Continue shopping 返回默认列表。加购成功留在详情，提供 View cart。返回结账上一阶段不删除购物车；路由内往返保留表单草稿，整页刷新后清空个人信息。

## 3 商品发现需求

本节需求 ID 均为 P0；同编号下的规则共同验收。

| ID | 功能 | 规则与验收结果 |
| --- | --- | --- |
| LIST-01 | 商品卡片 | 主图、完整可访问名称、品牌、USD 售价、1–2 项关键参数、库存状态。卡片标题最多两行；详情展示完整名称。不展示虚构评分、销量或折扣倒计时 |
| LIST-02 | 搜索 | 输入上限 100 个 Unicode 字符；Enter 或 Search 提交。去首尾空格、合并连续空白、大小写不敏感，按空格分词，每个词都须在名称、品牌、型号或关键词中命中；无模糊纠错。空词恢复未搜索状态 |
| LIST-03 | 组合筛选 | 分类单选；品牌多选（品牌之间 OR）；价格区间、库存与其他维度之间 AND。品牌选项取整个目录，零结果选项仍可取消。Clear all 清搜索与筛选、恢复 Featured 和第 1 页 |
| LIST-04 | 价格语义 | 任一 active SKU 同时满足价格和库存条件，商品才命中；上下界均包含。SKU 价格不同显示 From；应用价格/库存筛选时按命中 SKU 最低价展示并标明 Matching options from。详情仍显示全部可选规格 |
| LIST-05 | 排序 | Featured 按 featuredRank 升序；Price low/high 按命中 SKU 最低价；Newest 按 publishedAt 降序；Relevance 仅搜索时可用。并列最终按 productId 升序，顺序稳定 |
| LIST-06 | 分页与 URL | 每页 12 件；URL 保存 q、category、brand（可重复）、min、max、stock、sort、page。业务条件提交后回第 1 页。PC/mobile 均可前后翻页，不使用无限滚动 |
| LIST-07 | 状态与返回 | 区分加载、目录为空、无匹配结果、目录读取失败；可重试或清条件。返回列表优先还原访问前状态和卡片位置；数据变化导致越页时回最后有效页 |

搜索首次从空变为非空时默认 Relevance；后续修改词保留用户已选的显式排序；清空词时 Relevance 回退 Featured，其他排序保留。Relevance 顺序：名称完全匹配、所有词均在名称命中、其余命中；组内按 featuredRank/productId 排序。

价格输入允许 0–9999.99 美元、最多两位小数；空下界视为 0、空上界视为无上界；负数、指数、字母、超过两位小数、min > max 阻止 Apply，保留上次有效结果。UI 输入超长不静默提交；URL 超长 q 截到前 100 字符并提示“Search shortened to 100 characters”。重复的标量参数只取首个，brand 去重。未知分类/品牌/排序忽略并规范化 URL；格式错误的价格对同时移除并提示；page 非正整数回 1，越界回最后有效页，无结果时显示 0 results，内部 page=1。

默认保留全部 active 商品，包括缺货商品。archived 商品不出现在列表。若商品没有 active SKU，按 unavailable 处理并排除列表，已有详情链接展示不可售说明。开启 In stock only 后按本地剩余库存 > 0 过滤。

## 4 商品详情与规格库存

| ID | 功能 | 规则与验收结果 |
| --- | --- | --- |
| DETAIL-01 | 信息层级 | 首屏含图片、名称、品牌/型号、价格、核心卖点、规格、库存和购买动作；下方给完整参数、兼容性、接口/功率/电压、包装内容和演示保修/退货说明 |
| DETAIL-02 | 图集 | 1–8 张本地图片，缩略图切换、放大弹层和关闭；支持键盘。图片失败显示同尺寸替代图与 alt，不阻断其他信息 |
| DETAIL-03 | SKU 选择 | 颜色、存储、内存、布局等按商品配置，最多 3 个维度。只有一个 active SKU 时自动选中；多个时所有必选项初始为空。选择完整后展示对应 SKU 的准确售价、图片及库存 |
| DETAIL-04 | 组合联动 | 按optionDefinitions顺序联动，例如颜色在前、存储在后。前维未选时后维不可操作；已选前维下不存在的后维取值禁用。前维始终可改，修改时保留兼容后项、清除不兼容后项并提示，不自动代选。存在但缺货的SKU允许查看并标Out of stock，不可加购 |
| DETAIL-05 | 数量与限购 | 库存为整数；每 SKU 单次订单上限 maxPerOrder，默认 10、可配置 1–99。可新增数量 = max(0, min(本地库存, maxPerOrder) − 购物车已有该 SKU 数量)。输入只接受 1–该上限的整数；切换规格后无效数量不静默截断，提示调整 |
| DETAIL-06 | 加购 | 缺规格时 Add to cart 可点击以提示并聚焦首个缺失项；确定缺货/上限为 0 时禁用并说明原因。有有效选择时校验目录版本、库存、购物车容量；成功后更新角标并播报。一次正在进行的操作禁用重复提交；成功后再次有意点击视为新加购 |
| DETAIL-07 | 不可售商品 | 未知 slug 返回 404；构建目录中的 archived 商品保留详情说明但禁用购买；全部缺货仍可看参数；无有效价格的数据记录不进入可售目录 |

库存展示：剩余 0 为 Out of stock，1–5 为 Only N left，6 及以上为 In stock；可在已选 SKU 旁查看剩余数量。所有页面提示库存为 Demo stock。库存只在本浏览器模拟成功订单后减少；加购不占用，失败/取消不减少；不同设备互不影响。

电子产品参数要求：手机/计算机至少含处理器、RAM、存储、屏幕、端口、供电与系统兼容性；耳机含连接、续航、降噪与兼容性；配件含接口、输入/输出功率、适用设备。按适用品类填写，不适用项省略，未知项写 Not specified。不得从产品名称推断性能。计量值带单位，GB 与 TB 不混淆；规格说明须明确可变参数。所有品牌和参数为演示资料，不对外宣称真实认证。

## 5 购物车管理

| ID | 功能 | 规则与验收结果 |
| --- | --- | --- |
| CART-01 | 列表与角标 | 每个 SKU 一行，含图、名称、规格、单价、数量、行金额、状态、Change options、Remove；角标是所有保留行数量总和，含失效行，超过 99 显示 99+，可访问名称给准确总量 |
| CART-02 | 修改数量 | 加减与直接输入；1 时减号禁用；Enter/失焦提交。空值、0、负数、小数、指数、字母或超限均恢复上次有效值并显示错误，快速合法修改按操作顺序处理，不允许旧结果覆盖新结果 |
| CART-03 | 修改规格和合并 | Change options 弹层以原规格为初值，保存时一次性移除原行并增加目标 SKU。目标已存在则数量相加；超库存、限购或失效时整个操作失败，原两行保持不变。关闭/取消不提交 |
| CART-04 | 删除和撤销 | Remove 立即删除，提供 5 秒 Undo；无障碍播报。只保留最近一次删除的撤销机会，下一次删除替换它。Undo 合并时重新校验；超过上限不恢复且说明原因，不部分恢复。离开购物车、刷新或开始结账后撤销失效 |
| CART-05 | 容量与空状态 | 最多 20 个不同 SKU。第 21 行阻止新增，同 SKU 增量不受行数限制但受数量限制。最后一行移除后展示 Your cart is empty、Continue shopping；不显示 Checkout |
| CART-06 | 价格和失效状态 | 打开/恢复购物车、加购、改数量/规格、进入结账、提交与提交完成前重新校验。价格变化使用新价格并标出前后价格；无货、下架、未知 SKU 或数量超库存的行保留但不计入小计，阻止整个结账 |
| CART-07 | 处理失效 | 库存降低提供 Update to N（须 N≥1）和 Remove，必须由用户明确操作；不自动减量。下架或删除只可移除；商品其他规格有效时可换规格。任何待校验状态都阻止结账 |
| CART-08 | 费用与结账入口 | 展示 Subtotal、按 Standard 计算的 Demo shipping、Demo tax (8%)、Demo total；有失效行时注明仅含有效商品的估算并禁用结账。结账选择 Express 后仅结账页使用 Express，购物车仍说明 Standard estimate |

购物车不提供批量清空和部分勾选结账；Reset demo data 是演示说明页的独立功能，须确认其清除购物车、订单和库存变动的后果。金额使用当前可信目录与数量重算；购物车展示快照仅用于失效时识别商品，不是价格来源。

## 6 游客结账与模拟订单

### 6.1 结账表单与复核

| ID | 功能 | 规则与验收结果 |
| --- | --- | --- |
| CHECK-01 | 进入结账 | 等本地状态加载完成再判断。空车显示空态与 Continue shopping；任一无效行返回购物车并定位。有效车进入一页式结账，手机按 Contact → Shipping → Payment → Review 顺序呈现 |
| CHECK-02 | 联系信息与地址 | Email、Full name、Address line 1、City、State、ZIP code 必填，Address line 2 可选，Country 固定 US；提供 Use demo details，填入 Alex Demo / alex@example.com / 123 Demo Street / San Francisco / CA / 94105 |
| CHECK-03 | 校验与草稿 | 失焦与提交时校验，输入中不频繁报错；提交失败展示错误摘要并聚焦首项。保留有效输入；同标签页路由往返保留草稿，刷新后不保存个人信息。禁止将姓名/地址/email 放 URL、持久存储或事件 |
| CHECK-04 | 配送 | 默认 Standard，允许 Express；切换立即重新计算并播报总额，展示虚构时效和 Demo 标识。免运费仅适用于 Standard，Express 不减免 |
| CHECK-05 | 复核 | 商品、规格、数量、单价、费用分项、地址和最终按钮金额一致。可返回购物车修改；修改后重新复核。提交前变化过的价格必须展示新总额，由用户再次点击确认；不得用新总额自动继续 |

字段边界按去首尾空格后的 Unicode 字符计数：Full name 1–80，Address line 1 1–120，line 2 0–120，City 1–80。允许重音字母、Unicode 姓名、连字符与撇号，不要求纯英文。Email 3–254，采用浏览器 email 语法校验并拒绝内部空白；不声称邮箱真实存在。ZIP 为 5 位或 5+4 位数字，保留前导零；State 从既定枚举选择。超长内容提示错误，不截断后提交；不校验真实投递可达性，不要求电话号码。

### 6.2 金额规则

本节全部为演示产品规则，不是税务或物流结论。对用户同时展示“Demo estimates only”。

    lineTotalCents = unitPriceCents × quantity
    subtotalCents = 所有有效行的 lineTotalCents 之和
    standardShippingCents = subtotalCents >= 10000 ? 0 : 599
    expressShippingCents = 1499
    taxCents = floor((subtotalCents × 8 + 50) / 100)
    totalCents = subtotalCents + shippingCents + taxCents

运费：Standard $5.99，商品小计达到 $100.00 免费，演示时效 3–5 business days；Express $14.99，演示时效 1–2 business days。税费为商品小计的固定 8%，一次四舍五入到美分，运费不计税。空车不产生运税费，失效行不参与小计。仅 USD；显示 en-US 格式、两位小数，页头/汇总注明 USD。

| 数值样例 | 小计 | Standard 运费 | Demo tax | Demo total |
| --- | --- | --- | --- | --- |
| $19.99 × 3 + $5.50 × 2 | $70.97 | $5.99 | $5.68 | $82.64 |
| $99.99 | $99.99 | $5.99 | $8.00 | $113.98 |
| $100.00 | $100.00 | $0.00 | $8.00 | $108.00 |
| $100.00，选择 Express | $100.00 | $14.99 | $8.00 | $122.99 |

### 6.3 模拟支付

| ID | 功能 | 规则与验收结果 |
| --- | --- | --- |
| PAY-01 | 演示支付入口 | 仅 Demo payment，不展示可填写真实卡号/CVV的输入框。默认结果 Success；展开 Demo controls 可选 Declined、Technical error、Timeout，提交前确定该次结果，提交后不可修改 |
| PAY-02 | 提交锁定 | 按钮 Place demo order — $X.XX。校验表单、目录、库存与费用后生成 attemptId，保存不含个人信息的提交快照。Processing 时锁定本浏览器共享购物车的普通修改和新的结账请求（取消与演示重置除外），同时锁定该次表单、配送和支付场景；其余标签页展示 Checkout in progress，可继续浏览 |
| PAY-03 | 结果 | Success/Declined/Technical error 在 2 秒模拟处理后生效，Timeout 在 8 秒后生效；不调用支付网络。失败均无成功订单、不扣库存、不清购物车，保留当前标签页表单，提供 Try again |
| PAY-04 | 一次完成 | 成功提交须在同一本地事务中再次验证快照，生成唯一 demo 订单、扣减对应 SKU、清空本次购物车、把 attempt 标记完成。事务失败不得出现半成功；相同 attempt 重放只能取得原结果，不能再次扣库存或创建订单 |
| PAY-05 | 刷新与中断 | pending 快照可恢复。刷新/关页再开/另标签页到达时按已存结果和截止时间继续，显示 Processing 或原结果；刷新不会默认新建 attempt。用户点击 Cancel simulation 才取消，取消和成功按最先提交的事务生效，后到回调不得改结果 |
| PAY-06 | 变化和重试 | 最终校验如发现目录版本、库存、价格或购物车修订号变化，终止本次 attempt，显示 Items changed, review your order，回到复核；不自动改价或删行后提交。失败/取消后再提交产生新 attemptId。旧回调必须被忽略 |

从结账返回购物车不等于取消支付：若 pending，购物车展示 Resume checkout / Cancel simulation，不能修改。页面重新获得焦点时检查 pending 截止时间；无页面运行时不需要后台计时，下次打开完成该次确定性模拟。过期 30 天的整份演示数据先清理，不再续办旧 pending。

提交状态：idle → validating → processing → succeeded / declined / failed / timed_out / cancelled / needs_review。校验失败留在 idle 并展示字段或商品错误。仅 succeeded 生成订单。所有失败状态结束后解锁购物车；订单页刷新与返回历史记录本身不触发提交。

持久化失败区别于模拟支付失败：若保存pending本身失败，支付尚未开始，可按DATA-07降级后重新发起；若已有持久pending而最终事务写失败，保持该attempt为processing的save_blocked子状态，显示“We couldn't save your demo order. Retry or cancel.”，不转成已确认失败、不中途另开内存订单。恢复存储后Retry先读已提交结果，未完成才重试同attempt；Cancel也必须成功持久化才宣告取消。事务提交成功但页面未收到通知时，重读原订单即可恢复。

### 6.4 订单结果

| ID | 功能 | 规则与验收结果 |
| --- | --- | --- |
| ORDER-01 | 成功页 | 显示 Demo order placed、不可混淆的 demo-UUID 编号、时间、商品/规格/数量/单价快照、配送方式和费用分项；明确 No payment was taken. No items will be shipped. |
| ORDER-02 | 恢复和隐私 | 同浏览器可按 id 查询最近 20 笔成功演示订单；刷新不重复下单。持久订单只保存商品和费用，不保存个人信息，页面说明 Delivery details are not saved in this demo。最新订单可从购物车空态进入 |
| ORDER-03 | 不可查询 | id 缺失、格式错误、不存在、已清理或在另一浏览器打开时，显示 Demo order not found on this browser，提供 Continue shopping；不得伪造成功内容 |

订单快照不随目录后续改名改价而变化；清理超过 20 笔的旧订单不恢复库存。首版不提供物流、下载发票、取消已成功订单或退款按钮。

## 7 数据边界与可信来源

### 7.1 数据结构

| 对象 | 必需字段 | 约束与用途 |
| --- | --- | --- |
| Catalog | schemaVersion、catalogVersion、products、skus | 构建时固定 JSON；版本为正整数，catalogVersion随发布单调增加；最多 500 个商品、3000 个 SKU；异常结构使构建失败 |
| Product | id、slug、name、brand、model、categoryId、description、keywords、images、specifications、optionDefinitions、status、featuredRank、publishedAt | id/slug 唯一；name 1–160 字符，描述≤5000、关键词≤20；图片1–8张；status=active/archived；参数数组带 label/value/unit 或已带单位的字符串 |
| SKU | id、productId、options、priceCents、currency、initialStock、maxPerOrder、status、imageId 可选 | id 与规格组合唯一；productId 必须存在；priceCents 为 1–999999 整数；currency 固定 USD；stock 0–999 整数；maxPerOrder 1–99，缺省10；最多3个规格维度、每维≤10值；status=active/archived |
| CartLine | skuId、quantity、addedAt、displaySnapshot | quantity 1–99；同 SKU 一行，最多20行；快照仅含必要名称/图/规格/上次显示价 |
| DemoState | schemaVersion、catalogVersion、revision、cartRevision、lastMutatedAt、cart、inventoryDeductions、activeAttempt、orders | 一份逻辑事务状态；revision 每次事务递增，cartRevision 仅购物车变化时递增；创建/结束pending不单独改变cartRevision；库存扣减为非负整数，以 SKU 为键 |
| CheckoutDraft | email、fullName、address1/2、city、state、zip、shippingMethod | 仅当前标签页内存；不存数据库、URL、日志或事件；提交后清空个人字段 |
| Attempt | id、state、cartRevision、catalogVersion、quoteSnapshot、scenario、startedAt、resolveAt、orderId 可选 | 快照含已校验商品/数量/费用/配送，不含个人信息；同浏览器最多一个 pending；提交前地址有效性只记录布尔值 |
| DemoOrder | id、attemptId、createdAt、status、itemsSnapshot、shippingMethod、subtotalCents、shippingCents、taxCents、totalCents、currency | status 仅 demo_placed；只接受本地模拟成功产物；无姓名、邮箱、地址、卡信息 |
| QueryState | q、category、brands、min/max、stockOnly、sort、page | 按第3节规范解析；URL 是列表已提交状态来源，筛选草稿留在组件内 |

所有展示文本作为纯文本渲染；商品数据不接受 HTML。图片只能引用随包资源，不接受用户填写任意脚本 URL。开发配置和前端源码不放密钥。客户端状态可被用户改写，因此此应用不提供真实价格、库存、身份、订单或支付可信性保证。

### 7.2 保存、过期和同步

| ID | 规则 |
| --- | --- |
| DATA-01 | 商品目录随静态包发布，浏览器不抓取第三方价格/库存。当前本地库存 = max(0, initialStock − 本地成功订单累计扣减)。目录无实时更新；重新部署/故障配置才会改变测试所称的“最新目录” |
| DATA-02 | 使用 IndexedDB 保存 DemoState，所有读改写以同一 readwrite 事务完成，支持跨标签页的去重与库存校验。React 内存状态为 UI 视图；localStorage 不承担订单/库存事务，禁止各模块独立写入造成部分成功 |
| DATA-03 | 同源其他标签页在事务提交后接收更新通知，重新读取已提交状态；重新聚焦也必须重读。两个标签同时编辑同一 SKU 时按事务顺序提交绝对数量，最后提交者生效并提示 Cart updated in another tab；加购增量在事务内读取最新数量累加 |
| DATA-04 | 状态在最后一次成功购物操作、订单变更或主动重置后保留30天；普通查看和失败操作不续期。now − lastMutatedAt ≥ 30天即清理整份演示状态并恢复初始库存，提示过期；发现时间戳在未来超过5分钟视为损坏并重置 |
| DATA-05 | 本地 schema 不兼容/JSON或记录损坏时清理本应用命名空间并提示 Demo data was reset；不得清理其他网站数据。可解析但包含未知SKU/超库存的合法行按购物车失效处理，不静默删除；负数/小数等结构非法使整个状态重置 |
| DATA-06 | 新 catalogVersion：保留可识别SKU的购物车与扣减，按新基准库存重新校验；删除SKU的购物车行保留快照并失效，旧订单快照不改。pending 标记 needs_review。相同SKU必须保持规格语义；重新定义规格必须更换SKU ID。旧标签若发现持久版本高于自身目录版本，暂停写入并提示刷新，不允许把目录降回旧版 |
| DATA-07 | IndexedDB 开启被阻止、不可写或配额不足时，启动阶段等待最多3秒后降为内存模式；运行中普通写失败先回滚本次操作，再显式提示无法保存，用户可在内存模式继续重试。降级前保留最后已确认状态，不把失败交易视为成功；已存在持久pending时遵守第6节save_blocked规则，不转入独立内存支付 |
| DATA-08 | 内存模式固定至本次页面会话结束，持续显示 Changes are temporary and will be lost when you refresh；可完整模拟选购下单，但不承诺刷新恢复或跨标签同步。降级时即说明刷新可能恢复上一次成功持久化快照；下次加载只展示成功读取的状态，本次临时订单丢失不伪称仍可查询 |
| DATA-09 | Reset demo data 二次确认后清购物车、订单、pending与扣减并广播；取消不改变状态。旧异步回调不得恢复被清理数据。演示支付场景选择仅用于当前attempt，不长期记录用户偏好 |

### 7.3 统一数据限制

最大购物数量为 20 × 99 = 1980 件，最大商品小计为 1,979,998,020 美分，仍须全程整数运算。所有库存/数量/金额验证同时覆盖非数字、非有限数及非安全整数。库存不足拒绝整个操作，不出现负库存或自动截断。购物车 schema 保存版本独立于商品目录版本，升级规则可分别演示。

商品/SKU/品牌/分类ID采用1–64位ASCII字母数字、短横线或下划线；slug为1–80位小写字母数字与短横线。attemptId为UUID，订单id为demo-加UUID。时间存UTC时间戳，订单时间按en-US和浏览器本地时区显示并注明时区。对存储读取到的数量上限、行数和重复SKU同样验证；非法结构不能绕过界面限制。断点变化保留筛选草稿，不能自动提交。

正常目录必须通过引用、唯一性、类型、价格、库存与规格完整性检查；故障用例只能通过显式测试 fixture 注入，不混入正常演示目录。

## 8 异常状态与恢复

| ID | 触发 | 用户看到的英文状态 | 数据影响和恢复 |
| --- | --- | --- | --- |
| ERR-01 | 初始目录/持久数据加载 | Loading products / Loading cart | 骨架保留布局；恢复完成前不展示错误的空车/可提交按钮 |
| ERR-02 | 目录为空/搜索无结果 | No products available / No products match your search | 前者可重试，后者保留条件并提供 Clear all；不得混为读取失败 |
| ERR-03 | 本地目录读取失败 | We couldn't load products. Try again. | 保留条件与已有车；禁用依赖未确认目录的购买操作；重试成功恢复 |
| ERR-04 | 图片加载失败 | Image unavailable | 保留占位与替代文本，其他交互正常 |
| ERR-05 | 商品/SKU不可售 | Out of stock / Item no longer available | 保留可识别信息，阻止购买；购物车可改规格或移除 |
| ERR-06 | 数量或组合不合法 | Choose your options / Only N available | 字段附近提示，操作不提交、不部分成功 |
| ERR-07 | 价格/库存变动 | Price updated / Only N available | 更新展示，用户复核或主动调整；提交途中变化终止本次尝试 |
| ERR-08 | 模拟拒付/技术失败/超时 | Demo payment declined / Something went wrong / Demo payment timed out | 购物车和库存保持；可换结果后重试，超时晚到回调无效 |
| ERR-09 | 保存失败/内存模式 | Changes can't be saved on this browser | 已失败写入回滚；明确临时状态，保留当前已确认内容供重试 |
| ERR-10 | 数据损坏/过期 | Demo data was reset / Your demo session expired | 仅清应用演示数据并恢复种子；未知订单显示无法找到 |
| ERR-11 | 跨标签提交/取消/冲突 | Checkout in progress / Cart updated in another tab | 使用已提交状态；pending 时不接受新写入，取消或完成后解锁 |
| ERR-12 | 离线/静态资源缺失 | You're offline. Some content may be unavailable. | 已加载目录和本地操作可用，模拟支付不依赖联网；未缓存整页冷启动不保证可用；重新联网可重试资源 |
| ERR-13 | 未知页面或订单 | Page not found / Demo order not found on this browser | 不展示空白或伪成功，保留 Continue shopping |

任何加载反馈应在操作后100毫秒内出现；可恢复错误保留用户有效输入。错误提示同时使用文字，不能只变红；不向消费者展示堆栈或存储实现名。

## 9 响应式和交互设计要求

| ID | 要求 | 可验收标准 |
| --- | --- | --- |
| UX-01 | 页面布局 | 320–359px列表1列，360–767px两列，768–1023px三列，≥1024px四列；最大内容宽1440px。320px无页面横向滚动；长名称/参数正确换行 |
| UX-02 | 筛选一致性 | 手机全屏/底部面板、平板抽屉、PC侧栏；所有尺寸均 Apply 提交草稿，Cancel/关闭放弃，Clear all在面板内仅清草稿；已选条件chips的移除即时生效。面板显示 Apply (N)，N为草稿预计结果 |
| UX-03 | 详情和购物车 | PC详情图集/购买区双栏，车为明细/费用两栏；手机单列、底部购买或结账栏，预留内容间距与安全区；软键盘打开时底栏不得盖住焦点和错误提示 |
| UX-04 | 可操作性 | 核心触控区域≥44×44 CSS px，作为本项目设计目标；所有功能不依赖hover。Tab顺序正确、焦点可见，Enter/Space可用，Escape可关闭弹层；弹层锁定焦点并还给原触发器 |
| UX-05 | 无障碍内容 | 语义化标题/表单label/按钮名称；规格使用可识别的选中状态；更新小计、加购、错误用适当live region播报。普通文字对比度目标≥4.5:1；不只用颜色表达；浏览器200%缩放可完成流程 |
| UX-06 | 动效和内容 | 尊重减少动态效果偏好；商品图固定宽高比避免跳动。尺寸、容量、重量带单位；英文/USD一致；Demo标识贯穿商品、费用、支付与结果 |

44px 是本项目更宽裕的触控目标，不能表述为 WCAG 2.2 AA 的统一最低尺寸；W3C 对 2.5.8 的说明采用 24 CSS px 或相应间距例外。本项目仍需实际无障碍测试，不因采用某个尺寸就宣称完全合规。[W3C 目标尺寸说明](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

## 10 Next.js 实现边界与非功能要求

| ID | 要求 | 交付标准 |
| --- | --- | --- |
| TECH-01 | 纯静态交付 | Next.js App Router + React + TypeScript；output: export；已知商品 slug 在构建时生成，静态 host 支持嵌套目录/index.html 与404。订单用静态页面+查询参数。无运行时API、Server Actions或SSR依赖 |
| TECH-02 | 浏览器状态 | 仅浏览器初始化阶段读取 IndexedDB；服务端/构建阶段只输出确定性壳与目录内容。商品查询、购物车、表单、模拟器是客户端交互；恢复完成前禁止依赖车数据的跳转，避免水合差异 |
| TECH-03 | 静态资源 | 产品图和字体随包提供，准备合适尺寸的WebP/AVIF及兼容fallback；不依赖运行时默认图片优化服务，可用静态picture/srcset。关键图片优先加载，非首屏延迟加载 |
| TECH-04 | 性能预算 | 在生产静态包、390×844、4Mbps下载/1Mbps上传/150ms RTT/CPU 4×减速、冷缓存下测3次：LCP中位数≤2.5s，CLS每次≤0.1；500商品/3000 SKU筛选响应≤200ms；操作反馈≤100ms。这是项目验收预算，非已测结果 |
| TECH-05 | 兼容矩阵 | 测试日Chrome/Edge/Safari当前与前一稳定主版本、iOS Safari/Android Chrome当前与前一主版本；记录具体版本。桌面Firefox当前版冒烟；关键设备需至少一台真实iOS与Android手机 |
| TECH-06 | 可演示异常 | 测试配置可指定空目录、目录错误、图片失败、库存/价格变化、schema不兼容、存储失败、支付结果和时间推进。普通购买流程仅展示清楚标注的Demo controls，工程故障入口不混入消费界面 |
| TECH-07 | 事件 | 仅本地开发事件记录，不接第三方分析。记录search/filter、view_item、add_to_cart、update/remove、begin_checkout、demo_payment_result、demo_order_placed及错误码；成功事务后记成功，按attemptId去重；不记录自由搜索文本、邮箱、姓名、地址、卡信息 |

Next.js 官方静态导出支持生成可静态托管的 HTML/CSS/JS；动态商品路径需预生成，浏览器 API 要在客户端访问；依赖服务器的功能和默认图片优化不适用于此交付方式。[Next.js 静态导出文档](https://nextjs.org/docs/app/guides/static-exports)

建议代码按 catalog/query、cart、pricing、checkout simulator、persistence 五个业务模块组织。金额函数、SKU匹配和状态变更使用同一套规则供所有设备复用；持久事务层负责去重与原子更新，组件不另算一套总价。

## 11 验收计划与交付门槛

配套测试文档按需求 ID 映射到前置条件、操作步骤和明确预期，覆盖正常路径、边界值、异常与恢复、响应式、无障碍和静态部署。用例执行前先加载指定 fixture，成功后核对页面与本地状态两层结果。支付成功不是仅检查成功提示，还必须验证订单恰好一条、扣库存一次、购物车一致。

交付门槛：全部P0需求的测试通过；阻断主流程、错价、负库存、重复下单、隐私数据落盘、状态丢失及移动端主操作不可达缺陷为0；兼容与性能预算达标。P1功能不阻塞首版。

建议自动化覆盖查询/SKU/金额纯函数、购物车合并和存储事务、模拟下单状态机；端到端覆盖发现→加购→编辑→失败重试→成功，以及刷新、多标签页和静态深链接。人工验证真实手机、读屏、长内容与视觉反馈。

形成性可用性验证：邀请5–8名代表性用户，在不提示操作路径的条件下执行第1节任务，至少80%独立完成，且无人把模拟结果理解成真实扣款。该目标是本项目验收建议，不是已取得数据。行为漏斗只在本地演示与受控测试中观察，不宣称线上销售转化率。

## 12 评审决策与后续交付

本轮可按文中默认值直接进入设计。需优先评审的产品选择为：美国演示地址范围、固定运税费规则、单SKU默认限购10件、全车结账、30天保存期。品牌、配色、字体与正式商品素材在视觉设计阶段选定；不会改变本版数据与交易规则。

后续顺序：确定上述业务规则 → 商品列表、详情、购物车、结账、结果页的PC/移动端视觉方案 → Next.js实现 → 按测试清单验收。真实支付、库存、订单和跨设备同步需要另立后端方案，不属于本版完成条件。
