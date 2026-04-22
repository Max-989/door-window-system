import { useState, useEffect, useCallback } from 'react'
import { Tabs, Card, Button, Tag, Space, message, Modal } from 'antd'
import { EditOutlined, DeleteOutlined, EyeOutlined, MoreOutlined } from '@ant-design/icons'
import { Dropdown } from 'antd'
import BaseTable from '../../components/BaseTable'
import StatusTag from '../../components/StatusTag'
import ModalForm from '../../components/ModalForm'
import { Authorized, usePermission } from '../../components/Authorized'
import type { FormField } from '../../components/ModalForm'
import { get, post, put, del } from '../../utils/request'
import { phoneRules, phoneOrLandlineRules } from '../../utils/validators'

const ROLE_LABELS: Record<string, string> = { project_manager: '项目经理', sales_guide: '导购' }
const ROLE_COLORS: Record<string, string> = { project_manager: 'blue', sales_guide: 'green' }

interface Brand {
  id: number
  name: string
  contact_person: string
  phone: string
  process_order: string
  status: string
  created_at: string
}

interface Store {
  id: number
  brand: number
  brand_name: string
  name: string
  address: string
  status: string
  created_at: string
}

interface Staff {
  id: number
  store: number
  store_name: string
  name: string
  phone: string
  wechat: string
  role: string
  role_display: string
  status: string
  created_at: string
}

