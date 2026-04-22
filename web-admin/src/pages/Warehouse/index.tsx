import { useState, useEffect, useCallback } from 'react'
import { Tabs, Card, Tag, Button, Space, message, Modal, Select, Form, InputNumber, Input, Table } from 'antd'
import { EditOutlined, DeleteOutlined, CheckSquareOutlined, EyeOutlined, MoreOutlined, ExportOutlined, ImportOutlined, HistoryOutlined } from '@ant-design/icons'
import { Dropdown } from 'antd'
import BaseTable from '../../components/BaseTable'
import ModalForm from '../../components/ModalForm'
import { Authorized, usePermission } from '../../components/Authorized'
import type { FormField } from '../../components/ModalForm'
import { get, post, put, del, patch } from '../../utils/request'
import { ORDER_STATUS_TAG } from '../../types/api'

const { TextArea } = Input

// ── 后端返回的字段类型 ──

/** 流转仓产品（自动生成的，来自订单） */
interface FlowProduct {
  id: number
  order_no: string
  order_status: string
  brand_name: string
  store_name: string
  product_type: string
  product_model: string
  quantity: number
  status: string
  created_at: string
}

interface HardwareInventory {
  id: number
  name: string
  hardware_type: string
  current_stock: number
  alert_quantity: number
  purchasing_quantity: number
  pending_out_quantity: number
  available_stock: number
  city: string
  stock_records?: { type: string; quantity: number; reason: string; operator: string; created_at: string; related_task_id?: number; supplier?: string }[]
}

interface AccessoryInventory {
  id: number
  name: string
  spec_model: string
  current_stock: number
  purchasing_quantity: number
  city: string
  stock_records?: { type: string; quantity: number; reason: string; operator: string; created_at: string; related_task_id?: number; supplier?: string }[]
}

interface PendingGoods {
  id: number
  goods_name: string
  door_type: string
  spec_size: any
  color: string
  other_config: string
  inbound_time: string
  inbound_reason: string
  match_status: string
  match_status_display: string
  matched_order_no: string
  city: string
}

interface WarehouseTransfer {
  id: number
  from_city: string
  to_city: string
  goods_info: string
  status: string
  initiated_by_name: string
  confirmed_by_name: string
  notes: string
  created_at: string
}

const PL_LABELS: Record<string, string> = { wood: '木门', alloy: '合金门', security: '防盗门' }
const PL_COLORS: Record<string, string> = { wood: 'orange', alloy: 'blue', security: 'purple' }
const MATCH_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '待匹配', color: 'orange' },
  matched: { text: '已匹配', color: 'green' },
  unmatched: { text: '未匹配', color: 'red' },
}
const TRANSFER_STATUS_TAG: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'orange' },
  confirmed: { label: '已确认', color: 'blue' },
  transit: { label: '运输中', color: 'cyan' },
  completed: { label: '已签收', color: 'green' },
}

const hardwareFormFields: FormField[] = [
  { name: 'name', label: '名称', type: 'input', rules: [{ required: true }] },
  { name: 'hardware_type', label: '类型', type: 'select', options: [{ value: '木门', label: '木门' }, { value: '合金门', label: '合金门' }, { value: '防盗门', label: '防盗门' }, { value: '通用', label: '通用' }] },
  { name: 'current_stock', label: '当前库存', type: 'number', rules: [{ required: true }], props: { min: 0 } },
  { name: 'alert_quantity', label: '预警数量', type: 'number', props: { min: 0 } },
  { name: 'city', label: '城市', type: 'input' },
]

const accessoryFormFields: FormField[] = [
  { name: 'name', label: '名称', type: 'input', rules: [{ required: true }] },
  { name: 'spec_model', label: '规格型号', type: 'input' },
  { name: 'current_stock', label: '当前库存', type: 'number', rules: [{ required: true }], props: { min: 0 } },
  { name: 'city', label: '城市', type: 'input' },
]

