import { useState, useEffect, useCallback } from 'react'
import {
  Tabs, Table, Button, Space, Input, Radio, Switch, Modal, Form,
  Tree, message, Card, Empty, Tag, Spin, Tooltip,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  SaveOutlined, UserAddOutlined, CloseCircleOutlined,
  SafetyCertificateOutlined, DatabaseOutlined, FieldStringOutlined,
  TeamOutlined, FileSearchOutlined,
} from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import type { ColumnsType } from 'antd/es/table'
import { get, post, put, patch, del } from '@/utils/request'

const API = '/api/permissions'

/* ── types ── */
interface Role {
  id: number
  name: string
  description: string
  data_scope: string
  is_system: boolean
  created_at: string
  updated_at?: string
  menu_ids?: number[]
  field_permissions?: FieldPermission[]
  members?: Member[]
}
interface FieldPermission {
  id?: number
  app_label: string
  model_name: string
  field_name: string
  visible: boolean
}
interface Member {
  id: number
  name: string
  phone: string
  department: string
  status: string
}
interface MenuData {
  id: number
  name: string
  code?: string
  children?: MenuData[]
}

interface LogEntry {
  id: number
  operator_name: string
  action: string
  target: string
  detail: string
  created_at: string
}

const DATA_SCOPE_OPTIONS = [
  { value: 'all', label: '全部数据' },
  { value: 'city', label: '本城市数据' },
  { value: 'department', label: '本部门数据' },
  { value: 'self', label: '仅自己创建的数据' },
]

const ACTION_COLORS: Record<string, string> = {
  创建: 'green', 修改: 'blue', 删除: 'red', 分配: 'orange', 登录: 'default',
}

/* ── helpers ── */

function buildTree(data: MenuData[]): DataNode[] {
  return data.map(item => ({
    key: item.id,
    title: item.code ? `${item.name} (${item.code})` : item.name,
    children: item.children ? buildTree(item.children) : undefined,
  }))
}

