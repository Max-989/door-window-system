import { useState, useMemo, useEffect, useCallback } from 'react'
import { Tabs, Card, Tag, Button, Space, message, Modal, Dropdown, Descriptions } from 'antd'
import { EditOutlined, DeleteOutlined, EyeOutlined, MoreOutlined } from '@ant-design/icons'
import BaseTable from '../../components/BaseTable'
import StatusTag from '../../components/StatusTag'
import ModalForm from '../../components/ModalForm'
import { Authorized, usePermission } from '../../components/Authorized'
import type { FormField } from '../../components/ModalForm'
import { get, post, put, del } from '../../utils/request'

// ==================== API ====================
const API = {
  suppliers: '/products/suppliers/',
  wood: '/products/wood/',
  alloy: '/products/alloy/',
  security: '/products/security/',
  hardware: '/products/hardware/',
}

// ==================== 类型映射 ====================
const PROCESS_LABELS: Record<string, string> = { paint: '油漆', paint_free: '免漆', baking: '烤漆', veneer: '贴皮' }
const OPEN_LABELS: Record<string, string> = { casement: '平开', single_slide: '单推', double_slide: '双推', triple_slide: '三推', single: '单开', double: '双开' }
const SIZE_LABELS: Record<string, string> = { standard: '标尺', custom: '定制' }
const PRICING_LABELS: Record<string, string> = { area: '平方×单价', base_plus_glass: '底价+玻璃' }
const TRACK_LABELS: Record<string, string> = { overhead: '吊轨', floor: '地轨' }
const PL_LABELS: Record<string, string> = { wood: '木门', alloy: '合金门', security: '防盗门' }
const PL_COLORS: Record<string, string> = { wood: 'orange', alloy: 'blue', security: 'purple' }
const HW_TYPE_LABELS: Record<string, string> = { lock: '锁具', hinge: '合页', other: '其他' }

// ==================== 供货厂家选项 ====================
const SUPPLIER_STATUS_OPTIONS = [
  { value: 'cooperating', label: '合作中' },
  { value: 'suspended', label: '已暂停' },
  { value: 'terminated', label: '已终止' },
]
const PRODUCT_STATUS_OPTIONS = [
  { value: 'on_sale', label: '在售' },
  { value: 'off_sale', label: '停售' },
  { value: 'presale', label: '预售' },
]

// ==================== 通用 CRUD Hook ====================
function useCrudApi<T extends { id: number }>(apiUrl: string) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await get<any>(`${apiUrl}?${params.toString()}`)
      const results = Array.isArray(res) ? res : (res.items || res.results || [])
      setData(Array.isArray(results) ? results : [])
      setTotal(res.total ?? res.count ?? (Array.isArray(results) ? results.length : 0))
    } catch (err: any) {
      message.error(err.message || '加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter, apiUrl])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSearch = (values: Record<string, any>) => {
    setSearch(values.name || values.search || values.key || '')
    setPage(1)
  }

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') setStatusFilter(value || '')
    setPage(1)
  }

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPage(1)
  }

  const handleDelete = async (r: T) => {
    try {
      await del(`${apiUrl}${r.id}/`)
      message.success('删除成功')
      fetchData()
    } catch (err: any) {
      message.error(err.message || '删除失败')
    }
  }

  return {
    data, loading, total, page, pageSize,
    setPage, setPageSize,
    fetchData, handleSearch, handleFilterChange, handleResetFilters, handleDelete,
  }
}

