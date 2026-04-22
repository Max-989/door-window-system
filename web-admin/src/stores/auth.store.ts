import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginRequest, LoginResponse, UserRole } from '../types/api'
import { post, get as requestGet } from '@/utils/request'

// Mapping from backend role names to frontend UserRole codes
const ROLE_NAME_TO_CODE: Record<string, UserRole> = {
  // permissions.Role names (Chinese) to codes
  '系统管理员': 'system_admin',
  '项目经理': 'project_manager',
  '导购': 'sales_guide',
  '仓库管理员': 'warehouse',
  '现场服务人员': 'service_personnel',
  '文员': 'clerk',
  // existing codes map to themselves
  'system_admin': 'system_admin',
  'admin': 'admin',
  'clerk_wood': 'clerk_wood',
  'clerk_alloy': 'clerk_alloy',
  'clerk_security': 'clerk_security',
  'warehouse': 'warehouse',
  'measurer': 'measurer',
  'installer': 'installer',
  'repairman': 'repairman',
  'foreman': 'foreman',
}

/** Map backend role name to frontend UserRole code */
function mapRoleToCode(role: string): UserRole {
  return ROLE_NAME_TO_CODE[role] || role as UserRole
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  token: string | null
  refresh: string | null
  me: () => Promise<User>
  login: (credentials: LoginRequest) => Promise<LoginResponse>
  logout: () => void
  hasRole: (...roles: UserRole[]) => boolean
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      refresh: null,

      login: async (credentials: LoginRequest) => {
        // Reset permissions on every login to ensure fresh fetch
        try {
          const { default: permissionStore } = await import('./permissionStore')
          permissionStore.getState().clearPermissions()
        } catch { /* ignore if store not available */ }
        const response = await post<any>('/api/v1/users/login/', {
          username: credentials.phone,
          password: credentials.password,
        })
        const { token, refresh, user } = response
        set({ user, isAuthenticated: true, token, refresh })
        return response
      },

      logout: () => {
        try {
          const { default: permissionStore } = require('./permissionStore')
          permissionStore.getState().clearPermissions()
        } catch { /* ignore */ }
        set({ user: null, isAuthenticated: false, token: null, refresh: null })
      },

      me: async () => {
        const token = get().token
        if (!token) throw new Error('未登录')
        const user = await requestGet<User>('/api/v1/users/me/')
        set({ user, isAuthenticated: true })
        return user
      },

      hasRole: (...roles: UserRole[]) => {
        const { user } = get()
        if (!user) return false
        const userRoleCode = mapRoleToCode(user.role)
        return roles.includes(userRoleCode)
      },
    }),
    { name: 'auth-storage', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated, token: s.token, refresh: s.refresh }) }
  )
)

export default useAuthStore
export { useAuthStore }
