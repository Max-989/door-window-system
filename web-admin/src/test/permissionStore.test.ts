import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('permissionStore', () => {
  let usePermissionStore: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/stores/permissionStore')
    usePermissionStore = mod.default
    usePermissionStore.getState().clearPermissions()
  })

  it('hasPermission returns false when not initialized', () => {
    expect(usePermissionStore.getState().hasPermission('dashboard')).toBe(false)
  })

  it('hasPermission returns false when permissions empty', () => {
    usePermissionStore.setState({ permissions: [], initialized: true, loading: false })
    expect(usePermissionStore.getState().hasPermission('dashboard')).toBe(false)
  })

  it('hasPermission returns true when permission exists', () => {
    usePermissionStore.setState({
      permissions: ['dashboard', 'orders'],
      initialized: true,
      loading: false,
    })

    expect(usePermissionStore.getState().hasPermission('dashboard')).toBe(true)
    expect(usePermissionStore.getState().hasPermission('orders')).toBe(true)
    expect(usePermissionStore.getState().hasPermission('settings')).toBe(false)
  })

  it('hasMenuPermission returns false when not initialized', () => {
    expect(usePermissionStore.getState().hasMenuPermission('dashboard')).toBe(false)
  })

  it('hasMenuPermission returns false when menus empty', () => {
    usePermissionStore.setState({ menus: [], initialized: true, loading: false })
    expect(usePermissionStore.getState().hasMenuPermission('dashboard')).toBe(false)
  })

  it('hasMenuPermission returns true when menu code exists', () => {
    usePermissionStore.setState({
      menus: [{ id: 1, name: 'Dashboard', code: 'dashboard', path: '/app/dashboard' }],
      initialized: true,
      loading: false,
    })

    expect(usePermissionStore.getState().hasMenuPermission('dashboard')).toBe(true)
  })

  it('hasMenuPermission searches nested children', () => {
    usePermissionStore.setState({
      menus: [
        {
          id: 1,
          name: 'Settings',
          code: 'settings',
          path: '/app/settings',
          children: [
            { id: 2, name: 'Permissions', code: 'settings_permissions', path: '/app/settings/permissions' },
          ],
        },
      ],
      initialized: true,
      loading: false,
    })

    expect(usePermissionStore.getState().hasMenuPermission('settings_permissions')).toBe(true)
    expect(usePermissionStore.getState().hasMenuPermission('nonexistent')).toBe(false)
  })

  it('clearPermissions resets all state', () => {
    usePermissionStore.setState({
      menus: [{ id: 1, code: 'dashboard' }],
      permissions: ['dashboard'],
      initialized: true,
      loading: false,
    })

    usePermissionStore.getState().clearPermissions()
    expect(usePermissionStore.getState().menus).toEqual([])
    expect(usePermissionStore.getState().permissions).toEqual([])
    expect(usePermissionStore.getState().initialized).toBe(false)
  })

  it('initPermissions does not re-fetch if already initialized', async () => {
    usePermissionStore.setState({ initialized: true, loading: false })

    // initPermissions should return early without calling any API
    await usePermissionStore.getState().initPermissions()

    // State unchanged
    expect(usePermissionStore.getState().initialized).toBe(true)
  })

  it('initPermissions sets initialized true on API error', async () => {
    await usePermissionStore.getState().initPermissions()

    // initPermissions catches errors and still sets initialized
    expect(usePermissionStore.getState().initialized).toBe(true)
    expect(usePermissionStore.getState().loading).toBe(false)
  })
})
