import { useState, useEffect, useMemo, useCallback } from 'react'
import { Row, Col, Card, Table, Tag, List, Typography, Select, DatePicker, Space, Spin } from 'antd'
import {
  ShoppingOutlined, ToolOutlined, CompressOutlined, AlertOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import StatusTag from '../../components/StatusTag'
import { get } from '../../utils/request'

const { Text } = Typography
const { RangePicker } = DatePicker

interface OrderRecord {
  id: number
  order_no: string
  customer_name: string
  product_line: string
  status: string
  customer_price: number
  created_at: string
  source: string
  brand_name?: string
}

interface InventoryStats {
  not_arrived: number
  not_delivered: number
  hardware_alert: number
  pending_unmatched: number
}

interface OrderStats {
  total: number
  completed: number
  cancelled: number
  total_amount: number | string
  completion_rate: number
  by_status: Array<{ status: string; count: number }>
  by_source: Array<{ source: string; count: number }>
}

const productLineLabels: Record<string, string> = { wood: '木门', alloy: '合金门', security: '防盗门' }
const productLineColors: Record<string, string> = { wood: 'orange', alloy: 'blue', security: 'purple' }

const Dashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null)
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null)
  const [filterCity, setFilterCity] = useState<string | undefined>()
  const [filterBrand, setFilterBrand] = useState<string | undefined>()
  const [filterDateRange, setFilterDateRange] = useState<[any, any] | null>(null)
  const [startDate, setStartDate] = useState<string | undefined>()
  const [endDate, setEndDate] = useState<string | undefined>()
  const [brands, setBrands] = useState<any[]>([])

  // 加载品牌列表（用于筛选下拉）
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await get<any>('/decoration/brands/')
        const list = Array.isArray(res) ? res : (res.results || [])
        setBrands(list.map((b: any) => ({ value: b.id, label: b.name })))
      } catch { /* ignore */ }
    }
    fetchBrands()
  }, [])

  // 加载订单列表和统计
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 并行加载订单和统计数据
      const params = new URLSearchParams()
      if (startDate) params.set('start_date', startDate)
      if (endDate) params.set('end_date', endDate)

      const [ordersRes, statsRes, inventoryRes] = await Promise.allSettled([
        get<any>(`/orders/?${params.toString()}&page_size=20`),
        get<any>(`/reports/orders/?${params.toString()}`),
        get<any>('/reports/inventory/'),
      ])

      if (ordersRes.status === 'fulfilled') {
        const r = ordersRes.value
        const list = Array.isArray(r) ? r : (r.results || r.data?.items || r.data || [])
        setOrders(list)
      }

      if (statsRes.status === 'fulfilled') {
        setOrderStats(statsRes.value)
      }

      if (inventoryRes.status === 'fulfilled') {
        setInventoryStats(inventoryRes.value)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { fetchData() }, [fetchData])

  // 日期筛选
  const handleDateRangeChange = (dates: any) => {
    setFilterDateRange(dates)
    if (dates && dates[0] && dates[1]) {
      setStartDate(dates[0].format('YYYY-MM-DD'))
      setEndDate(dates[1].format('YYYY-MM-DD'))
    } else {
      setStartDate(undefined)
      setEndDate(undefined)
    }
  }

  const handleReset = () => {
    setFilterCity(undefined)
    setFilterBrand(undefined)
    setFilterDateRange(null)
    setStartDate(undefined)
    setEndDate(undefined)
  }

  const hasFilter = filterCity || filterBrand || filterDateRange

  // 过滤订单
  const filteredOrders = useMemo(() => {
    const data = [...orders]
    // 前端不支持城市过滤（后端 customer_address 模糊），品牌可过滤
    return data
  }, [orders])

  // 统计卡片数据
  const stats = useMemo(() => {
    const s = orderStats?.summary
    return [
      { title: '总订单', value: s?.total ?? 0, suffix: '单', icon: <ShoppingOutlined />, color: '#007AFF', bg: 'rgba(0,122,255,0.1)' },
      { title: '已完成', value: s?.completed ?? 0, suffix: '单', icon: <CompressOutlined />, color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
      { title: '已取消', value: s?.cancelled ?? 0, suffix: '单', icon: <AlertOutlined />, color: '#FF3B30', bg: 'rgba(255,59,48,0.1)' },
      { title: '五金预警', value: inventoryStats?.hardware_alert ?? 0, suffix: '项', icon: <ToolOutlined />, color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
    ]
  }, [orderStats, inventoryStats])

  const orderColumns = [
    { title: '订单号', dataIndex: 'order_no', render: (v: string) => <a onClick={() => navigate(`/app/orders/${v}`)}>{v}</a> },
    { title: '客户', dataIndex: 'customer_name' },
    { title: '产品线', dataIndex: 'product_line', render: (v: string) => <Tag color={productLineColors[v]}>{productLineLabels[v]}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <StatusTag status={v} /> },
    { title: '金额', dataIndex: 'customer_price', render: (v: number) => v ? `¥${Number(v).toLocaleString()}` : '-' },
    { title: '时间', dataIndex: 'created_at', width: 160 },
  ]

  // 库存概览数据
  const inventorySummary = useMemo(() => {
    if (!inventoryStats) return []
    return [
      { key: 'not_arrived', label: '已确认未到货', value: inventoryStats.not_arrived, color: '#FF9500' },
      { key: 'not_delivered', label: '未派送', value: inventoryStats.not_delivered, color: '#007AFF' },
      { key: 'hardware_alert', label: '五金预警', value: inventoryStats.hardware_alert, color: '#FF3B30' },
      { key: 'pending_unmatched', label: '暂存未匹配', value: inventoryStats.pending_unmatched, color: '#86868B' },
    ]
  }, [inventoryStats])

  return (
    <div>
      <div className="page-header">
        <h2>工作台</h2>
        <p>欢迎回来，今日业务概览</p>
      </div>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '16px 24px' }}>
        <Space size="middle" wrap>
          <Select
            placeholder="品牌"
            value={filterBrand}
            onChange={setFilterBrand}
            allowClear
            onClear={() => setFilterBrand(undefined)}
            style={{ width: 160 }}
            options={brands}
          />
          <RangePicker
            value={filterDateRange}
            onChange={handleDateRangeChange}
            placeholder={['开始日期', '结束日期']}
          />
          {hasFilter && (
            <a onClick={handleReset} style={{ fontSize: 13 }}>重置筛选</a>
          )}
        </Space>
      </Card>

      <Spin spinning={loading}>
        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {stats.map((s, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card bodyStyle={{ padding: '24px' }} style={{ border: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: s.color, fontSize: 22, flexShrink: 0,
                  }}>
                    {s.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 13, color: '#86868B', marginTop: 4 }}>
                      {s.title}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="最近订单" bodyStyle={{ padding: 0 }} extra={<a onClick={() => navigate('/app/orders')} style={{ color: '#007AFF' }}>查看全部 <RightOutlined /></a>}>
              <Table
                columns={orderColumns}
                dataSource={filteredOrders}
                rowKey="id"
                pagination={false}
                size="small"
                loading={loading}
                locale={{ emptyText: '暂无订单数据' }}
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            {/* 库存概览 */}
            <Card title="库存概览" style={{ marginBottom: 16 }}>
              <List
                dataSource={inventorySummary}
                renderItem={item => (
                  <List.Item style={{ padding: '10px 0' }}>
                    <List.Item.Meta
                      avatar={<div style={{
                        width: 36, height: 36, borderRadius: 8, background: `${item.color}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: item.color, fontSize: 14, fontWeight: 600,
                      }}>{item.value}</div>}
                      title={<Text>{item.label}</Text>}
                    />
                  </List.Item>
                )}
              />
            </Card>

            {/* 订单状态分布 */}
            {orderStats?.by_status && (
              <Card title="订单状态分布">
                <List
                  dataSource={orderStats.by_status.slice(0, 5)}
                  renderItem={item => (
                    <List.Item style={{ padding: '8px 0' }}>
                      <Space>
                        <StatusTag status={item.status} />
                        <Text>{item.count} 单</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </Col>
        </Row>
      </Spin>
    </div>
  )
}

export default Dashboard