// ==================== 主组件 ====================
const Products = () => {
  const { hasPermission } = usePermission()

  // 各产品类型 CRUD
  const woodCrud = useCrudApi<any>(API.wood)
  const alloyCrud = useCrudApi<any>(API.alloy)
  const securityCrud = useCrudApi<any>(API.security)
  const hardwareCrud = useCrudApi<any>(API.hardware)
  const supplierCrud = useCrudApi<any>(API.suppliers)

  // 供货厂家列表（用于表单下拉）
  const supplierOptions = useMemo(() =>
    supplierCrud.data.map((s: any) => ({ value: s.id, label: s.name })),
    [supplierCrud.data],
  )

  // Modal
  const [modalVisible, setModalVisible] = useState(false)
  const [modalType, setModalType] = useState('wood')
  const [editRecord, setEditRecord] = useState<any>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailRecord, setDetailRecord] = useState<any>(null)
  const [detailType, setDetailType] = useState('')

  const handleAdd = (type: string) => {
    setModalType(type); setEditRecord(null); setModalVisible(true)
  }
  const handleEdit = (type: string, r: any) => {
    setModalType(type); setEditRecord(r); setModalVisible(true)
  }
  const handleDetail = (type: string, r: any) => {
    setDetailType(type); setDetailRecord(r); setDetailVisible(true)
  }

  const handleDelete = (type: string, r: any) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除「${r.name}」吗？`,
      okText: '删除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: () => {
        const crudMap: Record<string, ReturnType<typeof useCrudApi<any>>> = {
          wood: woodCrud, alloy: alloyCrud, security: securityCrud,
          hardware: hardwareCrud, supplier: supplierCrud,
        }
        crudMap[type]?.handleDelete(r)
      },
    })
  }

  // 提交表单
  const handleOk = async (values: any) => {
    setModalLoading(true)
    try {
      const apiUrl = API[modalType as keyof typeof API]
      if (editRecord) {
        await put(`${apiUrl}${editRecord.id}/`, values)
        message.success('编辑成功')
      } else {
        await post(apiUrl, values)
        message.success('新增成功')
      }
      setModalVisible(false)
      setEditRecord(null)
      // 刷新对应列表
      const crudMap: Record<string, ReturnType<typeof useCrudApi<any>>> = {
        wood: woodCrud, alloy: alloyCrud, security: securityCrud,
        hardware: hardwareCrud, supplier: supplierCrud,
      }
      crudMap[modalType]?.fetchData()
    } catch (err: any) {
      message.error(err.message || '操作失败')
    } finally {
      setModalLoading(false)
    }
  }

  // 获取表单初始值（后端 snake_case）
  const getInitialValues = () => {
    if (!editRecord) return undefined
    return { ...editRecord }
  }

  // ==================== 表单字段 ====================
  const getFormFields = (): FormField[] => {
    const commonSupplier: FormField = {
      name: 'supplier', label: '供货厂家', type: 'select', options: supplierOptions,
    }
    const commonStatus: FormField = {
      name: 'status', label: '状态', type: 'select', options: PRODUCT_STATUS_OPTIONS,
    }

    switch (modalType) {
      case 'wood': return [
        { name: 'name', label: '名称', type: 'input', rules: [{ required: true }] },
        { name: 'model', label: '型号', type: 'input' },
        { name: 'surface_process', label: '表面工艺', type: 'select', options: [
          { value: 'paint', label: '油漆' }, { value: 'paint_free', label: '免漆' },
          { value: 'baking', label: '烤漆' }, { value: 'veneer', label: '贴皮' },
        ]},
        commonSupplier,
        { name: 'colors', label: '颜色', type: 'select', options: [
          '黑色', '白色', '灰色', '香槟金', '棕色', '银色', '胡桃木色', '原木色',
          '浅灰', '米色', '奶白色', '深灰色', '红色', '红木色', '檀木色',
        ].map(c => ({ value: c, label: c })), props: { mode: 'multiple' } },
        { name: 'cost_price', label: '成本价', type: 'number', props: { min: 0, prefix: '¥' } },
        commonStatus,
      ]
      case 'alloy': return [
        { name: 'name', label: '名称', type: 'input', rules: [{ required: true }] },
        { name: 'open_method', label: '开启方式', type: 'select', options: [
          { value: 'casement', label: '平开' }, { value: 'single_slide', label: '单推' },
          { value: 'double_slide', label: '双推' }, { value: 'triple_slide', label: '三推' },
        ]},
        commonSupplier,
        { name: 'profile', label: '型材', type: 'input' },
        { name: 'track_type', label: '轨道类型', type: 'select', options: [
          { value: 'overhead', label: '吊轨' }, { value: 'floor', label: '地轨' },
        ]},
        { name: 'colors', label: '颜色', type: 'select', options: [
          '黑色', '白色', '灰色', '香槟金', '棕色', '银色',
        ].map(c => ({ value: c, label: c })), props: { mode: 'multiple' } },
        { name: 'glass_type', label: '玻璃数量', type: 'select', options: [
          { value: 'single', label: '单玻' }, { value: 'double', label: '双玻' },
        ]},
        { name: 'pricing_method', label: '计价方式', type: 'select', options: [
          { value: 'area', label: '平方×单价' }, { value: 'base_plus_glass', label: '底价+玻璃' },
        ]},
        { name: 'unit_price', label: '单价', type: 'number', props: { min: 0, prefix: '¥' } },
        { name: 'glass_price', label: '玻璃价', type: 'number', props: { min: 0, prefix: '¥' } },
        { name: 'oversize_fee', label: '超大加价', type: 'number', props: { min: 0, prefix: '¥' } },
        commonStatus,
      ]
      case 'security': return [
        { name: 'name', label: '名称', type: 'input', rules: [{ required: true }] },
        { name: 'model', label: '型号', type: 'input' },
        { name: 'open_method', label: '开启方式', type: 'select', options: [
          { value: 'single', label: '单开' }, { value: 'double', label: '双开' },
        ]},
        { name: 'size_type', label: '尺寸类型', type: 'select', options: [
          { value: 'standard', label: '标尺' }, { value: 'custom', label: '定制' },
        ]},
        commonSupplier,
        { name: 'door_colors', label: '门扇颜色', type: 'select', options: [
          '灰黑色', '深灰色', '咖啡色', '黑色', '银色', '红色', '棕色', '香槟金', '白色',
        ].map(c => ({ value: c, label: c })), props: { mode: 'multiple' } },
        { name: 'standard_price', label: '标尺价', type: 'number', props: { min: 0, prefix: '¥' } },
        { name: 'custom_price', label: '定制价', type: 'number', props: { min: 0, prefix: '¥' } },
        commonStatus,
      ]
      case 'hardware': return [
        { name: 'name', label: '名称', type: 'input', rules: [{ required: true }] },
        { name: 'hardware_type', label: '类型', type: 'select', options: [
          { value: 'lock', label: '锁具' }, { value: 'hinge', label: '合页' }, { value: 'other', label: '其他' },
        ]},
        { name: 'sub_type', label: '子类型', type: 'input' },
        { name: 'model', label: '型号', type: 'input' },
        { name: 'applicable_products', label: '适用产品', type: 'select', options: [
          { value: 'wood', label: '木门' }, { value: 'alloy', label: '合金门' }, { value: 'security', label: '防盗门' },
        ], props: { mode: 'multiple' } },
        commonSupplier,
        { name: 'cost_price', label: '成本价', type: 'number', props: { min: 0, prefix: '¥' } },
        commonStatus,
      ]
      case 'supplier': return [
        { name: 'name', label: '厂家名称', type: 'input', rules: [{ required: true }] },
        { name: 'contact_person', label: '联系人', type: 'input' },
        { name: 'contact_phone', label: '电话', type: 'input' },
        { name: 'address', label: '地址', type: 'input' },
        { name: 'status', label: '状态', type: 'select', options: SUPPLIER_STATUS_OPTIONS },
      ]
      default: return []
    }
  }

  const typeLabel: Record<string, string> = { wood: '木门', alloy: '合金门', security: '防盗门', hardware: '五金配件', supplier: '供货厂家' }

  // 操作列
  const actionCol = (type: string) => ({
    title: '操作', width: 140, fixed: 'right' as const,
    render: (_: any, r: any) => (
      <Space>
        <Authorized permission="products-edit">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(type, r)}>编辑</Button>
        </Authorized>
        <Dropdown menu={{
          items: [
            { key: 'detail', icon: <EyeOutlined />, label: '查看详情' },
            ...(hasPermission('products-edit') ? [{ key: 'edit' as const, icon: <EditOutlined />, label: '编辑' }] : []),
            { type: 'divider' },
            ...(hasPermission('products-delete') ? [{ key: 'delete' as const, icon: <DeleteOutlined />, label: '删除', danger: true }] : []),
          ],
          onClick: ({ key }) => {
            if (key === 'detail') handleDetail(type, r)
            else if (key === 'edit') handleEdit(type, r)
            else if (key === 'delete') handleDelete(type, r)
          },
        }}>
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      </Space>
    ),
  })

  // ==================== 详情内容 ====================
  const getDetailItems = (type: string, r: any) => {
    switch (type) {
      case 'wood': return [
        { label: '名称', children: r.name },
        { label: '型号', children: r.model },
        { label: '表面工艺', children: PROCESS_LABELS[r.surface_process] },
        { label: '颜色', children: r.colors?.map((c: string) => <Tag key={c}>{c}</Tag>) },
        { label: '供货厂家', children: r.supplier_name },
        { label: '成本价', children: r.cost_price ? `¥${r.cost_price}` : '-' },
        { label: '状态', children: <StatusTag status={r.status} /> },
      ]
      case 'alloy': return [
        { label: '名称', children: r.name },
        { label: '开启方式', children: r.open_method_display || OPEN_LABELS[r.open_method] },
        { label: '轨道类型', children: r.track_type_display || TRACK_LABELS[r.track_type] || '-' },
        { label: '型材', children: r.profile },
        { label: '颜色', children: r.colors?.map((c: string) => <Tag key={c}>{c}</Tag>) },
        { label: '玻璃', children: r.glass_type_display },
        { label: '计价方式', children: PRICING_LABELS[r.pricing_method] },
        { label: '单价', children: r.unit_price ? `¥${r.unit_price}` : '-' },
        { label: '玻璃价', children: r.glass_price ? `¥${r.glass_price}` : '-' },
        { label: '超大加价', children: r.oversize_fee ? `¥${r.oversize_fee}` : '-' },
        { label: '供货厂家', children: r.supplier_name },
        { label: '状态', children: <StatusTag status={r.status} /> },
      ]
      case 'security': return [
        { label: '名称', children: r.name },
        { label: '型号', children: r.model },
        { label: '门扇颜色', children: r.door_colors?.map((c: string) => <Tag key={c}>{c}</Tag>) },
        { label: '开启方式', children: r.open_method_display || OPEN_LABELS[r.open_method] },
        { label: '尺寸类型', children: r.size_type_display || SIZE_LABELS[r.size_type] },
        { label: '标尺价', children: r.standard_price ? `¥${r.standard_price.toLocaleString()}` : '-' },
        { label: '定制价', children: r.custom_price ? `¥${r.custom_price.toLocaleString()}` : '-' },
        { label: '供货厂家', children: r.supplier_name },
        { label: '状态', children: <StatusTag status={r.status} /> },
      ]
      case 'hardware': return [
        { label: '名称', children: r.name },
        { label: '类型', children: r.hardware_type_display || HW_TYPE_LABELS[r.hardware_type] },
        { label: '子类型', children: r.sub_type },
        { label: '型号', children: r.model },
        { label: '适用产品', children: r.applicable_products?.map((p: string) => <Tag key={p} color={PL_COLORS[p]}>{PL_LABELS[p]}</Tag>) },
        { label: '供货厂家', children: r.supplier_name },
        { label: '成本价', children: r.cost_price ? `¥${r.cost_price}` : '-' },
        { label: '状态', children: <StatusTag status={r.status} /> },
      ]
      case 'supplier': return [
        { label: '厂家名称', children: r.name },
        { label: '联系人', children: r.contact_person },
        { label: '电话', children: r.contact_phone },
        { label: '地址', children: r.address },
        { label: '状态', children: <StatusTag status={r.status} /> },
      ]
      default: return []
    }
  }

  // ==================== Tab 配置 ====================
  const tabItems = [
    { key: 'wood', label: `木门 (${woodCrud.total})`, children: (
      <BaseTable
        columns={[
          { title: '名称', dataIndex: 'name', width: 120 },
          { title: '表面工艺', dataIndex: 'surface_process_display', width: 90, render: (v: string) => v || PROCESS_LABELS[v] || '-' },
          { title: '型号', dataIndex: 'model', width: 100 },
          { title: '颜色', dataIndex: 'colors', width: 200, render: (v: string[]) => v?.map((c: string) => <Tag key={c}>{c}</Tag>) || '-' },
          { title: '供货厂家', dataIndex: 'supplier_name', width: 110 },
          { title: '成本价', dataIndex: 'cost_price', width: 90, render: (v: number) => v ? `¥${v}` : '-' },
          { title: '状态', dataIndex: 'status_display', width: 80, render: (v: string) => <StatusTag status={v} /> },
          actionCol('wood'),
        ]}
        dataSource={woodCrud.data}
        rowKey="id"
        loading={woodCrud.loading}
        searchFields={[{ key: 'name', label: '名称', placeholder: '搜索名称/型号' }]}
        onSearch={woodCrud.handleSearch}
        onAdd={hasPermission('products-create') ? () => handleAdd('wood') : undefined}
        addText="新增木门"
        pagination={false}
        scroll={{ x: 960 }}
      />
    )},
    { key: 'alloy', label: `合金门 (${alloyCrud.total})`, children: (
      <BaseTable
        columns={[
          { title: '名称', dataIndex: 'name', width: 130 },
          { title: '开启方式', dataIndex: 'open_method_display', width: 80 },
          { title: '轨道', dataIndex: 'track_type_display', width: 70, render: (v: string) => v || '-' },
          { title: '型材', dataIndex: 'profile', width: 100, ellipsis: true },
          { title: '颜色', dataIndex: 'colors', width: 180, render: (v: string[]) => v?.map((c: string) => <Tag key={c}>{c}</Tag>) || '-' },
          { title: '玻璃', dataIndex: 'glass_type_display', width: 70 },
          { title: '计价', dataIndex: 'pricing_method', width: 100, render: (v: string) => PRICING_LABELS[v] || v },
          { title: '单价', dataIndex: 'unit_price', width: 80, render: (v: number) => v ? `¥${v}` : '-' },
          { title: '供货厂家', dataIndex: 'supplier_name', width: 100 },
          { title: '状态', dataIndex: 'status_display', width: 80, render: (v: string) => <StatusTag status={v} /> },
          actionCol('alloy'),
        ]}
        dataSource={alloyCrud.data}
        rowKey="id"
        loading={alloyCrud.loading}
        searchFields={[{ key: 'name', label: '名称', placeholder: '搜索名称/型材' }]}
        onSearch={alloyCrud.handleSearch}
        onAdd={hasPermission('products-create') ? () => handleAdd('alloy') : undefined}
        addText="新增合金门"
        pagination={false}
        scroll={{ x: 1060 }}
      />
    )},
    { key: 'security', label: `防盗门 (${securityCrud.total})`, children: (
      <BaseTable
        columns={[
          { title: '名称', dataIndex: 'name', width: 120 },
          { title: '型号', dataIndex: 'model', width: 80 },
          { title: '门扇颜色', dataIndex: 'door_colors', width: 180, render: (v: string[]) => v?.map((c: string) => <Tag key={c}>{c}</Tag>) || '-' },
          { title: '开启方式', dataIndex: 'open_method_display', width: 80 },
          { title: '尺寸类型', dataIndex: 'size_type_display', width: 80 },
          { title: '标尺价', dataIndex: 'standard_price', width: 90, render: (v: number) => v ? `¥${v.toLocaleString()}` : '-' },
          { title: '定制价', dataIndex: 'custom_price', width: 90, render: (v: number) => v ? `¥${v.toLocaleString()}` : '-' },
          { title: '供货厂家', dataIndex: 'supplier_name', width: 100 },
          { title: '状态', dataIndex: 'status_display', width: 80, render: (v: string) => <StatusTag status={v} /> },
          actionCol('security'),
        ]}
        dataSource={securityCrud.data}
        rowKey="id"
        loading={securityCrud.loading}
        searchFields={[{ key: 'name', label: '名称', placeholder: '搜索名称/型号' }]}
        onSearch={securityCrud.handleSearch}
        onAdd={hasPermission('products-create') ? () => handleAdd('security') : undefined}
        addText="新增防盗门"
        pagination={false}
        scroll={{ x: 960 }}
      />
    )},
    { key: 'hardware', label: `五金配件 (${hardwareCrud.total})`, children: (
      <BaseTable
        columns={[
          { title: '名称', dataIndex: 'name', width: 120 },
          { title: '类型', dataIndex: 'hardware_type_display', width: 60 },
          { title: '子类型', dataIndex: 'sub_type', width: 90 },
          { title: '型号', dataIndex: 'model', width: 90 },
          { title: '适用产品', dataIndex: 'applicable_products', width: 160, render: (v: string[]) => v?.map((p: string) => <Tag key={p} color={PL_COLORS[p]}>{PL_LABELS[p]}</Tag>) },
          { title: '供应商', dataIndex: 'supplier_name', width: 100 },
          { title: '成本价', dataIndex: 'cost_price', width: 80, render: (v: number) => v ? `¥${v}` : '-' },
          { title: '状态', dataIndex: 'status_display', width: 80, render: (v: string) => <StatusTag status={v} /> },
          actionCol('hardware'),
        ]}
        dataSource={hardwareCrud.data}
        rowKey="id"
        loading={hardwareCrud.loading}
        searchFields={[{ key: 'name', label: '名称', placeholder: '搜索名称/型号' }]}
        onSearch={hardwareCrud.handleSearch}
        onAdd={hasPermission('products-create') ? () => handleAdd('hardware') : undefined}
        addText="新增五金配件"
        pagination={false}
        scroll={{ x: 960 }}
      />
    )},
    { key: 'supplier', label: `供货厂家 (${supplierCrud.total})`, children: (
      <BaseTable
        columns={[
          { title: '名称', dataIndex: 'name', width: 120 },
          { title: '联系人', dataIndex: 'contact_person', width: 80 },
          { title: '电话', dataIndex: 'contact_phone', width: 130 },
          { title: '地址', dataIndex: 'address', ellipsis: true },
          { title: '状态', dataIndex: 'status_display', width: 80, render: (v: string) => <StatusTag status={v} /> },
          actionCol('supplier'),
        ]}
        dataSource={supplierCrud.data}
        rowKey="id"
        loading={supplierCrud.loading}
        searchFields={[{ key: 'name', label: '名称', placeholder: '搜索厂家名称' }]}
        onSearch={supplierCrud.handleSearch}
        onAdd={hasPermission('products-create') ? () => handleAdd('supplier') : undefined}
        addText="新增供货厂家"
        pagination={false}
        scroll={{ x: 800 }}
      />
    )},
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h2>产品库</h2><p>管理木门、合金门、防盗门、五金配件与供货厂家</p></div>
      </div>
      <Card><Tabs items={tabItems} /></Card>
      <ModalForm
        title={`${editRecord ? '编辑' : '新增'}${typeLabel[modalType]}`}
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setEditRecord(null) }}
        onOk={handleOk}
        fields={getFormFields()}
        initialValues={getInitialValues()}
        confirmLoading={modalLoading}
      />
      <Modal
        title={`产品详情 — ${detailRecord?.name || ''}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={560}
      >
        <Descriptions column={2} bordered size="small">
          {getDetailItems(detailType, detailRecord).map((item, i) => (
            <Descriptions.Item key={i} label={item.label} span={['颜色', '门扇颜色', '适用产品', '产品类型', '地址'].includes(item.label) ? 2 : 1}>
              {item.children}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Modal>
    </div>
  )
}

export default Products
