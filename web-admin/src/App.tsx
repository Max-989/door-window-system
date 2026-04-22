import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import usePermissionStore from './stores/permissionStore'
import { Spin, Button } from 'antd'
import React from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import OrderDetail from './pages/Orders/OrderDetail'
import OrderCreate from './pages/Orders/OrderCreate'
import TaskManagement from './pages/TaskManagement'
import Personnel from './pages/Personnel'
import DecorationCompany from './pages/DecorationCompany'
import Warehouse from './pages/Warehouse'
import Products from './pages/Products'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Permissions from './pages/Settings/Permissions'
import Approval from './pages/Settings/Approval'
import Forbidden from './pages/Forbidden'

// Error Boundary
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: string | null}> {
  state = {error: null as any}
  static getDerivedStateFromError(e: any) { return {error: e.message || String(e)} }
  render() {
    if (this.state.error) return <div style={{padding:40}}><h2>页面崩溃</h2><pre style={{whiteSpace:'pre-wrap'}}>{this.state.error}</pre><Button onClick={()=>{this.setState({error:null});window.location.reload()}}>刷新</Button></div>
    return this.props.children
  }
}

// 登录守卫
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// 权限路由码映射
const routePermissionMap: Record<string, string> = {
  dashboard: 'dashboard',
  orders: 'orders',
  tasks: 'service',
  personnel: 'personnel',
  'decoration-company': 'decoration',
  warehouse: 'warehouse',
  products: 'products',
  reports: 'reports',
  settings: 'settings',
  permissions: 'settings',
}

// 权限守卫
const PermissionRoute = ({ children, path }: { children: React.ReactNode; path: string }) => {
  const hasMenuPermission = usePermissionStore((s) => s.hasMenuPermission)
  const initialized = usePermissionStore((s) => s.initialized)

  // 未初始化权限时显示加载
  if (!initialized) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin /></div>

  const segment = path.replace('/app/', '').split('/')[0]
  const permCode = routePermissionMap[segment]

  if (permCode && !hasMenuPermission(permCode)) {
    // If initialized but menus empty (e.g. seed data not loaded yet), allow access in dev
    const { menus } = usePermissionStore.getState()
    if (menus.length > 0) return <Forbidden />
    // Fallback: allow access when no menus configured
  }

  return <>{children}</>
}

const App = () => {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PermissionRoute path="/app/dashboard"><Dashboard /></PermissionRoute>} />
        <Route path="orders" element={<PermissionRoute path="/app/orders"><Orders /></PermissionRoute>} />
        <Route path="orders/create" element={<PermissionRoute path="/app/orders/create"><OrderCreate /></PermissionRoute>} />
        <Route path="orders/:id" element={<PermissionRoute path="/app/orders"><OrderDetail /></PermissionRoute>} />
        <Route path="tasks" element={<PermissionRoute path="/app/tasks"><TaskManagement /></PermissionRoute>} />
        <Route path="personnel" element={<PermissionRoute path="/app/personnel"><Personnel /></PermissionRoute>} />
        <Route path="decoration-company" element={<PermissionRoute path="/app/decoration-company"><DecorationCompany /></PermissionRoute>} />
        <Route path="warehouse" element={<PermissionRoute path="/app/warehouse"><Warehouse /></PermissionRoute>} />
        <Route path="products" element={<PermissionRoute path="/app/products"><Products /></PermissionRoute>} />
        <Route path="reports" element={<PermissionRoute path="/app/reports"><Reports /></PermissionRoute>} />
        <Route path="settings" element={<PermissionRoute path="/app/settings"><Settings /></PermissionRoute>} />
        <Route path="settings/permissions" element={<PermissionRoute path="/app/settings"><Permissions /></PermissionRoute>} />
        <Route path="settings/approval" element={<PermissionRoute path="/app/settings"><Approval /></PermissionRoute>} />
        <Route path="403" element={<Forbidden />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </ErrorBoundary>
  )
}

export default App
