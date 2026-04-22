import { useState, useCallback, useEffect } from 'react'
import { 
  Button, Tag, Space, message, Modal, Descriptions, Row, Col, 
  Form, Input, Select, InputNumber, Card, Spin, Popconfirm,
} from 'antd'
import { 
  EyeOutlined, EditOutlined, DeleteOutlined,
  PlusOutlined, MinusCircleOutlined, 
  SendOutlined, CheckCircleOutlined, StopOutlined, SearchOutlined,
} from '@ant-design/icons'
import { Authorized } from '../../components/Authorized'
import BaseTable from '../../components/BaseTable'
import StatusTag from '../../components/StatusTag'

import type { ColumnsType } from 'antd/es/table'
import { get, post, patch, del } from '../../utils/request'
import { phoneRules } from '../../utils/validators'

// 状态映射
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待派单', color: 'orange' },
  assigned: { label: '已派单', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
}

// 来源映射
const SOURCE_MAP: Record<string, string> = {
  brand_store: '装企',
  direct: '直单',
  direct_task: '直接任务',
}

// 后端 MeasurementTaskListSerializer 返回字段
interface MeasurementRecord {
  id: number
  task_no: string
  source: string
  brand: number | null
  brand_name: string
  store: number | null
  store_name: string
  customer_name: string
  customer_phone: string
  customer_address: string
  assigned_to: number | null
  assigned_to_name: string
  status: string
  status_display: string
  wage_amount: number | null
  created_at: string
}

interface BrandOption {
  id: number
  name: string
}

interface StoreOption {
  id: number
  name: string
  brand_id: number
}

