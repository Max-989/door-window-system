import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { User, LoginResponse } from '@/types/api'

const mockUser: User = {
  id: 1,
  username: 'test',
  name: '测试',
  phone: '13800138000',
  role: 'admin',
  identity: 'system',
  is_approved: true,
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockLoginResponse: LoginResponse = {
  token: 'test-token-123',
  refresh: 'test-refresh-456',
  user: mockUser,
}

vi.mock('@/utils/request', () => ({
  post: vi.fn(),
  get: vi.fn(),
}))

beforeEach(async () => {
  localStorage.clear()
  vi.clearAllMocks()
  const { useAuthStore } = await import('@/stores/auth.store')
  useAuthStore.getState().logout()
})

describe('auth.store', () => {
  it('login stores token, refresh, and user', async () => {
    const { post } = await import('@/utils/request')
    vi.mocked(post).mockResolvedValue(mockLoginResponse)

    const { useAuthStore } = await import('@/stores/auth.store')
    await useAuthStore.getState().login({ phone: '13800138000', password: 'pass' })

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe('test-token-123')
    expect(state.refresh).toBe('test-refresh-456')
  })

  it('login sends phone as username to API', async () => {
    const { post } = await import('@/utils/request')
    vi.mocked(post).mockResolvedValue(mockLoginResponse)

    const { useAuthStore } = await import('@/stores/auth.store')
    await useAuthStore.getState().login({ phone: '13800138000', password: 'secret' })

    expect(post).toHaveBeenCalledWith('/api/v1/users/login/', {
      username: '13800138000',
      password: 'secret',
    })
  })

  it('logout clears all auth state', async () => {
    const { post } = await import('@/utils/request')
    vi.mocked(post).mockResolvedValue(mockLoginResponse)

    const { useAuthStore } = await import('@/stores/auth.store')
    await useAuthStore.getState().login({ phone: '13800138000', password: 'pass' })
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.refresh).toBeNull()
  })

  it('hasRole returns true for matching role', async () => {
    const { post } = await import('@/utils/request')
    vi.mocked(post).mockResolvedValue(mockLoginResponse)

    const { useAuthStore } = await import('@/stores/auth.store')
    await useAuthStore.getState().login({ phone: '13800138000', password: 'pass' })

    expect(useAuthStore.getState().hasRole('admin')).toBe(true)
  })

  it('hasRole returns false for non-matching role', async () => {
    const { post } = await import('@/utils/request')
    vi.mocked(post).mockResolvedValue(mockLoginResponse)

    const { useAuthStore } = await import('@/stores/auth.store')
    await useAuthStore.getState().login({ phone: '13800138000', password: 'pass' })

    expect(useAuthStore.getState().hasRole('installer')).toBe(false)
  })

  it('hasRole returns false when user is null', async () => {
    const { useAuthStore } = await import('@/stores/auth.store')
    expect(useAuthStore.getState().hasRole('admin')).toBe(false)
  })

  it('maps Chinese role names to codes', async () => {
    const chineseUser: User = { ...mockUser, role: '系统管理员' as any }
    const loginResp: LoginResponse = { ...mockLoginResponse, user: chineseUser }

    const { post } = await import('@/utils/request')
    vi.mocked(post).mockResolvedValue(loginResp)

    const { useAuthStore } = await import('@/stores/auth.store')
    await useAuthStore.getState().login({ phone: '13800138000', password: 'pass' })

    expect(useAuthStore.getState().hasRole('system_admin')).toBe(true)
  })

  it('me fetches user and sets state', async () => {
    const { post, get } = await import('@/utils/request')
    vi.mocked(post).mockResolvedValue(mockLoginResponse)

    const { useAuthStore } = await import('@/stores/auth.store')
    await useAuthStore.getState().login({ phone: '13800138000', password: 'pass' })

    const updatedUser: User = { ...mockUser, name: 'Updated' }
    vi.mocked(get).mockResolvedValue(updatedUser)

    const result = await useAuthStore.getState().me()
    expect(result).toEqual(updatedUser)
    expect(useAuthStore.getState().user?.name).toBe('Updated')
  })

  it('persists token and refresh in localStorage', async () => {
    const { post } = await import('@/utils/request')
    vi.mocked(post).mockResolvedValue(mockLoginResponse)

    const { useAuthStore } = await import('@/stores/auth.store')
    await useAuthStore.getState().login({ phone: '13800138000', password: 'pass' })

    const stored = JSON.parse(localStorage.getItem('auth-storage') || '{}')
    expect(stored.state.token).toBe('test-token-123')
    expect(stored.state.refresh).toBe('test-refresh-456')
    expect(stored.state.user).toEqual(mockUser)
    expect(stored.state.isAuthenticated).toBe(true)
  })
})
