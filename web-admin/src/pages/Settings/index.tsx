import { useState, useEffect, useCallback } from 'react'
import { Tabs, Card, Table, Form, Input, Button, message, Tag, Space } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import ModalForm from '../../components/ModalForm'
import type { FormField } from '../../components/ModalForm'
import { get, post, put, del } from '../../utils/request'

interface Role {
  id: number
  name: string
  description: string
  is_system: boolean
  member_count: number
  created_at: string
}

interface PermissionLog {
  id: number
  operator_name: string
  action: string
  target: string
  detail: any
  created_at: string
}

interface MenuNode {
  id: number
  name: string
  code: string
  parent: number | null
  path: string
  icon: string
  sort_order: number
  menu_type: string
  is_visible: boolean
  children?: MenuNode[]
}

const ACTION_COLORS: Record<string, string> = {
  '创建': 'green', '修改': 'blue', '删除': 'red', '审核': 'purple', '派单': 'orange', '登录': 'default',
}

const Settings = () => {
  // ── 数据状态 ──
  const [roles, setRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [menus, setMenus] = useState<MenuNode[]>([])
  const [menusLoading, setMenusLoading] = useState(false)
  const [logs, setLogs] = useState<PermissionLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const [modalVisible, setModalVisible] = useState(false)
  const [modalType, setModalType] = useState('')
  const [editRecord, setEditRecord] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── 数据加载 ──
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true)
    try {
      const res = await get<any>('/api/permissions/roles/')
      const items = res.results || res.data?.items || res.data || res || []
      setRoles(Array.isArray(items) ? items : [])
    } catch (err: any) {
      message.error(err.message || '加载角色数据失败')
    } finally {
      setRolesLoading(false)
    }
  }, [])

  const fetchMenus = useCallback(async () => {
    setMenusLoading(true)
    try {
      const res = await get<any>('/api/permissions/menus/')
      setMenus(Array.isArray(res) ? res : [])
    } catch (err: any) {
      message.error(err.message || '加载菜单数据失败')
    } finally {
      setMenusLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await get<any>('/api/permissions/logs/')
      const items = res.results || res.data?.items || res.data || res || []
      setLogs(Array.isArray(items) ? items : [])
    } catch (err: any) {
      message.error(err.message || '加载操作日志失败')
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoles()
    fetchMenus()
    fetchLogs()
  }, [fetchRoles, fetchMenus, fetchLogs])

  // ── 新增/编辑 ──
  const handleEdit = (type: string, r: any) => {
    setModalType(type)
    setEditRecord(r)
    setModalVisible(true)
  }

  const handleOk = async (values: any) => {
    setSubmitting(true)
    try {
      if (modalType === 'role') {
        const payload = {
          name: values.name,
          description: values.description || '',
        }
        if (editRecord) {
          await put(`/api/permissions/roles/${editRecord.id}/`, payload)
          message.success('编辑成功')
        } else {
          await post('/api/permissions/roles/', payload)
          message.success('新增成功')
        }
        fetchRoles()
      }
      setModalVisible(false)
      setEditRecord(null)
    } catch (err: any) {
      message.error(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRole = async (r: Role) => {
    if (r.is_system) {
      message.error('系统预设角色不允许删除')
      return
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除角色「${r.name}」吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await del(`/api/permissions/roles/${r.id}/`)
          message.success('删除成功')
          fetchRoles()
        } catch (err: any) {
          message.error(err.message || '删除失败')
        }
      },
    })
  }

  const getFormFields = (): FormField[] => {
    switch (modalType) {
      case 'role': return [
        { name: 'name', label: '角色名称', type: 'input', rules: [{ required: true }] },
        { name: 'description', label: '描述', type: 'input' },
      ]
      default: return []
    }
  }

  const logCols = [
    { title: '操作人', dataIndex: 'operator_name', width: 100 },
    { title: '操作', dataIndex: 'action', width: 80, render: (v: string) => <Tag color={ACTION_COLORS[v] || 'default'}>{v}</Tag> },
    { title: '目标', dataIndex: 'target', width: 120 },
    { title: '详情', dataIndex: 'detail', ellipsis: true, render: (v: any) => v ? JSON.stringify(v) : '-' },
    { title: '时间', dataIndex: 'created_at', width: 160 },
  ]

  // ── 菜单树渲染 ──
  const renderMenuTable = (items: MenuNode[]) => (
    <Table
      dataSource={items}
      rowKey="id"
      pagination={false}
      size="small"
      expandable={{
        defaultExpandAllRows: true,
        childrenColumnName: 'children' as any,
      }}
      columns={[
        { title: '菜单名称', dataIndex: 'name', width: 150 },
        { title: '编码', dataIndex: 'code', width: 150 },
        { title: '路径', dataIndex: 'path', width: 150, render: (v: string) => v || '-' },
        { title: '图标', dataIndex: 'icon', width: 80, render: (v: string) => v || '-' },
        { title: '排序', dataIndex: 'sort_order', width: 60 },
        { title: '类型', dataIndex: 'menu_type', width: 80 },
        { title: '可见', dataIndex: 'is_visible', width: 60, render: (v: boolean) => v ? '是' : '否' },
      ]}
    />
  )

  const tabItems = [
    {
      key: 'basic',
      label: '基础配置',
      children: (
        <Card>
          <Form layout="vertical" initialValues={{ companyName: '门窗安装有限公司', contactPhone: '400-888-8888', address: '江苏省南京市' }} style={{ maxWidth: 500 }} onFinish={() => message.success('保存成功')}>
            <Form.Item name="companyName" label="公司名称" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="contactPhone" label="联系电话"><Input /></Form.Item>
            <Form.Item name="address" label="公司地址"><Input /></Form.Item>
            <Form.Item><Button type="primary" htmlType="submit">保存配置</Button></Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'menu',
      label: '菜单管理',
      children: (
        <Card loading={menusLoading}>
          {menus.length > 0 ? renderMenuTable(menus) : <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无菜单数据</div>}
        </Card>
      ),
    },
    {
      key: 'role',
      label: '角色管理',
      children: (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { setModalType('role'); setEditRecord(null); setModalVisible(true) }}>新增角色</Button>
          </div>
          <Table
            loading={rolesLoading}
            columns={[
              { title: '角色名称', dataIndex: 'name', width: 150 },
              { title: '描述', dataIndex: 'description', ellipsis: true },
              { title: '成员数', dataIndex: 'member_count', width: 80 },
              { title: '系统角色', dataIndex: 'is_system', width: 90, render: (v: boolean) => v ? <Tag color="blue">系统预设</Tag> : <Tag>自定义</Tag> },
              { title: '操作', width: 140, render: (_: any, r: Role) => (
                <Space>
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit('role', r)}>编辑</Button>
                  {!r.is_system && <Button type="link" size="small" danger onClick={() => handleDeleteRole(r)}>删除</Button>}
                </Space>
              )},
            ]}
            dataSource={roles}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      ),
    },
    {
      key: 'log',
      label: '操作日志',
      children: (
        <Card loading={logsLoading}>
          <Table columns={logCols} dataSource={logs} rowKey="id" size="small" />
        </Card>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h2>系统设置</h2><p>系统配置与权限管理</p></div>
      </div>
      <Card><Tabs items={tabItems} /></Card>
      {modalType === 'role' && <ModalForm
        title={`${editRecord ? '编辑' : '新增'}角色`}
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setEditRecord(null); setModalType('') }}
        onOk={handleOk}
        fields={getFormFields()}
        initialValues={editRecord ? { name: editRecord.name, description: editRecord.description } : undefined}
        confirmLoading={submitting}
      />}
    </div>
  )
}

export default Settings
