import { useState, useMemo } from 'react'
import { Table, Input, Select, DatePicker, Button, Space, Row, Col } from 'antd'
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import './style.css'

export interface FilterOption {
  key: string
  label: string
  options: { value: string; label: string }[]
}

interface SearchField {
  key: string
  label: string
  placeholder?: string
}

export interface ServerPagination {
  current: number
  pageSize: number
  total: number
  onChange: (page: number, pageSize: number) => void
}

interface BaseTableProps<T> {
  columns: ColumnsType<T>
  dataSource: T[]
  loading?: boolean
  onSearch?: (values: Record<string, any>) => void
  searchFields?: SearchField[]
  filterOptions?: FilterOption[]
  extraFilters?: React.ReactNode
  onAdd?: () => void
  addText?: string
  toolbarExtra?: React.ReactNode
  title?: string
  rowKey?: string | ((record: T) => string)
  scroll?: { x?: number | string; y?: number | string }
  /** 服务端分页配置，传入则使用服务端分页，否则使用客户端分页 */
  pagination?: ServerPagination
  /** 是否隐藏客户端分页栏（服务端分页时由 Table 组件原生处理） */
  hidePagination?: boolean
}

const PAGE_SIZE = 20

const BaseTable = <T extends Record<string, any>>({
  columns, dataSource, loading, onSearch, searchFields = [], filterOptions = [],
  extraFilters, onAdd, addText = '新建', toolbarExtra, title, rowKey = 'id', scroll,
  pagination: serverPagination, hidePagination,
}: BaseTableProps<T>) => {
  const [searchValues, setSearchValues] = useState<Record<string, string>>({})
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [dateRange, setDateRange] = useState<[any, any] | null>(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: PAGE_SIZE })

  const isServerPagination = !!serverPagination

  // 客户端筛选（仅非服务端分页时使用）
  const filteredData = useMemo(() => {
    if (isServerPagination) return dataSource
    let data = [...dataSource]
    // 关键词搜索：匹配第一个搜索字段
    const keyword = searchValues[searchFields[0]?.key] || ''
    if (keyword) {
      data = data.filter(item =>
        searchFields.some(field => {
          const val = item[field.key]
          return val && String(val).toLowerCase().includes(keyword.toLowerCase())
        })
      )
    }
    // 状态筛选
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) {
        data = data.filter(item => item[key] === value)
      }
    })
    // 日期范围筛选
    if (dateRange) {
      data = data.filter(item => {
        const d = new Date(item.createdAt || item.createdAt)
        return d >= dateRange[0].startOf('day') && d <= dateRange[1].endOf('day')
      })
    }
    return data
  }, [dataSource, searchValues, filterValues, dateRange, searchFields, isServerPagination])

  const displayData = isServerPagination
    ? dataSource
    : filteredData.slice(
        (pagination.current - 1) * pagination.pageSize,
        pagination.current * pagination.pageSize
      )

  const handleSearch = () => {
    if (isServerPagination) {
      serverPagination.onChange?.(1, serverPagination.pageSize)
    } else {
      setPagination({ ...pagination, current: 1 })
    }
    onSearch?.({ ...searchValues, ...filterValues })
  }

  const handleReset = () => {
    setSearchValues({})
    setFilterValues({})
    setDateRange(null)
    if (isServerPagination) {
      serverPagination.onChange?.(1, serverPagination.pageSize)
    } else {
      setPagination({ current: 1, pageSize: PAGE_SIZE })
    }
  }

  // 服务端分页配置
  const tablePaginationConfig: TablePaginationConfig | false = isServerPagination
    ? {
        current: serverPagination.current,
        pageSize: serverPagination.pageSize,
        total: serverPagination.total,
        onChange: serverPagination.onChange,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50'],
      }
    : false

  return (
    <div>
      {title && (
        <div className="table-toolbar">
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>{title}</h2>
        </div>
      )}

      {/* 搜索栏 */}
      {searchFields.length > 0 && (
        <div className="search-bar">
          <Row gutter={12} align="middle" justify="space-between">
            <Col flex="auto">
              <Space>
                {searchFields.slice(0, 3).map(field => (
                  <Input
                    key={field.key}
                    placeholder={field.placeholder || `搜索${field.label}`}
                    prefix={<SearchOutlined />}
                    value={searchValues[field.key] || ''}
                    onChange={e => setSearchValues({ ...searchValues, [field.key]: e.target.value })}
                    onPressEnter={handleSearch}
                    allowClear
                    style={{ width: 280 }}
                  />
                ))}
                {searchFields.length > 0 && (
                  <>
                    <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
                    <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
                  </>
                )}
              </Space>
            </Col>
          </Row>
        </div>
      )}

      {/* 筛选栏 */}
      {(filterOptions.length > 0 || extraFilters || onAdd) && (
        <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
            {filterOptions.map(opt => (
              <Select
                key={opt.key}
                placeholder={opt.label}
                value={filterValues[opt.key] || undefined}
                onChange={v => setFilterValues({ ...filterValues, [opt.key]: v })}
                allowClear
                style={{ minWidth: 140 }}
                options={opt.options}
              />
            ))}
            {!extraFilters && <DatePicker.RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['开始日期', '结束日期']}
            />}
            {extraFilters}
          </div>
          {(onAdd || toolbarExtra) && (
            <Space size="small" style={{ marginLeft: 'auto', flexShrink: 0 }}>
              {toolbarExtra}
              {onAdd && (
                <Button
                  icon={<PlusOutlined />}
                  onClick={onAdd}
                  size="small"
                  style={{ background: '#1d1d1f', borderColor: '#1d1d1f', color: '#fff' }}
                >
                  {addText}
                </Button>
              )}
            </Space>
          )}
        </div>
      )}

      {/* 表格 */}
      <div className="table-container">
        <Table
          columns={columns}
          dataSource={displayData}
          loading={loading}
          rowKey={rowKey}
          scroll={scroll}
          pagination={tablePaginationConfig}
          size="middle"
          locale={{ emptyText: '暂无数据' }}
        />
        {!isServerPagination && !hidePagination && filteredData.length > pagination.pageSize && (
          <div className="table-pagination">
            <span style={{ marginRight: 12, color: '#86868b', fontSize: 13 }}>
              共 {filteredData.length} 条
            </span>
            <Select
              value={pagination.pageSize}
              onChange={v => setPagination({ current: 1, pageSize: v })}
              options={[
                { value: 10, label: '10条/页' },
                { value: 20, label: '20条/页' },
                { value: 50, label: '50条/页' },
              ]}
              size="small"
              style={{ width: 100, marginRight: 12 }}
            />
          </div>
        )}
      </div>


    </div>
  )
}

export default BaseTable