const DecorationCompany = () => {
  const { hasPermission } = usePermission()
  const [brands, setBrands] = useState<Brand[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [storesLoading, setStoresLoading] = useState(false)
  const [staffLoading, setStaffLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalType, setModalType] = useState<'brand' | 'store' | 'staff'>('brand')
  const [editRecord, setEditRecord] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── 数据加载 ──
  const fetchBrands = useCallback(async () => {
    setBrandsLoading(true)
    try {
      const res = await get<any>('/decoration/brands/')
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setBrands(Array.isArray(items) ? items : [])
    } catch (err: any) {
      message.error(err.message || '加载品牌失败')
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  const fetchStores = useCallback(async () => {
    setStoresLoading(true)
    try {
      const res = await get<any>('/decoration/stores/')
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setStores(Array.isArray(items) ? items : [])
    } catch (err: any) {
      message.error(err.message || '加载门店失败')
    } finally {
      setStoresLoading(false)
    }
  }, [])

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true)
    try {
      const res = await get<any>('/decoration/staff/')
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setStaff(Array.isArray(items) ? items : [])
    } catch (err: any) {
      message.error(err.message || '加载人员失败')
    } finally {
      setStaffLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBrands()
    fetchStores()
    fetchStaff()
  }, [fetchBrands, fetchStores, fetchStaff])

  // ── 新增/编辑 ──
  const handleAdd = (type: 'brand' | 'store' | 'staff') => {
    setModalType(type)
    setEditRecord(null)
    setModalVisible(true)
  }

  const handleEdit = (type: 'brand' | 'store' | 'staff', r: any) => {
    setModalType(type)
    setEditRecord(r)
    setModalVisible(true)
  }

  // ── 删除 ──
  const handleDelete = (type: 'brand' | 'store' | 'staff', r: any) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除「${r.name}」吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const endpoint = type === 'brand' ? 'brands' : type === 'store' ? 'stores' : 'staff'
          await del(`/decoration/${endpoint}/${r.id}/`)
          message.success('删除成功')
          if (type === 'brand') fetchBrands()
          else if (type === 'store') fetchStores()
          else fetchStaff()
        } catch (err: any) {
          message.error(err.message || '删除失败')
        }
      },
    })
  }

  // ── 提交 ──
  const handleOk = async (values: any) => {
    setSubmitting(true)
    try {
      // 将前端 camelCase 转为后端 snake_case
      let payload: Record<string, any> = {}
      if (modalType === 'brand') {
        payload = {
          name: values.name,
          contact_person: values.contactPerson || '',
          phone: values.contactPhone || '',
          process_order: values.processOrder || 'measure_first',
          status: values.status,
        }
      } else if (modalType === 'store') {
        payload = {
          brand: values.brandId,
          name: values.name,
          address: values.address || '',
          status: values.status,
        }
      } else {
        payload = {
          store: values.storeId,
          name: values.name,
          phone: values.phone,
          wechat: values.wechat || '',
          role: values.role,
          status: values.status,
        }
      }

      const endpoint = modalType === 'brand' ? 'brands' : modalType === 'store' ? 'stores' : 'staff'

      if (editRecord) {
        await put(`/decoration/${endpoint}/${editRecord.id}/`, payload)
        message.success('编辑成功')
      } else {
        await post(`/decoration/${endpoint}/`, payload)
        message.success('新增成功')
      }

      setModalVisible(false)
      setEditRecord(null)
      if (modalType === 'brand') fetchBrands()
      else if (modalType === 'store') fetchStores()
      else fetchStaff()
    } catch (err: any) {
      message.error(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 表单字段 ──
  const getFormFields = (): FormField[] => {
    switch (modalType) {
      case 'brand': return [
        { name: 'name', label: '品牌名称', type: 'input', rules: [{ required: true }] },
        { name: 'contactPerson', label: '联系人', type: 'input' },
        { name: 'contactPhone', label: '电话', type: 'input', rules: phoneOrLandlineRules },
        { name: 'processOrder', label: '流程顺序', type: 'select', options: [{ value: 'measure_first', label: '先量尺后下单' }, { value: 'order_first', label: '先下单后量尺' }] },
        { name: 'status', label: '状态', type: 'select', rules: [{ required: true }], options: [{ value: 'cooperating', label: '合作中' }, { value: 'paused', label: '已暂停' }, { value: 'terminated', label: '已终止' }] },
      ]
      case 'store': return [
        { name: 'brandId', label: '所属品牌', type: 'select', rules: [{ required: true }], options: brands.map(b => ({ value: b.id, label: b.name })) },
        { name: 'name', label: '门店名称', type: 'input', rules: [{ required: true }] },
        { name: 'address', label: '地址', type: 'input' },
        { name: 'status', label: '状态', type: 'select', rules: [{ required: true }], options: [{ value: 'cooperating', label: '合作中' }, { value: 'paused', label: '已暂停' }, { value: 'terminated', label: '已终止' }] },
      ]
      case 'staff': return [
        { name: 'storeId', label: '所属门店', type: 'select', rules: [{ required: true }], options: stores.map(s => ({ value: s.id, label: `${s.brand_name}-${s.name}` })) },
        { name: 'name', label: '姓名', type: 'input', rules: [{ required: true }] },
        { name: 'phone', label: '手机号', type: 'input', rules: [{ required: true }, ...phoneRules] },
        { name: 'wechat', label: '微信', type: 'input' },
        { name: 'role', label: '角色', type: 'select', rules: [{ required: true }], options: [{ value: 'project_manager', label: '项目经理' }, { value: 'sales_guide', label: '导购' }] },
        { name: 'status', label: '状态', type: 'select', rules: [{ required: true }], options: [{ value: 'active', label: '启用' }, { value: 'paused', label: '停用' }] },
      ]
    }
  }

  const typeLabel = modalType === 'brand' ? '品牌' : modalType === 'store' ? '门店' : '人员'

  // 编辑时转换后端字段到前端格式
  const getInitialValues = (): any => {
    if (!editRecord) return undefined
    if (modalType === 'brand') {
      return {
        name: editRecord.name,
        contactPerson: editRecord.contact_person,
        contactPhone: editRecord.phone,
        processOrder: editRecord.process_order || 'measure_first',
        status: editRecord.status,
      }
    } else if (modalType === 'store') {
      return {
        brandId: editRecord.brand,
        name: editRecord.name,
        address: editRecord.address,
        status: editRecord.status,
      }
    } else {
      return {
        storeId: editRecord.store,
        name: editRecord.name,
        phone: editRecord.phone,
        wechat: editRecord.wechat,
        role: editRecord.role,
        status: editRecord.status,
      }
    }
  }

  // ── 列定义 ──
  const brandCols = [
    { title: '名称', dataIndex: 'name', width: 120 },
    { title: '联系人', dataIndex: 'contact_person', width: 80, render: (v: string) => v || '-' },
    { title: '电话', dataIndex: 'phone', width: 130, render: (v: string) => v || '-' },
    { title: '流程顺序', dataIndex: 'process_order', width: 120, render: (v: string) => v === 'order_first' ? '先下单后量尺' : '先量尺后下单' },
    { title: '状态', dataIndex: 'status', width: 90, render: v => <StatusTag status={v} /> },
    { title: '创建时间', dataIndex: 'created_at', width: 160 },
    { title: '操作', width: 140, fixed: 'right' as const, render: (_: any, r: any) => (
      <Space>
        <Authorized permission="decoration-company-edit"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit('brand', r)}>编辑</Button></Authorized>
        <Dropdown menu={{ items: [
          { key: 'detail', icon: <EyeOutlined />, label: '查看详情' },
          { type: 'divider' as const },
          ...(hasPermission('decoration-company-delete') ? [{ key: 'delete' as const, icon: <DeleteOutlined />, label: '删除', danger: true }] : []),
        ], onClick: ({ key }) => { if (key === 'detail') message.info(`查看详情: ${r.name}`); else if (key === 'delete') handleDelete('brand', r) } }}>
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      </Space>
    ) },
  ]

  const storeCols = [
    { title: '品牌', dataIndex: 'brand_name', width: 110 },
    { title: '名称', dataIndex: 'name', width: 120 },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 90, render: v => <StatusTag status={v} /> },
    { title: '操作', width: 140, fixed: 'right' as const, render: (_: any, r: any) => (
      <Space>
        <Authorized permission="decoration-company-edit"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit('store', r)}>编辑</Button></Authorized>
        <Dropdown menu={{ items: [
          { key: 'detail', icon: <EyeOutlined />, label: '查看详情' },
          { type: 'divider' as const },
          ...(hasPermission('decoration-company-delete') ? [{ key: 'delete' as const, icon: <DeleteOutlined />, label: '删除', danger: true }] : []),
        ], onClick: ({ key }) => { if (key === 'detail') message.info(`查看详情: ${r.name}`); else if (key === 'delete') handleDelete('store', r) } }}>
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      </Space>
    ) },
  ]

  const staffCols = [
    { title: '门店', dataIndex: 'store_name', width: 120 },
    { title: '姓名', dataIndex: 'name', width: 80 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '微信', dataIndex: 'wechat', width: 100, render: (v: string) => v || '-' },
    { title: '角色', dataIndex: 'role', width: 90, render: v => <Tag color={ROLE_COLORS[v]}>{ROLE_LABELS[v]}</Tag> },
    { title: '状态', dataIndex: 'status', width: 80, render: v => <StatusTag status={v} /> },
    { title: '操作', width: 140, fixed: 'right' as const, render: (_: any, r: any) => (
      <Space>
        <Authorized permission="decoration-company-edit"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit('staff', r)}>编辑</Button></Authorized>
        <Dropdown menu={{ items: [
          { key: 'detail', icon: <EyeOutlined />, label: '查看详情' },
          { type: 'divider' as const },
          ...(hasPermission('decoration-company-delete') ? [{ key: 'delete' as const, icon: <DeleteOutlined />, label: '删除', danger: true }] : []),
        ], onClick: ({ key }) => { if (key === 'detail') message.info(`查看详情: ${r.name}`); else if (key === 'delete') handleDelete('staff', r) } }}>
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      </Space>
    ) },
  ]

  const tabItems = [
    { key: 'brand', label: `品牌 (${brands.length})`, children: (
      <BaseTable
        columns={brandCols}
        dataSource={brands}
        loading={brandsLoading}
        rowKey="id"
        onAdd={hasPermission('decoration-company-create') ? () => handleAdd('brand') : undefined}
        addText="新增品牌"
        pagination={false}
      />
    )},
    { key: 'store', label: `门店 (${stores.length})`, children: (
      <BaseTable
        columns={storeCols}
        dataSource={stores}
        loading={storesLoading}
        rowKey="id"
        searchFields={[{ key: 'name', label: '门店名称', placeholder: '搜索门店' }]}
        onAdd={hasPermission('decoration-company-create') ? () => handleAdd('store') : undefined}
        addText="新增门店"
        pagination={false}
      />
    )},
    { key: 'staff', label: `人员 (${staff.length})`, children: (
      <BaseTable
        columns={staffCols}
        dataSource={staff}
        loading={staffLoading}
        rowKey="id"
        searchFields={[{ key: 'name', label: '姓名', placeholder: '搜索人员' }]}
        onAdd={hasPermission('decoration-company-create') ? () => handleAdd('staff') : undefined}
        addText="新增人员"
        pagination={false}
      />
    )},
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h2>装企管理</h2><p>管理品牌、门店与装企人员</p></div>
      </div>
      <Card><Tabs items={tabItems} /></Card>
      <ModalForm
        title={`${editRecord ? '编辑' : '新建'}${typeLabel}`}
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setEditRecord(null) }}
        onOk={handleOk}
        fields={getFormFields()}
        initialValues={getInitialValues()}
        confirmLoading={submitting}
      />
    </div>
  )
}

export default DecorationCompany
