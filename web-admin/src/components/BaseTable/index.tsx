import { useState } from 'react'
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
  /** 服务端分页配置。传入 ServerPagination 启用分页，false 禁用分页栏 */
  pagination?: ServerPagination | false
}

const BaseTable = <T extends Record<string, any>>({
  columns, dataSource, loading, onSearch, searchFields = [], filterOptions = [],
  extraFilters, onAdd, addText = '新建', toolbarExtra, title, rowKey = 'id', scroll,
  pagination,
}: BaseTableProps<T>) => {
  const [searchValues, setSearchValues] = useState<Record<string, string>>({})
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [dateRange, setDateRange] = useState<[any, any] | null>(null)

  const handleSearch = () => {
    if (pagination && typeof pagination === 'object') {
      pagination.onChange?.(1, pagination.pageSize)
    }
    onSearch?.({ ...searchValues, ...filterValues })
  }

  const handleReset = () => {
    setSearchValues({})
    setFilterValues({})
    setDateRange(null)
    if (pagination && typeof pagination === 'object') {
      pagination.onChange?.(1, pagination.pageSize)
    }
  }

  const tablePaginationConfig: TablePaginationConfig | false = pagination && typeof pagination === 'object'
    ? {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: pagination.onChange,
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
          dataSource={dataSource}
          loading={loading}
          rowKey={rowKey}
          scroll={scroll}
          pagination={tablePaginationConfig}
          size="middle"
          locale={{ emptyText: '暂无数据' }}
        />
      </div>
    </div>
  )
}

export default BaseTable
