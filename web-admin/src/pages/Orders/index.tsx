import { useState, useCallback, useEffect } from 'react'
import { Button, Tag, Space, message, Modal, Row, Col, Select, DatePicker, Dropdown } from 'antd'
import { ReloadOutlined, PlusOutlined, MoreOutlined, EyeOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import BaseTable from '../../components/BaseTable'
import type { ColumnsType } from 'antd/es/table'
import { get, post } from '../../utils/request'
import { usePermission } from '../../components/Authorized'

// ── 状态映射 ──
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'default' },
  confirmed: { label: '已确认', color: 'processing' },
  produced: { label: '已生产', color: 'orange' },
  shipped: { label: '已发货', color: 'warning' },
  arrived: { label: '已到货', color: 'geekblue' },
  delivered: { label: '已派送', color: 'purple' },
  installing: { label: '安装中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
  closed: { label: '已关闭', color: 'default' },
}

const PRODUCT_LINE_MAP: Record<string, string> = { wood: '木门', alloy: '合金门', security: '防盗门' }
const SOURCE_MAP: Record<string, string> = { brand_store: '装企', direct: '直单', direct_task: '直接任务' }

const STATUS_OPTIONS = Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))
const PRODUCT_LINE_OPTIONS = [
  { value: 'wood', label: '木门' },
  { value: 'alloy', label: '合金门' },
  { value: 'security', label: '防盗门' },
]

// 城市选项（硬编码主要城市）
const CITY_OPTIONS = [
  { value: '北京', label: '北京' },
  { value: '上海', label: '上海' },
  { value: '广州', label: '广州' },
  { value: '深圳', label: '深圳' },
  { value: '杭州', label: '杭州' },
  { value: '南京', label: '南京' },
  { value: '苏州', label: '苏州' },
  { value: '成都', label: '成都' },
  { value: '重庆', label: '重庆' },
  { value: '武汉', label: '武汉' },
  { value: '西安', label: '西安' },
  { value: '天津', label: '天津' },
]

// ── API 类型 ──
interface OrderRecord {
  id: number
  order_no: string
  source: string
  brand: number | null
  brand_name: string
  store: number | null
  store_name: string
  customer_name: string
  customer_phone: string
  customer_address: string
  status: string
  status_display: string
  product_line: string
  order_type: string
  order_type_display: string
  customer_price: number
  cost_price: number
  bill_no: string
  factory_order_no: string
  collected_fee: number
  created_at: string
  salesman_name: string
  notes: string
}

interface BrandOption {
  id: number
  name: string
}

