import { useState, useEffect, useCallback } from 'react'
import { Button, Tag, Space, message, Modal, Tabs } from 'antd'
import { EditOutlined, DeleteOutlined, UserOutlined, TeamOutlined, EyeOutlined, MoreOutlined } from '@ant-design/icons'
import { Dropdown } from 'antd'
import BaseTable from '../../components/BaseTable'
import ModalForm from '../../components/ModalForm'
import { Authorized, usePermission } from '../../components/Authorized'
import type { FormField } from '../../components/ModalForm'
import type { ColumnsType } from 'antd/es/table'
import { get, post, patch, del } from '../../utils/request'

// ==================== Types ====================
/** 后端返回的师傅字段（snake_case） */
interface WorkerItem {
  id: number
  name: string
  phone: string
  wechat?: string
  skills: string[]
  foreman: number | null
  foreman_name: string
  branch: number | null
  branch_name: string
  city: string
  status: string
  status_display: string
  created_at: string
}

/** 后端返回的工头字段（snake_case） */
interface ForemanItem {
  id: number
  name: string
  phone: string
  branch: number | null
  branch_name: string
  city: string
  status: string
  status_display: string
  created_at: string
}

// ==================== API ====================
const WORKERS_API = '/personnel/workers/'
const FOREMEN_API = '/personnel/foremen/'

