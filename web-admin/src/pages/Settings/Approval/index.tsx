import { useState, useEffect, useCallback } from 'react'
import {
  Card, Table, Button, Tag, Modal, Form, Select, Input, Space, Badge, Radio, Empty, message,
} from 'antd'
import { CheckOutlined, CloseOutlined, AuditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import Authorized from '../../../components/Authorized'

const API = '/api/users/pending'

interface PendingUser {
  id: number
  username: string
  phone: string
  real_name: string
  user_type: 'management' | 'service'
  created_at: string
}

interface Role {
  id: number
  name: string
  code: string
  description: string
}

const departments = ['量尺部', '安装部', '维修部', '仓库管理', '综合管理']

const Approval = () => {
  const [data, setData] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<PendingUser | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [approveForm] = Form.useForm()
  const [rejectForm] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(API)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json.results ?? json)
    } catch {
      message.error('获取待审核列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/permissions/roles/')
      if (!res.ok) return
      const json = await res.json()
      setRoles(json.results ?? json)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchData(); fetchRoles() }, [fetchData, fetchRoles])

  const filtered = typeFilter === 'all' ? data : data.filter(u => u.user_type === typeFilter)

  const handleApprove = async (values: { role_id: number; department: string }) => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API}/${currentUser.id}/approve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error()
      message.success('审核通过')
      setApproveOpen(false)
      approveForm.resetFields()
      fetchData()
    } catch {
      message.error('操作失败')
    }
  }

  const handleReject = async (values: { reason: string }) => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API}/${currentUser.id}/reject/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error()
      message.success('已驳回')
      setRejectOpen(false)
      rejectForm.resetFields()
      fetchData()
    } catch {
      message.error('操作失败')
    }
  }

  const columns: ColumnsType<PendingUser> = [
    { title: '姓名', dataIndex: 'real_name', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 140 },
    {
      title: '用户类型',
      dataIndex: 'user_type',
      width: 120,
      render: (t: string) => (
        <Tag color={t === 'management' ? '#007AFF' : '#34C759'}>
          {t === 'management' ? '管理人员' : '服务人员'}
        </Tag>
      ),
    },
    { title: '注册时间', dataIndex: 'created_at', width: 180 },
    {
      title: '操作',
      width: 160,
      render: (_: unknown, record: PendingUser) => (
        <Space>
          <Button type="primary" size="small" style={{ background: '#007AFF', borderColor: '#007AFF' }}
            onClick={() => { setCurrentUser(record); setApproveOpen(true) }}>
            <CheckOutlined /> 通过
          </Button>
          <Button danger size="small"
            onClick={() => { setCurrentUser(record); setRejectOpen(true) }}>
            <CloseOutlined /> 驳回
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Authorized permission="settings-approval">
      <Card title={<Space><AuditOutlined /> 注册审核 <Badge count={data.length} showZero color="#007AFF" /></Space>}>
        <Radio.Group value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ marginBottom: 16 }}>
          <Radio.Button value="all">全部</Radio.Button>
          <Radio.Button value="management">管理人员</Radio.Button>
          <Radio.Button value="service">服务人员</Radio.Button>
        </Radio.Group>
        <Table<PendingUser>
          rowKey="id" columns={columns} dataSource={filtered} loading={loading}
          locale={{ emptyText: <Empty description="暂无待审核用户" /> }}
          pagination={false} size="middle"
        />
      </Card>

      {/* 审核通过 Modal */}
      <Modal title="审核通过" open={approveOpen} onCancel={() => { setApproveOpen(false); approveForm.resetFields() }}
        onOk={() => approveForm.submit()} okText="确认" cancelText="取消"
        okButtonProps={{ style: { background: '#007AFF', borderColor: '#007AFF' } }}>
        <Form form={approveForm} layout="vertical" onFinish={handleApprove}>
          <Form.Item name="role_id" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select showSearch optionFilterProp="label" placeholder="请选择角色">
              {roles.map(r => ({ value: r.id, label: `${r.name}${r.description ? ` - ${r.description}` : ''}` }))}
            </Select>
          </Form.Item>
          <Form.Item name="department" label="部门" rules={[{ required: true, message: '请选择部门' }]}>
            <Select placeholder="请选择部门">
              {departments.map(d => ({ value: d, label: d }))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 审核驳回 Modal */}
      <Modal title="审核驳回" open={rejectOpen} onCancel={() => { setRejectOpen(false); rejectForm.resetFields() }}
        onOk={() => rejectForm.submit()} okText="确认" cancelText="取消"
        okButtonProps={{ danger: true }}>
        <Form form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item name="reason" label="驳回原因" rules={[{ required: true, message: '请填写驳回原因' }]}>
            <Input.TextArea rows={3} placeholder="请填写驳回原因" maxLength={200} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </Authorized>
  )
}

export default Approval
