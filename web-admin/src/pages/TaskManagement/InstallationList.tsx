import { useState, useCallback, useEffect } from 'react'
import { Button, Tag, Space, message, Modal, Descriptions, Form, Select, Spin, Popconfirm } from 'antd'
import { EyeOutlined, EditOutlined, DeleteOutlined, SendOutlined, SearchOutlined, ToolOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons'
import { Authorized } from '../../components/Authorized'
import BaseTable from '../../components/BaseTable'
import StatusTag from '../../components/StatusTag'
import ModalForm from '../../components/ModalForm'
import type { FormField } from '../../components/ModalForm'
import type { InstallationTask } from '../../types/api'
import type { ColumnsType } from 'antd/es/table'
import { get, post, patch, del } from '../../utils/request'
import { ORDER_STATUS_TAG } from '../../types/api'
import { phoneRules } from '../../utils/validators'

// ── 关联订单搜索结果类型 ──
interface OrderSearchResult {
  id: number
  order_no: string
  brand_name: string
  store_name: string
  customer_name: string
  customer_phone: string
  customer_address: string
  order_status: string
}

const formFields: FormField[] = [
  { name: 'customer_name', label: '客户姓名', type: 'input', rules: [{ required: true, message: '请输入客户姓名' }] },
  { name: 'customer_phone', label: '客户电话', type: 'input', rules: phoneRules },
  { name: 'customer_address', label: '客户地址', type: 'input' },
  { name: 'branch', label: '分公司', type: 'select', options: [
    { value: '华东分公司', label: '华东分公司' }, { value: '华南分公司', label: '华南分公司' }, { value: '华北分公司', label: '华北分公司' },
  ] },
  { name: 'remark', label: '备注', type: 'textarea' },
]

/** 将后端 snake_case 字段映射为前端 camelCase */
const toCamel = (r: any): InstallationTask => ({
  id: r.id,
  taskNo: r.task_no ?? r.taskNo ?? '',
  relatedOrderNo: r.related_order_no ?? r.relatedOrderNo,
  branch: r.branch ?? '',
  customerName: r.customer_name ?? r.customerName ?? '',
  customerPhone: r.customer_phone ?? r.customerPhone ?? '',
  customerAddress: r.customer_address ?? r.customerAddress ?? '',
  status: r.status ?? 'pending',
  // 安装师傅：优先使用 assigned_to_name（单个姓名），其次 installers_name，最后拼接 installers 数组
  assignedWorkers: r.assigned_to_name
    ? [r.assigned_to_name]
    : r.installers_name
    ? [r.installers_name]
    : r.installers?.map((i: any) => i.name || i).filter(Boolean)
    ?? r.assigned_workers
    ?? r.assignedWorkers
    ?? [],
  measurementPhotos: r.measurement_photos ?? r.measurementPhotos ?? [],
  deliveryPhotos: r.delivery_photos ?? r.deliveryPhotos ?? [],
  installationPhotos: r.installation_photos ?? r.installationPhotos ?? [],
  extraItems: r.extra_items ?? r.extraItems ?? [],
  remark: r.remark ?? '',
  completedAt: r.completed_at ?? r.completedAt,
  createdAt: r.created_at ?? r.createdAt ?? '',
})

/** 将前端 camelCase 字段映射回后端 snake_case */
const toSnake = (values: Record<string, any>) => {
  const map: Record<string, string> = {
    related_order_no: 'relatedOrderNo',
    order: 'order',
    customer_name: 'customerName',
    customer_phone: 'customerPhone',
    customer_address: 'customerAddress',
    assigned_workers: 'assignedWorkers',
    measurement_photos: 'measurementPhotos',
    delivery_photos: 'deliveryPhotos',
    installation_photos: 'installationPhotos',
    extra_items: 'extraItems',
    completed_at: 'completedAt',
    created_at: 'createdAt',
  }
  const result: Record<string, any> = {}
  for (const [snake, camel] of Object.entries(map)) {
    if (values[camel] !== undefined) result[snake] = values[camel]
  }
  for (const [k, v] of Object.entries(values)) {
    if (!map[k] && !result[k]) result[k] = v
  }
  return result
}

const API_BASE = '/installations/tasks'

const InstallationList = () => {
  const [data, setData] = useState<InstallationTask[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Modal states
  const [modalVisible, setModalVisible] = useState(false)
  const [editRecord, setEditRecord] = useState<InstallationTask | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Detail modal states
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailRecord, setDetailRecord] = useState<InstallationTask | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ── 生成售后单 loading ──
  const [createMaintenanceLoading, setCreateMaintenanceLoading] = useState(false)

  // ── 新建安装单：关联订单相关 ──
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [_orderSearchValue, setOrderSearchValue] = useState('')
  const [orderOptions, setOrderOptions] = useState<{ value: number; label: string }[]>([])
  const [orderSearchLoading, setOrderSearchLoading] = useState(false)
  const [selectedOrderInfo, setSelectedOrderInfo] = useState<OrderSearchResult | null>(null)

  // ── 派单弹窗 ──
  const [assignVisible, setAssignVisible] = useState(false)
  const [assignRecord, setAssignRecord] = useState<InstallationTask | null>(null)
  const [assignLoading, setAssignLoading] = useState(false)
  const [selectedWorkers, setSelectedWorkers] = useState<number[]>([])
  const [workerOptions, setWorkerOptions] = useState<{ value: number; label: string }[]>([])
  const [workerSearchLoading, setWorkerSearchLoading] = useState(false)

  // ── 完成弹窗 ──
  const [completeVisible, setCompleteVisible] = useState(false)
  const [completeRecord, setCompleteRecord] = useState<InstallationTask | null>(null)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [completeNotes, setCompleteNotes] = useState('')

  // 搜索订单（防抖）
  const searchOrders = useCallback(async (keyword: string) => {
    if (!keyword || keyword.length < 1) {
      setOrderOptions([])
      return
    }
    setOrderSearchLoading(true)
    try {
      const res = await get<any>(`/orders/?search=${encodeURIComponent(keyword)}&page_size=20`)
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setOrderOptions(
        Array.isArray(items) ? items.map((o: any) => ({ value: o.id, label: o.order_no })) : []
      )
    } catch {
      setOrderOptions([])
    } finally {
      setOrderSearchLoading(false)
    }
  }, [])

  /** 当选择了一个订单后，获取订单详情以自动填充 */
  const handleOrderSelect = useCallback(async (orderId: number) => {
    setSelectedOrderId(orderId)
    try {
      const res = await get<any>(`/orders/${orderId}/`)
      setSelectedOrderInfo(res)
    } catch {
      setSelectedOrderInfo(null)
    }
  }, [])

  /** 取消关联订单 */
  const handleOrderClear = () => {
    setSelectedOrderId(null)
    setSelectedOrderInfo(null)
    setOrderOptions([])
    setOrderSearchValue('')
  }

  // Fetch list
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await get<any>(`${API_BASE}/?${params.toString()}`)
      const results = Array.isArray(res) ? res : (res.items || res.results || [])
      setData(Array.isArray(results) ? results.map(toCamel) : [])
      setTotal(res.total ?? res.count ?? (Array.isArray(results) ? results.length : 0))
    } catch (err: any) {
      message.error(err.message || '加载安装任务列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  // Fetch single detail
  const fetchDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const res = await get<any>(`${API_BASE}/${id}/`)
      setDetailRecord(toCamel(res))
      setDetailVisible(true)
    } catch (err: any) {
      message.error(err.message || '获取详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  // Add / Edit
  const handleAdd = () => {
    setEditRecord(null)
    setSelectedOrderId(null)
    setSelectedOrderInfo(null)
    setOrderSearchValue('')
    setOrderOptions([])
    setModalVisible(true)
  }
  const handleEdit = (r: InstallationTask) => { setEditRecord(r); setModalVisible(true) }

  const handleOk = async (values: any) => {
    setModalLoading(true)
    try {
      const payload = toSnake(values)
      // 如果选择了关联订单，附加 order 字段
      if (selectedOrderId) {
        payload.order = selectedOrderId
      }
      if (editRecord) {
        await patch(`${API_BASE}/${editRecord.id}/`, payload)
        message.success('编辑成功')
      } else {
        await post(API_BASE + '/', payload)
        message.success('新增成功')
      }
      setModalVisible(false)
      setEditRecord(null)
      setSelectedOrderId(null)
      setSelectedOrderInfo(null)
      fetchData()
    } catch (err: any) {
      // 403: 无权限独立创建
      if (err.status === 403) {
        message.error('无权限创建独立安装任务，请关联订单后重试')
      } else {
        message.error(err.message || '操作失败')
      }
    } finally {
      setModalLoading(false)
    }
  }

  // View detail
  const handleView = (r: InstallationTask) => { fetchDetail(r.id) }

  // ── 搜索安装工 ──
  const searchWorkers = useCallback(async (keyword: string) => {
    if (!keyword || keyword.length < 1) {
      setWorkerOptions([])
      return
    }
    setWorkerSearchLoading(true)
    try {
      const res = await get<any>(`/personnel/workers/?search=${encodeURIComponent(keyword)}&skill=installation&page_size=20`)
      const items = Array.isArray(res) ? res : (res.items || res.results || [])
      setWorkerOptions(
        Array.isArray(items) ? items.map((w: any) => ({ value: w.id, label: `${w.name}${w.phone ? ` (${w.phone})` : ''}` })) : []
      )
    } catch {
      try {
        const res = await get<any>(`/personnel/workers/?search=${encodeURIComponent(keyword)}&page_size=20`)
        const items = Array.isArray(res) ? res : (res.items || res.results || [])
        setWorkerOptions(
          Array.isArray(items) ? items.map((w: any) => ({ value: w.id, label: `${w.name}${w.phone ? ` (${w.phone})` : ''}` })) : []
        )
      } catch {
        setWorkerOptions([])
      }
    } finally {
      setWorkerSearchLoading(false)
    }
  }, [])

  // ── 派单操作 ──
  const handleDispatch = (r: InstallationTask) => {
    setAssignRecord(r)
    setSelectedWorkers([])
    setWorkerOptions([])
    setAssignVisible(true)
  }

  const handleAssignConfirm = async () => {
    if (!assignRecord) return
    if (selectedWorkers.length === 0) {
      message.warning('请选择至少一名安装工')
      return
    }
    setAssignLoading(true)
    try {
      await post(`${API_BASE}/${assignRecord.id}/assign/`, { installers: selectedWorkers })
      message.success('派单成功')
      setAssignVisible(false)
      setAssignRecord(null)
      fetchData()
    } catch (err: any) {
      message.error(err.message || '派单失败')
    } finally {
      setAssignLoading(false)
    }
  }

  // ── 完成操作 ──
  const handleComplete = (r: InstallationTask) => {
    setCompleteRecord(r)
    setCompleteNotes('')
    setCompleteVisible(true)
  }

  const handleCompleteConfirm = async () => {
    if (!completeRecord) return
    setCompleteLoading(true)
    try {
      await post(`${API_BASE}/${completeRecord.id}/complete/`, { notes: completeNotes })
      message.success('已完成')
      setCompleteVisible(false)
      setCompleteRecord(null)
      fetchData()
    } catch (err: any) {
      message.error(err.message || '操作失败')
    } finally {
      setCompleteLoading(false)
    }
  }

  // ── 取消操作 ──
  const handleCancel = async (r: InstallationTask) => {
    try {
      await post(`${API_BASE}/${r.id}/cancel/`)
      message.success('已取消')
      fetchData()
    } catch (err: any) {
      message.error(err.message || '取消失败')
    }
  }

  // Delete
  const handleDelete = (r: InstallationTask) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除安装任务 ${r.taskNo} 吗？`,
      okText: '删除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await del(`${API_BASE}/${r.id}/`)
          message.success('删除成功')
          fetchData()
        } catch (err: any) {
          message.error(err.message || '删除失败')
        }
      },
    })
  }

  // ── 生成售后单（从安装单） ──
  const handleCreateMaintenance = async (task: InstallationTask) => {
    Modal.confirm({
      title: '生成售后单',
      content: `确定要基于安装单 ${task.taskNo} 生成售后单吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setCreateMaintenanceLoading(true)
        try {
          await post('/maintenance/tasks/create-from-installation/', { installation_task_id: task.id })
          message.success('售后单已生成')
          setDetailVisible(false)
          fetchData()
        } catch (err: any) {
          message.error(err.message || '生成售后单失败')
        } finally {
          setCreateMaintenanceLoading(false)
        }
      },
    })
  }

  // Search & filter handlers
  const handleSearch = (values: Record<string, any>) => {
    const q = values.taskNo || values.search || values.key || ''
    setSearch(q)
    setPage(1)
  }

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') {
      setStatusFilter(value || '')
    }
    setPage(1)
  }

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPage(1)
  }

  /** 自定义表单字段渲染：关联订单选择器（仅在新建时显示） */
  const customFieldRender = (fieldName: string) => {
    if (fieldName === '_order_search' && !editRecord) {
      return (
        <div>
          <Select
            showSearch
            allowClear
            placeholder="输入订单号搜索关联订单（可选）"
            filterOption={false}
            value={selectedOrderId}
            onSearch={(v) => {
              setOrderSearchValue(v)
              searchOrders(v)
            }}
            onSelect={handleOrderSelect}
            onClear={handleOrderClear}
            notFoundContent={orderSearchLoading ? <Spin size="small" /> : '暂无匹配订单'}
            options={orderOptions}
            style={{ width: '100%' }}
            suffixIcon={<SearchOutlined />}
          />
          {selectedOrderInfo && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#fafafa', borderRadius: 6, fontSize: 13 }}>
              <div><b>品牌：</b>{selectedOrderInfo.brand_name || '-'}</div>
              <div><b>门店：</b>{selectedOrderInfo.store_name || '-'}</div>
              <div><b>客户：</b>{selectedOrderInfo.customer_name}</div>
              <div><b>电话：</b>{selectedOrderInfo.customer_phone || '-'}</div>
              <div><b>地址：</b>{selectedOrderInfo.customer_address || '-'}</div>
              <div>
                <b>订单状态：</b>
                {(() => {
                  const tag = ORDER_STATUS_TAG[selectedOrderInfo.order_status]
                  return tag ? <Tag color={tag.color} style={{ marginLeft: 4 }}>{tag.label}</Tag> : selectedOrderInfo.order_status
                })()}
              </div>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  /** 当表单值变化时：如果关联了订单且字段为空，自动填充 */
  const handleValuesChange = (_changedValues: any, allValues: any) => {
    // 不强制覆盖用户已填的值
  }

  /** 获取表单初始值（新建时关联订单自动填充） */
  const getInitialValues = () => {
    if (editRecord) return toSnake(editRecord as unknown as Record<string, any>)
    // 新建时如果有选中的订单，自动填充客户信息
    if (selectedOrderInfo) {
      return {
        customer_name: selectedOrderInfo.customer_name,
        customer_phone: selectedOrderInfo.customer_phone,
        customer_address: selectedOrderInfo.customer_address,
      }
    }
    return undefined
  }

  /** 动态表单字段：新建时顶部插入关联订单搜索 */
  const getFormFields = (): FormField[] => {
    if (!editRecord) {
      return [
        { name: '_order_search', label: '关联订单', type: 'input' },
        ...formFields,
      ]
    }
    return formFields
  }

  const columns: ColumnsType<InstallationTask> = [
    { title: '任务号', dataIndex: 'taskNo', width: 160 },
    { title: '关联订单', dataIndex: 'relatedOrderNo', width: 150, render: v => v || '-' },
    { title: '客户', dataIndex: 'customerName', width: 80 },
    { title: '地址', dataIndex: 'customerAddress', width: 120, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 90, render: v => <StatusTag status={v} /> },
    {
      title: '安装师傅', dataIndex: 'assignedWorkers', width: 90,
      render: (v: string[]) => v?.length ? v.join('、') : <Tag color="orange">待派单</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 160 },
    {
      title: '操作', width: 240, fixed: 'right',
      render: (_, r) => (
        <Space>
          {(r.status === 'pending') && (
            <Authorized permission="tasks-dispatch">
              <Button type="primary" size="small" icon={<SendOutlined />} onClick={() => handleDispatch(r)}>派单</Button>
            </Authorized>
          )}
          {r.status === 'assigned' && (
            <Authorized permission="tasks-complete">
              <Button type="primary" size="small" style={{ background: '#52c41a', borderColor: '#52c41a' }} icon={<CheckCircleOutlined />} onClick={() => handleComplete(r)}>完成</Button>
            </Authorized>
          )}
          {(r.status === 'pending' || r.status === 'assigned') && (
            <Authorized permission="tasks-cancel">
              <Popconfirm
                title="确认取消"
                description={`确定要取消安装任务 ${r.taskNo} 吗？`}
                onConfirm={() => handleCancel(r)}
                okText="取消任务"
                cancelText="返回"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" size="small" danger icon={<StopOutlined />}>取消</Button>
              </Popconfirm>
            </Authorized>
          )}
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(r)}>查看</Button>
          <Authorized permission="tasks-edit">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          </Authorized>
          <Authorized permission="tasks-delete">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)}>删除</Button>
          </Authorized>
        </Space>
      ),
    },
  ]

  return (
    <>
      <BaseTable
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        searchFields={[{ key: 'taskNo', label: '任务号', placeholder: '搜索任务号/客户名' }]}
        onSearch={handleSearch}
        filterOptions={[{ key: 'status', label: '状态', options: [
          { value: 'pending', label: '待派单' }, { value: 'assigned', label: '已派单' },
          { value: 'completed', label: '已完成' }, { value: 'partial', label: '部分完成' },
          { value: 'cancelled', label: '已取消' },
        ]}]}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onAdd={handleAdd}
        addText="新建安装单"
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps) },
        }}
      />
      <ModalForm
        title={editRecord ? '编辑安装任务' : '新建安装任务'}
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setEditRecord(null); setSelectedOrderId(null); setSelectedOrderInfo(null) }}
        onOk={handleOk}
        fields={getFormFields()}
        initialValues={getInitialValues()}
        confirmLoading={modalLoading}
        customFieldRender={customFieldRender}
        onValuesChange={handleValuesChange}
      />

      {/* ── 派单弹窗 ── */}
      <Modal
        title={`派单 - ${assignRecord?.taskNo || ''}`}
        open={assignVisible}
        onCancel={() => { setAssignVisible(false); setAssignRecord(null) }}
        onOk={handleAssignConfirm}
        confirmLoading={assignLoading}
        okText="确认派单"
        width={480}
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="选择安装工" required>
            <Select
              mode="multiple"
              showSearch
              allowClear
              placeholder="输入姓名搜索安装工"
              filterOption={false}
              value={selectedWorkers}
              onSearch={searchWorkers}
              onChange={(val) => setSelectedWorkers(val)}
              notFoundContent={workerSearchLoading ? <Spin size="small" /> : '暂无匹配工人'}
              options={workerOptions}
              style={{ width: '100%' }}
              suffixIcon={<SearchOutlined />}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── 完成弹窗 ── */}
      <Modal
        title={`完成确认 - ${completeRecord?.taskNo || ''}`}
        open={completeVisible}
        onCancel={() => { setCompleteVisible(false); setCompleteRecord(null) }}
        onOk={handleCompleteConfirm}
        confirmLoading={completeLoading}
        okText="确认完成"
        okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
        width={480}
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="备注">
            <Input.TextArea
              rows={3}
              placeholder="可选填完成备注"
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="安装任务详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={
          <Space>
            {detailRecord && (
              <Button
                icon={<ToolOutlined />}
                onClick={() => handleCreateMaintenance(detailRecord)}
                loading={createMaintenanceLoading}
              >
                生成售后单
              </Button>
            )}
            <Button onClick={() => setDetailVisible(false)}>关闭</Button>
          </Space>
        }
        width={600}
        loading={detailLoading}
      >
        {detailRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="任务号">{detailRecord.taskNo}</Descriptions.Item>
            <Descriptions.Item label="关联订单">{detailRecord.relatedOrderNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户姓名">{detailRecord.customerName}</Descriptions.Item>
            <Descriptions.Item label="客户电话">{detailRecord.customerPhone}</Descriptions.Item>
            <Descriptions.Item label="客户地址" span={2}>{detailRecord.customerAddress}</Descriptions.Item>
            <Descriptions.Item label="分公司">{detailRecord.branch}</Descriptions.Item>
            <Descriptions.Item label="状态"><StatusTag status={detailRecord.status} /></Descriptions.Item>
            <Descriptions.Item label="安装师傅">{detailRecord.assignedWorkers?.length ? detailRecord.assignedWorkers.join('、') : '待派单'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{detailRecord.createdAt}</Descriptions.Item>
            {detailRecord.completedAt && <Descriptions.Item label="完成时间">{detailRecord.completedAt}</Descriptions.Item>}
            {detailRecord.extraItems?.length > 0 && (
              <Descriptions.Item label="增项" span={2}>
                {detailRecord.extraItems.map(e => `${e.description} ¥${e.amount}`).join('；')}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </>
  )
}

export default InstallationList
