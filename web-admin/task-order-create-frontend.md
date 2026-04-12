# Task: Frontend Order Create/Edit Page - Factory Order Form Layout

## Context
- Frontend path: C:\workspace\web-admin
- Framework: React 18 + TypeScript + Ant Design 5 + Zustand
- Request util: src/utils/request.ts (get, post, put, del, upload)

## Goal
Create a new order page that visually replicates the factory order forms.
The clerk (文员) should feel like they are filling the same Excel form, just on a web page.

## Page Structure

### Order Header Section
```
+----------------------------------------------------------+
| 装企: [Select]  门店: [Select]                           |
| 客户姓名: [Input]  电话: [Input]  地址: [Input]          |
| 买单号: [Input]  CP下单编号: [Input]                     |
| 应收金额: [InputNumber]  已收劳务费: [InputNumber]        |
| 订单性质: [Select] 主单/补单/售后                        |
| 备注: [TextArea]                                          |
| 订货单附件: [Upload]                                      |
+----------------------------------------------------------+
```

### Product Line Tabs
Three tabs: 防盗门 | 铝合金 | 木门

Each tab shows a different table layout matching the factory Excel form.

### Security Door Table (防盗门)
Columns: 型号 | 规格(高×宽) | 色泽 | 外开左 | 外开右 | 内开左 | 内开右 | 数量 | 等级 | 板材厚度 | 铰链 | 胶条 | 装饰套 | 锁芯 | 锁体 | 把手 | 内填充 | 门铃 | 猫眼 | 备注 | 平方 | 单价 | 总价

Action: Add row / Delete row

### Alloy Door Table (铝合金)
Columns: 编号 | 位置 | 产品系列 | 门型 | 类别 | 型号 | 门套 | 品牌 | 高 | 宽 | 墙厚 | 颜色 | 吊脚 | 玻璃工艺 | 底玻 | 开启方向 | 面积 | 产品报价 | 包套线(米) | 包套线(单价) | 包套线(合计) | 玻璃报价 | 玻璃合计 | 五金合计 | 合计金额 | 备注

### Wood Door Table (木门)
Columns: 序号 | 位置 | 产品号 | 颜色 | 产品名称 | 高 | 宽 | 厚 | 门扇高 | 门扇宽 | 门扇厚 | 竖框 | 横框 | 门边线(尺寸) | 门边线(型) | 数量 | 单位 | 开向 | 备注 | 单价 | 金额

### Submit
POST /api/v1/orders/ with header fields + items array

## API Format

Create order:
```json
POST /api/v1/orders/
{
  "brand": 1,
  "store": 1,
  "customer_name": "陈队",
  "customer_phone": "13005185942",
  "customer_address": "白云区...",
  "bill_no": "351072105...",
  "factory_order_no": "CP-26030900090",
  "customer_price": 4640,
  "cost_price": 1746,
  "collected_fee": 0,
  "order_type": "main",
  "notes": "搬楼费450",
  "items": [
    {
      "product_type": "security",
      "product_model": "6283",
      "color": "标配色",
      "size_height": "2050",
      "size_width": "960",
      "quantity": 1,
      "unit": "樘",
      "open_direction": "外开左",
      "custom_type": "定制",
      "specs": {
        "grade": "4",
        "board_thickness": "标配",
        "hinge": "标配",
        "lock_core": "标配",
        "lock_body": "标配",
        "handle": "标配机械锁",
        "doorbell": "无",
        "peephole": "无",
        "remark": "标配隐形门楣"
      },
      "unit_price": 0,
      "total_price": 0,
      "hardware_items": [
        {"name": "PW-001", "model": "标准", "quantity": 1, "price": 153}
      ],
      "notes": ""
    }
  ]
}
```

## Reference Files
The original Excel forms are at:
- C:\Users\Administrator\Desktop\罗湖整装 深圳龙岗兰花路39号.xlsx (security)
- C:\Users\Administrator\Desktop\4.7（铝）南山区松坪山竹苑7-1-701(1).xlsx (alloy)
- C:\Users\Administrator\Desktop\4.7（木）南山区松坪山竹苑7-1-701(1).xlsx (wood)

Read these files to understand exact layout. The web form should match them visually.

## Style
- Match existing Apple HIG dark style of the web admin
- Tables should use Ant Design Table with editable cells
- Use Ant Design Form for header section
- Tabs: Ant Design Tabs

## IMPORTANT
- Use request.ts for all API calls, NOT raw fetch
- Chinese text for all labels
- Keep table columns matching factory Excel forms exactly
- Support multiple product items per order (add/delete rows)
- Position field (位置) is important for alloy and wood doors
