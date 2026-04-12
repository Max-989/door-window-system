import React, { useEffect, useMemo } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import useAuthStore from '../../stores/auth.store'
import usePermissionStore, { type MenuItem } from '../../stores/permissionStore'
import {
  DashboardOutlined, ShoppingOutlined, CompressOutlined, ToolOutlined,
  TeamOutlined, ShopOutlined, BankOutlined, AppstoreOutlined,
  BarChartOutlined, SettingOutlined, LogoutOutlined, UnorderedListOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, SafetyOutlined,
} from '@ant-design/icons'
import { Menu, Button, Spin } from 'antd'
import './style.css'

// Fallback menus for dev mode (when permissions not loaded)
const FALLBACK_MENUS = [
  { code: 'dashboard', label: '工作台', path: '/app/dashboard', icon: 'DashboardOutlined' },
  { code: 'orders', label: '订单管理', path: '/app/orders', icon: 'ShoppingOutlined' },
  { code: 'service', label: '服务管理', path: '/app/tasks', icon: 'UnorderedListOutlined' },
  { code: 'personnel', label: '人员管理', path: '/app/personnel', icon: 'TeamOutlined' },
  { code: 'decoration', label: '装企管理', path: '/app/decoration-company', icon: 'ShopOutlined' },
  { code: 'warehouse', label: '仓库管理', path: '/app/warehouse', icon: 'BankOutlined' },
  { code: 'products', label: '产品库', path: '/app/products', icon: 'AppstoreOutlined' },
  { code: 'reports', label: '数据看板', path: '/app/reports', icon: 'BarChartOutlined' },
  { code: 'settings', label: '系统设置', path: '/app/settings', icon: 'SettingOutlined', children: [
    { code: 'settings', label: '基础设置', path: '/app/settings', icon: 'SettingOutlined' },
    { code: 'settings', label: '权限管理', path: '/app/settings/permissions', icon: 'SafetyOutlined' },
  ]},
]

// Backend menu code → frontend route path mapping
const MENU_PATH_MAP: Record<string, string> = {
  '/dashboard': '/app/dashboard',
  '/orders': '/app/orders',
  '/service': '/app/tasks',
  '/personnel': '/app/personnel',
  '/decoration': '/app/decoration-company',
  '/warehouse': '/app/warehouse',
  '/products': '/app/products',
  '/reports': '/app/reports',
  '/settings': '/app/settings',
  '/settings/permissions': '/app/settings/permissions',
}

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  ShoppingOutlined: <ShoppingOutlined />,
  ShoppingCartOutlined: <ShoppingOutlined />,
  UnorderedListOutlined: <UnorderedListOutlined />,
  TeamOutlined: <TeamOutlined />,
  ShopOutlined: <ShopOutlined />,
  BankOutlined: <BankOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  SettingOutlined: <SettingOutlined />,
  RulerOutlined: <CompressOutlined />,
  ToolOutlined: <ToolOutlined />,
  HomeOutlined: <BankOutlined />,
  CustomerServiceOutlined: <ToolOutlined />,
  SafetyOutlined: <SafetyOutlined />,
}

// 页面名称映射
const PAGE_NAMES: Record<string, string> = {
  dashboard: '工作台', orders: '订单管理', tasks: '服务管理', personnel: '人员管理',
  'decoration-company': '装企管理', warehouse: '仓库管理', products: '产品库',
  reports: '数据看板', settings: '系统设置', permissions: '权限管理',
}

// 从菜单树构建 Ant Design Menu items
const buildMenuItems = (menus: MenuItem[]) => {
  return menus
    .filter(m => m.menu_type !== 'button')
    .map(m => {
      const resolvePath = (p: string | undefined) => p ? (MENU_PATH_MAP[p] || `/app${p}`) : undefined
      if (m.children?.length) {
        const childrenItems = m.children
          .filter(c => c.menu_type !== 'button')
          .map(c => ({
            key: resolvePath(c.path) || c.code,
            icon: c.icon ? iconMap[c.icon] : undefined,
            label: c.name,
          }))
        return {
          key: resolvePath(m.path) || m.code,
          icon: m.icon ? iconMap[m.icon] : undefined,
          label: m.name,
          children: childrenItems.length > 0 ? childrenItems : undefined,
        }
      }
      return {
        key: resolvePath(m.path) || m.code,
        icon: m.icon ? iconMap[m.icon] : undefined,
        label: m.name,
      }
    })
}

const LayoutPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { menus, initialized, initPermissions, loading } = usePermissionStore()
  const [collapsed, setCollapsed] = React.useState(false)

  useEffect(() => {
    if (useAuthStore.getState().isAuthenticated && !initialized) {
      initPermissions()
    }
  }, [initialized])

  const currentPath = location.pathname

  // Use dynamic menus or fallback
  const menuItems = useMemo(() => {
    if (initialized && menus.length > 0) {
      return buildMenuItems(menus)
    }
    // Fallback for dev mode
    return FALLBACK_MENUS.map(m => ({
      key: m.path,
      icon: iconMap[m.icon],
      label: m.label,
      children: m.children ? m.children.map(c => ({
        key: c.path,
        icon: iconMap[c.icon],
        label: c.label,
      })) : undefined,
    }))
  }, [menus, initialized])

  // Active menu
  const selectedKeys = useMemo(() => {
    const match = menuItems.find(item =>
      currentPath.startsWith(item.key)
    )
    return match ? [match.key] : ['/app/dashboard']
  }, [currentPath, menuItems])

  // Default open keys for submenus
  const defaultOpenKeys = useMemo(() => {
    return menuItems
      .filter((item: any) => 'children' in item && (item.children as any[])?.some((c: any) => currentPath.startsWith(c.key)))
      .map(item => item.key)
  }, [menuItems, currentPath])

  // Breadcrumb
  const segments = currentPath.replace('/app/', '').split('/')
  const breadcrumbItems = segments.map((seg, i) => ({
    label: PAGE_NAMES[seg] || seg,
    path: '/app/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }))

  const handleLogout = () => {
    logout()
    usePermissionStore.getState().clearPermissions()
    navigate('/login')
  }

  // Loading guard (must be after all hooks)
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="layout-wrapper">
      {/* 侧边栏 */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🚪</div>
          {!collapsed && '门窗管理系统'}
        </div>
        <nav className="sidebar-menu">
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            defaultOpenKeys={defaultOpenKeys}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            inlineCollapsed={collapsed}
            style={{ borderRight: 0 }}
          />
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{user?.name?.[0] || 'U'}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || '未知用户'}
              </div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>
                {user?.branch || ''}
              </div>
            </div>
          </div>
          <div className="sidebar-logout" onClick={handleLogout}>
            <LogoutOutlined style={{ marginRight: 4 }} /> 退出登录
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <div className="main-layout">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)} />
            <div className="breadcrumb">
              {breadcrumbItems.map((item, i) => (
                <span key={i}>
                  {i > 0 && <span>/</span>}
                  {item.isLast ? (
                    <a>{item.label}</a>
                  ) : (
                    <Link to={item.path}>{item.label}</Link>
                  )}
                </span>
              ))}
            </div>
          </div>
        </header>
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default LayoutPage
