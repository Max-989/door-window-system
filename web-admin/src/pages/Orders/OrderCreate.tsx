import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, Select, InputNumber, message, Card, Row, Col, Tabs, Space } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { post, get } from '../../utils/request'
import { phoneRules } from '../../utils/validators'

const SOURCE_OPTIONS = [
  { value: 'brand_store', label: '装企' },
  { value: 'direct', label: '直单' },
  { value: 'direct_task', label: '直接任务' },
]

const ORDER_TYPE_OPTIONS = [
  { value: 'main', label: '主单' },
  { value: 'supplement', label: '补单' },
  { value: 'after_sale', label: '售后' },
]

// ── 产品搜索 ──
interface ProductSearchResult {
  id: number
  name: string
  product_line: string
  model?: string
  surface_process?: string
  colors?: string[]
  cost_price?: string
  unit_price?: string
  standard_price?: string
  open_method?: string
  track_type?: string
  profile?: string
  glass_type?: string
  glass_kind?: string
  door_colors?: string[]
}

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function searchProducts(productLine: string, keyword: string): Promise<ProductSearchResult[]> {
  try {
    const res = await get<any>(`/products/search/?product_line=${productLine}&q=${encodeURIComponent(keyword)}`)
    // Support paginated response (data.items) and legacy formats
    return res.data?.items || res.results || res.data?.results || res.data || []
  } catch {
    return []
  }
}

const thStyle: React.CSSProperties = { padding: '6px 10px', textAlign: 'center', fontWeight: 600, background: '#fafafa', fontSize: 12 }
const tdStyle: React.CSSProperties = { padding: '4px 4px', textAlign: 'center' }
const inputStyle = { width: '100%' }

// ── 防盗门产品行 ──
interface SecurityItem {
  product_id: number | null
  product_model: string; color: string; size_h: string; size_w: string
  outer_left: number; outer_right: number; inner_left: number; inner_right: number
  quantity: number; grade: string; board_thickness: string; hinge: string
  seal_strip: string; deco_cover: string; lock_core: string; lock_body: string
  handle: string; inner_fill: string; doorbell: string; peephole: string
  remark: string; area: string; unit_price: number; total_price: number
  available_colors: string[]
}
const emptySecurityItem = (): SecurityItem => ({
  product_id: null,
  product_model: '', color: '', size_h: '', size_w: '',
  outer_left: 0, outer_right: 0, inner_left: 0, inner_right: 0,
  quantity: 1, grade: '', board_thickness: '标配', hinge: '标配',
  seal_strip: '标配', deco_cover: '标配', lock_core: '标配', lock_body: '标配',
  handle: '', inner_fill: '标配', doorbell: '无', peephole: '无',
  remark: '', area: '', unit_price: 0, total_price: 0,
  available_colors: [],
})

// ── 铝合金产品行 ──
interface AlloyItem {
  product_id: number | null
  position: string; product_series: string; door_type: string; category: string
  product_model: string; door_cover: string; brand: string
  size_h: string; size_w: string; wall_thickness: string; color: string
  lifting_foot: string; glass_process: string; bottom_glass: string; open_direction: string
  area: string; product_price: number
  cover_meters: string; cover_price: number; cover_total: number
  glass_price: number; glass_total: number; hw_total: number; grand_total: number
  remark: string
  available_colors: string[]
}
const emptyAlloyItem = (): AlloyItem => ({
  product_id: null,
  position: '', product_series: '', door_type: '', category: '',
  product_model: '', door_cover: '外单包', brand: '美心',
  size_h: '', size_w: '', wall_thickness: '', color: '',
  lifting_foot: '', glass_process: '', bottom_glass: '', open_direction: '',
  area: '', product_price: 0,
  cover_meters: '', cover_price: 0, cover_total: 0,
  glass_price: 0, glass_total: 0, hw_total: 0, grand_total: 0,
  remark: '',
  available_colors: [],
})