/* ── main component ── */
const Permissions: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)
  const [menuTree, setMenuTree] = useState<DataNode[]>([])
  const [checkedKeys, setCheckedKeys] = useState<{ checked: number[]; halfChecked: number[] }>({ checked: [], halfChecked: [] })
  const [menuSearch, setMenuSearch] = useState('')
  const [menuLoading, setMenuLoading] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form] = Form.useForm()

  // Add member modal
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<Member[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [_selectedRoleIds, _setSelectedRoleIds] = useState<number[]>([])
  const [userLoading, setUserLoading] = useState(false)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await get<{code: number, data: {items: Role[], total: number}}>(`${API}/roles/`)
      // Support both DRF format {count, results} and custom wrapper {code, data: {items, total}}
      const items = res.results || res.data?.items || res.data || res || []
      setRoles(Array.isArray(items) ? items : [])
    } catch (e: unknown) { message.error((e instanceof Error ? e.message : String(e)) || '获取角色列表失败') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  const fetchRoleDetail = useCallback(async (id: number) => {
    try {
      const res = await get<{code: number, data: Role}>(`${API}/roles/${id}/`)
      const roleData = res.data || res
      setSelectedRole({ ...roleData, members: [] })
      setCheckedKeys({ checked: roleData.menu_ids || [], halfChecked: [] })
    } catch (e: unknown) { message.error(e instanceof Error ? e.message : String(e)) }
  }, [])

  const fetchMenuTree = useCallback(async () => {
    setMenuLoading(true)
    try {
      const res = await get<{code: number, data: MenuData[]}>(`${API}/menus/`)
      // API 返回格式: {code: 200, data: [...]} 或直接是数组
      const data = res.data || res
      setMenuTree(buildTree(Array.isArray(data) ? data : []))
    } catch (e: unknown) { message.error((e instanceof Error ? e.message : String(e)) || '获取菜单树失败') }
    finally { setMenuLoading(false) }
  }, [])

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await get<{code: number, data: {items: LogEntry[], total: number}}>(`${API}/logs/`)
      // Support both DRF format {count, results} and custom wrapper {code, data: {items, total}}
      const items = res.results || res.data?.items || res.data || res || []
      setLogs(Array.isArray(items) ? items : [])
    } catch (e: unknown) { message.error((e instanceof Error ? e.message : String(e)) || '获取日志失败') }
    finally { setLogsLoading(false) }
  }, [])

  useEffect(() => { fetchMenuTree(); fetchLogs() }, [fetchMenuTree, fetchLogs])

  // Role CRUD
  const handleAddRole = () => {
    setEditingRole(null)
    form.resetFields()
    form.setFieldsValue({ data_scope: 'all' })
    setModalOpen(true)
  }

  const handleEditRole = () => {
    if (!selectedRole) return message.warning('请先选择角色')
    setEditingRole(selectedRole)
    form.setFieldsValue({ name: selectedRole.name, description: selectedRole.description, data_scope: selectedRole.data_scope })
    setModalOpen(true)
  }

  const handleDeleteRole = async () => {
    if (!selectedRole) return
    if (selectedRole.is_system) return message.warning('系统预设角色不可删除')
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除角色「${selectedRole.name}」吗？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await del(`${API}/roles/${selectedRole.id}/`)
          message.success('删除成功')
          setSelectedRole(null)
          fetchRoles()
        } catch (e: unknown) { message.error(e instanceof Error ? e.message : String(e)) }
      },
    })
  }

  const handleModalOk = async () => {
    try { await form.validateFields() } catch { return }
    const values = form.getFieldsValue()
    try {
      if (editingRole) {
        await put(`${API}/roles/${editingRole.id}/`, values)
        message.success('修改成功')
      } else {
        await post(`${API}/roles/`, values)
        message.success('新增成功')
      }
      setModalOpen(false)
      fetchRoles()
      if (editingRole && selectedRole?.id === editingRole.id) fetchRoleDetail(editingRole.id)
    } catch (e: unknown) { message.error(e instanceof Error ? e.message : String(e)) }
  }

  // Save menus
  const handleSaveMenus = async () => {
    if (!selectedRole) return
    try {
      await post(`${API}/roles/${selectedRole.id}/assign-menus/`, { menu_ids: checkedKeys.checked })
      message.success('功能授权保存成功')
    } catch (e: unknown) { message.error(e instanceof Error ? e.message : String(e)) }
  }

  // Save data scope
  const handleSaveDataScope = async (data_scope: string) => {
    if (!selectedRole) return
    try {
      await patch(`${API}/roles/${selectedRole.id}/`, { data_scope })
      message.success('数据范围保存成功')
      setSelectedRole({ ...selectedRole, data_scope })
      fetchRoles()
    } catch (e: unknown) { message.error(e instanceof Error ? e.message : String(e)) }
  }

  // Field permissions
  const handleFieldToggle = (index: number, is_visible: boolean) => {
    if (!selectedRole) return
    const newFields = [...(selectedRole.field_permissions || [])]
    newFields[index] = { ...newFields[index], visible: is_visible }
    setSelectedRole({ ...selectedRole, field_permissions: newFields })
  }

  const handleAddFieldPermission = () => {
    if (!selectedRole) return
    const newField: FieldPermission = { app_label: '', model_name: '', field_name: '', visible: true }
    setSelectedRole({ ...selectedRole, field_permissions: [...(selectedRole.field_permissions || []), newField] })
  }

  const handleSaveFieldPermissions = async () => {
    if (!selectedRole) return
    try {
      await put(`${API}/roles/${selectedRole.id}/`, { field_permissions: selectedRole.field_permissions })
      message.success('字段权限保存成功')
    } catch (e: unknown) { message.error(e instanceof Error ? e.message : String(e)) }
  }

  // Members
  const handleOpenAddMember = async () => {
    setMemberModalOpen(true)
    setSelectedUserIds([])
    setUserLoading(true)
    try {
      const data = await get<Member[]>('/api/v1/personnel/users/')
      setAllUsers(data)
    } catch {
      // fallback empty
      setAllUsers([])
    }
    finally { setUserLoading(false) }
  }

  const handleAddMembers = async () => {
    if (!selectedRole || selectedUserIds.length === 0) return
    try {
      await post(`${API}/roles/${selectedRole.id}/assign-members/`, { user_ids: selectedUserIds })
      message.success('添加成员成功')
      setMemberModalOpen(false)
      fetchRoleDetail(selectedRole.id)
    } catch (e: any) { message.error(e.message) }
  }

  const handleRemoveMember = async (userId: number) => {
    if (!selectedRole) return
    try {
      // Remove by re-assigning without that user
      const remainIds = (selectedRole.members || []).map(m => m.id).filter(id => id !== userId)
      await post(`${API}/roles/${selectedRole.id}/assign-members/`, { user_ids: remainIds })
      message.success('移除成功')
      fetchRoleDetail(selectedRole.id)
    } catch (e: any) { message.error(e.message) }
  }

  // Filter menu tree by search
  const filteredMenuTree = menuSearch
    ? (filterTree(menuTree, menuSearch.toLowerCase()) || [])
    : menuTree

  function filterTree(nodes: DataNode[], keyword: string): DataNode[] {
    return nodes
      .map(node => {
        const title = (node.title as string).toLowerCase()
        const matched = title.includes(keyword)
        const filteredChildren = node.children ? filterTree(node.children, keyword) : []
        if (matched || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children }
        }
        return null
      })
      .filter(Boolean) as DataNode[]
  }

  /* ── Tab 1: 功能授权 ── */
  const menuTab = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>
      <Input
        placeholder="搜索菜单名称"
        prefix={<SearchOutlined />}
        value={menuSearch}
        onChange={e => setMenuSearch(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 300 }}
        allowClear
      />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {menuLoading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
          menuTree.length > 0
            ? <Tree
                checkable
                checkedKeys={checkedKeys}
                onCheck={(checkedKeys, { checked, halfChecked }) => {
                  setCheckedKeys({ checked: checked as number[], halfChecked: halfChecked as number[] });
                }}
                treeData={filteredMenuTree}
                defaultExpandAll
              />
            : <Empty description="暂无菜单数据" />
        )}
      </div>
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveMenus}>保存授权</Button>
      </div>
    </div>
  )

  /* ── Tab 2: 数据授权 ── */
  const dataTab = (
    <div style={{ padding: '8px 0' }}>
      <Radio.Group
        value={selectedRole?.data_scope || 'all'}
        onChange={e => handleSaveDataScope(e.target.value)}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {DATA_SCOPE_OPTIONS.map(opt => (
          <Radio key={opt.value} value={opt.value} style={{ fontSize: 14 }}>{opt.label}</Radio>
        ))}
      </Radio.Group>
    </div>
  )

  /* ── Tab 3: 字段授权 ── */
  const fieldColumns: ColumnsType<FieldPermission> = [
    { title: '应用标识', dataIndex: 'app_label', width: 150 },
    { title: '模型名称', dataIndex: 'model_name', width: 150 },
    { title: '字段名称', dataIndex: 'field_name', width: 150 },
    {
      title: '可见', dataIndex: 'visible', width: 80,
      render: (val: boolean, _: any, index: number) => (
        <Switch checked={val} size="small" onChange={v => handleFieldToggle(index, v)} />
      ),
    },
  ]
  const fieldTab = (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={handleAddFieldPermission}>新增字段权限</Button>
      </div>
      <Table
        columns={fieldColumns}
        dataSource={selectedRole?.field_permissions || []}
        rowKey={(_, i) => String(i)}
        pagination={false}
        size="small"
        bordered={false}
      />
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveFieldPermissions}>保存</Button>
      </div>
    </div>
  )

  /* ── Tab 4: 角色成员 ── */
  const memberColumns: ColumnsType<Member> = [
    { title: '员工姓名', dataIndex: 'name', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 140 },
    { title: '部门', dataIndex: 'department', width: 140 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: v => <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? '在职' : v}</Tag>,
    },
    {
      title: '操作', width: 80,
      render: (_: any, r: any) => (
        <Tooltip title="移除">
          <Button type="text" danger size="small" icon={<CloseCircleOutlined />} onClick={() => handleRemoveMember(r.id)} />
        </Tooltip>
      ),
    },
  ]
  const memberTab = (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" size="small" icon={<UserAddOutlined />} onClick={handleOpenAddMember}>添加成员</Button>
      </div>
      <Table
        columns={memberColumns}
        dataSource={selectedRole?.members || []}
        rowKey="id"
        pagination={false}
        size="small"
        bordered={false}
      />
    </div>
  )

  /* ── Tab 5: 日志 ── */
  const logColumns: ColumnsType<LogEntry> = [
    { title: '操作时间', dataIndex: 'created_at', width: 170 },
    { title: '操作人', dataIndex: 'operator_name', width: 100 },
    {
      title: '操作类型', dataIndex: 'action', width: 100,
      render: v => <Tag color={ACTION_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: '操作对象', dataIndex: 'target', width: 150 },
    { title: '变更详情', dataIndex: 'detail', ellipsis: true },
  ]
  const logTab = (
    <Spin spinning={logsLoading}>
      <Table
        columns={logColumns}
        dataSource={logs}
        rowKey="id"
        size="small"
        bordered={false}
        pagination={{ pageSize: 20 }}
      />
    </Spin>
  )

  const tabItems = [
    { key: 'menus', label: <span><SafetyCertificateOutlined /> 功能授权</span>, children: menuTab },
    { key: 'data', label: <span><DatabaseOutlined /> 数据授权</span>, children: dataTab },
    { key: 'fields', label: <span><FieldStringOutlined /> 字段授权</span>, children: fieldTab },
    { key: 'members', label: <span><TeamOutlined /> 角色成员</span>, children: memberTab },
    { key: 'logs', label: <span><FileSearchOutlined /> 日志</span>, children: logTab },
  ]

  const roleColumns: ColumnsType<Role> = [
    { title: '角色名称', dataIndex: 'name', ellipsis: true },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', width: 120 },
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h2>权限管理</h2><p>角色与权限配置</p></div>
      </div>
      <Card bodyStyle={{ padding: 0 }}>
        <div style={{ display: 'flex', minHeight: 520 }}>
          {/* Left: role list */}
          <div style={{ width: 320, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #f0f0f0' }}>
              <Space>
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddRole}>新增</Button>
                <Button size="small" icon={<EditOutlined />} onClick={handleEditRole} disabled={!selectedRole}>修改</Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={handleDeleteRole}
                  disabled={!selectedRole || selectedRole.is_system}>删除</Button>
              </Space>
            </div>
            <Spin spinning={loading}>
              <Table
                columns={roleColumns}
                dataSource={roles}
                rowKey="id"
                pagination={false}
                size="small"
                bordered={false}
                onRow={(record) => ({
                  onClick: () => fetchRoleDetail(record.id),
                  style: {
                    cursor: 'pointer',
                    background: selectedRole?.id === record.id ? '#e6f4ff' : undefined,
                  },
                })}
                style={{ flex: 1 }}
              />
            </Spin>
          </div>
          {/* Right: config */}
          <div style={{ flex: 1, padding: '16px 20px', overflow: 'auto' }}>
            {selectedRole ? (
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{selectedRole.name}</span>
                <span style={{ color: '#999', marginLeft: 8, fontSize: 13 }}>{selectedRole.description}</span>
                {selectedRole.is_system && <Tag color="blue" style={{ marginLeft: 8 }}>系统预设</Tag>}
              </div>
            ) : (
              <Empty description="请在左侧选择一个角色" style={{ paddingTop: 60 }} />
            )}
            {selectedRole && <Tabs items={tabItems} />}
          </div>
        </div>
      </Card>

      {/* Role Modal */}
      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item name="data_scope" label="数据范围">
            <Radio.Group>
              {DATA_SCOPE_OPTIONS.map(opt => (
                <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        title="添加角色成员"
        open={memberModalOpen}
        onOk={handleAddMembers}
        onCancel={() => setMemberModalOpen(false)}
        width={600}
        destroyOnClose
      >
        <Spin spinning={userLoading}>
          <Table
            columns={[
              { title: '姓名', dataIndex: 'name', width: 100 },
              { title: '手机号', dataIndex: 'phone', width: 130 },
              { title: '部门', dataIndex: 'department' },
            ]}
            dataSource={allUsers.filter(u => !(selectedRole?.members || []).some(m => m.id === u.id))}
            rowKey="id"
            size="small"
            bordered={false}
            rowSelection={{
              selectedRowKeys: selectedUserIds,
              onChange: (keys) => setSelectedUserIds(keys as number[]),
            }}
            pagination={false}
            scroll={{ y: 400 }}
          />
        </Spin>
      </Modal>
    </div>
  )
}

export default Permissions
