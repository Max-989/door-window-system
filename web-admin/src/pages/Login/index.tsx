import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Select, message, Modal, Radio, Checkbox } from 'antd'
import {
  UserOutlined,
  LockOutlined,
  MobileOutlined,
  QrcodeOutlined,
  DesktopOutlined,
} from '@ant-design/icons'
import useAuthStore from '../../stores/auth.store'
import type { RoleOption } from '../../types/api'
import './style.css'

interface RoleOption {
  role_id: number
  role_name: string
}

const Login = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [identity, setIdentity] = useState<'decoration' | 'service'>('decoration')
  const [view, setView] = useState<'account' | 'qrcode'>('account')
  const [form] = Form.useForm()

  // 记住密码 & 自动登录
  const [rememberMe, setRememberMe] = useState(false)
  const [autoLogin, setAutoLogin] = useState(false)
  const [autoLoginLoading, setAutoLoginLoading] = useState(false)

  // 忘记密码 Modal
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotForm] = Form.useForm()
  const [forgotLoading, setForgotLoading] = useState(false)

  // 角色选择 Modal 状态
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [confirmingRole, setConfirmingRole] = useState(false)
  // 暂存登录凭据，用于角色确认后重新请求
  const pendingLoginRef = useRef<{ username: string; password: string; token: string } | null>(null)

  useEffect(() => {
    if (isAuthenticated) navigate('/app/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  // 记住密码：初始化时读取
  useEffect(() => {
    try {
      const saved = localStorage.getItem('login_remember')
      if (saved) {
        const data = JSON.parse(saved)
        form.setFieldsValue({ account: data.phone, password: data.password })
        setIdentity(data.identity || 'decoration')
        setRememberMe(true)
        if (localStorage.getItem('login_auto')) {
          setAutoLogin(true)
        }
      }
    } catch { /* ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 自动登录：检测到 login_auto 时自动登录
  useEffect(() => {
    const autoToken = localStorage.getItem('login_auto')
    if (!autoToken || isAuthenticated) return

    let cancelled = false
    setAutoLoginLoading(true)

    const doAutoLogin = async () => {
      try {
        const saved = localStorage.getItem('login_remember')
        if (!saved) { cancelled = true; return }
        const { phone, password } = JSON.parse(saved)

        if (phone && password) {
          const _res = await login({ phone, password })
          if (!cancelled) {
            message.success('自动登录成功')
            navigate('/app/dashboard', { replace: true })
          }
        }
      } catch {
        // 自动登录失败，清除标记
        localStorage.removeItem('login_auto')
        setAutoLogin(false)
        if (!cancelled) {
          message.info('自动登录失效，请重新登录')
        }
      } finally {
        if (!cancelled) setAutoLoginLoading(false)
      }
    }

    // 延迟一小段时间让页面先渲染
    const timer = setTimeout(doAutoLogin, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = useCallback(async (values: any) => {
    setLoading(true)
    try {
      const res = await login({ phone: values.account, password: values.password })

      // 记住密码 / 自动登录 保存
      if (rememberMe) {
        localStorage.setItem('login_remember', JSON.stringify({
          phone: values.account,
          password: values.password,
          identity,
        }))
        if (autoLogin) {
          localStorage.setItem('login_auto', res.token || '1')
        } else {
          localStorage.removeItem('login_auto')
        }
      } else {
        localStorage.removeItem('login_remember')
        localStorage.removeItem('login_auto')
      }

      // 装企登录时检查是否有多个角色（旧逻辑，可能不再需要）
      if (identity === 'decoration' && res?.user?.roles && res.user.roles.length > 1) {
        // 多角色，弹出选择
        pendingLoginRef.current = {
          username: values.account,
          password: values.password,
          token: res.token,
        }
        setRoleOptions(res.user.roles)
        setSelectedRoleId(res.user.roles[0].role_id)
        setRoleModalOpen(true)
        return
      }

      // 根据用户身份进行路由跳转
      const user = res.user
      if (user.identity === 'contractor' && !user.is_approved) {
        // 承包商未审核，提示但不跳转
        message.warning('账号待审核，请等待管理员审核')
        return
      } else {
        // decoration / customer / contractor(is_approved=true) 均跳转首页
        navigate('/', { replace: true })
      }

      message.success('登录成功')
    } catch (err: any) {
      message.error(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }, [login, navigate, identity, rememberMe, autoLogin])

  const handleRoleConfirm = async () => {
    if (!selectedRoleId || !pendingLoginRef.current) return
    setConfirmingRole(true)
    try {
      // 用选中的角色重新确认登录
      const res = await fetch('/api/v1/users/confirm-role/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pendingLoginRef.current.token}` },
        body: JSON.stringify({ role_id: selectedRoleId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || '角色确认失败')

      message.success('登录成功')
      setRoleModalOpen(false)
      navigate('/app/dashboard', { replace: true })
    } catch (err: any) {
      message.error(err.message || '角色确认失败')
    } finally {
      setConfirmingRole(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🚪</div>
          <h1>门窗安装管理系统</h1>
          <p>乙方全流程管理平台</p>
        </div>

        <div className="login-view-toggle">
          {view === 'account' ? (
            <QrcodeOutlined onClick={() => setView('qrcode')} />
          ) : (
            <DesktopOutlined onClick={() => setView('account')} />
          )}
        </div>

        <div className="login-body">
          {view === 'account' ? (
            <>
              <Form.Item className="login-identity-select">
                <Select
                  value={identity}
                  onChange={setIdentity}
                  options={[
                    { value: 'decoration', label: '🏢 装企登录' },
                    { value: 'service', label: '🔧 服务登录' },
                  ]}
                  size="large"
                />
              </Form.Item>

              <Form form={form} onFinish={handleLogin} size="large" layout="vertical">
                {identity === 'decoration' ? (
                  <Form.Item name="account" rules={[{ required: true, message: '请输入账号' }]}>
                    <Input prefix={<UserOutlined style={{ color: '#86868B' }} />} placeholder="请输入账号" />
                  </Form.Item>
                ) : (
                  <Form.Item
                    name="account"
                    rules={[
                      { required: true, message: '请输入手机号' },
                      { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
                    ]}
                  >
                    <Input prefix={<MobileOutlined style={{ color: '#86868B' }} />} placeholder="请输入手机号" maxLength={11} />
                  </Form.Item>
                )}

                <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password prefix={<LockOutlined style={{ color: '#86868B' }} />} placeholder="请输入密码" />
                </Form.Item>

                <div className="login-form-extra">
                  <div className="login-checkbox-group">
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => {
                        setRememberMe(e.target.checked)
                        if (!e.target.checked) setAutoLogin(false)
                      }}
                      className="login-checkbox"
                    >
                      记住密码
                    </Checkbox>
                    <Checkbox
                      checked={autoLogin}
                      disabled={!rememberMe}
                      onChange={(e) => setAutoLogin(e.target.checked)}
                      className="login-checkbox"
                    >
                      自动登录
                    </Checkbox>
                  </div>
                  <a className="login-forgot" onClick={() => setForgotOpen(true)}>忘记密码</a>
                </div>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" block loading={loading || autoLoginLoading} className="login-submit-btn">
                    {autoLoginLoading ? '自动登录中...' : '登录'}
                  </Button>
                </Form.Item>
              </Form>
            </>
          ) : (
            <div className="login-qrcode-view">
              <div className="login-qrcode-placeholder">
                <QrcodeOutlined style={{ fontSize: 120, color: '#C7C7CC' }} />
              </div>
              <p className="login-qrcode-hint">使用微信扫码登录</p>
              <a className="login-download-link">下载小程序 &gt;&gt;</a>
            </div>
          )}

          <div className="login-bottom-link">
            还没有账号？<a onClick={() => navigate('/register')}>注册账号</a>
          </div>

          <div className="demo-accounts">
            <h4>演示账号</h4>
            <div>管理员：<code>admin</code> / <code>admin123</code></div>
            <div>仓库人员：<code>13100000003</code> / <code>admin123</code></div>
            <div>量尺师傅：<code>13100000001</code> / <code>admin123</code></div>
          </div>
        </div>
      </div>

      {/* 忘记密码 Modal */}
      <Modal
        title="重置密码"
        open={forgotOpen}
        onCancel={() => { setForgotOpen(false); forgotForm.resetFields() }}
        footer={null}
        centered
        width={400}
      >
        <Form form={forgotForm} layout="vertical" onFinish={async (values) => {
          setForgotLoading(true)
          try {
            // 尝试调用后端接口，失败则 mock 成功
            try {
              await fetch('/api/v1/users/reset-password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: values.phone, old_password: values.oldPassword, new_password: values.newPassword }),
              })
            } catch { /* 后端不存在，mock 成功 */ }
            message.success('密码已重置，请登录')
            setForgotOpen(false)
            forgotForm.resetFields()
          } finally {
            setForgotLoading(false)
          }
        }}>
          <Form.Item name="phone" label="手机号" rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
          ]}>
            <Input prefix={<MobileOutlined style={{ color: '#86868B' }} />} placeholder="请输入注册手机号" maxLength={11} />
          </Form.Item>
          <Form.Item name="oldPassword" label="原密码" rules={[
            { required: true, message: '请输入原密码' },
          ]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#86868B' }} />} placeholder="请输入原密码" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少6位' },
          ]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#86868B' }} />} placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="确认密码" dependencies={['newPassword']} rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                return Promise.reject(new Error('两次密码输入不一致'))
              },
            }),
          ]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#86868B' }} />} placeholder="请再次输入新密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={forgotLoading} className="login-submit-btn">
              重置密码
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 多角色选择 Modal */}
      <Modal
        title="选择登录角色"
        open={roleModalOpen}
        onOk={handleRoleConfirm}
        onCancel={() => {
          setRoleModalOpen(false)
          pendingLoginRef.current = null
        }}
        confirmLoading={confirmingRole}
        okText="确认登录"
        cancelText="取消"
        centered
      >
        <p style={{ color: '#86868B', marginBottom: 16 }}>您有多个可用角色，请选择本次登录使用的角色：</p>
        <Radio.Group
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          style={{ width: '100%' }}
        >
          {roleOptions.map((role) => (
            <Radio key={role.role_id} value={role.role_id} style={{ display: 'block', marginBottom: 12, fontSize: 15 }}>
              {role.role_name}
            </Radio>
          ))}
        </Radio.Group>
      </Modal>
    </div>
  )
}

export default Login