const pendingFormFields: FormField[] = [
  { name: 'goods_name', label: '名称', type: 'input', rules: [{ required: true }] },
  { name: 'door_type', label: '门种类', type: 'select', options: [{ value: 'wood', label: '木门' }, { value: 'alloy', label: '合金门' }, { value: 'security', label: '防盗门' }] },
  { name: 'color', label: '颜色', type: 'input' },
  { name: 'inbound_reason', label: '入库原因', type: 'input' },
  { name: 'city', label: '城市', type: 'input' },
]

const Warehouse = () => {
  const { hasPermission } = usePermission()

  // ── 数据状态 ──
  const [flow, setFlow] = useState<FlowProduct[]>([])
  const [hardware, setHardware] = useState<HardwareInventory[]>([])
  const [accessory, setAccessory] = useState<AccessoryInventory[]>([])
  const [pending, setPending] = useState<PendingGoods[]>([])
  const [transfer, setTransfer] = useState<WarehouseTransfer[]>([])

  const [flowLoading, setFlowLoading] = useState(false)
  const [hardwareLoading, setHardwareLoading] = useState(false)
  const [accessoryLoading, setAccessoryLoading] = useState(false)
  const [pendingLoading, setPendingLoading] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)

  const [modalVisible, setModalVisible] = useState(false)
  const [modalType, setModalType] = useState('hardware')
  const [editRecord, setEditRecord] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── 流转仓筛选（搜索参数） ──
  const [flowOrderStatus, setFlowOrderStatus] = useState<string | undefined>()
  const [flowBrandId, setFlowBrandId] = useState<number | undefined>()
  const [flowStoreId, setFlowStoreId] = useState<number | undefined>()
  const [brandOptions, setBrandOptions] = useState<{ value: number; label: string }[]>([])
  const [storeOptions, setStoreOptions] = useState<{ value: number; label: string }[]>([])

  // ── 盘点弹窗 ──
  const [inventoryCheckVisible, setInventoryCheckVisible] = useState(false)
  const [inventoryCheckRecord, setInventoryCheckRecord] = useState<any>(null)
  const [inventoryCheckType, setInventoryCheckType] = useState('')
  const [inventoryForm] = Form.useForm()

  // ── 调拨弹窗 ──
  const [transferModalVisible, setTransferModalVisible] = useState(false)
  const [transferForm] = Form.useForm()

  // ── 批次5新增：出库/入库弹窗 ──
  const [stockModalVisible, setStockModalVisible] = useState(false)
  const [stockModalType, setStockModalType] = useState<'out' | 'in'>('out')
  const [stockModalRecord, setStockModalRecord] = useState<any>(null)
  const [stockModalCategory, setStockModalCategory] = useState<'hardware' | 'accessory'>('hardware')
  const [stockForm] = Form.useForm()
  const [stockSubmitting, setStockSubmitting] = useState(false)

  // ── 批次5新增：出入库历史弹窗 ──
  const [historyModalVisible, setHistoryModalVisible] = useState(false)
  const [historyRecord, setHistoryRecord] = useState<any>(null)

  // ── 数据加载 ──
  const fetchFlow = useCallback(async () => {
    setFlowLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('auto_generated', 'true')
      if (flowOrderStatus) params.set('order_status', flowOrderStatus)
      if (flowBrandId) params.set('brand_id', String(flowBrandId))
      if (flowStoreId) params.set('store_id', String(flowStoreId))
      const res = await get<any>(`/warehouse/products/?${params.toString()}`)
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setFlow(Array.isArray(items) ? items : [])
    } catch (err: any) {
      message.error(err.message || '加载流转仓数据失败')
    } finally {
      setFlowLoading(false)
    }
  }, [flowOrderStatus, flowBrandId, flowStoreId])

  /** 加载品牌选项（用于筛选） */
  const fetchBrandOptions = useCallback(async () => {
    try {
      const res = await get<any>('/brands/')
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setBrandOptions(Array.isArray(items) ? items.map((b: any) => ({ value: b.id, label: b.name })) : [])
    } catch { /* ignore */ }
  }, [])

  /** 加载门店选项（用于筛选） */
  const fetchStoreOptions = useCallback(async () => {
    try {
      const res = await get<any>('/stores/')
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setStoreOptions(Array.isArray(items) ? items.map((s: any) => ({ value: s.id, label: s.name })) : [])
    } catch { /* ignore */ }
  }, [])

  const fetchHardware = useCallback(async () => {
    setHardwareLoading(true)
    try {
      const res = await get<any>('/warehouse/hardware/')
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setHardware(Array.isArray(items) ? items : [])
    } catch (err: any) {
      message.error(err.message || '加载五金仓数据失败')
    } finally {
      setHardwareLoading(false)
    }
  }, [])

  const fetchAccessory = useCallback(async () => {
    setAccessoryLoading(true)
    try {
      const res = await get<any>('/warehouse/accessories/')
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setAccessory(Array.isArray(items) ? items : [])
    } catch (err: any) {
      message.error(err.message || '加载配件仓数据失败')
    } finally {
      setAccessoryLoading(false)
    }
  }, [])

  const fetchPending = useCallback(async () => {
    setPendingLoading(true)
    try {
      const res = await get<any>('/warehouse/pending/')
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setPending(Array.isArray(items) ? items : [])
    } catch (err: any) {
      message.error(err.message || '加载暂存仓数据失败')
    } finally {
      setPendingLoading(false)
    }
  }, [])

  const fetchTransfer = useCallback(async () => {
    setTransferLoading(true)
    try {
      const res = await get<any>('/warehouse/transfers/')
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setTransfer(Array.isArray(items) ? items : [])
    } catch (err: any) {
      message.error(err.message || '加载调拨数据失败')
    } finally {
      setTransferLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFlow()
    fetchHardware()
    fetchAccessory()
    fetchPending()
    fetchTransfer()
    fetchBrandOptions()
    fetchStoreOptions()
  }, [fetchFlow, fetchHardware, fetchAccessory, fetchPending, fetchTransfer, fetchBrandOptions, fetchStoreOptions])

  // ── CRUD 操作（非流转仓） ──
  const handleAdd = (type: string) => {
    setModalType(type)
    setEditRecord(null)
    setModalVisible(true)
  }

  const handleEdit = (type: string, r: any) => {
    setModalType(type)
    setEditRecord(r)
    setModalVisible(true)
  }

  const handleDelete = async (type: string, r: any) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除「${r.name || r.order_no || r.goods_name}」吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const endpoint = type === 'hardware' ? 'hardware' : type === 'accessory' ? 'accessories' : 'pending'
          await del(`/warehouse/${endpoint}/${r.id}/`)
          message.success('删除成功')
          if (type === 'hardware') fetchHardware()
          else if (type === 'accessory') fetchAccessory()
          else fetchPending()
        } catch (err: any) {
          message.error(err.message || '删除失败')
        }
      },
    })
  }

  const handleOk = async (values: any) => {
    setSubmitting(true)
    try {
      if (modalType === 'hardware') {
        const payload = {
          name: values.name,
          hardware_type: values.hardware_type || '',
          current_stock: values.current_stock || 0,
          alert_quantity: values.alert_quantity || 0,
          city: values.city || '',
        }
        if (editRecord) {
          await put(`/warehouse/hardware/${editRecord.id}/`, payload)
          message.success('编辑成功')
        } else {
          await post('/warehouse/hardware/', payload)
          message.success('入库成功')
        }
        fetchHardware()
      } else if (modalType === 'accessory') {
        const payload = {
          name: values.name,
          spec_model: values.spec_model || '',
          current_stock: values.current_stock || 0,
          city: values.city || '',
        }
        if (editRecord) {
          await put(`/warehouse/accessories/${editRecord.id}/`, payload)
          message.success('编辑成功')
        } else {
          await post('/warehouse/accessories/', payload)
          message.success('入库成功')
        }
        fetchAccessory()
      } else if (modalType === 'pending') {
        const payload = {
          goods_name: values.goods_name,
          door_type: values.door_type,
          color: values.color || '',
          inbound_reason: values.inbound_reason || '',
          city: values.city || '',
        }
        if (editRecord) {
          await put(`/warehouse/pending/${editRecord.id}/`, payload)
          message.success('编辑成功')
        } else {
          await post('/warehouse/pending/', payload)
          message.success('入库成功')
        }
        fetchPending()
      }
      setModalVisible(false)
      setEditRecord(null)
    } catch (err: any) {
      message.error(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 盘点 ──
  const handleInventoryCheck = (type: string, record: any) => {
    setInventoryCheckType(type)
    setInventoryCheckRecord(record)
    inventoryForm.setFieldsValue({ actual_quantity: undefined })
    setInventoryCheckVisible(true)
  }

  const handleInventoryCheckOk = async () => {
    try {
      const values = await inventoryForm.validateFields()
      await post('/warehouse/stocktake/', {
        warehouse_type: inventoryCheckType,
        item_id: inventoryCheckRecord.id,
        actual_quantity: values.actual_quantity,
      })
      setInventoryCheckVisible(false)
      if (inventoryCheckType === 'hardware') fetchHardware()
      else if (inventoryCheckType === 'accessory') fetchAccessory()
      else if (inventoryCheckType === 'pending') fetchPending()
      message.success('盘点完成')
    } catch (err: any) {
      message.error(err.message || '盘点失败')
    }
  }

  // ── 调拨 ──
  const handleTransferSubmit = async () => {
    try {
      const values = await transferForm.validateFields()
      if (values.from_city === values.to_city) {
        message.error('调出城市和调入城市不能相同')
        return
      }
      await post('/warehouse/transfers/', {
        from_city: values.from_city,
        to_city: values.to_city,
        goods_info: values.goods_info,
        notes: values.notes || '',
      })
      setTransferModalVisible(false)
      transferForm.resetFields()
      fetchTransfer()
      message.success('调拨申请已提交')
    } catch (err: any) {
      message.error(err.message || '提交调拨失败')
    }
  }

  const handleTransferAction = async (record: WarehouseTransfer, action: 'confirmed' | 'transit' | 'completed') => {
    try {
      await patch(`/warehouse/transfers/${record.id}/update_status/`, { status: action })
      message.success(`状态已更新为「${TRANSFER_STATUS_TAG[action]?.label || action}」`)
      fetchTransfer()
    } catch (err: any) {
      message.error(err.message || '更新状态失败')
    }
  }

  // ── 批次5新增：出库/入库操作 ──
  const handleStock = (category: 'hardware' | 'accessory', type: 'out' | 'in', record: any) => {
    setStockModalCategory(category)
    setStockModalType(type)
    setStockModalRecord(record)
    stockForm.resetFields()
    setStockModalVisible(true)
  }

  const handleStockOk = async () => {
    try {
      const values = await stockForm.validateFields()
      setStockSubmitting(true)
      const endpoint = stockModalCategory === 'hardware' ? 'hardware' : 'accessories'
      const action = stockModalType === 'out' ? 'out-stock' : 'in-stock'
      const payload: any = {
        quantity: values.quantity,
        reason: values.reason,
      }
      if (stockModalType === 'out' && values.related_task_id) {
        payload.related_task_id = values.related_task_id
      }
      if (stockModalType === 'in' && values.supplier) {
        payload.supplier = values.supplier
      }
      const res = await post(`/warehouse/${endpoint}/${stockModalRecord.id}/${action}/`, payload)
      if (res.warning) {
        message.warning(res.warning)
      } else {
        message.success(stockModalType === 'out' ? '出库成功' : '入库成功')
      }
      setStockModalVisible(false)
      if (stockModalCategory === 'hardware') fetchHardware()
      else fetchAccessory()
    } catch (err: any) {
      message.error(err.message || '操作失败')
    } finally {
      setStockSubmitting(false)
    }
  }

  const handleViewHistory = (record: any) => {
    setHistoryRecord(record)
    setHistoryModalVisible(true)
  }

  // ── 编辑时转换后端字段到前端格式 ──
  const getInitialValues = (): any => {
    if (!editRecord) return undefined
    if (modalType === 'hardware') return {
      name: editRecord.name,
      hardware_type: editRecord.hardware_type,
      current_stock: editRecord.current_stock,
      alert_quantity: editRecord.alert_quantity,
      city: editRecord.city,
    }
    if (modalType === 'accessory') return {
      name: editRecord.name,
      spec_model: editRecord.spec_model,
      current_stock: editRecord.current_stock,
      city: editRecord.city,
    }
    if (modalType === 'pending') return {
      goods_name: editRecord.goods_name,
      door_type: editRecord.door_type,
      color: editRecord.color,
      inbound_reason: editRecord.inbound_reason,
      city: editRecord.city,
    }
    return editRecord
  }

  const getFormFields = (): FormField[] => {
    switch (modalType) {
      case 'hardware': return hardwareFormFields
      case 'accessory': return accessoryFormFields
      case 'pending': return pendingFormFields
      default: return []
    }
  }

  const typeLabel: Record<string, string> = { hardware: '五金', accessory: '配件', pending: '暂存货品' }

  const actionCol = (type: string) => ({ title: '操作', width: 180, render: (_: any, r: any) => (
    <Space>
      <Authorized permission="warehouse-edit">
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(type, r)}>编辑</Button>
      </Authorized>
      <Dropdown menu={{ items: [
        { key: 'detail', icon: <EyeOutlined />, label: '查看详情' },
        ...(hasPermission('warehouse-inventory') && (type === 'hardware' || type === 'accessory' || type === 'pending') ? [{ key: 'inventory' as const, icon: <CheckSquareOutlined />, label: '盘点' }] : []),
        { type: 'divider' as const },
        ...(hasPermission('warehouse-delete') ? [{ key: 'delete' as const, icon: <DeleteOutlined />, label: '删除', danger: true }] : []),
      ], onClick: ({ key }) => {
        if (key === 'detail') message.info(`查看详情: ${r.name || r.order_no}`)
        else if (key === 'inventory') handleInventoryCheck(type, r)
        else if (key === 'delete') handleDelete(type, r)
      } }}>
        <Button type="text" size="small" icon={<MoreOutlined />} />
      </Dropdown>
    </Space>
  ) })

  // ── 订单状态标签渲染 ──
  const renderOrderStatus = (status: string) => {
    const tag = ORDER_STATUS_TAG[status]
    if (tag) return <Tag color={tag.color}>{tag.label}</Tag>
    return <Tag>{status}</Tag>
  }

  // ── 列定义 ──
  const flowCols = [
    { title: '订单号', dataIndex: 'order_no', width: 150 },
    { title: '订单状态', dataIndex: 'order_status', width: 100, render: renderOrderStatus },
    { title: '品牌', dataIndex: 'brand_name', width: 100, render: (v: string) => v || '-' },
    { title: '门店', dataIndex: 'store_name', width: 120, render: (v: string) => v || '-' },
    { title: '产品类型', dataIndex: 'product_type', width: 90, render: v => <Tag color={PL_COLORS[v]}>{PL_LABELS[v]}</Tag> },
    { title: '产品型号', dataIndex: 'product_model', width: 100, render: (v: string) => v || '-' },
    { title: '数量', dataIndex: 'quantity', width: 60 },
    { title: '状态', dataIndex: 'status', width: 90 },
    { title: '创建时间', dataIndex: 'created_at', width: 160 },
  ]

  const hardwareCols = [
    { title: '名称', dataIndex: 'name', width: 120 },
    { title: '类型', dataIndex: 'hardware_type', width: 80 },
    { title: '当前库存', dataIndex: 'current_stock', width: 90, render: (v: number, r: HardwareInventory) => (
      <span style={{ color: v < r.alert_quantity ? '#FF3B30' : undefined, fontWeight: v < r.alert_quantity ? 600 : undefined }}>
        {v}
        {v < r.alert_quantity && <Tag color="red" style={{ marginLeft: 4, fontSize: 10 }}>预警</Tag>}
      </span>
    )},
    { title: '预警数量', dataIndex: 'alert_quantity', width: 90 },
    { title: '采购中', dataIndex: 'purchasing_quantity', width: 80 },
    { title: '待出库需求', dataIndex: 'pending_out_quantity', width: 100 },
    { title: '可用库存', dataIndex: 'available_stock', width: 90, render: (v: number) => <span style={{ color: v < 10 ? '#FF3B30' : '#34C759', fontWeight: 600 }}>{v}</span> },
    { title: '操作', width: 220, render: (_: any, r: HardwareInventory) => (
      <Space>
        <Button type="link" size="small" icon={<ExportOutlined />} onClick={() => handleStock('hardware', 'out', r)}>出库</Button>
        <Button type="link" size="small" icon={<ImportOutlined />} onClick={() => handleStock('hardware', 'in', r)}>入库</Button>
        <Dropdown menu={{ items: [
          { key: 'history', icon: <HistoryOutlined />, label: '出入库记录' },
          { key: 'edit', icon: <EditOutlined />, label: '编辑' },
          { key: 'inventory', icon: <CheckSquareOutlined />, label: '盘点' },
          { type: 'divider' as const },
          { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
        ], onClick: ({ key }) => {
          if (key === 'history') handleViewHistory(r)
          else if (key === 'edit') handleEdit('hardware', r)
          else if (key === 'inventory') handleInventoryCheck('hardware', r)
          else if (key === 'delete') handleDelete('hardware', r)
        } }}>
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      </Space>
    )},
  ]

  const accessoryCols = [
    { title: '名称', dataIndex: 'name', width: 130 },
    { title: '规格型号', dataIndex: 'spec_model', width: 100 },
    { title: '当前库存', dataIndex: 'current_stock', width: 100 },
    { title: '采购中', dataIndex: 'purchasing_quantity', width: 100 },
    { title: '操作', width: 220, render: (_: any, r: AccessoryInventory) => (
      <Space>
        <Button type="link" size="small" icon={<ExportOutlined />} onClick={() => handleStock('accessory', 'out', r)}>出库</Button>
        <Button type="link" size="small" icon={<ImportOutlined />} onClick={() => handleStock('accessory', 'in', r)}>入库</Button>
        <Dropdown menu={{ items: [
          { key: 'history', icon: <HistoryOutlined />, label: '出入库记录' },
          { key: 'edit', icon: <EditOutlined />, label: '编辑' },
          { key: 'inventory', icon: <CheckSquareOutlined />, label: '盘点' },
          { type: 'divider' as const },
          { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
        ], onClick: ({ key }) => {
          if (key === 'history') handleViewHistory(r)
          else if (key === 'edit') handleEdit('accessory', r)
          else if (key === 'inventory') handleInventoryCheck('accessory', r)
          else if (key === 'delete') handleDelete('accessory', r)
        } }}>
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      </Space>
    )},
  ]

  const pendingCols = [
    { title: '名称', dataIndex: 'goods_name', width: 110 },
    { title: '门种类', dataIndex: 'door_type', width: 80, render: v => <Tag color={PL_COLORS[v]}>{PL_LABELS[v]}</Tag> },
    { title: '颜色', dataIndex: 'color', width: 100, render: (v: string) => v || '-' },
    { title: '入库时间', dataIndex: 'inbound_time', width: 140 },
    { title: '入库原因', dataIndex: 'inbound_reason', width: 90, render: (v: string) => v || '-' },
    { title: '匹配状态', dataIndex: 'match_status', width: 90, render: v => { const m = MATCH_LABELS[v]; return m ? <Tag color={m.color}>{m.text}</Tag> : v } },
    { title: '匹配订单', dataIndex: 'matched_order_no', width: 150, render: (v: string) => v || '-' },
    actionCol('pending'),
  ]

  const transferCols = [
    { title: '调出城市', dataIndex: 'from_city', width: 100 },
    { title: '调入城市', dataIndex: 'to_city', width: 100 },
    { title: '货品信息', dataIndex: 'goods_info', width: 200, render: (v: string) => <span style={{ whiteSpace: 'pre-line' }}>{v || '-'}</span> },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => { const t = TRANSFER_STATUS_TAG[v]; return t ? <Tag color={t.color}>{t.label}</Tag> : v } },
    { title: '发起人', dataIndex: 'initiated_by_name', width: 80, render: (v: string) => v || '-' },
    { title: '创建时间', dataIndex: 'created_at', width: 150 },
    { title: '操作', width: 160, render: (_: any, r: WarehouseTransfer) => (
      <Space>
        {r.status === 'pending' && <Button type="link" size="small" onClick={() => handleTransferAction(r, 'confirmed')}>确认</Button>}
        {r.status === 'confirmed' && <Button type="link" size="small" onClick={() => handleTransferAction(r, 'transit')}>发货</Button>}
        {r.status === 'transit' && <Button type="link" size="small" onClick={() => handleTransferAction(r, 'completed')}>签收</Button>}
        {r.status === 'completed' && <span style={{ color: '#999' }}>已完成</span>}
      </Space>
    )},
  ]

  const tabItems = [
    { key: 'flow', label: `产品流转仓 (${flow.length})`, children: (
      <BaseTable
        columns={flowCols}
        dataSource={flow}
        loading={flowLoading}
        rowKey="id"
        // 流转仓：去掉新建按钮，添加筛选栏
        extraFilters={
          <Space>
            <Select
              placeholder="订单状态"
              allowClear
              style={{ width: 130 }}
              size="small"
              value={flowOrderStatus}
              onChange={v => setFlowOrderStatus(v)}
              options={Object.entries(ORDER_STATUS_TAG).map(([value, { label }]) => ({ value, label }))}
            />
            <Select
              placeholder="品牌"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 140 }}
              size="small"
              value={flowBrandId}
              onChange={v => setFlowBrandId(v)}
              options={brandOptions}
            />
            <Select
              placeholder="门店"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 160 }}
              size="small"
              value={flowStoreId}
              onChange={v => setFlowStoreId(v)}
              options={storeOptions}
            />
          </Space>
        }
        pagination={false}
      />
    )},
    { key: 'hardware', label: `五金仓 (${hardware.length})`, children: (
      <BaseTable
        columns={hardwareCols}
        dataSource={hardware}
        loading={hardwareLoading}
        rowKey="id"
        onAdd={hasPermission('warehouse-create') ? () => handleAdd('hardware') : undefined}
        addText="新增入库"
        pagination={false}
      />
    )},
    { key: 'accessory', label: `配件仓 (${accessory.length})`, children: (
      <BaseTable
        columns={accessoryCols}
        dataSource={accessory}
        loading={accessoryLoading}
        rowKey="id"
        onAdd={hasPermission('warehouse-create') ? () => handleAdd('accessory') : undefined}
        addText="新增入库"
        pagination={false}
      />
    )},
    { key: 'pending', label: `货品暂存仓 (${pending.length})`, children: (
      <BaseTable
        columns={pendingCols}
        dataSource={pending}
        loading={pendingLoading}
        rowKey="id"
        onAdd={hasPermission('warehouse-create') ? () => handleAdd('pending') : undefined}
        addText="新增入库"
        pagination={false}
      />
    )},
    { key: 'transfer', label: `城市调拨 (${transfer.length})`, children: (
      <BaseTable
        columns={transferCols}
        dataSource={transfer}
        loading={transferLoading}
        rowKey="id"
        onAdd={hasPermission('warehouse-transfer') ? () => { transferForm.resetFields(); setTransferModalVisible(true) } : undefined}
        addText="新建调拨"
        pagination={false}
      />
    )},
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h2>仓库管理</h2><p>管理产品流转、五金配件库存与货品暂存</p></div>
      </div>
      <Card><Tabs items={tabItems} /></Card>
      <ModalForm
        title={`${editRecord ? '编辑' : '入库'}${typeLabel[modalType] || '产品'}`}
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setEditRecord(null) }}
        onOk={handleOk}
        fields={getFormFields()}
        initialValues={getInitialValues()}
        confirmLoading={submitting}
      />
      {/* 盘点弹窗 */}
      <Modal
        title={`库存盘点 — ${inventoryCheckRecord?.name || ''}`}
        open={inventoryCheckVisible}
        onOk={handleInventoryCheckOk}
        onCancel={() => setInventoryCheckVisible(false)}
        okText="确认盘点"
        cancelText="取消"
        width={400}
      >
        <Form form={inventoryForm} layout="vertical">
          <Form.Item label="物品名称"><span style={{ fontWeight: 500 }}>{inventoryCheckRecord?.name}</span></Form.Item>
          <Form.Item label="账面库存"><span style={{ fontWeight: 500 }}>{inventoryCheckRecord?.current_stock}</span></Form.Item>
          <Form.Item name="actual_quantity" label="实盘数量" rules={[{ required: true, message: '请输入实盘数量' }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入实际盘点数量" />
          </Form.Item>
        </Form>
      </Modal>
      {/* 调拨弹窗 */}
      <Modal
        title="新建城市间调拨"
        open={transferModalVisible}
        onOk={handleTransferSubmit}
        onCancel={() => setTransferModalVisible(false)}
        okText="提交"
        cancelText="取消"
        width={520}
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item name="from_city" label="调出城市" rules={[{ required: true, message: '请选择调出城市' }]}>
            <Select placeholder="请选择调出城市" showSearch optionFilterProp="label"
              options={['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '西安'].map(c => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="to_city" label="调入城市" rules={[{ required: true, message: '请选择调入城市' }]}>
            <Select placeholder="请选择调入城市" showSearch optionFilterProp="label"
              options={['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '西安'].map(c => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="goods_info" label="货品信息" rules={[{ required: true, message: '请填写货品信息' }]}>
            <TextArea rows={4} placeholder="请输入货品信息，如：智能锁-标准款 ×10" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="选填备注" />
          </Form.Item>
        </Form>
      </Modal>
      {/* 批次5新增：出库/入库弹窗 */}
      <Modal
        title={`${stockModalType === 'out' ? '出库' : '入库'} — ${stockModalRecord?.name || ''}`}
        open={stockModalVisible}
        onOk={handleStockOk}
        onCancel={() => setStockModalVisible(false)}
        okText="确认"
        cancelText="取消"
        confirmLoading={stockSubmitting}
        width={400}
      >
        <Form form={stockForm} layout="vertical">
          <Form.Item label="物品名称"><span style={{ fontWeight: 500 }}>{stockModalRecord?.name}</span></Form.Item>
          <Form.Item label="当前库存"><span style={{ fontWeight: 500 }}>{stockModalRecord?.current_stock}</span></Form.Item>
          <Form.Item name="quantity" label={stockModalType === 'out' ? '出库数量' : '入库数量'} rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={stockModalType === 'out' ? stockModalRecord?.current_stock : undefined} placeholder="请输入数量" />
          </Form.Item>
          <Form.Item name="reason" label="原因" rules={[{ required: true, message: '请输入原因' }]}>
            <Input placeholder={stockModalType === 'out' ? '如：安装使用' : '如：采购入库'} />
          </Form.Item>
          {stockModalType === 'out' && (
            <Form.Item name="related_task_id" label="关联任务ID（可选）">
              <InputNumber style={{ width: '100%' }} placeholder="选填" />
            </Form.Item>
          )}
          {stockModalType === 'in' && (
            <Form.Item name="supplier" label="供应商（可选）">
              <Input placeholder="选填" />
            </Form.Item>
          )}
        </Form>
      </Modal>
      {/* 批次5新增：出入库历史弹窗 */}
      <Modal
        title={`出入库记录 — ${historyRecord?.name || ''}`}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={<Button onClick={() => setHistoryModalVisible(false)}>关闭</Button>}
        width={700}
      >
        {historyRecord?.stock_records && historyRecord.stock_records.length > 0 ? (
          <Table
            dataSource={historyRecord.stock_records.map((r: any, idx: number) => ({ ...r, key: idx }))}
            columns={[
              { title: '类型', dataIndex: 'type', width: 80, render: (v: string) => <Tag color={v === 'out' ? 'red' : 'green'}>{v === 'out' ? '出库' : '入库'}</Tag> },
              { title: '数量', dataIndex: 'quantity', width: 80 },
              { title: '原因', dataIndex: 'reason', width: 150 },
              { title: '操作人', dataIndex: 'operator', width: 100 },
              { title: '时间', dataIndex: 'created_at', width: 180, render: (v: string) => v?.replace('T', ' ').slice(0, 19) },
              { title: '备注', dataIndex: 'supplier', width: 100, render: (v: string, r: any) => v || r.related_task_id || '-' },
            ]}
            pagination={false}
            size="small"
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>暂无出入库记录</div>
        )}
      </Modal>
    </div>
  )
}

export default Warehouse
