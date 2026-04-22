import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const STORAGE_KEY = 'auth-storage'

function setStorage(token?: string, refresh?: string) {
  const data = { state: { token: token || null, refresh: refresh || null } }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('request', () => {
  it('GET request adds auth header when token exists', async () => {
    setStorage('test-token')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ code: 200, data: 'ok' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { request } = await import('@/utils/request')
    const result = await request('/test-url')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const args = mockFetch.mock.calls[0]!
    expect(args[0]).toBe('/api/v1/test-url')
    expect((args[1] as any).headers['Authorization']).toBe('Bearer test-token')
    expect(result).toBe('ok')
  })

  it('GET request works without token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ code: 200, data: 'hello' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { request } = await import('@/utils/request')
    const result = await request('/test-url')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const headers = (mockFetch.mock.calls[0]![1] as any).headers
    expect(headers['Authorization']).toBeUndefined()
    expect(result).toBe('hello')
  })

  it('POST request sends JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ code: 200, data: { id: 1 } }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { post } = await import('@/utils/request')
    const result = await post('/test-url', { name: 'test' })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const args = mockFetch.mock.calls[0]!
    expect((args[1] as any).method).toBe('POST')
    expect((args[1] as any).body).toBe(JSON.stringify({ name: 'test' }))
    expect(result).toEqual({ id: 1 })
  })

  it('auto-unwraps unified response with code and data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ code: 200, message: 'success', data: { items: [1, 2, 3] } }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { request } = await import('@/utils/request')
    const result = await request('/test-url')

    expect(result).toEqual({ items: [1, 2, 3] })
  })

  it('returns raw JSON for non-unified response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [1, 2], total: 10 }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { request } = await import('@/utils/request')
    const result = await request('/test-url')

    expect(result).toEqual({ items: [1, 2], total: 10 })
  })

  it('throws error with detail on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Bad request' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { request } = await import('@/utils/request')
    await expect(request('/test-url')).rejects.toThrow('Bad request')
  })

  it('throws error with message on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Validation failed' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { request } = await import('@/utils/request')
    await expect(request('/test-url')).rejects.toThrow('Validation failed')
  })

  it('uses full URL when path starts with /api', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'ok' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { request } = await import('@/utils/request')
    await request('/api/permissions/my-menus/')

    expect((mockFetch.mock.calls[0]![0] as any)).toBe('/api/permissions/my-menus/')
  })

  it('sends FormData without Content-Type header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ code: 200, data: 'ok' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { post } = await import('@/utils/request')
    const formData = new FormData()
    formData.append('file', 'test')
    await post('/test-url', formData)

    const headers = (mockFetch.mock.calls[0]![1] as any).headers
    expect(headers['Content-Type']).toBeUndefined()
  })

  it('exposes get/post/put/del/patch helpers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ code: 200, data: 'ok' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { get, post, put, del, patch } = await import('@/utils/request')

    await get('/get-test')
    expect((mockFetch.mock.calls[0]![1] as any).method).toBeUndefined()

    await post('/post-test', { a: 1 })
    expect((mockFetch.mock.calls[1]![1] as any).method).toBe('POST')

    await put('/put-test', { a: 1 })
    expect((mockFetch.mock.calls[2]![1] as any).method).toBe('PUT')

    await del('/del-test')
    expect((mockFetch.mock.calls[3]![1] as any).method).toBe('DELETE')

    await patch('/patch-test', { a: 1 })
    expect((mockFetch.mock.calls[4]![1] as any).method).toBe('PATCH')
  })
})

describe('401 token refresh', () => {
  it('refreshes token on 401 and retries original request', async () => {
    setStorage('old-token', 'refresh-token')

    let callCount = 0
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ detail: 'Unauthorized' }),
        })
      } else if (callCount === 2) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ code: 200, data: { access: 'new-token', refresh: 'new-refresh' } }),
        })
      } else {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ code: 200, data: 'retry-success' }),
        })
      }
    })
    vi.stubGlobal('fetch', mockFetch)

    const { request } = await import('@/utils/request')
    const result = await request('/test-url')

    expect(result).toBe('retry-success')
    expect(callCount).toBe(3)

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    expect(stored.state.token).toBe('new-token')
    expect(stored.state.refresh).toBe('new-refresh')
  })

  it('clears auth and redirects on refresh failure', async () => {
    setStorage('old-token', 'refresh-token')

    let callCount = 0
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ detail: 'Unauthorized' }),
        })
      } else {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ detail: 'Invalid token' }),
        })
      }
    })
    vi.stubGlobal('fetch', mockFetch)

    // Mock window.location.href for redirect check
    const locationMock = { href: '' } as Location
    vi.stubGlobal('location', locationMock)

    const { request } = await import('@/utils/request')
    await expect(request('/test-url')).rejects.toThrow('登录已过期')

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(locationMock.href).toBe('/login')
  })

  it('deduplicates concurrent 401 refresh attempts', async () => {
    setStorage('old-token', 'refresh-token')

    let callIdx = 0
    const mockFetch = vi.fn().mockImplementation((_url: string) => {
      callIdx++
      if (callIdx <= 2) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ detail: 'Unauthorized' }),
        })
      }
      if (callIdx === 3) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ code: 200, data: { access: 'new-token', refresh: 'new-refresh' } }),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 200, data: 'success' }),
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { request } = await import('@/utils/request')
    const [r1, r2] = await Promise.all([request('/test-url'), request('/test-url')])

    expect(r1).toBe('success')
    expect(r2).toBe('success')
  })
})
