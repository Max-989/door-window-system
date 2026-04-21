import { useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Layout, Menu, Button, Avatar, Dropdown, Breadcrumb } from 'antd'
import {
  DashboardOutlined, ShoppingOutlined, ToolOutlined,
  TeamOutlined, BankOutlined, HomeOutlined,
  AppstoreOutlined, BarChartOutlined, SettingOutlined, SafetyOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined,
  AuditOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../stores/auth.store'

const { Sider, Header, Content } = Layout

const menuItems = [
  { key: '/app/dashboard', icon: <DashboardOutlined />, label: '数据概览' },
  { key: '/app/orders', icon: <ShoppingOutlined />, label: '订单管理' },
  { key: '/app/tasks', icon: <ToolOutlined />, label: '任务管理' },
  { key: '/app/personnel', icon: <TeamOutlined />, label: '人员管理' },
  { key: '/app/decoration-company', icon: <BankOutlined />, label: '装企管理' },
  { key: '/app/warehouse', icon: <HomeOutlined />, label: '仓库管理' },
  { key: '/app/products', icon: <AppstoreOutlined />, label: '产品库管理' },
  { key: '/app/reports', icon: <BarChartOutlined />, label: '数据看板' },
  {
    key: 'settings-group',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      { key: '/app/settings', icon: <SettingOutlined />, label: '基础设置' },
      { key: '/app/settings/permissions', icon: <SafetyOutlined />, label: '权限管理' },
      { key: '/app/settings/approval', icon: <AuditOutlined />, label: '注册审核' },
    ],
  },
]

const breadcrumbMap: Record<string, string> = {
  '/app/dashboard': '数据概览', '/app/orders': '订单管理', '/app/tasks': '任务管理',
  '/app/personnel': '人员管理', '/app/decoration-company': '装企管理', '/app/warehouse': '仓库管理',
  '/app/products': '产品库管理', '/app/reports': '数据看板', '/app/settings': '系统设置',
  '/app/settings/permissions': '权限管理', '/app/settings/approval': '注册审核',
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const selectedKey = menuItems.find(m => location.pathname.startsWith(m.key))?.key
    || menuItems.flatMap(m => m.children || []).find(m => location.pathname.startsWith(m.key))?.key
    || '/app/dashboard'
  const breadcrumbLabel = Object.entries(breadcrumbMap).find(([k]) => location.pathname.startsWith(k))?.[1] || ''

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: user?.name || '用户' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
    ],
    onClick: ({ key }: { key: string }) => { if (key === 'logout') { logout(); navigate('/login') } },
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}
        style={{ borderRight: '1px solid #e5e5ea' }}
        trigger={null}
      >
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #e5e5ea' }}>
          <span style={{ fontSize: collapsed ? 18 : 16, fontWeight: 700, color: '#007AFF', whiteSpace: 'nowrap' }}>
            {collapsed ? '门窗' : '门窗管理系统'}
          </span>
        </div>
        <Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems}
          onClick={({ key }) => navigate(key)} style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)} />
            <Breadcrumb items={[{ title: '首页' }, breadcrumbLabel ? { title: breadcrumbLabel } : undefined].filter(Boolean) as any[]} />
          </div>
          <Dropdown menu={userMenu}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar style={{ background: '#007AFF' }} icon={<UserOutlined />} />
              <span>{user?.name || '用户'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content><Outlet /></Content>
      </Layout>
    </Layout>
  )
}
