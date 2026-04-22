import { create } from 'zustand'
import { get } from '@/utils/request'

interface MenuItem {
  id: number
  name: string
  code: string
  path: string
  icon?: string
  menu_type?: string
  children?: MenuItem[]
}

interface PermissionState {
  menus: MenuItem[]
  permissions: string[]
  loading: boolean
  initialized: boolean
  fetchMenus: () => Promise<void>
  fetchPermissions: () => Promise<void>
  initPermissions: () => Promise<void>
  hasPermission: (code: string) => boolean
  hasMenuPermission: (menuCode: string) => boolean
  clearPermissions: () => void
}

const API_BASE = '/api/permissions'


const usePermissionStore = create<PermissionState>()((set, get) => ({
  menus: [],
  permissions: [],
  loading: false,
  initialized: false,

  fetchMenus: async () => {
    const data = await get<any>(`${API_BASE}/my-menus/`)
    const menuList = Array.isArray(data) ? data : (data.menus || [])
    set({ menus: menuList })
  },

  fetchPermissions: async () => {
    const data = await get<any>(`${API_BASE}/my-permissions/`)
    set({ permissions: data.permissions || [] })
  },

  initPermissions: async () => {
    const { initialized } = get()
    if (initialized) return
    set({ loading: true })
    try {
      await Promise.all([get().fetchMenus(), get().fetchPermissions()])
    } catch (e) {
      // API 失败时默认拒绝访问，避免未授权访问
      console.warn('Permission init failed, defaulting to deny:', e)
    }
    set({ loading: false, initialized: true })
  },

  hasPermission: (code: string) => {
    const { permissions, initialized } = get()
    if (!initialized) return false
    // 权限为空时拒绝访问
    if (permissions.length === 0) return false
    return permissions.includes(code)
  },

  hasMenuPermission: (menuCode: string) => {
    const { menus, initialized } = get()
    // 未获取菜单数据时禁止访问
    if (!initialized) return false
    // 菜单为空时拒绝访问（可能后端未配置或开发模式）
    if (menus.length === 0) return false
    // 检查菜单树中是否有该 code
    const findMenu = (items: MenuItem[]): boolean => {
      for (const item of items) {
        if (item.code === menuCode) return true
        if (item.children?.length && findMenu(item.children)) return true
      }
      return false
    }
    return findMenu(menus)
  },

  clearPermissions: () => set({ menus: [], permissions: [], initialized: false }),
}))

export default usePermissionStore
export type { MenuItem }
