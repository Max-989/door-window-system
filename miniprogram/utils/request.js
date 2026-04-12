/**
 * HTTP 请求封装 - 对接 /api/v1/
 */

const app = getApp()

// 是否使用 Mock 数据（API 未对接时为 true）
const USE_MOCK = app.globalData.useMock !== undefined ? app.globalData.useMock : true

// Mock 数据
const mockData = {
  // 任务列表
  'GET /tasks': {
    code: 200,
    data: [
      { id: 'T001', type: '安装', status: '已派单', customer: '张先生', address: '杭州市西湖区xxx小区3栋501', phone: '138****1234', createdAt: '2026-04-05 10:00', products: '木门×3,合金门×2' },
      { id: 'T002', type: '量尺', status: '待派单', customer: '李女士', address: '杭州市拱墅区xxx花园1单元302', phone: '139****5678', createdAt: '2026-04-05 14:30', products: '防盗门×1' },
      { id: 'T003', type: '维修', status: '已完成', customer: '王先生', address: '杭州市滨江区xxx公寓2栋801', phone: '137****9012', createdAt: '2026-04-04 09:00', products: '木门维修' }
    ]
  },
  // 订单列表
  'GET /orders': {
    code: 200,
    data: [
      { id: 'O001', orderNo: 'DD20260405001', status: '已派送', customer: '张先生', address: '杭州市西湖区xxx小区3栋501', total: 15800, products: '木门×3,合金门×2', createdAt: '2026-04-01' },
      { id: 'O002', orderNo: 'DD20260403002', status: '生产中', customer: '李女士', address: '杭州市拱墅区xxx花园1单元302', total: 8900, products: '防盗门×1', createdAt: '2026-03-30' }
    ]
  },
  // 任务详情
  'GET /tasks/T001': {
    code: 200,
    data: { id: 'T001', type: '安装', status: '已派单', customer: '张先生', address: '杭州市西湖区xxx小区3栋501', phone: '13812341234', products: [{ name: '木门', spec: '2100×900mm', qty: 3, room: '主卧' }, { name: '合金门', spec: '2400×800mm', qty: 2, room: '阳台' }], orderNo: 'DD20260405001', images: [], remark: '注意保护墙面' }
  },
  // 用户信息
  'GET /user/me': {
    code: 200,
    data: { id: 'U001', name: '张师傅', role: '安装师傅', phone: '13812341234', avatar: '', balance: 3580.00, monthlyIncome: 5800.00 }
  },
  // 登录
  'POST /auth/login': {
    code: 200,
    data: { token: 'mock_token', identity: 'partner', role: '安装师傅', user: { id: 'U001', name: '张师傅', phone: '13812341234', identity: 'partner' } }
  },
  // 上传文件
  'POST /upload': {
    code: 200,
    data: { url: 'https://example.com/uploaded.jpg' }
  }
}

/**
 * 封装请求方法
 * @param {Object} options 请求配置
 * @param {string} options.url 接口路径（如 /tasks）
 * @param {string} options.method 请求方法
 * @param {Object} options.data 请求数据
 * @param {boolean} options.showLoading 是否显示 loading
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const { url, method = 'GET', data = {}, showLoading = true } = options

    if (showLoading) {
      wx.showLoading({ title: '加载中...', mask: true })
    }

    if (USE_MOCK) {
      // Mock 模式
      setTimeout(() => {
        if (showLoading) wx.hideLoading()
        const mockKey = `${method} ${url}`
        const result = mockData[mockKey] || { code: 200, data: {} }
        if (result.code === 200) {
          resolve(result.data)
        } else {
          reject(result)
        }
      }, 600)
      return
    }

    // 真实请求
    wx.request({
      url: app.globalData.baseUrl + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + app.globalData.token
      },
      success(res) {
        if (showLoading) wx.hideLoading()
        if (res.statusCode === 200 && res.data.code === 200) {
          resolve(res.data.data)
        } else if (res.statusCode === 401) {
          // token 过期，重新登录
          wx.removeStorageSync('token')
          wx.removeStorageSync('role')
          wx.redirectTo({ url: '/pages/login/login' })
          reject(new Error('登录已过期'))
        } else {
          wx.showToast({ title: res.data.message || '请求失败', icon: 'none' })
          reject(res.data)
        }
      },
      fail(err) {
        if (showLoading) wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      }
    })
  })
}

// 快捷方法
function get(url, data) { return request({ url, method: 'GET', data }) }
function post(url, data) { return request({ url, method: 'POST', data }) }
function put(url, data) { return request({ url, method: 'PUT', data }) }
function del(url, data) { return request({ url, method: 'DELETE', data }) }

// 上传图片
function uploadImage(tempFilePath, options = {}) {
  return new Promise((resolve, reject) => {
    const { showLoading = true } = options

    if (showLoading) {
      wx.showLoading({ title: '上传中...', mask: true })
    }

    if (USE_MOCK) {
      // Mock 模式
      setTimeout(() => {
        if (showLoading) wx.hideLoading()
        const mockKey = 'POST /upload'
        const result = mockData[mockKey] || { code: 200, data: { url: 'https://example.com/uploaded.jpg' } }
        if (result.code === 200) {
          resolve(result.data.url)
        } else {
          reject(result)
        }
      }, 600)
      return
    }

    // 真实上传
    wx.uploadFile({
      url: app.globalData.baseUrl + '/upload',
      filePath: tempFilePath,
      name: 'file',
      header: {
        'Authorization': 'Bearer ' + app.globalData.token
      },
      success(res) {
        if (showLoading) wx.hideLoading()
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data)
            if (data.code === 200) {
              resolve(data.data.url)
            } else {
              wx.showToast({ title: data.message || '上传失败', icon: 'none' })
              reject(data)
            }
          } catch (e) {
            wx.showToast({ title: '解析响应失败', icon: 'none' })
            reject(e)
          }
        } else if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          wx.removeStorageSync('role')
          wx.redirectTo({ url: '/pages/login/login' })
          reject(new Error('登录已过期'))
        } else {
          wx.showToast({ title: '上传失败', icon: 'none' })
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      },
      fail(err) {
        if (showLoading) wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      }
    })
  })
}

module.exports = { request, get, post, put, del, uploadImage }
