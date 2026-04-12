import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginRequest, LoginResponse, UserRole } from '../types/api'
import { post, get } from '@/utils/request'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  token: string | null
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

      login: async (credentials: LoginRequest) => {
        const data = await post<LoginResponse>('/api/v1/users/login/', {
          username: credentials.phone,
          password: credentials.password,
        })
        const { token, refresh, user } = data
        set({ user, isAuthenticated: true, token })
        return data
      },

      logout: () => set({ user: null, isAuthenticated: false, token: null }),

      me: async () => {
        const token = get().token
        if (!token) throw new Error('未登录')
        const user = await get<User>('/api/v1/users/me/')
        set({ user, isAuthenticated: true })
        return user
      },

      hasRole: (...roles: UserRole[]) => {
        const { user } = get()
        return !!user && roles.includes(user.role)
      },
    }),
    { name: 'auth-storage', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated, token: s.token }) }
  )
)

export default useAuthStore
export { useAuthStore }
