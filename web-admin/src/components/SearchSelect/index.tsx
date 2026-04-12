import { useState, useRef, useMemo, useCallback } from 'react'
import { Select, Spin } from 'antd'
import type { SelectProps } from 'antd'

export interface SearchSelectOption {
  value: string | number
  label: string
  [key: string]: any
}

export interface SearchSelectProps
  extends Omit<SelectProps, 'options' | 'filterOption' | 'showSearch' | 'allowClear' | 'onSearch'> {
  /** 选中的值 */
  value?: SelectProps['value']
  /** 值变化回调 */
  onChange?: SelectProps['onChange']
  /** 占位文本 */
  placeholder?: string
  /** 本地静态选项 */
  options?: SearchSelectOption[]
  /** 远程搜索函数，传入关键词返回 Promise<Option[]> */
  fetchFn?: (keyword: string) => Promise<SearchSelectOption[]>
  /** 是否多选 */
  mode?: 'multiple' | 'tags'
  /** 是否禁用 */
  disabled?: boolean
  /** 远程搜索防抖时间(ms)，默认 300 */
  debounceMs?: number
  /** 远程搜索最小关键词长度，默认 0 */
  minKeywordLength?: number
  /** 样式 */
  style?: React.CSSProperties
  /** 类名 */
  className?: string
}

const SearchSelect: React.FC<SearchSelectProps> = ({
  value,
  onChange,
  placeholder = '请选择',
  options: staticOptions = [],
  fetchFn,
  mode,
  disabled,
  debounceMs = 300,
  minKeywordLength = 0,
  style,
  className,
  ...restProps
}) => {
  const isRemote = !!fetchFn
  const [remoteOptions, setRemoteOptions] = useState<SearchSelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mergedOptions = useMemo(() => {
    return isRemote ? remoteOptions : staticOptions
  }, [isRemote, remoteOptions, staticOptions])

  const handleSearch = useCallback(
    (keyword: string) => {
      if (!isRemote) return
      if (keyword.length < minKeywordLength) {
        setRemoteOptions([])
        return
      }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        setLoading(true)
        try {
          const results = await fetchFn(keyword)
          setRemoteOptions(results)
        } catch (err) {
          console.error('SearchSelect fetchFn error:', err)
          setRemoteOptions([])
        } finally {
          setLoading(false)
        }
      }, debounceMs)
    },
    [isRemote, fetchFn, debounceMs, minKeywordLength],
  )

  // 远程模式下，focus 时加载初始数据
  const handleFocus = useCallback(() => {
    if (isRemote && minKeywordLength === 0 && remoteOptions.length === 0) {
      handleSearch('')
    }
  }, [isRemote, minKeywordLength, remoteOptions.length, handleSearch])

  // 本地模糊匹配：同时匹配 label 和 value
  const defaultFilterOption = useCallback(
    (input: string, option: any) => {
      if (!input) return true
      const keyword = input.toLowerCase()
      const label = String(option?.label ?? '').toLowerCase()
      const val = String(option?.value ?? '').toLowerCase()
      return label.includes(keyword) || val.includes(keyword)
    },
    [],
  )

  return (
    <Select
      showSearch
      allowClear
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      options={mergedOptions}
      mode={mode}
      disabled={disabled}
      filterOption={isRemote ? false : defaultFilterOption}
      onSearch={isRemote ? handleSearch : undefined}
      onFocus={isRemote ? handleFocus : undefined}
      notFoundContent={loading ? <Spin size="small" /> : undefined}
      style={style}
      className={className}
      {...restProps}
    />
  )
}

export default SearchSelect
