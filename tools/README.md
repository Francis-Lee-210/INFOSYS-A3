# SAP API probe

从仓库根目录运行方式见[根README](../README.md#检查候选api)。脚本读取`SAP_APIKEY`环境变量，不包含密钥；发起GET，并在本目录保存响应样本。结果文件默认不进入Git。

脚本的候选标签只是技术探索提示，不代表团队选型。`verify:true`路径仍需通过SAP API Hub的Try Out URL核对；不要把404自动解释为该API完全不可用，也不要把产品/订单字段直接当作Spark真实套餐或用量数据。本次整理未执行带Key探测。
