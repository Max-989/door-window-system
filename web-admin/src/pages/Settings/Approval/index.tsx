import { useState, useEffect, useCallback } from 'react'
import {
  Card, Table, Button, Tag, Modal, Form, Select, Input, Space, Badge, Radio, Empty, message,
} from 'antd'
import { CheckOutlined, CloseOutlined, AuditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { get, post } from '../../../utils/request'
import Authorized from '../../../components/Authorized'

const API = '/users/pending'

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

interface PaginatedResponse<T> {
  code: number
  message: string
  data: {
    items: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  timestamp: string
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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [approveForm] = Form.useForm()
  const [rejectForm] = Form.useForm()

  const fetchData = useCallback(async (p: number, ps: number) => {
    setLoading(true)
    try {
      const json = await get<PaginatedResponse<PendingUser>>(`${API}/?page=${p}&pageSize=${ps}`)
      setData(json.data.items)
      setTotal(json.data.total)
    } catch {
      message.error('获取待审核列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRoles = useCallback(async () => {
    try {
      const json = await get<Role[]>('/api/permissions/roles/')
      setRoles(Array.isArray(json) ? json : (json as any).results ?? [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchData(page, pageSize); fetchRoles() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (values: { role_id: number; department: string }) => {
    if (!currentUser) return
    try {
      await post(`${API}/${currentUser.id}/approve/`, values)
      message.success('审核通过')
      setApproveOpen(false)
      approveForm.resetFields()
      fetchData(page, pageSize)
    } catch {
      message.error('操作失败')
    }
  }

  const handleReject = async (values: { reason: string }) => {
    if (!currentUser) return
    try {
      await post(`${API}/${currentUser.id}/reject/`, values)
      message.success('已驳回')
      setRejectOpen(false)
      rejectForm.resetFields()
      fetchData(page, pageSize)
    } catch {
      message.error('操作失败')
    }
  }

  const onPageChange = (p: number, ps: number) => {
    setPage(p)
    setPageSize(ps)
    fetchData(p, ps)
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
      <Card title={<Space><AuditOutlined /> 注册审核</Space>}>
        <Radio.Group value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ marginBottom: 16 }}>
          <Radio.Button value="all">全部</Radio.Button>
          <Radio.Button value="management">管理人员</Radio.Button>
          <Radio.Button value="service">服务人员</Radio.Button>
        </Radio.Group>
        <Table<PendingUser>
          rowKey="id" columns={columns} dataSource={data} loading={loading}
          locale={{ emptyText: <Empty description="暂无待审核用户" /> }}
          pagination={{ current: page, pageSize, total, onChange: onPageChange, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
          size="middle"
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