// ==================== Form Fields ====================
const siteFormFields: FormField[] = [
  { name: 'name', label: '姓名', type: 'input', rules: [{ required: true, message: '请输入姓名' }] },
  { name: 'phone', label: '手机号', type: 'input', rules: [{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误' }] },
  { name: 'skills', label: '技能', type: 'select', rules: [{ required: true, message: '请选择技能' }], options: [
    { value: 'measurement', label: '量尺' }, { value: 'installation', label: '安装' },
    { value: 'repair', label: '维修' }, { value: 'delivery', label: '送货' },
  ], props: { mode: 'multiple' } },
  { name: 'status', label: '状态', type: 'select', rules: [{ required: true, message: '请选择状态' }], options: [
    { value: 'active', label: '在职' }, { value: 'inactive', label: '离职' }, { value: 'disabled', label: '禁用' },
  ] },
  { name: 'foreman', label: '所属工头', type: 'select' },
  { name: 'city', label: '城市', type: 'input' },
]

const clerkFormFields: FormField[] = [
  { name: 'name', label: '姓名', type: 'input', rules: [{ required: true, message: '请输入姓名' }] },
  { name: 'phone', label: '手机号', type: 'input', rules: [{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误' }] },
  { name: 'status', label: '状态', type: 'select', rules: [{ required: true, message: '请选择状态' }], options: [
    { value: 'active', label: '在职' }, { value: 'inactive', label: '离职' }, { value: 'disabled', label: '禁用' },
  ] },
  { name: 'city', label: '城市', type: 'input' },
]

// ==================== Status Color ====================
const STATUS_MAP: Record<string, { color: string; label: string }> = {
  active: { color: 'green', label: '在职' },
  inactive: { color: 'default', label: '离职' },
  disabled: { color: 'red', label: '禁用' },
}

// ==================== 技能映射 ====================
const SKILL_LABELS: Record<string, string> = {
  measurement: '量尺', installation: '安装', repair: '维修', delivery: '送货',
}

// ==================== Component ====================
const Personnel = () => {
  const { hasPermission } = usePermission()
  const [activeTab, setActiveTab] = useState('site')

  // 现场人员状态
  const [siteData, setSiteData] = useState<WorkerItem[]>([])
  const [siteLoading, setSiteLoading] = useState(false)
  const [siteTotal, setSiteTotal] = useState(0)
  const [sitePage, setSitePage] = useState(1)
  const [sitePageSize, setSitePageSize] = useState(20)
  const [siteSearch, setSiteSearch] = useState('')

  // 后勤人员状态
  const [clerkData, setClerkData] = useState<ForemanItem[]>([])
  const [clerkLoading, setClerkLoading] = useState(false)
  const [clerkTotal, setClerkTotal] = useState(0)
  const [clerkPage, setClerkPage] = useState(1)
  const [clerkPageSize, setClerkPageSize] = useState(20)
  const [clerkSearch, setClerkSearch] = useState('')

  // 工头列表（用于表单下拉）
  const [foremenList, setForemenList] = useState<{ id: number; name: string }[]>([])

  // Modal
  const [modalVisible, setModalVisible] = useState(false)
  const [editRecord, setEditRecord] = useState<any>(null)
  const [modalLoading, setModalLoading] = useState(false)

  const isSite = activeTab === 'site'

  // 加载工头列表
  useEffect(() => {
    get<any>(FOREMEN_API + '?page_size=100&status=active').then(res => {
      const items = res.results || res || []
      setForemenList(items.map((f: any) => ({ id: f.id, name: f.name })))
    }).catch(() => { /* ignore */ })
  }, [])

  // 加载现场人员列表
  const fetchSiteData = useCallback(async () => {
    setSiteLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(sitePage))
      params.set('page_size', String(sitePageSize))
      if (siteSearch) params.set('search', siteSearch)
      const res = await get<any>(`${WORKERS_API}?${params.toString()}`)
      const results = res.results || res.data?.items || res.data || res || []
      setSiteData(Array.isArray(results) ? results : [])
      setSiteTotal(res.count ?? res.data?.total ?? (Array.isArray(results) ? results.length : 0))
    } catch (err: any) {
      message.error(err.message || '加载人员列表失败')
    } finally {
      setSiteLoading(false)
    }
  }, [sitePage, sitePageSize, siteSearch])

  useEffect(() => { fetchSiteData() }, [fetchSiteData])

  // 加载后勤人员列表
  const fetchClerkData = useCallback(async () => {
    setClerkLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(clerkPage))
      params.set('page_size', String(clerkPageSize))
      if (clerkSearch) params.set('search', clerkSearch)
      const res = await get<any>(`${FOREMEN_API}?${params.toString()}`)
      const results = res.results || res.data?.items || res.data || res || []
      setClerkData(Array.isArray(results) ? results : [])
      setClerkTotal(res.count ?? res.data?.total ?? (Array.isArray(results) ? results.length : 0))
    } catch (err: any) {
      message.error(err.message || '加载文员列表失败')
    } finally {
      setClerkLoading(false)
    }
  }, [clerkPage, clerkPageSize, clerkSearch])

  useEffect(() => { fetchClerkData() }, [fetchClerkData])

  // Modal
  const openModal = (record?: any) => { setEditRecord(record || null); setModalVisible(true) }
  const closeModal = () => { setModalVisible(false); setEditRecord(null) }

  // 提交表单
  const handleOk = async (values: any) => {
    setModalLoading(true)
    try {
      if (isSite) {
        if (editRecord) {
          await patch(`${WORKERS_API}${editRecord.id}/`, values)
          message.success('编辑成功')
        } else {
          await post(WORKERS_API, values)
          message.success('新增成功')
        }
        fetchSiteData()
      } else {
        if (editRecord) {
          await patch(`${FOREMEN_API}${editRecord.id}/`, values)
          message.success('编辑成功')
        } else {
          await post(FOREMEN_API, values)
          message.success('新增成功')
        }
        fetchClerkData()
      }
      closeModal()
    } catch (err: any) {
      message.error(err.message || '操作失败')
    } finally {
      setModalLoading(false)
    }
  }

  // 删除
  const handleDelete = (isSiteTab: boolean, r: any) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除「${r.name}」吗？`,
      okText: '删除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: async () => {
        try {
          if (isSiteTab) {
            await del(`${WORKERS_API}${r.id}/`)
            fetchSiteData()
          } else {
            await del(`${FOREMEN_API}${r.id}/`)
            fetchClerkData()
          }
          message.success('删除成功')
        } catch (err: any) {
          message.error(err.message || '删除失败')
        }
      },
    })
  }

  // 搜索
  const handleSiteSearch = (values: Record<string, any>) => {
    setSiteSearch(values.name || values.search || '')
    setSitePage(1)
  }
  const handleClerkSearch = (values: Record<string, any>) => {
    setClerkSearch(values.name || values.search || '')
    setClerkPage(1)
  }

  // 获取表单初始值
  const getInitialValues = () => {
    if (!editRecord) return undefined
    // 后端返回 snake_case，表单字段也是 snake_case
    return editRecord
  }

  // 动态工头下拉选项
  const getSiteFormFields = (): FormField[] => {
    const fields = [...siteFormFields]
    const foremanField = fields.find(f => f.name === 'foreman')
    if (foremanField) {
      foremanField.options = foremenList.map(f => ({ value: f.id, label: f.name }))
    }
    return fields
  }

  // ==================== Columns ====================
  const siteColumns: ColumnsType<WorkerItem> = [
    { title: '姓名', dataIndex: 'name', width: 80 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '技能', dataIndex: 'skills', width: 150, render: (v: string[]) => v?.length ? v.map(s => <Tag key={s}>{SKILL_LABELS[s] || s}</Tag>) : '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag> },
    { title: '所属工头', dataIndex: 'foreman_name', width: 90, render: v => v || '-' },
    { title: '城市', dataIndex: 'city', width: 80, render: v => v || '-' },
    { title: '分公司', dataIndex: 'branch_name', width: 100, render: v => v || '-' },
    { title: '创建时间', dataIndex: 'created_at', width: 160 },
    {
      title: '操作', width: 130, fixed: 'right',
      render: (_: any, r: WorkerItem) => (
        <Space>
          <Authorized permission="personnel-edit"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(r)}>编辑</Button></Authorized>
          <Dropdown menu={{ items: [
            { key: 'detail', icon: <EyeOutlined />, label: '查看详情' },
            { type: 'divider' as const },
            ...(hasPermission('personnel-delete') ? [{ key: 'delete' as const, icon: <DeleteOutlined />, label: '删除', danger: true }] : []),
          ], onClick: ({ key }) => { if (key === 'detail') message.info(`查看详情: ${r.name}`); else if (key === 'delete') handleDelete(true, r) } }}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ]

  const clerkColumns: ColumnsType<ForemanItem> = [
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '手机号', dataIndex: 'phone', width: 140 },
    { title: '城市', dataIndex: 'city', width: 80, render: v => v || '-' },
    { title: '分公司', dataIndex: 'branch_name', width: 100, render: v => v || '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag> },
    {
      title: '操作', width: 130, fixed: 'right',
      render: (_: any, r: ForemanItem) => (
        <Space>
          <Authorized permission="personnel-edit"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(r)}>编辑</Button></Authorized>
          <Dropdown menu={{ items: [
            { key: 'detail', icon: <EyeOutlined />, label: '查看详情' },
            { type: 'divider' as const },
            ...(hasPermission('personnel-delete') ? [{ key: 'delete' as const, icon: <DeleteOutlined />, label: '删除', danger: true }] : []),
          ], onClick: ({ key }) => { if (key === 'detail') message.info(`查看详情: ${r.name}`); else if (key === 'delete') handleDelete(false, r) } }}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ]

  const tabs = [
    {
      key: 'site',
      label: <span><UserOutlined /> 现场服务人员</span>,
      children: (
        <BaseTable
          columns={siteColumns}
          dataSource={siteData}
          rowKey="id"
          loading={siteLoading}
          searchFields={[{ key: 'name', label: '姓名', placeholder: '搜索姓名/手机号' }]}
          onSearch={handleSiteSearch}
          onAdd={hasPermission('personnel-create') ? () => openModal() : undefined}
          addText="新增人员"
          pagination={{
            current: sitePage,
            pageSize: sitePageSize,
            total: siteTotal,
            onChange: (p, ps) => { setSitePage(p); setSitePageSize(ps) },
          }}
          scroll={{ x: 1000 }}
        />
      ),
    },
    {
      key: 'clerk',
      label: <span><TeamOutlined /> 工头管理</span>,
      children: (
        <BaseTable
          columns={clerkColumns}
          dataSource={clerkData}
          rowKey="id"
          loading={clerkLoading}
          searchFields={[{ key: 'name', label: '姓名', placeholder: '搜索姓名/手机号' }]}
          onSearch={handleClerkSearch}
          onAdd={hasPermission('personnel-create') ? () => openModal() : undefined}
          addText="新增工头"
          pagination={{
            current: clerkPage,
            pageSize: clerkPageSize,
            total: clerkTotal,
            onChange: (p, ps) => { setClerkPage(p); setClerkPageSize(ps) },
          }}
          scroll={{ x: 800 }}
        />
      ),
    },
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>人员管理</h2>
          <p style={{ margin: '4px 0 0', color: '#999' }}>管理人员信息与角色分配</p>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabs}
          tabBarStyle={{ marginBottom: 16 }}
        />
      </div>
      <ModalForm
        title={editRecord ? `编辑${isSite ? '人员' : '工头'}` : `新增${isSite ? '人员' : '工头'}`}
        visible={modalVisible}
        onCancel={closeModal}
        onOk={handleOk}
        fields={isSite ? getSiteFormFields() : clerkFormFields}
        initialValues={getInitialValues()}
        confirmLoading={modalLoading}
      />
    </div>
  )
}

export default Personnel
