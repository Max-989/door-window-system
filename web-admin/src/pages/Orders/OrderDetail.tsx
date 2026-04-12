import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Steps, Button, Tag, Timeline, message, Spin, Space } from 'antd'
import { ArrowLeftOutlined, ToolOutlined } from '@ant-design/icons'
import { get, post } from '../../utils/request'
import { useState, useEffect } from 'react'

const STATUS_FLOW = ['pending', 'confirmed', 'produced', 'shipped', 'arrived', 'delivered', 'installing', 'completed']
const STATUS_LABELS: Record<string, string> = {
  pending: '待确认', confirmed: '已确认', produced: '已生产',
  shipped: '已发货', arrived: '已到货', delivered: '已派送',
  installing: '安装中', completed: '已完成', cancelled: '已取消', closed: '已关闭',
}
const PRODUCT_LINE_MAP: Record<string, string> = { wood: '木门', alloy: '合金门', security: '防盗门' }

interface OrderData {
  id: number; order_no: string; source: string; source_display: string
  brand_name: string; store_name: string
  customer_name: string; customer_phone: string; customer_address: string
  status: string; status_display: string; product_line: string
  order_type: string; order_type_display: string
  customer_price: number; cost_price: number
  bill_no: string; factory_order_no: string; collected_fee: number
  notes: string; salesman_name: string; salesman_phone: string
  created_at: string; updated_at: string
  created_by_name: string; confirmed_by_name: string
  items: any[]
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<any[]>([])