// ── 主组件 ──
const Orders = () => {
  const navigate = useNavigate()
  const { hasPermission } = usePermission()

  const handleExport = () => {
    const params = new URLSearchParams()
    if (filters.product_line) params.set('product_line', filters.product_line)
    if (filters.status) params.set('status', filters.status)
    if (search) params.set('search', search)
    const token = localStorage.getItem('auth-storage')
    const tk = token ? JSON.parse(token).state?.token : ''
    window.open(`/api/v1/orders/export/?${params.toString()}`, '_blank')
    // Or use fetch to download with auth:
    // Actually need auth header, use fetch + blob
    fetch(`/api/v1/orders/export/?${params.toString()}`, {
      headers: { Authorization: `Bearer ${tk}` }
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'orders.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  // 数据状态
  const [data, setData] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 筛选状态
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')

  // 品牌数据
  const [brandOptions, setBrandOptions] = useState<{ value: string; label: string }[]>([])
  const [loadingBrands, setLoadingBrands] = useState(false)

  // 加载品牌数据
  const fetchBrands = useCallback(async () => {
    setLoadingBrands(true)
    try {
      const res = await get<any>('/decoration/brands/')
      const brands = Array.isArray(res) ? res : (res.items || res.results || [])
      const options = brands.map((brand: BrandOption) => ({
        value: String(brand.id),
        label: brand.name
      }))
      setBrandOptions(options)
    } catch (err: any) {
      console.error('加载品牌数据失败:', err)
    } finally {
      setLoadingBrands(false)
    }
  }, [])

  // 加载数据
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
      if (search) params.set('search', search)
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v)
      })

      const res = await get<any>(`/orders/?${params.toString()}`)
      // DRF paginated response: { count, results, next, previous }
      const results = Array.isArray(res) ? res : (res.items || res.results || [])
      setData(Array.isArray(results) ? results : [])
      setTotal(res.count || results.length || 0)
    } catch (err: any) {
      message.error(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, filters])

  useEffect(() => { 
    fetchData()
    fetchBrands()
  }, [fetchData])

  // 操作
  const handleConfirm = async (id: number) => {
    try {
      await post(`/orders/${id}/confirm/`)
      message.success('订单已确认')
      fetchData()
    } catch (err: any) {
      message.error(err.message || '操作失败')
    }
  }

  const handleCancel = async (id: number) => {
    Modal.confirm({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      okText: '确认取消',
      cancelText: '返回',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await post(`/orders/${id}/cancel/`, { reason: '手动取消' })
          message.success('订单已取消')
          fetchData()
        } catch (err: any) {
          message.error(err.message || '操作失败')
        }
      },
    })
  }

  const handleMarkProduction = async (id: number) => {
    try {
      await post(`/orders/${id}/mark-production/`)
      message.success('订单已标记为生产中')
      fetchData()
    } catch (err: any) {
      message.error(err.message || '操作失败')
    }
  }

  const handleRollback = (id: number, currentStatus: string) => {
    const statusLabel = STATUS_MAP[currentStatus]?.label || currentStatus
    Modal.confirm({
      title: '撤回确认',
      content: `确定要将订单状态从「${statusLabel}」回退吗？`,
      okText: '确认撤回',
      cancelText: '返回',
      onOk: async () => {
        try {
          await post(`/orders/${id}/rollback/`)
          message.success('状态已回退')
          fetchData()
        } catch (err: any) {
          message.error(err.message || '操作失败')
        }
      },
    })
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除', content: '确定要删除该订单吗？',
      okText: '删除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await post(`/orders/${id}/cancel/`, { reason: '删除' })
          message.success('已删除')
          fetchData()
        } catch (err: any) {
          message.error(err.message || '删除失败')
        }
      },
    })
  }

  // 列定义
  const columns: ColumnsType<OrderRecord> = [
    {
      title: '订单号', dataIndex: 'order_no', fixed: 'left', width: 150,
      render: (v, r) => <a onClick={() => navigate(`/app/orders/${r.id}`)}>{v}</a>,
    },
    { title: '来源', dataIndex: 'source', width: 80, render: v => <Tag>{SOURCE_MAP[v] || v}</Tag> },
    { title: '品牌', dataIndex: 'brand_name', width: 120, ellipsis: true },
    { title: '门店', dataIndex: 'store_name', width: 110, ellipsis: true },
    { title: '客户', dataIndex: 'customer_name', width: 80 },
    { title: '地址', dataIndex: 'customer_address', width: 140, ellipsis: true },
    {
      title: '产品线', dataIndex: 'product_line', width: 80,
      render: (v: string) => v ? PRODUCT_LINE_MAP[v] || v : '-',
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: v => {
        const s = STATUS_MAP[v]
        return s ? <Tag color={s.color}>{s.label}</Tag> : <Tag>{v}</Tag>
      },
    },
    {
      title: '应收金额', dataIndex: 'customer_price', width: 100,
      render: v => v ? `¥${Number(v).toLocaleString()}` : '-',
    },
    {
      title: '买单号', dataIndex: 'bill_no', width: 120, ellipsis: true,
      render: v => v || '-',
    },
    {
      title: 'CP编号', dataIndex: 'factory_order_no', width: 140, ellipsis: true,
      render: v => v || '-',
    },
    { title: '创建时间', dataIndex: 'created_at', width: 160 },
    {
      title: '操作', width: 220, fixed: 'right',
      render: (_, r) => {
        const actions: React.ReactNode[] = []

        if (r.status === 'pending') {
          actions.push(
            <Button type="link" size="small" onClick={() => handleConfirm(r.id)}>确认</Button>,
            <Button type="link" size="small" danger onClick={() => handleCancel(r.id)}>取消</Button>,
          )
        } else if (r.status === 'confirmed') {
          actions.push(
            <Button type="link" size="small" onClick={() => handleRollback(r.id, r.status)}>撤回确认</Button>,
            <Button type="link" size="small" onClick={() => handleMarkProduction(r.id)}>生产</Button>,
            <Button type="link" size="small" danger onClick={() => handleCancel(r.id)}>取消</Button>,
          )
        }

        return (
          <Space>
            {actions}
            <Dropdown menu={{
              items: [
                { key: 'detail', icon: <EyeOutlined />, label: '查看详情' },
                ...(hasPermission('orders-delete') ? [{ key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true }] : []),
              ],
              onClick: ({ key }) => {
                if (key === 'detail') navigate(`/app/orders/${r.id}`)
                else if (key === 'delete') handleDelete(r.id)
              },
            }}>
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        )
      },
    },
  ]

  // 筛选栏
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => {
      const next = { ...prev }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
    setPage(1)
  }

  const handleResetFilters = () => {
    setFilters({})
    setSearch('')
    setPage(1)
  }

  const filterRow = (
    <Row gutter={8} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <Col style={{ flexShrink: 0 }}>
        <Select
          value={filters.status || undefined}
          onChange={v => handleFilterChange('status', v)}
          placeholder="订单状态"
          options={STATUS_OPTIONS}
          allowClear showSearch optionFilterProp="label"
          style={{ width: 130 }} size="small"
        />
      </Col>
      <Col style={{ flexShrink: 0 }}>
        <Select
          value={filters.product_line || undefined}
          onChange={v => handleFilterChange('product_line', v)}
          placeholder="品类"
          options={PRODUCT_LINE_OPTIONS}
          allowClear showSearch optionFilterProp="label"
          style={{ width: 120 }} size="small"
        />
      </Col>
      <Col style={{ flexShrink: 0 }}>
        <Select
          value={filters.source || undefined}
          onChange={v => handleFilterChange('source', v)}
          placeholder="来源"
          options={[
            { value: 'brand_store', label: '装企' },
            { value: 'direct', label: '直单' },
            { value: 'direct_task', label: '直接任务' },
          ]}
          allowClear style={{ width: 120 }} size="small"
        />
      </Col>
      <Col style={{ flexShrink: 0 }}>
        <Select
          value={filters.brand || undefined}
          onChange={v => handleFilterChange('brand', v)}
          placeholder="品牌"
          options={brandOptions}
          allowClear showSearch optionFilterProp="label"
          loading={loadingBrands}
          style={{ width: 120 }} size="small"
        />
      </Col>
      <Col style={{ flexShrink: 0 }}>
        <Select
          value={filters.city || undefined}
          onChange={v => handleFilterChange('city', v)}
          placeholder="城市"
          options={CITY_OPTIONS}
          allowClear showSearch optionFilterProp="label"
          style={{ width: 120 }} size="small"
        />
      </Col>
      <Col style={{ flexShrink: 0 }}>
        <Button size="small" icon={<ReloadOutlined />} onClick={handleResetFilters}>重置</Button>
      </Col>
    </Row>
  )

  return (
    <div>
      <div className="page-header">
        <div><h2>订单管理</h2><p>管理所有门窗安装订单</p></div>
      </div>

      <BaseTable
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        searchFields={[{ key: 'search', label: '订单号/客户名/手机号', placeholder: '搜索订单号/客户名/手机号' }]}
        onSearch={(values) => { const q = values.search || values.key || ''; setSearch(q); setPage(1) }}
        filterOptions={[]}
        extraFilters={filterRow}
        toolbarExtra={
          <Space>
            <Button 
              type="default" 
              icon={<PlusOutlined />} 
              onClick={() => navigate('/app/orders/create')}
              size="small"
            >
              新建订单
            </Button>
            <Button 
              type="default" 
              icon={<DownloadOutlined />} 
              onClick={handleExport}
              size="small"
            >
              导出Excel
            </Button>
          </Space>
        }
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps) },
        }}
        scroll={{ x: 1500 }}
      />
    </div>
  )
}

export default Orders
