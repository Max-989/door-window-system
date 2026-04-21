import { useState, useCallback, useEffect } from 'react'
import { Button, Tag, Space, message, Modal, Descriptions, Select, Switch, Form, InputNumber, Spin, Divider, Table, Input } from 'antd'
import { EyeOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { Authorized } from '../../components/Authorized'
import BaseTable from '../../components/BaseTable'
import StatusTag from '../../components/StatusTag'
import ModalForm from '../../components/ModalForm'
import type { FormField } from '../../components/ModalForm'
import type { ColumnsType } from 'antd/es/table'
import { get, post, patch, del } from '../../utils/request'
import { phoneRules } from '../../utils/validators'

const RESPONSIBILITIES: Record<string, string> = { factory: '工厂', logistics: '物流', installation: '安装', measurement: '量尺', delivery: '送货', construction: '工地' }
const RESP_COLORS: Record<string, string> = { factory: 'red', logistics: 'orange', installation: 'blue', measurement: 'cyan', delivery: 'purple', construction: 'default' }
const REISSUE_TYPE_MAP: Record<string, string> = { hardware: '五金', accessory: '配件' }

// ── 关联安装单搜索结果类型 ──
interface InstallationSearchResult {
  id: number
  task_no: string
  customer_name: string
  assigned_workers: string[]
}

// ── 安装工搜索结果类型 ──
interface WorkerSearchResult {
  id: number
  name: string
  phone: string
}

// ── 补发配件明细 ──
interface ReissueItem {
  name: string
  quantity: number
  type: string
}

// 后端 MaintenanceTaskListSerializer 返回字段
interface MaintenanceRecord {
  id: number
  task_no: string
  source: string
  brand: number | null
  store: number | null
  original_order: number | null
  original_order_no: string
  customer_name: string
  customer_phone: string
  customer_address: string
  issue_description: string
  status: string
  status_display: string
  assigned_to: number | null
  assigned_to_name: string
  responsibility: string
  maintenance_fee: number | null
  wage_amount: number | null
  created_at: string
  // ── 批次4 新增字段 ──
  installer: number | null  // 🔴 改为 ID
  installer_name: string
  installation_task: number | null  // 🟡 字段名一致性
  installation_task_no: string
  accessory_reissue: boolean
  reissue_items: ReissueItem[]
  notes: string
}

const formFields: FormField[] = [
  { name: 'customer_name', label: '客户姓名', type: 'input', rules: [{ required: true, message: '请输入客户姓名' }] },
  { name: 'customer_phone', label: '客户电话', type: 'input', rules: phoneRules },
  { name: 'customer_address', label: '客户地址', type: 'input' },
  { name: 'issue_description', label: '问题描述', type: 'textarea', rules: [{ required: true, message: '请输入问题描述' }] },
  { name: 'responsibility', label: '责任方', type: 'select', options: [
    { value: 'factory', label: '工厂' }, { value: 'logistics', label: '物流' },
    { value: 'installation', label: '安装' }, { value: 'measurement', label: '量尺' },
    { value: 'delivery', label: '送货' }, { value: 'construction', label: '工地' },
  ] },
  { name: 'notes', label: '备注', type: 'textarea' },
]

/** 动态表单字段：包含关联安装单、安装人、补发配件开关 */
const getFormFields = (editMode: boolean): FormField[] => {
  return [
    { name: '_installation_search', label: '关联安装单', type: 'input' },
    { name: 'installer', label: '安装人', type: 'input' },  // 🔴 改为 installer（ID）
    { name: 'customer_name', label: '客户姓名', type: 'input', rules: [{ required: true, message: '请输入客户姓名' }] },
    { name: 'customer_phone', label: '客户电话', type: 'input', rules: phoneRules },
    { name: 'customer_address', label: '客户地址', type: 'input' },
    { name: 'issue_description', label: '问题描述', type: 'textarea', rules: [{ required: true, message: '请输入问题描述' }] },
    { name: 'responsibility', label: '责任方', type: 'select', options: [
      { value: 'factory', label: '工厂' }, { value: 'logistics', label: '物流' },
      { value: 'installation', label: '安装' }, { value: 'measurement', label: '量尺' },
      { value: 'delivery', label: '送货' }, { value: 'construction', label: '工地' },
    ] },
    { name: 'accessory_reissue', label: '补发配件', type: 'switch' },
    { name: '_reissue_items_placeholder', label: '', type: 'input' },
    { name: 'notes', label: '备注', type: 'textarea' },
  ]
}

const MaintenanceList = () => {
  const [form] = Form.useForm()

  // ── 数据状态 ──
  const [data, setData] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // ── 筛选 / 搜索 ──
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')

  // ── 弹窗 ──
  const [modalVisible, setModalVisible] = useState(false)
  const [editRecord, setEditRecord] = useState<MaintenanceRecord | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailRecord, setDetailRecord] = useState<MaintenanceRecord | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // ── 关联安装单搜索 ──
  const [selectedInstallationId, setSelectedInstallationId] = useState<number | null>(null)
  const [installationOptions, setInstallationOptions] = useState<{ value: number; label: string }[]>([])
  const [installationSearchLoading, setInstallationSearchLoading] = useState(false)

  // ── 安装人搜索 ──
  const [installerOptions, setInstallerOptions] = useState<{ value: number; label: string }[]>([])  // 🔴 value 改为 number
  const [installerSearchLoading, setInstallerSearchLoading] = useState(false)

  // ── 补发配件开关 ──
  const [accessoryReissue, setAccessoryReissue] = useState(false)

  // ── 加载数据 ──
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

      const res = await get<any>(`/maintenance/tasks/?${params.toString()}`)
      const results = res.results || res.data?.items || res.data || res || []
      setData(Array.isArray(results) ? results : [])
      setTotal(res.count ?? res.data?.total ?? 0)
    } catch (err: any) {
      message.error(err.message || '加载维修任务失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, filters])

  useEffect(() => { fetchData() }, [fetchData])

  // ── 搜索安装单 ──
  const searchInstallations = useCallback(async (keyword: string) => {
    if (!keyword || keyword.length < 1) {
      setInstallationOptions([])
      return
    }
    setInstallationSearchLoading(true)
    try {
      const res = await get<any>(`/installations/tasks/?search=${encodeURIComponent(keyword)}&page_size=20`)
      const items = res.results || res.data?.items || res.data || res || []
      setInstallationOptions(
        Array.isArray(items) ? items.map((o: any) => ({ value: o.id, label: `${o.task_no || ''} - ${o.customer_name || ''}` })) : []
      )
    } catch {
      setInstallationOptions([])
    } finally {
      setInstallationSearchLoading(false)
    }
  }, [])

  // ── 搜索安装工 ──
  const searchInstallers = useCallback(async (keyword: string) => {
    if (!keyword || keyword.length < 1) {
      setInstallerOptions([])
      return
    }
    setInstallerSearchLoading(true)
    try {
      const res = await get<any>(`/workers/?search=${encodeURIComponent(keyword)}&skill=installation&page_size=20`)
      const items = res.results || res.data?.items || res.data || res || []
      // 🔴 返回 worker ID 而不是 name
      setInstallerOptions(
        Array.isArray(items) ? items.map((w: any) => ({ value: w.id, label: `${w.name}${w.phone ? ` (${w.phone})` : ''}` })) : []
      )
    } catch {
      // fallback: try workers endpoint without skill filter
      try {
        const res = await get<any>(`/workers/?search=${encodeURIComponent(keyword)}&page_size=20`)
        const items = res.results || res.data?.items || res.data || res || []
        setInstallerOptions(
          Array.isArray(items) ? items.map((w: any) => ({ value: w.id, label: `${w.name}${w.phone ? ` (${w.phone})` : ''}` })) : []
        )
      } catch {
        setInstallerOptions([])
      }
    } finally {
      setInstallerSearchLoading(false)
    }
  }, [])

  // ── 选择安装单后自动带出安装人 ──
  const handleInstallationSelect = useCallback(async (taskId: number) => {
    setSelectedInstallationId(taskId)
    try {
      const res = await get<any>(`/installations/tasks/${taskId}/`)
      // 🔴 尝试获取 installer ID（后端可能返回 installers ID 数组或 assigned_workers 姓名数组）
      const installerIds: number[] = res.installers || res.installer_ids || []
      if (installerIds.length > 0) {
        form.setFieldsValue({ installer: installerIds[0] })
      } else {
        // 如果没有 ID，尝试从 assigned_workers 获取（可能是姓名，需要额外查询）
        const workers: string[] = res.assigned_workers || res.assignedWorkers || []
        if (workers.length > 0) {
          // 查询工人 ID
          try {
            const workerRes = await get<any>(`/workers/?search=${encodeURIComponent(workers[0])}&page_size=1`)
            const workerItems = workerRes.results || workerRes.data?.items || workerRes.data || workerRes || []
            if (Array.isArray(workerItems) && workerItems.length > 0) {
              form.setFieldsValue({ installer: workerItems[0].id })
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }, [form])

  const handleInstallationClear = () => {
    setSelectedInstallationId(null)
    setInstallationOptions([])
  }

  // ── 搜索回调 ──
  const handleFilterAndSearch = (values: Record<string, any>) => {
    const q = values.taskNo || values.search || ''
    setSearch(q)
    const newFilters: Record<string, string> = {}
    if (values.status) newFilters.status = values.status
    if (values.responsibility) newFilters.responsibility = values.responsibility
    setFilters(newFilters)
    setPage(1)
  }

  // ── 新增 ──
  const handleAdd = () => {
    setEditRecord(null)
    setSelectedInstallationId(null)
    setInstallationOptions([])
    setInstallerOptions([])
    setAccessoryReissue(false)
    setModalVisible(true)
  }

  // ── 编辑 ──
  const handleEdit = (r: MaintenanceRecord) => {
    setEditRecord(r)
    setSelectedInstallationId(r.installation_task)  // 🟡 字段名一致性
    setAccessoryReissue(r.accessory_reissue || false)
    setModalVisible(true)
  }

  // ── 查看详情 ──
  const handleView = (r: MaintenanceRecord) => { setDetailRecord(r); setDetailVisible(true) }

  // ── 删除 ──
  const handleDelete = (r: MaintenanceRecord) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除维修任务 ${r.task_no} 吗？`,
      okText: '删除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await del(`/maintenance/tasks/${r.id}/`)
          message.success('删除成功')
          fetchData()
        } catch (err: any) {
          message.error(err.message || '删除失败')
        }
      },
    })
  }

  // ── 新增 / 编辑提交 ──
  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const payload: any = { ...values }

      // 附加关联安装单 ID
      if (selectedInstallationId) {
        payload.installation_task = selectedInstallationId  // 🟡 字段名一致性
      }

      // 清理自定义字段（不发送到后端）
      delete payload._installation_search
      delete payload._reissue_items_placeholder

      // 处理补发配件明细：从 Form.List 获取
      const reissueItems = form.getFieldValue('reissue_items')
      if (reissueItems && reissueItems.length > 0) {
        payload.reissue_items = reissueItems.filter((item: ReissueItem) => item.name)
      } else {
        payload.reissue_items = []
      }

      setModalLoading(true)
      if (editRecord) {
        await patch(`/maintenance/tasks/${editRecord.id}/`, payload)
        message.success('编辑成功')
      } else {
        await post('/maintenance/tasks/', payload)
        message.success('新增成功')
      }
      setModalVisible(false)
      setEditRecord(null)
      setSelectedInstallationId(null)
      setInstallationOptions([])
      fetchData()
    } catch (err: any) {
      if (err.message) {
        message.error(err.message || '操作失败')
      }
      // validateFields 校验失败时不弹错误
    } finally {
      setModalLoading(false)
    }
  }

  // 编辑时转换后端 snake_case 到表单字段
  const getInitialValues = (): any => {
    if (!editRecord) return undefined
    return {
      customer_name: editRecord.customer_name,
      customer_phone: editRecord.customer_phone,
      customer_address: editRecord.customer_address,
      issue_description: editRecord.issue_description,
      responsibility: editRecord.responsibility,
      installer: editRecord.installer,  // 🔴 使用 installer ID
      accessory_reissue: editRecord.accessory_reissue || false,
      reissue_items: editRecord.reissue_items || [],
      notes: editRecord.notes,
    }
  }

  // ── 自定义字段渲染 ──
  const customFieldRender = (fieldName: string) => {
    if (fieldName === '_installation_search') {
      return (
        <Select
          showSearch
          allowClear
          placeholder="输入安装单号搜索关联安装单（可选）"
          filterOption={false}
          value={selectedInstallationId}
          onSearch={searchInstallations}
          onSelect={handleInstallationSelect}
          onClear={handleInstallationClear}
          notFoundContent={installationSearchLoading ? <Spin size="small" /> : '暂无匹配安装单'}
          options={installationOptions}
          style={{ width: '100%' }}
          suffixIcon={<SearchOutlined />}
        />
      )
    }

    if (fieldName === 'installer_name') {
      return (
        <Select
          showSearch
          allowClear
          placeholder="输入安装工姓名搜索（可选）"
          filterOption={false}
          onSearch={searchInstallers}
          notFoundContent={installerSearchLoading ? <Spin size="small" /> : '暂无匹配安装工'}
          options={installerOptions}
          style={{ width: '100%' }}
          suffixIcon={<SearchOutlined />}
        />
      )
    }

    if (fieldName === '_reissue_items_placeholder') {
      return (
        <div style={{ display: accessoryReissue ? 'block' : 'none' }}>
          <Divider style={{ margin: '4px 0 16px' }} />
          <div style={{ marginBottom: 8, fontWeight: 500 }}>补发配件明细</div>
          <Form.List name="reissue_items" initialValue={editRecord?.reissue_items?.length ? editRecord.reissue_items : [{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      rules={[{ required: true, message: '请输入配件名称' }]}
                    >
                      <Input placeholder="配件名称" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      rules={[{ required: true, message: '请输入数量' }]}
                    >
                      <InputNumber min={1} placeholder="数量" style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'type']}
                      rules={[{ required: true, message: '请选择类型' }]}
                    >
                      <Select placeholder="类型" style={{ width: 100 }}>
                        <Select.Option value="hardware">五金</Select.Option>
                        <Select.Option value="accessory">配件</Select.Option>
                      </Select>
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button type="link" danger onClick={() => remove(name)}>删除</Button>
                    )}
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block style={{ marginBottom: 16 }}>
                  + 添加配件
                </Button>
              </>
            )}
          </Form.List>
        </div>
      )
    }

    return null
  }

  // ── 表单值变化回调 ──
  const handleValuesChange = (changedValues: any) => {
    if ('accessory_reissue' in changedValues) {
      setAccessoryReissue(!!changedValues.accessory_reissue)
    }
  }

  // ── 列定义 ──
  const columns: ColumnsType<MaintenanceRecord> = [
    { title: '任务号', dataIndex: 'task_no', width: 160 },
    { title: '客户', dataIndex: 'customer_name', width: 80 },
    { title: '问题描述', dataIndex: 'issue_description', width: 150, ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 90, render: v => <StatusTag status={v} /> },
    { title: '责任方', dataIndex: 'responsibility', width: 80, render: v => v ? <Tag color={RESP_COLORS[v]}>{RESPONSIBILITIES[v]}</Tag> : '-' },
    { title: '维修师傅', dataIndex: 'assigned_to_name', width: 90, render: v => v || <Tag color="orange">待派单</Tag> },
    // ── 批次4 新增列 ──
    { title: '安装人', dataIndex: 'installer_name', width: 80, render: v => v || '-' },
    { title: '关联安装单', dataIndex: 'installation_task_no', width: 140, render: v => v || '-' },
    { title: '补发配件', dataIndex: 'accessory_reissue', width: 90, render: v => v ? <Tag color="blue">是</Tag> : <Tag>否</Tag> },
    { title: '创建时间', dataIndex: 'created_at', width: 160 },
    {
      title: '操作', width: 180, fixed: 'right',
      render: (_, r) => (
        <Space>
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
        loading={loading}
        rowKey="id"
        searchFields={[{ key: 'taskNo', label: '任务号', placeholder: '搜索任务号/客户名' }]}
        onSearch={handleFilterAndSearch}
        filterOptions={[{ key: 'status', label: '状态', options: [
          { value: 'pending', label: '待派单' }, { value: 'assigned', label: '已派单' },
          { value: 'completed', label: '已完成' }, { value: 'partial', label: '部分完成' },
        ]}, { key: 'responsibility', label: '责任方', options: [
          { value: 'factory', label: '工厂' }, { value: 'logistics', label: '物流' },
          { value: 'installation', label: '安装' }, { value: 'measurement', label: '量尺' },
          { value: 'delivery', label: '送货' }, { value: 'construction', label: '工地' },
        ]}]}
        onAdd={handleAdd}
        addText="新建维修单"
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps) },
        }}
        scroll={{ x: 1400 }}
      />
      <ModalForm
        title={editRecord ? '编辑维修任务' : '新建维修任务'}
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setEditRecord(null); setSelectedInstallationId(null); setAccessoryReissue(false) }}
        onOk={handleOk}
        fields={getFormFields(!!editRecord)}
        initialValues={getInitialValues()}
        confirmLoading={modalLoading}
        width={720}
        customFieldRender={customFieldRender}
        onValuesChange={handleValuesChange}
      />
      <Modal title="维修任务详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={<Button onClick={() => setDetailVisible(false)}>关闭</Button>} width={640}>
        {detailRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="任务号">{detailRecord.task_no}</Descriptions.Item>
            <Descriptions.Item label="状态"><StatusTag status={detailRecord.status} /></Descriptions.Item>
            <Descriptions.Item label="客户姓名">{detailRecord.customer_name}</Descriptions.Item>
            <Descriptions.Item label="客户电话">{detailRecord.customer_phone}</Descriptions.Item>
            <Descriptions.Item label="客户地址" span={2}>{detailRecord.customer_address}</Descriptions.Item>
            <Descriptions.Item label="问题描述" span={2}>{detailRecord.issue_description}</Descriptions.Item>
            <Descriptions.Item label="责任方">{detailRecord.responsibility ? <Tag color={RESP_COLORS[detailRecord.responsibility]}>{RESPONSIBILITIES[detailRecord.responsibility]}</Tag> : '-'}</Descriptions.Item>
            <Descriptions.Item label="维修师傅">{detailRecord.assigned_to_name || '待派单'}</Descriptions.Item>
            {/* ── 批次4 新增详情字段 ── */}
            <Descriptions.Item label="安装人">{detailRecord.installer_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="关联安装单">{detailRecord.installation_task_no || '-'}</Descriptions.Item>
            <Descriptions.Item label="补发配件">{detailRecord.accessory_reissue ? <Tag color="blue">是</Tag> : <Tag>否</Tag>}</Descriptions.Item>
            {detailRecord.original_order_no && <Descriptions.Item label="关联订单">{detailRecord.original_order_no}</Descriptions.Item>}
            <Descriptions.Item label="创建时间">{detailRecord.created_at}</Descriptions.Item>
            {detailRecord.maintenance_fee != null && <Descriptions.Item label="维修费">{detailRecord.maintenance_fee}</Descriptions.Item>}
            {detailRecord.wage_amount != null && <Descriptions.Item label="工费">{detailRecord.wage_amount}</Descriptions.Item>}
          </Descriptions>
        )}
        {/* ── 补发配件明细 ── */}
        {detailRecord?.accessory_reissue && detailRecord?.reissue_items?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>补发配件明细</div>
            <Table
              dataSource={detailRecord.reissue_items}
              rowKey={(_, idx) => String(idx)}
              size="small"
              pagination={false}
              columns={[
                { title: '配件名称', dataIndex: 'name', width: 150 },
                { title: '数量', dataIndex: 'quantity', width: 80 },
                { title: '类型', dataIndex: 'type', width: 80, render: v => REISSUE_TYPE_MAP[v] || v },
              ]}
            />
          </div>
        )}
      </Modal>
    </>
  )
}

export default MaintenanceList