// ── 木门产品行 ──
interface WoodItem {
  product_id: number | null
  position: string; product_no: string; color: string; product_name: string
  hole_h: string; hole_w: string; hole_thickness: string
  leaf_h: string; leaf_w: string; leaf_thickness: string
  v_frame: string; h_frame: string; edge_size: string; edge_type: string
  quantity: number; unit: string; open_direction: string; remark: string
  unit_price: number; total_price: number; hw_config: string
  available_colors: string[]
}
const emptyWoodItem = (): WoodItem => ({
  product_id: null,
  position: '', product_no: '', color: '', product_name: '',
  hole_h: '', hole_w: '', hole_thickness: '',
  leaf_h: '', leaf_w: '', leaf_thickness: '',
  v_frame: '', h_frame: '', edge_size: '', edge_type: '',
  quantity: 1, unit: '樘', open_direction: '', remark: '',
  unit_price: 0, total_price: 0, hw_config: '',
  available_colors: [],
})

export default function OrderCreate() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [productLine, setProductLine] = useState('security')

  // 产品明细数据（非 Form 管理，手动维护）
  const [securityItems, setSecurityItems] = useState<SecurityItem[]>([emptySecurityItem()])
  const [alloyItems, setAlloyItems] = useState<AlloyItem[]>([emptyAlloyItem()])
  const [woodItems, setWoodItems] = useState<WoodItem[]>([emptyWoodItem()])

  // 品牌/门店联动
  const [brands, setBrands] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])

  // 产品搜索结果
  const [securityProductOptions, setSecurityProductOptions] = useState<ProductSearchResult[]>([])
  const [alloyProductOptions, setAlloyProductOptions] = useState<ProductSearchResult[]>([])
  const [woodProductOptions, setWoodProductOptions] = useState<ProductSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // 防抖搜索产品
  const handleProductSearch = useCallback((productLine: string, keyword: string) => {
    if (searchTimer) clearTimeout(searchTimer)
    if (!keyword || keyword.length < 1) {
      if (productLine === 'security') setSecurityProductOptions([])
      else if (productLine === 'alloy') setAlloyProductOptions([])
      else setWoodProductOptions([])
      return
    }
    setSearchLoading(true)
    searchTimer = setTimeout(async () => {
      const results = await searchProducts(productLine, keyword)
      if (productLine === 'security') setSecurityProductOptions(results)
      else if (productLine === 'alloy') setAlloyProductOptions(results)
      else setWoodProductOptions(results)
      setSearchLoading(false)
    }, 300)
  }, [])

  // 选中产品后自动填充
  const handleSecurityProductSelect = (idx: number, product: ProductSearchResult) => {
    const colors = (product.door_colors || product.colors || []) as string[]
    setSecurityItems(prev => prev.map((it, i) => i === idx ? {
      ...it,
      product_id: product.id,
      product_model: product.model || product.name,
      color: colors.length === 1 ? colors[0] : '',
      unit_price: parseFloat(product.standard_price || product.cost_price || '0'),
      available_colors: colors,
    } : it))
  }

  const handleAlloyProductSelect = (idx: number, product: ProductSearchResult) => {
    const colors = (product.colors || []) as string[]
    setAlloyItems(prev => prev.map((it, i) => i === idx ? {
      ...it,
      product_id: product.id,
      product_model: product.model || '',
      product_series: product.name,
      color: colors.length === 1 ? colors[0] : '',
      product_price: parseFloat(product.unit_price || product.cost_price || '0'),
      available_colors: colors,
    } : it))
  }

  const handleWoodProductSelect = (idx: number, product: ProductSearchResult) => {
    const colors = (product.colors || []) as string[]
    setWoodItems(prev => prev.map((it, i) => i === idx ? {
      ...it,
      product_id: product.id,
      product_name: product.name,
      product_no: product.model || '',
      color: colors.length === 1 ? colors[0] : '',
      unit_price: parseFloat(product.cost_price || '0'),
      available_colors: colors,
    } : it))
  }

  useEffect(() => {
    get<any>('/api/v1/decoration/brands/').then(r => setBrands(Array.isArray(r) ? r : r.results || []))
      .catch(() => { /* ignore */ })
  }, [])

  const handleBrandChange = (brandId: number) => {
    form.setFieldsValue({ store: undefined })
    if (!brandId) { setStores([]); return }
    get<any>(`/api/v1/decoration/stores/?brand=${brandId}`).then(r => setStores(Array.isArray(r) ? r : r.results || []))
      .catch(() => setStores([]))
  }

  // 提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // 构造 items
      let items: any[] = []
      if (productLine === 'security') {
        items = securityItems.filter(i => i.product_model).map(i => ({
          product_type: 'security',
          security_product: i.product_id || undefined,
          product_model: i.product_model,
          color: i.color,
          quantity: i.outer_left + i.outer_right + i.inner_left + i.inner_right,
          unit: '樘',
          open_direction: [
            ...(i.outer_left ? ['外开左'] : []),
            ...(i.outer_right ? ['外开右'] : []),
            ...(i.inner_left ? ['内开左'] : []),
            ...(i.inner_right ? ['内开右'] : []),
          ].join('+'),
          unit_cost_price: i.unit_price,
          notes: i.remark,
          specs: {
            height: i.size_h,
            width: i.size_w,
            grade: i.grade, board_thickness: i.board_thickness, hinge: i.hinge,
            seal_strip: i.seal_strip, deco_cover: i.deco_cover, lock_core: i.lock_core,
            lock_body: i.lock_body, handle: i.handle, inner_fill: i.inner_fill,
            doorbell: i.doorbell, peephole: i.peephole, area: i.area,
          },
        }))
      } else if (productLine === 'alloy') {
        items = alloyItems.filter(i => i.position || i.product_series).map(i => ({
          product_type: 'alloy',
          alloy_product: i.product_id || undefined,
          product_model: i.product_model,
          color: i.color,
          quantity: 1,
          unit: '樘',
          open_direction: i.open_direction,
          position: i.position,
          unit_cost_price: i.product_price,
          notes: i.remark,
          specs: {
            height: i.size_h,
            width: i.size_w,
            product_series: i.product_series, door_type: i.door_type, category: i.category,
            door_cover: i.door_cover, brand: i.brand, wall_thickness: i.wall_thickness,
            lifting_foot: i.lifting_foot, glass_process: i.glass_process, bottom_glass: i.bottom_glass,
            area: i.area, cover_line_meters: i.cover_meters, cover_line_price: i.cover_price,
            cover_line_total: i.cover_total, glass_price: i.glass_price, glass_total: i.glass_total,
            hardware_total: i.hw_total, grand_total: i.grand_total,
          },
        }))
      } else {
        items = woodItems.filter(i => i.product_no).map(i => ({
          product_type: 'wood',
          wood_product: i.product_id || undefined,
          product_model: i.product_no,
          color: i.color,
          quantity: i.quantity,
          unit: i.unit,
          open_direction: i.open_direction,
          position: i.position,
          unit_cost_price: i.unit_price,
          notes: i.remark,
          specs: {
            height: i.hole_h,
            width: i.hole_w,
            product_no: i.product_no, hole_thickness: i.hole_thickness,
            door_leaf_height: i.leaf_h, door_leaf_width: i.leaf_w, door_leaf_thickness: i.leaf_thickness,
            vertical_frame: i.v_frame, horizontal_frame: i.h_frame,
            edge_line_size: i.edge_size, edge_line_type: i.edge_type,
            hardware_config: i.hw_config,
          },
        }))
      }

      if (items.length === 0) {
        message.warning('请至少添加一个产品明细')
        setSubmitting(false)
        return
      }

      await post('/orders/', {
        ...values,
        product_line: productLine,
        items,
      })
      message.success('订单创建成功')
      navigate('/app/orders')
    } catch (err: any) {
      message.error(err.message || '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 防盗门表格 ──
  const SecurityTable = () => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, minWidth: 180 }}>产品名称</th>
            <th style={thStyle}>型号</th>
            <th style={thStyle}>规格(高×宽)</th>
            <th style={thStyle}>色泽</th>
            <th style={thStyle}>外开左</th>
            <th style={thStyle}>外开右</th>
            <th style={thStyle}>内开左</th>
            <th style={thStyle}>内开右</th>
            <th style={thStyle}>等级</th>
            <th style={thStyle}>板材厚度</th>
            <th style={thStyle}>铰链</th>
            <th style={thStyle}>锁芯</th>
            <th style={thStyle}>把手</th>
            <th style={thStyle}>备注</th>
            <th style={thStyle}>单价</th>
            <th style={thStyle}>操作</th>
          </tr>
        </thead>
        <tbody>
          {securityItems.map((item, idx) => (
            <tr key={idx}>
              <td style={tdStyle}>
                <Select
                  size="small"
                  showSearch
                  filterOption={false}
                  placeholder="搜索选择产品"
                  style={inputStyle}
                  loading={searchLoading}
                  value={item.product_id}
                  onChange={(_val: number, option: any) => {
                    const product = option?.product as ProductSearchResult | undefined
                    if (product) handleSecurityProductSelect(idx, product)
                  }}
                  onSearch={(q) => handleProductSearch('security', q)}
                  options={securityProductOptions.map(p => ({
                    value: p.id,
                    label: `${p.name}${p.model ? ` (${p.model})` : ''}`,
                    product: p,
                  }))}
                  allowClear
                  onClear={() => updateSecurity(idx, 'product_id', null)}
                />
              </td>
              <td style={tdStyle}><Input size="small" value={item.product_model} onChange={e => updateSecurity(idx, 'product_model', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><div style={{ display: 'flex', gap: 2 }}><Input size="small" value={item.size_h} onChange={e => updateSecurity(idx, 'size_h', e.target.value)} placeholder="高" style={inputStyle} /><Input size="small" value={item.size_w} onChange={e => updateSecurity(idx, 'size_w', e.target.value)} placeholder="宽" style={inputStyle} /></div></td>
              <td style={tdStyle}>
                {item.available_colors.length > 0 ? (
                  <Select size="small" value={item.color || undefined} onChange={v => updateSecurity(idx, 'color', v)} style={inputStyle} placeholder="选色泽" allowClear showSearch
                    options={item.available_colors.map(c => ({ value: c, label: c }))} />
                ) : (
                  <Input size="small" value={item.color} onChange={e => updateSecurity(idx, 'color', e.target.value)} style={inputStyle} />
                )}
              </td>
              <td style={tdStyle}><InputNumber size="small" min={0} value={item.outer_left} onChange={v => updateSecurity(idx, 'outer_left', v || 0)} style={inputStyle} /></td>
              <td style={tdStyle}><InputNumber size="small" min={0} value={item.outer_right} onChange={v => updateSecurity(idx, 'outer_right', v || 0)} style={inputStyle} /></td>
              <td style={tdStyle}><InputNumber size="small" min={0} value={item.inner_left} onChange={v => updateSecurity(idx, 'inner_left', v || 0)} style={inputStyle} /></td>
              <td style={tdStyle}><InputNumber size="small" min={0} value={item.inner_right} onChange={v => updateSecurity(idx, 'inner_right', v || 0)} style={inputStyle} /></td>
              <td style={tdStyle}><Input size="small" value={item.grade} onChange={e => updateSecurity(idx, 'grade', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Input size="small" value={item.board_thickness} onChange={e => updateSecurity(idx, 'board_thickness', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Input size="small" value={item.hinge} onChange={e => updateSecurity(idx, 'hinge', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Input size="small" value={item.lock_core} onChange={e => updateSecurity(idx, 'lock_core', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Input size="small" value={item.handle} onChange={e => updateSecurity(idx, 'handle', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Input size="small" value={item.remark} onChange={e => updateSecurity(idx, 'remark', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><InputNumber size="small" value={item.unit_price} onChange={v => updateSecurity(idx, 'unit_price', v || 0)} style={inputStyle} /></td>
              <td style={tdStyle}><Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => setSecurityItems(prev => prev.filter((_, i) => i !== idx))} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={() => setSecurityItems(prev => [...prev, emptySecurityItem()])} style={{ width: '100%', marginTop: 8 }}>添加行</Button>
    </div>
  )

  // ── 铝合金表格 ──
  const AlloyTable = () => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, minWidth: 180 }}>产品名称</th>
            <th style={thStyle}>位置</th>
            <th style={thStyle}>门型</th>
            <th style={thStyle}>型号</th>
            <th style={thStyle}>门套</th>
            <th style={thStyle}>高</th>
            <th style={thStyle}>宽</th>
            <th style={thStyle}>墙厚</th>
            <th style={thStyle}>颜色</th>
            <th style={thStyle}>玻璃工艺</th>
            <th style={thStyle}>开启方向</th>
            <th style={thStyle}>备注</th>
            <th style={thStyle}>操作</th>
          </tr>
        </thead>
        <tbody>
          {alloyItems.map((item, idx) => (
            <tr key={idx}>
              <td style={tdStyle}>
                <Select
                  size="small"
                  showSearch
                  filterOption={false}
                  placeholder="搜索选择产品"
                  style={inputStyle}
                  loading={searchLoading}
                  value={item.product_id}
                  onChange={(_val: number, option: any) => {
                    const product = option?.product as ProductSearchResult | undefined
                    if (product) handleAlloyProductSelect(idx, product)
                  }}
                  onSearch={(q) => handleProductSearch('alloy', q)}
                  options={alloyProductOptions.map(p => ({
                    value: p.id,
                    label: `${p.name}${p.model ? ` (${p.model})` : ''}`,
                    product: p,
                  }))}
                  allowClear
                  onClear={() => updateAlloy(idx, 'product_id', null)}
                />
              </td>
              <td style={tdStyle}><Input size="small" value={item.position} onChange={e => updateAlloy(idx, 'position', e.target.value)} style={inputStyle} placeholder="厨房" /></td>
              <td style={tdStyle}><Input size="small" value={item.door_type} onChange={e => updateAlloy(idx, 'door_type', e.target.value)} style={inputStyle} placeholder="平开门" /></td>
              <td style={tdStyle}><Input size="small" value={item.product_model} onChange={e => updateAlloy(idx, 'product_model', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Select size="small" value={item.door_cover} onChange={v => updateAlloy(idx, 'door_cover', v)} style={inputStyle} options={[{ value: '外单包', label: '外单包' }, { value: '双包', label: '双包' }, { value: '内单包', label: '内单包' }]} /></td>
              <td style={tdStyle}><Input size="small" value={item.size_h} onChange={e => updateAlloy(idx, 'size_h', e.target.value)} style={inputStyle} placeholder="2160" /></td>
              <td style={tdStyle}><Input size="small" value={item.size_w} onChange={e => updateAlloy(idx, 'size_w', e.target.value)} style={inputStyle} placeholder="785" /></td>
              <td style={tdStyle}><Input size="small" value={item.wall_thickness} onChange={e => updateAlloy(idx, 'wall_thickness', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}>
                {item.available_colors.length > 0 ? (
                  <Select size="small" value={item.color || undefined} onChange={v => updateAlloy(idx, 'color', v)} style={inputStyle} placeholder="选颜色" allowClear showSearch
                    options={item.available_colors.map(c => ({ value: c, label: c }))} />
                ) : (
                  <Input size="small" value={item.color} onChange={e => updateAlloy(idx, 'color', e.target.value)} style={inputStyle} placeholder="混油白" />
                )}
              </td>
              <td style={tdStyle}><Input size="small" value={item.glass_process} onChange={e => updateAlloy(idx, 'glass_process', e.target.value)} style={inputStyle} placeholder="透明白玻" /></td>
              <td style={tdStyle}><Input size="small" value={item.open_direction} onChange={e => updateAlloy(idx, 'open_direction', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Input size="small" value={item.remark} onChange={e => updateAlloy(idx, 'remark', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => setAlloyItems(prev => prev.filter((_, i) => i !== idx))} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={() => setAlloyItems(prev => [...prev, emptyAlloyItem()])} style={{ width: '100%', marginTop: 8 }}>添加行</Button>
    </div>
  )

  // ── 木门表格 ──
  const WoodTable = () => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, minWidth: 180 }}>产品名称</th>
            <th style={thStyle}>位置</th>
            <th style={thStyle}>产品号(型号)</th>
            <th style={thStyle}>颜色</th>
            <th style={thStyle}>洞口高</th>
            <th style={thStyle}>洞口宽</th>
            <th style={thStyle}>洞口厚</th>
            <th style={thStyle}>门扇高</th>
            <th style={thStyle}>门扇宽</th>
            <th style={thStyle}>门边线尺寸</th>
            <th style={thStyle}>门边线型</th>
            <th style={thStyle}>数量</th>
            <th style={thStyle}>单位</th>
            <th style={thStyle}>开向</th>
            <th style={thStyle}>备注</th>
            <th style={thStyle}>操作</th>
          </tr>
        </thead>
        <tbody>
          {woodItems.map((item, idx) => (
            <tr key={idx}>
              <td style={tdStyle}>
                <Select
                  size="small"
                  showSearch
                  filterOption={false}
                  placeholder="搜索选择产品"
                  style={inputStyle}
                  loading={searchLoading}
                  value={item.product_id}
                  onChange={(_val: number, option: any) => {
                    const product = option?.product as ProductSearchResult | undefined
                    if (product) handleWoodProductSelect(idx, product)
                  }}
                  onSearch={(q) => handleProductSearch('wood', q)}
                  options={woodProductOptions.map(p => ({
                    value: p.id,
                    label: `${p.name}${p.model ? ` (${p.model})` : ''}`,
                    product: p,
                  }))}
                  allowClear
                  onClear={() => updateWood(idx, 'product_id', null)}
                />
              </td>
              <td style={tdStyle}><Input size="small" value={item.position} onChange={e => updateWood(idx, 'position', e.target.value)} style={inputStyle} placeholder="主卧" /></td>
              <td style={tdStyle}><Input size="small" value={item.product_no} onChange={e => updateWood(idx, 'product_no', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}>
                {item.available_colors.length > 0 ? (
                  <Select size="small" value={item.color || undefined} onChange={v => updateWood(idx, 'color', v)} style={inputStyle} placeholder="选颜色" allowClear showSearch
                    options={item.available_colors.map(c => ({ value: c, label: c }))} />
                ) : (
                  <Input size="small" value={item.color} onChange={e => updateWood(idx, 'color', e.target.value)} style={inputStyle} />
                )}
              </td>
              <td style={tdStyle}><Input size="small" value={item.hole_h} onChange={e => updateWood(idx, 'hole_h', e.target.value)} style={inputStyle} placeholder="2260" /></td>
              <td style={tdStyle}><Input size="small" value={item.hole_w} onChange={e => updateWood(idx, 'hole_w', e.target.value)} style={inputStyle} placeholder="900" /></td>
              <td style={tdStyle}><Input size="small" value={item.hole_thickness} onChange={e => updateWood(idx, 'hole_thickness', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Input size="small" value={item.leaf_h} onChange={e => updateWood(idx, 'leaf_h', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Input size="small" value={item.leaf_w} onChange={e => updateWood(idx, 'leaf_w', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Input size="small" value={item.edge_size} onChange={e => updateWood(idx, 'edge_size', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Input size="small" value={item.edge_type} onChange={e => updateWood(idx, 'edge_type', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><InputNumber size="small" min={1} value={item.quantity} onChange={v => updateWood(idx, 'quantity', v || 1)} style={inputStyle} /></td>
              <td style={tdStyle}><Select size="small" value={item.unit} onChange={v => updateWood(idx, 'unit', v)} style={inputStyle} options={[{ value: '樘', label: '樘' }, { value: '套', label: '套' }]} /></td>
              <td style={tdStyle}><Input size="small" value={item.open_direction} onChange={e => updateWood(idx, 'open_direction', e.target.value)} style={inputStyle} placeholder="内右" /></td>
              <td style={tdStyle}><Input size="small" value={item.remark} onChange={e => updateWood(idx, 'remark', e.target.value)} style={inputStyle} /></td>
              <td style={tdStyle}><Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => setWoodItems(prev => prev.filter((_, i) => i !== idx))} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={() => setWoodItems(prev => [...prev, emptyWoodItem()])} style={{ width: '100%', marginTop: 8 }}>添加行</Button>
    </div>
  )

  const updateSecurity = (idx: number, key: keyof SecurityItem, val: any) =>
    setSecurityItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it))
  const updateAlloy = (idx: number, key: keyof AlloyItem, val: any) =>
    setAlloyItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it))
  const updateWood = (idx: number, key: keyof WoodItem, val: any) =>
    setWoodItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it))

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/app/orders')} style={{ marginBottom: 16 }}>返回列表</Button>
      <h2 style={{ marginBottom: 16 }}>新建订单</h2>

      <Form form={form} layout="vertical" style={{ maxWidth: 1200 }}>
        {/* 订单头部信息 */}
        <Card title="订单信息" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="source" label="来源" rules={[{ required: true }]}>
                <Select options={SOURCE_OPTIONS} placeholder="请选择" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="brand" label="装企">
                <Select options={brands.map((b: any) => ({ value: b.id, label: b.name }))} placeholder="请选择" allowClear showSearch optionFilterProp="label" onChange={handleBrandChange} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="store" label="门店">
                <Select options={stores.map((s: any) => ({ value: s.id, label: s.name }))} placeholder="请先选装企" allowClear showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="order_type" label="订单性质" initialValue="main">
                <Select options={ORDER_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="customer_name" label="客户姓名" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="customer_phone" label="电话" rules={[{ required: true, message: '请输入' }, ...phoneRules]}>
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customer_address" label="地址">
                <Input placeholder="请输入客户地址" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="bill_no" label="买单号">
                <Input placeholder="装企记账单号" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="factory_order_no" label="CP下单编号">
                <Input placeholder="给工厂的下单编号" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="customer_price" label="应收金额">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="cost_price" label="下单金额">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="collected_fee" label="已收劳务费">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="订单备注" />
          </Form.Item>
        </Card>

        {/* 产品明细 - 按产品线 Tab */}
        <Card title="产品明细" style={{ marginBottom: 16 }}>
          <Tabs activeKey={productLine} onChange={setProductLine} items={[
            { key: 'security', label: '防盗门', children: <SecurityTable /> },
            { key: 'alloy', label: '铝合金', children: <AlloyTable /> },
            { key: 'wood', label: '木门', children: <WoodTable /> },
          ]} />
        </Card>

        {/* 提交 */}
        <div style={{ textAlign: 'right', marginBottom: 24 }}>
          <Space>
            <Button onClick={() => navigate('/app/orders')}>取消</Button>
            <Button type="primary" onClick={handleSubmit} loading={submitting}>提交订单</Button>
          </Space>
        </div>
      </Form>
    </div>
  )
}
