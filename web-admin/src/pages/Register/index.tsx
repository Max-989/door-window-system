import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Radio, Checkbox, message, Divider, Select } from 'antd'
import {
  UserOutlined,
  LockOutlined,
  MobileOutlined,
  PhoneOutlined,
} from '@ant-design/icons'
import './style.css'

// 角色映射
const ROLE_MAP: Record<string, number> = {
  '项目经理': 3,
  '导购': 4,
}

const Register = () => {
  const navigate = useNavigate()
  const [identity, setIdentity] = useState<'decoration' | 'staff'>('decoration')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [staffType, setStaffType] = useState<'management' | 'service'>('management')
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([])
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [storesLoading, setStoresLoading] = useState(false)
  const [form] = Form.useForm()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 加载品牌列表
  useEffect(() => {
    if (identity === 'decoration') {
      fetchBrands()
    }
  }, [identity])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const fetchBrands = async () => {
    setBrandsLoading(true)
    try {
      const res = await fetch('/api/decoration/brands/')
      const data = await res.json()
      setBrands(data || [])
    } catch {
      setBrands([])
    } finally {
      setBrandsLoading(false)
    }
  }

  const fetchStores = useCallback(async (brandId: number) => {
    setStoresLoading(true)
    setStores([])
    form.setFieldValue('store_id', undefined)
    try {
      const res = await fetch(`/api/decoration/stores/?brand_id=${brandId}`)
      const data = await res.json()
      setStores(data || [])
    } catch {
      setStores([])
    } finally {
      setStoresLoading(false)
    }
  }, [form])

  const sendSmsCode = async () => {
    try {
      const phone = form.getFieldValue('phone')
      if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        message.error('请先输入正确的手机号')
        return
      }
      message.success('验证码已发送')
      setCountdown(60)
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      // ignore
    }
  }

  const handleRegister = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      if (identity === 'decoration') {
        const payload = {
          contact_name: values.contact_name,
          phone: values.phone,
          password: values.password,
          code: values.code,
          brand_id: values.brand_id,
          store_id: values.store_id,
          role_id: ROLE_MAP[values.role],
        }
        const res = await fetch('/api/users/register/decoration/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || data.message || '注册失败')
        message.success('注册成功，即将跳转登录页...')
        setTimeout(() => navigate('/login', { replace: true }), 2000)
      } else {
        const payload = {
          real_name: values.real_name,
          phone: values.phone,
          password: values.password,
          code: values.code,
          user_type: staffType,
        }
        const res = await fetch('/api/users/register/staff/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || data.message || '注册失败')
        message.success('注册成功，请等待管理员审核')
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      }
    } catch (err: any) {
      if (err?.errorFields) return // validation error
      message.error(err?.message || '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const onIdentityChange = (val: 'decoration' | 'staff') => {
    setIdentity(val)
    form.resetFields()
    setStores([])
  }

  const passwordValidator = (_: any, value: string) => {
    if (value && value.length < 6) return Promise.reject('密码至少6位')
    return Promise.resolve()
  }

  const confirmPasswordValidator = (_: any, value: string) => {
    if (value && value !== form.getFieldValue('password')) return Promise.reject('两次密码不一致')
    return Promise.resolve()
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <div className="register-logo">🚪</div>
          <h1>注册账号</h1>
          <p>门窗安装管理系统</p>
        </div>

        <div className="register-body">
          <Radio.Group
            value={identity}
            onChange={(e) => onIdentityChange(e.target.value)}
            className="register-identity-tabs"
            size="large"
          >
            <Radio.Button value="decoration">装企注册</Radio.Button>
            <Radio.Button value="staff">服务人员注册</Radio.Button>
          </Radio.Group>

          <Divider style={{ margin: '20px 0 24px' }} />

          <Form form={form} layout="vertical" requiredMark={false} size="large">
            {identity === 'decoration' ? (
              <>
                <Form.Item name="brand_id" label="选择品牌" rules={[{ required: true, message: '请选择品牌' }]}>
                  <Select
                    showSearch
                    placeholder="请搜索或选择品牌"
                    loading={brandsLoading}
                    filterOption={(input, option) =>
                      (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={brands.map(b => ({ value: b.id, label: b.name }))}
                    onChange={(val: number) => fetchStores(val)}
                    allowClear
                    onClear={() => { setStores([]); form.setFieldValue('store_id', undefined) }}
                  />
                </Form.Item>

                <Form.Item name="store_id" label="选择门店" rules={[{ required: true, message: '请选择门店' }]}>
                  <Select
                    showSearch
                    placeholder="请先选择品牌"
                    loading={storesLoading}
                    disabled={stores.length === 0}
                    filterOption={(input, option) =>
                      (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={stores.map(s => ({ value: s.id, label: s.name }))}
                    allowClear
                  />
                </Form.Item>

                <Form.Item name="contact_name" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
                  <Input prefix={<UserOutlined style={{ color: '#86868B' }} />} placeholder="请输入联系人姓名" />
                </Form.Item>

                <Form.Item name="role" label="选择角色" rules={[{ required: true, message: '请选择角色' }]}>
                  <Radio.Group>
                    <Radio value="项目经理">项目经理</Radio>
                    <Radio value="导购">导购</Radio>
                  </Radio.Group>
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item label="身份类型">
                  <Radio.Group
                    value={staffType}
                    onChange={(e) => setStaffType(e.target.value)}
                  >
                    <Radio value="management">管理人员</Radio>
                    <Radio value="service">服务人员</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item name="real_name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                  <Input prefix={<UserOutlined style={{ color: '#86868B' }} />} placeholder="请输入姓名" />
                </Form.Item>
              </>
            )}

            <Form.Item
              name="phone"
              label="手机号"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
              ]}
            >
              <Input prefix={<MobileOutlined style={{ color: '#86868B' }} />} placeholder="请输入手机号" maxLength={11} />
            </Form.Item>

            <Form.Item
              name="code"
              label="短信验证码"
              rules={[{ required: true, message: '请输入验证码' }]}
            >
              <div className="register-sms-row">
                <Input prefix={<PhoneOutlined style={{ color: '#86868B' }} />} placeholder="请输入验证码" style={{ flex: 1 }} />
                <Button
                  disabled={countdown > 0}
                  onClick={sendSmsCode}
                  className="register-sms-btn"
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              </div>
            </Form.Item>

            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }, passwordValidator]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#86868B' }} />} placeholder="请输入密码（至少6位）" />
            </Form.Item>

            <Form.Item name="confirmPassword" label="确认密码" rules={[{ required: true, message: '请确认密码' }, confirmPasswordValidator]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#86868B' }} />} placeholder="请再次输入密码" />
            </Form.Item>

            <Form.Item
              name="agreement"
              valuePropName="checked"
              rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject('请阅读并同意协议') }]}
            >
              <Checkbox>
                我已阅读并同意 <a style={{ color: '#1d1d1f' }}>《用户协议》</a> 和 <a style={{ color: '#1d1d1f' }}>《隐私政策》</a>
              </Checkbox>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                block
                onClick={handleRegister}
                loading={loading}
                className="register-submit-btn"
              >
                注册
              </Button>
            </Form.Item>
          </Form>

          <div className="register-bottom-link">
            已有账号？<a onClick={() => navigate('/login')}>返回登录</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
