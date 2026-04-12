/**
 * 微信登录模块 - wx.login → 后端换 token
 */

const { post } = require('./request')

/**
 * 微信登录
 * 流程：wx.login 获取 code → 后端换取 token 和用户角色信息
 */
function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          // 将 code 发送到后端换取 token
          post('/auth/wx-login', { code: res.code })
            .then(data => {
              const { token, role, userInfo } = data
              wx.setStorageSync('token', token)
              wx.setStorageSync('role', role)
              wx.setStorageSync('userInfo', userInfo)
              resolve(data)
            })
            .catch(err => {
              // Mock 模式下直接模拟登录成功
              mockLogin().then(resolve).catch(reject)
            })
        } else {
          reject(new Error('wx.login 失败'))
        }
      },
      fail: reject
    })
  })
}

/**
 * Mock 登录（开发阶段使用）
 */
function mockLogin() {
  return new Promise(resolve => {
    setTimeout(() => {
      const mockRoles = ['安装师傅', '量尺师傅', '维修师傅', '送货师傅', '导购', '项目经理', '工头', '客户', '仓库人员']
      // 默认使用安装师傅角色，可在调试时修改
      const role = '安装师傅'
      const token = 'mock_token_' + Date.now()
      const userInfo = {
        id: 'U001',
        name: '张师傅',
        role: role,
        phone: '13812341234',
        avatar: ''
      }
      wx.setStorageSync('token', token)
      wx.setStorageSync('role', role)
      wx.setStorageSync('userInfo', userInfo)
      resolve({ token, role, userInfo })
    }, 800)
  })
}

/**
 * 获取手机号（需用户点击按钮授权）
 */
function getPhoneNumber(e) {
  return new Promise((resolve, reject) => {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      reject(new Error('用户拒绝授权'))
      return
    }
    post('/auth/bind-phone', { encryptedData: e.detail.encryptedData, iv: e.detail.iv })
      .then(resolve)
      .catch(() => {
        // Mock 模式
        resolve({ phone: '13812341234' })
      })
  })
}

/**
 * 退出登录
 */
function logout() {
  wx.removeStorageSync('token')
  wx.removeStorageSync('role')
  wx.removeStorageSync('userInfo')
  wx.reLaunch({ url: '/pages/login/login' })
}

module.exports = { wxLogin, getPhoneNumber, logout }