  const fetchOrder = async () => {
    setLoading(true)
    try {
      const res = await get<any>(`/orders/${id}/`)
      setOrder(res)
    } catch (err: any) {
      message.error(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      const res = await get<any>(`/order-change-logs/?order=${id}`)
      setLogs(Array.isArray(res) ? res : res.results || [])
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchOrder(); fetchLogs() }, [id])

  const handleConfirm = async () => {
    try {
      await post(`/orders/${id}/confirm/`)
      message.success('订单已确认')
      fetchOrder()
    } catch (err: any) { message.error(err.message) }
  }

  const handleCancel = async () => {
    try {
      await post(`/orders/${id}/cancel/`, { reason: '手动取消' })
      message.success('订单已取消')
      fetchOrder()
    } catch (err: any) { message.error(err.message) }
  }

  const handleStartProduction = async () => {
    try {
      await post(`/orders/${id}/start-production/`)
      message.success('已开始生产')
      fetchOrder()
    } catch (err: any) { message.error(err.message) }
  }

  const handleCreateInstallation = async () => {
    try {
      await post('/installations/create-from-order/', { order_id: id })
      message.success('安装单已生成')
      navigate('/app/tasks')
    } catch (err: any) {
      message.error(err.message || '生成安装单失败')
    }
  }

  const handleCreateMaintenance = async () => {
    try {
      await post('/maintenance/tasks/create-from-order/', { order_id: id })
      message.success('售后单已生成')
      navigate('/app/tasks')
    } catch (err: any) {
      message.error(err.message || '生成售后单失败')
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />
  if (!order) return <div>订单不存在</div>

  // 当前步骤（排除 cancelled/closed）
  const currentStep = STATUS_FLOW.indexOf(order.status)

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/app/orders')} style={{ marginBottom: 16 }}>返回列表</Button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>订单详情 - {order.order_no}</h2>
        <Space>
          {order.status === 'pending' && (
            <>
              <Button type="primary" onClick={handleConfirm}>确认订单</Button>
              <Button danger onClick={handleCancel}>取消订单</Button>
            </>
          )}
          {order.status === 'confirmed' && (
            <Button type="primary" onClick={handleStartProduction}>开始生产</Button>
          )}
          {['confirmed', 'produced', 'shipped'].includes(order.status) && (
            <>
              <Button icon={<ToolOutlined />} onClick={handleCreateInstallation}>生成安装单</Button>
              <Button icon={<ToolOutlined />} style={{ borderColor: '#722ed1', color: '#722ed1' }} onClick={handleCreateMaintenance}>生成售后单</Button>
            </>
          )}
        </Space>
      </div>

      {/* 状态流转 */}
      <Card style={{ marginBottom: 16 }}>
        <Steps
          current={currentStep}
          items={STATUS_FLOW.map(s => ({
            title: STATUS_LABELS[s] || s,
            status: order.status === 'cancelled' ? 'error' : undefined,
          }))}
          style={{ marginBottom: 0 }}
        />
      </Card>

      {/* 订单信息 */}
      <Card title="订单信息" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={3} size="small">
          <Descriptions.Item label="订单号">{order.order_no}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={
              order.status === 'completed' ? 'success' :
              order.status === 'cancelled' ? 'error' :
              ['pending'].includes(order.status) ? 'default' : 'processing'
            }>{order.status_display}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="产品线">{PRODUCT_LINE_MAP[order.product_line] || order.product_line}</Descriptions.Item>
          <Descriptions.Item label="来源">{order.source_display}</Descriptions.Item>
          <Descriptions.Item label="品牌">{order.brand_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="门店">{order.store_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="客户">{order.customer_name}</Descriptions.Item>
          <Descriptions.Item label="电话">{order.customer_phone}</Descriptions.Item>
          <Descriptions.Item label="地址">{order.customer_address}</Descriptions.Item>
          <Descriptions.Item label="应收金额">{order.customer_price ? `¥${Number(order.customer_price).toLocaleString()}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="买单号">{order.bill_no || '-'}</Descriptions.Item>
          <Descriptions.Item label="CP编号">{order.factory_order_no || '-'}</Descriptions.Item>
          <Descriptions.Item label="已收劳务费">{order.collected_fee ? `¥${Number(order.collected_fee).toLocaleString()}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="创建人">{order.created_by_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{order.created_at}</Descriptions.Item>
          <Descriptions.Item label="导购">{order.salesman_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>{order.notes || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 产品明细 */}
      <Card title="产品明细" style={{ marginBottom: 16 }}>
        {order.items && order.items.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>产品类型</th>
                <th style={thStyle}>型号</th>
                <th style={thStyle}>名称</th>
                <th style={thStyle}>颜色</th>
                <th style={thStyle}>位置</th>
                <th style={thStyle}>高</th>
                <th style={thStyle}>宽</th>
                <th style={thStyle}>开向</th>
                <th style={thStyle}>数量</th>
                <th style={thStyle}>单价</th>
                <th style={thStyle}>金额</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any, idx: number) => (
                <tr key={item.id || idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={tdStyle}>{PRODUCT_LINE_MAP[item.product_type] || item.product_type}</td>
                  <td style={tdStyle}>{item.product_model || '-'}</td>
                  <td style={tdStyle}>{item.product_name || '-'}</td>
                  <td style={tdStyle}>{item.color || '-'}</td>
                  <td style={tdStyle}>{item.position || '-'}</td>
                  <td style={tdStyle}>{item.size_height || '-'}</td>
                  <td style={tdStyle}>{item.size_width || '-'}</td>
                  <td style={tdStyle}>{item.open_direction || '-'}</td>
                  <td style={tdStyle}>{item.quantity}</td>
                  <td style={tdStyle}>{item.unit_price ? `¥${Number(item.unit_price).toLocaleString()}` : '-'}</td>
                  <td style={tdStyle}>{item.total_price ? `¥${Number(item.total_price).toLocaleString()}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', color: '#999', padding: 24 }}>暂无产品明细</div>
        )}
      </Card>

      {/* 操作日志 */}
      {logs.length > 0 && (
        <Card title="操作记录">
          <Timeline items={logs.map((log: any) => ({
            children: (
              <>
                <b>{log.change_content}</b>
                <br />
                <span style={{ color: '#999', fontSize: 12 }}>
                  {log.operator_name || '系统'} · {log.created_at}
                </span>
              </>
            ),
          }))} />
        </Card>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 500 }
const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }
