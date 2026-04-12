const BASE_URL = '/api/v1'

function getToken(): string | null {
  try {
    const auth = JSON.parse(localStorage.getItem('auth-storage') || '{}')
    return auth?.state?.token || null
  } catch {
    return null
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
    // Token 过期，清除登录状态
    localStorage.removeItem('auth-storage')
    window.location.href = '/login'
    throw new Error('登录已过期')
  }

  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.detail || '请求失败') as any
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const get = <T = unknown>(url: string) => request<T>(url)
export const post = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, { method: 'POST', body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined })
export const put = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PUT', body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined })
export const del = <T = unknown>(url: string) => request<T>(url, { method: 'DELETE' })
export const patch = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PATCH', body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined })
