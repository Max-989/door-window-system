import { useState, useEffect, useCallback } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Select, Typography, DatePicker, Space, Spin, message } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import StatusTag from '../../components/StatusTag'
import { get } from '../../utils/request'
import './style.css'

const { Text } = Typography

// ── API 类型 ──
interface ProfitStats {
  second_party_profit: number
  foreman_profit: number
  monthly_order_count: number
  completion_rate: number
  profit_trend: number
  foreman_profit_trend: number
  order_trend: number
  completion_trend: number
}

interface OrderReport {
  id: number
  brand: string
  store: string
  product_type: string
  month: string
  order_count: number
  total_amount: number
  completed_rate: number
}

interface WorkerPerformance {
  id: number
  name: string
  branch: string
  measurement_count: number
  install_count: number
  repair_count: number
  total_wage: number
  reject_rate: number
}

interface MaintenanceReport {
  id: number
  month: string
  total_count: number
  factory_count: number
  logistics_count: number
  install_count: number
  other_count: number
  total_cost: number
}

const Reports = () => {
  const [period, setPeriod] = useState('month')
  const [customRange, setCustomRange] = useState<[any, any] | null>(null)

  // 数据状态
  const [profitStats, setProfitStats] = useState<ProfitStats | null>(null)
  const [orderStats, setOrderStats] = useState<OrderReport[]>([])
  const [workerPerf, setWorkerPerf] = useState<WorkerPerformance[]>([])
  const [repairStats, setRepairStats] = useState<MaintenanceReport[]>([])

  // 加载状态
  const [loadingProfit, setLoadingProfit] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [loadingRepair, setLoadingRepair] = useState(false)

  // 构建查询参数
  const buildParams = useCallback(() => {
    const params = new URLSearchParams()
    params.set('period', period)
    if (period === 'custom' && customRange && customRange[0] && customRange[1]) {
      params.set('start_date', customRange[0].format('YYYY-MM-DD'))
      params.set('end_date', customRange[1].format('YYYY-MM-DD'))
    }
    return params.toString()
  }, [period, customRange])

  // 加载利润统计
  const fetchProfitStats = useCallback(async () => {
    setLoadingProfit(true)
    try {
      const res = await get<ProfitStats>(`/reports/profit/?${buildParams()}`)
      setProfitStats(res)
    } catch (err: any) {
      console.error('加载利润统计失败:', err)
      message.error(err.message || '加载利润统计失败')
    } finally {
      setLoadingProfit(false)
    }
  }, [buildParams])

  // 加载订单统计
  const fetchOrderStats = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const res = await get<any>(`/reports/orders/?${buildParams()}`)
      const results = Array.isArray(res) ? res : (res.items || res.results || [])
      setOrderStats(Array.isArray(results) ? results : [])
    } catch (err: any) {
      console.error('加载订单统计失败:', err)
      message.error(err.message || '加载订单统计失败')
    } finally {
      setLoadingOrders(false)
    }
  }, [buildParams])

  // 加载师傅绩效
  const fetchWorkerPerf = useCallback(async () => {
    setLoadingWorkers(true)
    try {
      const res = await get<any>(`/reports/worker-performance/?${buildParams()}`)
      const results = Array.isArray(res) ? res : (res.items || res.results || [])
      setWorkerPerf(Array.isArray(results) ? results : [])
    } catch (err: any) {
      console.error('加载师傅绩效失败:', err)
      message.error(err.message || '加载师傅绩效失败')
    } finally {
      setLoadingWorkers(false)
    }
  }, [buildParams])

  // 加载维修统计
  const fetchRepairStats = useCallback(async () => {
    setLoadingRepair(true)
    try {
      const res = await get<any>(`/reports/maintenance/?${buildParams()}`)
      const results = Array.isArray(res) ? res : (res.items || res.results || [])
      setRepairStats(Array.isArray(results) ? results : [])
    } catch (err: any) {
      console.error('加载维修统计失败:', err)
      message.error(err.message || '加载维修统计失败')
    } finally {
      setLoadingRepair(false)
    }
  }, [buildParams])

  // 统一加载所有数据
  useEffect(() => {
    fetchProfitStats()
    fetchOrderStats()
    fetchWorkerPerf()
    fetchRepairStats()
  }, [fetchProfitStats, fetchOrderStats, fetchWorkerPerf, fetchRepairStats])

  // 统计卡片配置（从 API 数据动态生成）
  const statsCards = profitStats ? [
    {
      title: '乙方利润',
      value: profitStats.second_party_profit,
      prefix: '¥',
      trend: profitStats.profit_trend,
      color: '#34C759',
    },
    {
      title: '工头利润',
      value: profitStats.foreman_profit,
      prefix: '¥',
      trend: profitStats.foreman_profit_trend,
      color: '#007AFF',
    },
    {
      title: '本月订单量',
      value: profitStats.monthly_order_count,
      suffix: '单',
      trend: profitStats.order_trend,
      color: '#5856D6',
    },
    {
      title: '安装完成率',
      value: profitStats.completion_rate,
      suffix: '%',
      trend: profitStats.completion_trend,
      color: '#FF9500',
    },
  ] : []

  // 列定义
  const orderCols = [
    { title: '品牌', dataIndex: 'brand', width: 100 },
    { title: '门店', dataIndex: 'store', width: 110 },
    {
      title: '产品类型', dataIndex: 'product_type', width: 90,
      render: (v: string) => <Tag color={{ 木门: 'orange', 合金门: 'blue', 防盗门: 'purple' }[v] || 'default'}>{v}</Tag>,
    },
    { title: '月份', dataIndex: 'month', width: 80 },
    { title: '订单数', dataIndex: 'order_count', width: 80 },
    {
      title: '金额', dataIndex: 'total_amount', width: 110,
      render: (v: number) => `¥${(v || 0).toLocaleString()}`,
    },
    {
      title: '完成率', dataIndex: 'completed_rate', width: 80,
      render: (v: number) => <span style={{ color: v >= 90 ? '#34C759' : v >= 80 ? '#FF9500' : '#FF3B30' }}>{v}%</span>,
    },
  ]

  const workerCols = [
    { title: '姓名', dataIndex: 'name', width: 80 },
    { title: '分公司', dataIndex: 'branch', width: 100 },
    { title: '量尺', dataIndex: 'measurement_count', width: 70 },
    { title: '安装', dataIndex: 'install_count', width: 70 },
    { title: '维修', dataIndex: 'repair_count', width: 70 },
    {
      title: '工费', dataIndex: 'total_wage', width: 100,
      render: (v: number) => <span style={{ fontWeight: 600 }}>¥{(v || 0).toLocaleString()}</span>,
    },
    {
      title: '拒单率', dataIndex: 'reject_rate', width: 80,
      render: (v: number) => <span style={{ color: v > 5 ? '#FF3B30' : '#34C759' }}>{v}%</span>,
    },
  ]

  const repairCols = [
    { title: '月份', dataIndex: 'month', width: 80 },
    { title: '总次数', dataIndex: 'total_count', width: 80 },
    { title: '工厂', dataIndex: 'factory_count', width: 70 },
    { title: '物流', dataIndex: 'logistics_count', width: 70 },
    { title: '安装', dataIndex: 'install_count', width: 70 },
    { title: '其他', dataIndex: 'other_count', width: 70 },
    {
      title: '费用', dataIndex: 'total_cost', width: 100,
      render: (v: number) => `¥${(v || 0).toLocaleString()}`,
    },
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>数据看板</h2>
          <p>业务数据统计与分析</p>
        </div>
        <Space size="middle">
          <Select
            value={period}
            onChange={v => setPeriod(v)}
            style={{ width: 120 }}
            options={[
              { value: 'day', label: '今日' },
              { value: 'week', label: '本周' },
              { value: 'month', label: '本月' },
              { value: 'quarter', label: '本季度' },
              { value: 'custom', label: '自定义' },
            ]}
          />
          {period === 'custom' && (
            <DatePicker.RangePicker
              value={customRange}
              onChange={setCustomRange}
              placeholder={['开始日期', '结束日期']}
            />
          )}
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Spin spinning={loadingProfit}>
          <Row gutter={[16, 16]}>
            {statsCards.map((s, i) => (
              <Col xs={24} sm={12} lg={6} key={i}>
                <Card bodyStyle={{ padding: '20px 24px' }}>
                  <Statistic
                    title={<Text style={{ color: '#86868b' }}>{s.title}</Text>}
                    value={s.value}
                    prefix={s.prefix ? <span>¥</span> : undefined}
                    suffix={s.suffix}
                    valueStyle={{ color: s.color, fontWeight: 600, fontSize: 24 }}
                  />
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    {typeof s.trend === 'number' && !isNaN(s.trend) ? (
                      <span style={{ color: s.trend >= 0 ? '#34C759' : '#FF3B30' }}>
                        {s.trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(s.trend)}%
                      </span>
                    ) : (
                      <span style={{ color: '#86868b' }}>--</span>
                    )}
                    <span style={{ color: '#86868b', marginLeft: 4 }}>较上月</span>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Spin>
      </Row>

      {/* 订单统计 */}
      <Card title="订单统计" style={{ marginBottom: 16 }}>
        <Table
          columns={orderCols}
          dataSource={orderStats}
          rowKey="id"
          loading={loadingOrders}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无数据' }}
        />
      </Card>

      <Row gutter={16}>
        {/* 师傅绩效 */}
        <Col xs={24} lg={16}>
          <Card title="师傅绩效" style={{ marginBottom: 16 }}>
            <Table
              columns={workerCols}
              dataSource={workerPerf}
              rowKey="id"
              loading={loadingWorkers}
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无数据' }}
            />
          </Card>
        </Col>

        {/* 维修统计 */}
        <Col xs={24} lg={8}>
          <Card title="维修统计">
            <Table
              columns={repairCols}
              dataSource={repairStats}
              rowKey="id"
              loading={loadingRepair}
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无数据' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Reports
