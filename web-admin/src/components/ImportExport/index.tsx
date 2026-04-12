import { useState, useCallback, useRef } from 'react'
import { Button, Modal, Table, message, Space, Alert } from 'antd'
import { DownloadOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import * as XLSX from 'xlsx'

export interface ImportExportColumn {
  /** Excel 表头名称 */
  title: string
  /** 对应数据字段名 */
  dataIndex: string
  /** 列宽(仅导出) */
  width?: number
}

export interface ImportExportProps {
  /** 列配置 */
  columns: ImportExportColumn[]
  /** 导出数据 */
  data?: Record<string, any>[]
  /** 导入解析回调，返回确认后的数据 */
  onImport?: (data: Record<string, any>[]) => void | Promise<void>
  /** 文件名(不含扩展名) */
  fileName?: string
  /** 是否显示导出按钮 */
  showExport?: boolean
  /** 是否显示导入按钮 */
  showImport?: boolean
  /** 模板名称(下载模板用) */
  templateName?: string
  /** 最大导入行数，默认 1000 */
  maxRows?: number
  /** 按钮尺寸 */
  size?: 'small' | 'middle' | 'large'
  /** 按钮样式 */
  style?: React.CSSProperties
}

const DEFAULT_MAX_ROWS = 1000

const ImportExport: React.FC<ImportExportProps> = ({
  columns,
  data = [],
  onImport,
  fileName = '导入导出数据',
  showExport = true,
  showImport = true,
  templateName,
  maxRows = DEFAULT_MAX_ROWS,
  size = 'middle',
  style,
}) => {
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // ── 工具方法：构建表头和数据 ──
  const buildSheet = useCallback(
    (rows: Record<string, any>[], useEmpty = false) => {
      const headers = columns.map((c) => c.title)
      const body = useEmpty
        ? []
        : rows.map((row) => columns.map((c) => row[c.dataIndex] ?? ''))
      return [headers, ...body]
    },
    [columns],
  )

  // ── 导出 Excel ──
  const handleExport = useCallback(() => {
    if (data.length === 0) {
      message.warning('暂无数据可导出')
      return
    }
    const sheetData = buildSheet(data)
    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    // 设置列宽
    ws['!cols'] = columns.map((c) => ({ wch: c.width || Math.max(c.title.length * 2 + 4, 12) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, `${fileName}.xlsx`)
    message.success(`成功导出 ${data.length} 条数据`)
  }, [data, columns, fileName, buildSheet])

  // ── 下载空白模板 ──
  const downloadTemplate = useCallback(() => {
    const sheetData = buildSheet([], true)
    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    ws['!cols'] = columns.map((c) => ({ wch: c.width || Math.max(c.title.length * 2 + 4, 12) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const name = templateName || `${fileName}模板`
    XLSX.writeFile(wb, `${name}.xlsx`)
    message.success('模板下载成功')
  }, [columns, fileName, templateName, buildSheet])

  // ── 解析 Excel 文件 ──
  const parseExcel = useCallback(
    (file: File): Promise<Record<string, any>[]> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const wb = XLSX.read(e.target?.result, { type: 'array' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })
            if (jsonData.length < 2) {
              reject(new Error('文件为空或只有表头'))
              return
            }
            // 第一行为表头，跳过
            const rows = jsonData.slice(1)
            const titleToField: Record<string, string> = {}
            columns.forEach((c) => {
              titleToField[c.title] = c.dataIndex
            })
            const result = rows
              .filter((row: any[]) => row.some((cell) => cell !== undefined && cell !== ''))
              .map((row: any[]) => {
                const obj: Record<string, any> = {}
                columns.forEach((c, idx) => {
                  obj[c.dataIndex] = row[idx] ?? ''
                })
                return obj
              })
            resolve(result)
          } catch (err) {
            reject(err)
          }
        }
        reader.onerror = () => reject(new Error('文件读取失败'))
        reader.readAsArrayBuffer(file)
      })
    },
    [columns],
  )

  // ── 导入处理 ──
  const handleImport = useCallback(
    async (file: File) => {
      try {
        const parsed = await parseExcel(file)
        if (parsed.length === 0) {
          message.warning('文件中没有有效数据')
          return false
        }
        if (parsed.length > maxRows) {
          message.warning(`数据量超过 ${maxRows} 条限制，当前 ${parsed.length} 条`)
          return false
        }
        setPreviewData(parsed)
        setPreviewVisible(true)
      } catch (err: any) {
        message.error(err.message || '文件解析失败')
      }
      return false // 阻止 Upload 的默认行为
    },
    [parseExcel, maxRows],
  )

  // ── 确认导入 ──
  const handleConfirmImport = useCallback(async () => {
    setImportLoading(true)
    try {
      await onImport?.(previewData)
      message.success(`成功导入 ${previewData.length} 条数据`)
      setPreviewVisible(false)
      setPreviewData([])
    } catch (err: any) {
      message.error(err.message || '导入失败')
    } finally {
      setImportLoading(false)
    }
  }, [previewData, onImport])

  // 预览表格列
  const previewColumns: ColumnsType<Record<string, any>> = columns.map((c) => ({
    title: c.title,
    dataIndex: c.dataIndex,
    ellipsis: true,
  }))

  if (!showExport && !showImport) return null

  return (
    <>
      <Space style={style}>
        {showExport && (
          <Button size={size} icon={<DownloadOutlined />} onClick={handleExport}>
            导出
          </Button>
        )}
        {showImport && (
          <Space.Compact>
            <Button
              size={size}
              icon={<UploadOutlined />}
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click()
              }}
            >
              导入
            </Button>
            <Button size={size} icon={<FileExcelOutlined />} onClick={downloadTemplate}>
              模板
            </Button>
          </Space.Compact>
        )}
      </Space>

      {/* 隐藏的 file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleImport(file)
            e.target.value = '' // reset
          }
        }}
      />

      {/* 预览弹窗 */}
      <Modal
        title={`导入预览（共 ${previewData.length} 条）`}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false)
          setPreviewData([])
        }}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>
            取消
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={importLoading}
            onClick={handleConfirmImport}
          >
            确认导入
          </Button>,
        ]}
      >
        <Alert
          message={`请确认以下 ${previewData.length} 条数据无误后点击"确认导入"`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={previewColumns}
          dataSource={previewData}
          rowKey={(_, idx) => String(idx)}
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Modal>
    </>
  )
}

export default ImportExport
