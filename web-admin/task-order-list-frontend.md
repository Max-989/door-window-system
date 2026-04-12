# Task: Frontend Order List - Replace Mock with Real API

## Context
- Frontend path: C:\workspace\web-admin
- Framework: React 18 + TypeScript + Ant Design 5 + Zustand
- API base: localhost:8000 (Vite proxy /api -> localhost:8000)
- Request util: src/utils/request.ts (get, post, put, del, upload)
- Auth: src/stores/auth.store.ts (token in localStorage)

## Current Problem
- src/pages/Orders/index.tsx (29KB) uses mockData, no API calls
- src/pages/Orders/OrderDetail.tsx (2.8KB) also uses mock data

## Task

### 1. Order List Page (src/pages/Orders/index.tsx)

Replace mock data with real API calls:

```typescript
// API endpoints
GET /api/v1/orders/              // list with filters
GET /api/v1/orders/{id}/         // detail
POST /api/v1/orders/             // create
PATCH /api/v1/orders/{id}/       // update
POST /api/v1/orders/{id}/confirm/   // confirm
POST /api/v1/orders/{id}/cancel/    // cancel
POST /api/v1/orders/{id}/mark-arrived/ // mark arrived
```

Order list response format (paginated):
```json
{
  "count": 100,
  "next": "http://...",
  "previous": null,
  "results": [
    {
      "id": 1,
      "order_no": "3733",
      "customer_name": "陈队",
      "customer_phone": "13005185942",
      "customer_address": "白云区...",
      "product_line": "wood",
      "status": "pending",
      "order_type": "main",
      "brand": {"id": 1, "name": "百安居天河店"},
      "store": {"id": 1, "name": "天河店"},
      "customer_price": 4640,
      "cost_price": 1746,
      "bill_no": "351072105...",
      "factory_order_no": "CP-26030900090",
      "collected_fee": 0,
      "created_at": "2026-03-05T00:00:00+08:00",
      "notes": "搬楼费450"
    }
  ]
}
```

Status mapping:
```typescript
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'default' },
  confirmed: { label: '已确认', color: 'processing' },
  in_production: { label: '生产中', color: 'processing' },
  shipped: { label: '已发货', color: 'warning' },
  arrived: { label: '已到货', color: 'warning' },
  delivered: { label: '已派送', color: 'processing' },
  installing: { label: '安装中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
  closed: { label: '已关闭', color: 'default' },
};

const PRODUCT_LINE_MAP: Record<string, string> = {
  wood: '木门',
  alloy: '合金门',
  security: '防盗门',
};
```

Filters to keep:
- brand (brand ID)
- product_line (wood/alloy/security)
- status
- city (search in customer_address)

Actions column:
- View detail -> navigate to /orders/:id
- Confirm button (only when status=pending)
- Cancel button (only when status not in [completed, closed, cancelled])

### 2. Order Detail Page (src/pages/Orders/OrderDetail.tsx)

Fetch from: GET /api/v1/orders/{id}/
Display: order info + items list + status timeline

Keep existing page structure but replace mock data.

### 3. Use request.ts for all API calls

```typescript
import { get, post, put, del } from '@/utils/request';
// NOT raw fetch, NOT axios directly
```

## IMPORTANT
- Use Chinese text for UI labels
- Keep the existing BaseTable component pattern
- Do NOT remove any existing working code
- Only replace mock data sections with real API calls
- Handle loading states and error messages
