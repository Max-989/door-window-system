const BASE_URL = '/api/v1'

function getAuthStorage(): { state?: { token?: string; refresh?: string } } | null {
  try {
    return JSON.parse(localStorage.getItem('auth-storage') || '{}')
  } catch {
    return null
  }
}

function getToken(): string | null {
  const auth = getAuthStorage()
  return auth?.state?.token || null
}

function getRefreshToken(): string | null {
  const auth = getAuthStorage()
  return auth?.state?.refresh || null
}

function updateToken(newToken: string, newRefresh?: string): void {
  const auth = getAuthStorage()
  if (!auth) return
  auth.state = auth.state || {}
  auth.state.token = newToken
  if (newRefresh) auth.state.refresh = newRefresh
  localStorage.setItem('auth-storage', JSON.stringify(auth))
}

let refreshing: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const res = await fetch('/api/v1/users/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    })
    if (!res.ok) return false
    const json = await res.json()
    const data = json.data || json
    updateToken(data.access, data.refresh)
    return true
  } catch {
    return false
  }
}

export async function request<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // 如果URL以/api开头，直接使用完整路径，否则添加BASE_URL
  const fullUrl = url.startsWith('/api') ? url : `${BASE_URL}${url}`
  const res = await fetch(fullUrl, { ...options, headers })

  if (res.status === 401) {
    // Try to refresh token
    if (!refreshing) refreshing = refreshAccessToken()
    const refreshed = await refreshing
    refreshing = null

    if (refreshed) {
      // Retry original request with new token
      const newToken = getToken()
      headers['Authorization'] = `Bearer ${newToken}`
      const retryRes = await fetch(fullUrl, { ...options, headers })
      if (retryRes.ok) {
        const retryJson = await retryRes.json()
        if (retryJson && typeof retryJson === 'object' && 'code' in retryJson && 'data' in retryJson) {
          return retryJson.data
        }
        return retryJson
      }
    }

    // Refresh failed, clear login state and redirect
    localStorage.removeItem('auth-storage')
    window.location.href = '/login'
    throw new Error('登录已过期')
  }

  const json = await res.json()
  if (!res.ok) {
    const err = new Error(json.detail || json.message || '请求失败') as any
    err.status = res.status
    err.data = json
    throw err
  }
  // Auto-unwrap unified response: if response has code and data fields, return data
  if (json && typeof json === 'object' && 'code' in json && 'data' in json) {
    return json.data
  }
  return json
}

export const get = <T = unknown>(url: string) => request<T>(url)
export const post = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, { method: 'POST', body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined })
export const put = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PUT', body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined })
export const del = <T = unknown>(url: string) => request<T>(url, { method: 'DELETE' })
export const patch = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PATCH', body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined })
