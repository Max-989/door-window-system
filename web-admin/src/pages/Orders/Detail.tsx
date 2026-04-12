import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Table, Tag, Steps, Timeline, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import StatusTag from '../../components/StatusTag'
import type { OrderProductItem } from '../../types/api'

// Mock 产品明细
const productItems: OrderProductItem[] = [
  { id: 1, productType: 'wood', productName: '实木复合门-简约系列', model: 'MJ-801', specs: '900×2100mm', quantity: 3, unitPrice: 1200, totalPrice: 3600 },
  { id: 2, productType: 'wood', productName: '实木复合门-轻奢系列', model: 'MJ-902', specs: '800×2100mm', quantity: 1, unitPrice: 1800, totalPrice: 1800 },
]

const orderSteps = [
  { title: '待确认', status: 'finish' as const },
  { title: '已确认', status: 'finish' as const },
  { title: '生产中', status: 'process' as const },
  { title: '已发货', status: 'wait' as const },
  { title: '已到货', status: 'wait' as const },
  { title: '已派送', status: 'wait' as const },
  { title: '安装中', status: 'wait' as const },
  { title: '已完成', status: 'wait' as const },
]

const measurementTasks = [
  { id: 1, taskNo: 'MSR-20260401-001', customer: '张三', address: '南京市鼓楼区XX小区', worker: '王量尺', status: 'completed' },
]

const installationTasks = [
  { id: 1, taskNo: 'INS-20260403-001', customer: '张三', address: '南京市鼓楼区XX小区', workers: ['赵安装', '钱安装'], status: 'pending_assign' },
]

const operationLogs = [
  { time: '2026-04-06 10:30:00', user: '系统管理员', action: '创建订单', detail: '创建订单 DOOR2026040001' },
  { time: '2026-04-06 10:35:00', user: '系统管理员', action: '确认订单', detail: '确认订单，关联量尺任务 MSR-20260401-001' },
  { time: '2026-04-06 11:00:00', user: '系统', action: '状态变更', detail: '订单状态变更为「生产中」' },
]

const productColumns = [
  { title: '产品名称', dataIndex: 'productName', width: 200 },
  { title: '型号', dataIndex: 'model', width: 100 },
  { title: '规格', dataIndex: 'specs', width: 120 },
  { title: '数量', dataIndex: 'quantity', width: 70 },
  { title: '单价', dataIndex: 'unitPrice', width: 100, render: (v: number) => `¥${v.toLocaleString()}` },
  { title: '小计', dataIndex: 'totalPrice', width: 100, render: (v: number) => `¥${v.toLocaleString()}` },
]

const OrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/app/orders')}>返回订单列表</Button>
      </div>

      <div className="page-header">
        <h2>订单详情 {id}</h2>
      </div>

      {/* 基本信息 */}
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={3}>
          <Descriptions.Item label="订单号">{id || 'DOOR2026040001'}</Descriptions.Item>
          <Descriptions.Item label="状态"><StatusTag status="in_production" /></Descriptions.Item>
          <Descriptions.Item label="来源"><Tag>装企</Tag></Descriptions.Item>
          <Descriptions.Item label="品牌">TATA木门</Descriptions.Item>
          <Descriptions.Item label="门店">南京旗舰店</Descriptions.Item>
          <Descriptions.Item label="导购">刘导购</Descriptions.Item>
          <Descriptions.Item label="客户姓名">张三</Descriptions.Item>
          <Descriptions.Item label="客户电话">13812345678</Descriptions.Item>
          <Descriptions.Item label="客户地址">南京市鼓楼区XX小区3栋501</Descriptions.Item>
          <Descriptions.Item label="订单金额" span={2}><span style={{ fontSize: 18, fontWeight: 600, color: '#FF3B30' }}>¥5,400.00</span></Descriptions.Item>
          <Descriptions.Item label="创建时间">2026-04-06 10:30:00</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 产品明细 */}
      <Card title="产品明细" style={{ marginBottom: 16 }}>
        <Table columns={productColumns} dataSource={productItems} rowKey="id" pagination={false} size="small" />
        <div style={{ textAlign: 'right', marginTop: 12, fontWeight: 600 }}>
          合计：¥{productItems.reduce((s, i) => s + i.totalPrice, 0).toLocaleString()}
        </div>
      </Card>

      {/* 状态流转 */}
      <Card title="订单进度" style={{ marginBottom: 16 }}>
        <Steps current={2} items={orderSteps} />
      </Card>

      <Card title="关联量尺任务" style={{ marginBottom: 16 }}>
        <Table
          columns={[
            { title: '任务号', dataIndex: 'taskNo' },
            { title: '客户', dataIndex: 'customer' },
            { title: '地址', dataIndex: 'address' },
            { title: '指派师傅', dataIndex: 'worker' },
            { title: '状态', dataIndex: 'status', render: v => <StatusTag status={v} /> },
          ]}
          dataSource={measurementTasks}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      <Card title="关联安装任务" style={{ marginBottom: 16 }}>
        <Table
          columns={[
            { title: '任务号', dataIndex: 'taskNo' },
            { title: '客户', dataIndex: 'customer' },
            { title: '地址', dataIndex: 'address' },
            { title: '安装师傅', dataIndex: 'workers', render: (v: string[]) => v.join('、') },
            { title: '状态', dataIndex: 'status', render: v => <StatusTag status={v} /> },
          ]}
          dataSource={installationTasks}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* 操作日志 */}
      <Card title="操作日志">
        <Timeline
          items={operationLogs.map(log => ({
            children: (
              <div>
                <div><strong>{log.user}</strong> {log.action} <span style={{ color: '#86868b', fontSize: 12 }}>{log.time}</span></div>
                <div style={{ color: '#666', fontSize: 13 }}>{log.detail}</div>
              </div>
            ),
          }))}
        />
      </Card>
    </div>
  )
}

export default OrderDetail