const MeasurementList = () => {
  // 数据状态
  const [data, setData] = useState<MeasurementRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 筛选状态
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')

  // 品牌和门店数据
  const [brandOptions, setBrandOptions] = useState<{ value: string; label: string }[]>([])
  const [storeOptions, setStoreOptions] = useState<{ value: string; label: string }[]>([])
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingStores, setLoadingStores] = useState(false)

  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false)
  const [editRecord, setEditRecord] = useState<MeasurementRecord | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailRecord, setDetailRecord] = useState<MeasurementRecord | null>(null)

  // ── 派单弹窗 ──
  const [assignVisible, setAssignVisible] = useState(false)
  const [assignRecord, setAssignRecord] = useState<MeasurementRecord | null>(null)
  const [assignLoading, setAssignLoading] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null)
  const [workerOptions, setWorkerOptions] = useState<{ value: number; label: string }[]>([])
  const [workerSearchLoading, setWorkerSearchLoading] = useState(false)

  // ── 完成弹窗 ──
  const [completeVisible, setCompleteVisible] = useState(false)
  const [completeRecord, setCompleteRecord] = useState<MeasurementRecord | null>(null)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [completeNotes, setCompleteNotes] = useState('')

  // 加载品牌数据
  const fetchBrands = useCallback(async () => {
    setLoadingBrands(true)
    try {
      const res = await get<any>('/decoration/brands/')
      const brands = Array.isArray(res) ? res : (res.items || res.results || [])
      const options = brands.map((brand: BrandOption) => ({
        value: String(brand.id),
        label: brand.name
      }))
      setBrandOptions(options)
    } catch (err: any) {
      console.error('加载品牌数据失败:', err)
    } finally {
      setLoadingBrands(false)
    }
  }, [])

  // 加载门店数据
  const fetchStores = useCallback(async (brandId?: string) => {
    if (!brandId) {
      setStoreOptions([])
      return
    }
    setLoadingStores(true)
    try {
      const res = await get<any>(`/decoration/stores/?brand=${brandId}`)
      const stores = Array.isArray(res) ? res : (res.items || res.results || [])
      const options = stores.map((store: StoreOption) => ({
        value: String(store.id),
        label: store.name
      }))
      setStoreOptions(options)
    } catch (err: any) {
      console.error('加载门店数据失败:', err)
    } finally {
      setLoadingStores(false)
    }
  }, [])

  // 加载量尺任务数据
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
      if (search) params.set('search', search)
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v)
      })

      const res = await get<any>(`/measurements/tasks/?${params.toString()}`)
      // Support both DRF format {count, results} and custom wrapper {code, data: {items, total}}
      const results = Array.isArray(res) ? res : (res.items || res.results || [])
      setData(Array.isArray(results) ? results : [])
      setTotal(res.total ?? res.count ?? 0)
    } catch (err: any) {
      message.error(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, filters])

  // 初始化加载
  useEffect(() => { 
    fetchData()
    fetchBrands()
  }, [fetchData])

  // ── 搜索量尺工 ──
  const searchWorkers = useCallback(async (keyword: string) => {
    if (!keyword || keyword.length < 1) {
      setWorkerOptions([])
      return
    }
    setWorkerSearchLoading(true)
    try {
      const res = await get<any>(`/personnel/workers/?search=${encodeURIComponent(keyword)}&skill=measurement&page_size=20`)
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
  const handleDispatch = (r: MeasurementRecord) => {
    setAssignRecord(r)
    setSelectedWorker(null)
    setWorkerOptions([])
    setAssignVisible(true)
  }

  const handleAssignConfirm = async () => {
    if (!assignRecord) return
    if (!selectedWorker) {
      message.warning('请选择量尺工')
      return
    }
    setAssignLoading(true)
    try {
      await post(`/measurements/tasks/${assignRecord.id}/assign/`, { assigned_to: selectedWorker })
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
  const handleComplete = (r: MeasurementRecord) => {
    setCompleteRecord(r)
    setCompleteNotes('')
    setCompleteVisible(true)
  }

  const handleCompleteConfirm = async () => {
    if (!completeRecord) return
    setCompleteLoading(true)
    try {
      await post(`/measurements/tasks/${completeRecord.id}/complete/`, { notes: completeNotes })
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
  const handleCancel = async (r: MeasurementRecord) => {
    try {
      await post(`/measurements/tasks/${r.id}/cancel/`)
      message.success('已取消')
      fetchData()
    } catch (err: any) {
      message.error(err.message || '取消失败')
    }
  }

  // 操作处理函数
  const handleAdd = () => { 
    setEditRecord(null)
    setStoreOptions([])
    setModalVisible(true) 
  }

  const handleEdit = (record: MeasurementRecord) => { 
    setEditRecord(record)
    if (record.brand) {
      fetchStores(String(record.brand))
    }
    setModalVisible(true) 
  }

  const handleView = (record: MeasurementRecord) => { 
    setDetailRecord(record)
    setDetailVisible(true) 
  }

  const handleDelete = async (record: MeasurementRecord) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除量尺任务 ${record.task_no} 吗？`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await del(`/measurements/tasks/${record.id}/`)
          message.success('删除成功')
          fetchData()
        } catch (err: any) {
          message.error(err.message || '删除失败')
        }
      },
    })
  }

  // 表格列定义
  const columns: ColumnsType<MeasurementRecord> = [
    { title: '任务号', dataIndex: 'task_no', width: 160 },
    { title: '来源', dataIndex: 'source', width: 80, render: v => <Tag>{SOURCE_MAP[v] || v}</Tag> },
    { title: '品牌', dataIndex: 'brand_name', width: 100 },
    { title: '门店', dataIndex: 'store_name', width: 120 },
    { title: '客户', dataIndex: 'customer_name', width: 80 },
    { title: '地址', dataIndex: 'customer_address', width: 120, ellipsis: true },
    { title: '量尺师傅', dataIndex: 'assigned_to_name', width: 90, render: v => v || <Tag color="orange">待派单</Tag> },
    { title: '状态', dataIndex: 'status', width: 90, render: v => <StatusTag status={v} /> },
    { title: '创建时间', dataIndex: 'created_at', width: 160 },
    {
      title: '操作', width: 260, fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Authorized permission="tasks-dispatch">
              <Button type="primary" size="small" icon={<SendOutlined />} onClick={() => handleDispatch(record)}>派单</Button>
            </Authorized>
          )}
          {record.status === 'assigned' && (
            <Authorized permission="tasks-complete">
              <Button type="primary" size="small" style={{ background: '#52c41a', borderColor: '#52c41a' }} icon={<CheckCircleOutlined />} onClick={() => handleComplete(record)}>完成</Button>
            </Authorized>
          )}
          {(record.status === 'pending' || record.status === 'assigned') && (
            <Authorized permission="tasks-cancel">
              <Popconfirm
                title="确认取消"
                description={`确定要取消量尺任务 ${record.task_no} 吗？`}
                onConfirm={() => handleCancel(record)}
                okText="取消任务"
                cancelText="返回"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" size="small" danger icon={<StopOutlined />}>取消</Button>
              </Popconfirm>
            </Authorized>
          )}
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看</Button>
          <Authorized permission="tasks-edit">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          </Authorized>
          <Authorized permission="tasks-delete">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
          </Authorized>
        </Space>
      ),
    },
  ]

  // 筛选选项
  const filterOptions = [
    { 
      key: 'status', 
      label: '状态', 
      options: [
        { value: 'pending', label: '待派单' },
        { value: 'assigned', label: '已派单' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ]
    },
    { 
      key: 'source', 
      label: '来源', 
      options: [
        { value: 'brand_store', label: '装企' },
        { value: 'direct', label: '直单' },
        { value: 'direct_task', label: '直接任务' },
      ]
    },
  ]

  return (
    <>
      <BaseTable
        columns={columns}
        dataSource={data}
        loading={loading}
        searchFields={[{ key: 'search', label: '搜索', placeholder: '搜索任务号/客户名/地址' }]}
        filterOptions={filterOptions}
        onSearch={(values) => {
          setSearch(values.search || '')
          setFilters({
            status: values.status,
            source: values.source,
          })
          setPage(1)
        }}
        onAdd={handleAdd}
        addText="新建量尺单"
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (newPage, newPageSize) => {
            setPage(newPage)
            setPageSize(newPageSize)
          }
        }}
      />

      <Modal
        title={editRecord ? '编辑量尺任务' : '新建量尺任务'}
        open={modalVisible}
        onCancel={() => { 
          setModalVisible(false)
          setEditRecord(null)
        }}
        footer={null}
        width={800}
      >
        <MeasurementCreateForm
          editRecord={editRecord}
          brandOptions={brandOptions}
          storeOptions={storeOptions}
          loadingBrands={loadingBrands}
          loadingStores={loadingStores}
          onBrandChange={fetchStores}
          onCancel={() => {
            setModalVisible(false)
            setEditRecord(null)
          }}
          onSuccess={() => {
            setModalVisible(false)
            setEditRecord(null)
            fetchData()
          }}
        />
      </Modal>

      {/* ── 派单弹窗 ── */}
      <Modal
        title={`派单 - ${assignRecord?.task_no || ''}`}
        open={assignVisible}
        onCancel={() => { setAssignVisible(false); setAssignRecord(null) }}
        onOk={handleAssignConfirm}
        confirmLoading={assignLoading}
        okText="确认派单"
        width={480}
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="选择量尺工" required>
            <Select
              showSearch
              allowClear
              placeholder="输入姓名搜索量尺工"
              filterOption={false}
              value={selectedWorker}
              onSearch={searchWorkers}
              onChange={(val) => setSelectedWorker(val)}
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
        title={`完成确认 - ${completeRecord?.task_no || ''}`}
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
        title="量尺任务详情" 
        open={detailVisible} 
        onCancel={() => setDetailVisible(false)} 
        footer={<Button onClick={() => setDetailVisible(false)}>关闭</Button>} 
        width={700}
      >
        {detailRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="任务号">{detailRecord.task_no}</Descriptions.Item>
            <Descriptions.Item label="来源"><Tag>{SOURCE_MAP[detailRecord.source] || detailRecord.source}</Tag></Descriptions.Item>
            <Descriptions.Item label="品牌">{detailRecord.brand_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="门店">{detailRecord.store_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="客户姓名">{detailRecord.customer_name}</Descriptions.Item>
            <Descriptions.Item label="客户电话">{detailRecord.customer_phone}</Descriptions.Item>
            <Descriptions.Item label="客户地址" span={2}>{detailRecord.customer_address}</Descriptions.Item>
            <Descriptions.Item label="状态"><StatusTag status={detailRecord.status} /></Descriptions.Item>
            <Descriptions.Item label="量尺师傅">{detailRecord.assigned_to_name || '待派单'}</Descriptions.Item>
            {detailRecord.wage_amount != null && <Descriptions.Item label="工费">{detailRecord.wage_amount}</Descriptions.Item>}
            <Descriptions.Item label="创建时间">{detailRecord.created_at}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  )
}

// 量尺新建表单组件
interface MeasurementCreateFormProps {
  editRecord: MeasurementRecord | null
  brandOptions: { value: string; label: string }[]
  storeOptions: { value: string; label: string }[]
  loadingBrands: boolean
  loadingStores: boolean
  onBrandChange: (brandId: string) => void
  onCancel: () => void
  onSuccess: () => void
}

const AntRow = Row
const AntCol = Col

const MeasurementCreateForm: React.FC<MeasurementCreateFormProps> = ({
  editRecord,
  brandOptions,
  storeOptions,
  loadingBrands,
  loadingStores,
  onBrandChange,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // 产品线选项
  const productLineOptions = [
    { value: 'wood', label: '木门' },
    { value: 'alloy', label: '合金门' },
    { value: 'security', label: '防盗门' },
  ]

  // 来源选项
  const sourceOptions = [
    { value: 'brand_store', label: '装企' },
    { value: 'direct', label: '直单' },
  ]

  // 初始化表单值
  useEffect(() => {
    if (editRecord) {
      form.setFieldsValue({
        source: editRecord.source,
        brand: editRecord.brand ? String(editRecord.brand) : undefined,
        store: editRecord.store ? String(editRecord.store) : undefined,
        customer_name: editRecord.customer_name,
        customer_phone: editRecord.customer_phone,
        customer_address: editRecord.customer_address,
        assigned_to: editRecord.assigned_to,
        product_details: [{}],
      })
    } else {
      form.resetFields()
    }
  }, [editRecord, form])

  // 处理品牌变化
  const handleBrandChange = (value: string) => {
    form.setFieldsValue({ store: undefined })
    onBrandChange(value)
  }

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // 处理产品明细数据
      const productDetails = values.product_details?.map((item: any) => {
        const baseItem: Record<string, any> = {
          product_line: item.product_line,
          position: item.position,
          quantity: item.quantity || 1,
        }

        switch (item.product_line) {
          case 'wood':
            return { ...baseItem, surface_process: item.surface_process }
          case 'alloy':
            return {
              ...baseItem,
              open_method: item.open_method,
              track_type: item.track_type,
              slide_type: item.slide_type,
            }
          case 'security':
            return baseItem
          default:
            return baseItem
        }
      }) || []

      const submitData = {
        source: values.source,
        brand: values.brand,
        store: values.store,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_address: values.customer_address,
        assigned_to: values.assigned_to,
        product_details: productDetails,
        notes: values.notes,
      }

      if (editRecord) {
        await patch(`/measurements/tasks/${editRecord.id}/`, submitData)
        message.success('编辑成功')
      } else {
        await post('/measurements/tasks/', submitData)
        message.success('新增成功')
      }

      onSuccess()
    } catch (error: any) {
      console.error('表单提交错误:', error)
      message.error(error.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        source: 'brand_store',
        product_details: [{}],
      }}
    >
      {/* 上半部分：信息区 */}
      <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
        {/* 第1行：来源、品牌、门店 */}
        <AntRow gutter={16}>
          <AntCol span={8}>
            <Form.Item
              name="source"
              label="来源"
              rules={[{ required: true, message: '请选择来源' }]}
            >
              <Select options={sourceOptions} placeholder="选择来源" />
            </Form.Item>
          </AntCol>
          <AntCol span={8}>
            <Form.Item
              name="brand"
              label="品牌"
              rules={[{ required: true, message: '请选择品牌' }]}
            >
              <Select
                options={brandOptions}
                loading={loadingBrands}
                placeholder="选择品牌"
                onChange={handleBrandChange}
              />
            </Form.Item>
          </AntCol>
          <AntCol span={8}>
            <Form.Item
              name="store"
              label="门店"
              rules={[{ required: true, message: '请选择门店' }]}
            >
              <Select
                options={storeOptions}
                loading={loadingStores}
                placeholder="选择门店"
                disabled={!form.getFieldValue('brand')}
              />
            </Form.Item>
          </AntCol>
        </AntRow>

        {/* 第2行：客户姓名、客户电话 */}
        <AntRow gutter={16}>
          <AntCol span={12}>
            <Form.Item name="customer_name" label="客户姓名">
              <Input placeholder="非必填" />
            </Form.Item>
          </AntCol>
          <AntCol span={12}>
            <Form.Item name="customer_phone" label="客户电话" rules={phoneRules}>
              <Input placeholder="非必填" />
            </Form.Item>
          </AntCol>
        </AntRow>

        {/* 第3行：量尺地址 */}
        <AntRow gutter={16}>
          <AntCol span={24}>
            <Form.Item
              name="customer_address"
              label="量尺地址"
              rules={[
                { required: true, message: '请输入量尺地址' },
                { pattern: /^[^,，。. ]+$/, message: '地址不能包含空格、逗号、句号，允许 -/ 符号' },
              ]}
            >
              <Input.TextArea 
                placeholder="请输入量尺地址" 
                rows={2}
              />
            </Form.Item>
          </AntCol>
        </AntRow>
      </Card>

      {/* 下半部分：量尺内容区 */}
      <Card title="量尺内容" size="small" style={{ marginBottom: 16 }}>
        <Form.List name="product_details">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <div key={key} style={{ marginBottom: 16, padding: 12, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                  <AntRow gutter={8} align="middle">
                    {/* 产品线 */}
                    <AntCol span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'product_line']}
                        rules={[{ required: true, message: '请选择产品线' }]}
                      >
                        <Select 
                        options={productLineOptions} 
                        placeholder="产品线"
                        onChange={() => {
                          const productLine = form.getFieldValue(['product_details', name, 'product_line'])
                          if (productLine) {
                            form.setFieldValue(['product_details', name, 'surface_process'], undefined)
                            form.setFieldValue(['product_details', name, 'open_method'], undefined)
                            form.setFieldValue(['product_details', name, 'track_type'], undefined)
                            form.setFieldValue(['product_details', name, 'slide_type'], undefined)
                          }
                        }}
                      />
                    </Form.Item>
                  </AntCol>

                  {/* 位置 */}
                  <AntCol span={4}>
                    <Form.Item
                      {...restField}
                      name={[name, 'position']}
                      rules={[{ required: true, message: '请选择位置' }]}
                    >
                      <Select 
                        options={[
                          { value: 'bedroom', label: '卧室' },
                          { value: 'kitchen', label: '厨房' },
                          { value: 'bathroom', label: '卫生间' },
                          { value: 'balcony', label: '阳台' },
                        ]}
                        placeholder="位置"
                      />
                    </Form.Item>
                  </AntCol>

                  {/* 规格选项 - 根据产品线动态渲染 */}
                  <AntCol span={10}>
                    <Form.Item
                      noStyle
                      shouldUpdate={(prevValues, curValues) => {
                        const prevProductLine = prevValues.product_details?.[name]?.product_line
                        const curProductLine = curValues.product_details?.[name]?.product_line
                        return prevProductLine !== curProductLine
                      }}
                    >
                      {() => {
                        const productLine = form.getFieldValue(['product_details', name, 'product_line'])
                        
                        switch (productLine) {
                          case 'wood':
                            return (
                              <Form.Item
                                {...restField}
                                name={[name, 'surface_process']}
                                rules={[{ required: true, message: '请选择工艺' }]}
                              >
                                <Select 
                                  options={[
                                    { value: 'paint', label: '油漆' },
                                    { value: 'paintless', label: '免漆' },
                                  ]}
                                  placeholder="油漆/免漆"
                                />
                              </Form.Item>
                            )
                          case 'alloy':
                            return (
                              <AntRow gutter={8}>
                                <AntCol span={6}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'open_method']}
                                    rules={[{ required: true, message: '请选择开启方式' }]}
                                  >
                                    <Select 
                                      options={[
                                        { value: 'swing', label: '平开' },
                                        { value: 'slide', label: '推拉' },
                                      ]}
                                      placeholder="开启方式"
                                    />
                                  </Form.Item>
                                </AntCol>
                                <AntCol span={6}>
                                  <Form.Item
                                    noStyle
                                    shouldUpdate={(prevValues, curValues) => {
                                      const prevOpen = prevValues.product_details?.[name]?.open_method
                                      const curOpen = curValues.product_details?.[name]?.open_method
                                      return prevOpen !== curOpen
                                    }}
                                  >
                                    {() => {
                                      const openMethod = form.getFieldValue(['product_details', name, 'open_method'])
                                      if (openMethod === 'swing') {
                                        return (
                                          <Form.Item
                                            {...restField}
                                            name={[name, 'door_cover']}
                                          >
                                            <Select 
                                              options={[
                                                { value: 'single', label: '单包' },
                                                { value: 'double', label: '双包' },
                                              ]}
                                              placeholder="门套"
                                            />
                                          </Form.Item>
                                        )
                                      }
                                      if (openMethod === 'slide') {
                                        return (
                                          <Form.Item
                                            {...restField}
                                            name={[name, 'track_type']}
                                            rules={[{ required: true, message: '请选择轨道' }]}
                                          >
                                            <Select 
                                              options={[
                                                { value: 'overhead', label: '吊轨' },
                                                { value: 'ground', label: '地轨' },
                                              ]}
                                              placeholder="轨道"
                                            />
                                          </Form.Item>
                                        )
                                      }
                                      return <Form.Item><Input placeholder="选开启方式" disabled /></Form.Item>
                                    }}
                                  </Form.Item>
                                </AntCol>
                                <AntCol span={6}>
                                  <Form.Item
                                    noStyle
                                    shouldUpdate={(prevValues, curValues) => {
                                      const prevOpen = prevValues.product_details?.[name]?.open_method
                                      const curOpen = curValues.product_details?.[name]?.open_method
                                      return prevOpen !== curOpen
                                    }}
                                  >
                                    {() => {
                                      const openMethod = form.getFieldValue(['product_details', name, 'open_method'])
                                      if (openMethod === 'slide') {
                                        return (
                                          <Form.Item
                                            {...restField}
                                            name={[name, 'slide_type']}
                                          >
                                            <Select 
                                              options={[
                                                { value: 'single', label: '单推' },
                                                { value: 'double', label: '双推' },
                                                { value: 'triple', label: '三联动' },
                                              ]}
                                              placeholder="推拉类型"
                                            />
                                          </Form.Item>
                                        )
                                      }
                                      return null
                                    }}
                                  </Form.Item>
                                </AntCol>
                              </AntRow>
                            )
                          case 'security':
                            return (
                              <Form.Item
                                {...restField}
                                name={[name, 'security_spec']}
                              >
                                <Input placeholder="防盗门无额外规格" disabled />
                              </Form.Item>
                            )
                          default:
                            return (
                              <Form.Item
                                {...restField}
                                name={[name, 'spec_placeholder']}
                              >
                                <Input placeholder="请先选择产品线" disabled />
                              </Form.Item>
                            )
                        }
                      }}
                    </Form.Item>
                  </AntCol>

                  {/* 数量 */}
                  <AntCol span={4}>
                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      rules={[{ required: true, message: '请输入数量' }]}
                    >
                      <InputNumber 
                        min={1} 
                        placeholder="数量" 
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </AntCol>

                  {/* 删除按钮 */}
                  <AntCol span={2}>
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(name)}
                      disabled={fields.length === 1}
                    />
                  </AntCol>
                </AntRow>
              </div>
              ))}

              {/* 添加按钮 */}
              <Button
                type="dashed"
                onClick={() => add({})}
                icon={<PlusOutlined />}
                style={{ width: '100%' }}
              >
                添加量尺内容
              </Button>
            </>
          )}
        </Form.List>
      </Card>

      {/* 备注 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form.Item name="notes" label="备注">
          <Input.TextArea placeholder="备注信息" rows={2} />
        </Form.Item>
      </Card>

      {/* 操作按钮 */}
      <div style={{ textAlign: 'right' }}>
        <Button onClick={onCancel} style={{ marginRight: 8 }}>
          取消
        </Button>
        <Button type="primary" htmlType="submit" loading={submitting}>
          {editRecord ? '保存' : '提交'}
        </Button>
      </div>
    </Form>
  )
}

export default MeasurementList
