/**
 * 登录页逻辑 - 统一登录，后端返回身份和角色
 */
const app = getApp()
const { post } = require('../../utils/request')

Page({
  data: {
    loading: false,
    loginMode: 'password', // password | code
    phone: '',
    password: '',
    verifyCode: '',
    codeCountdown: 0,
    agreed: false,
    showPassword: false
  },

  onLoad() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.navigateToIndex()
    }
  },

  // 切换登录方式
  onSwitchLoginMode() {
    this.setData({ loginMode: this.data.loginMode === 'password' ? 'code' : 'password' })
  },

  // 显示/隐藏密码
  onTogglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  // 获取验证码
  onGetCode() {
    if (this.data.codeCountdown > 0) return
    if (!this.data.phone || this.data.phone.length < 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    // TODO: 调用后端发送验证码接口
    wx.showToast({ title: '验证码已发送', icon: 'success' })
    this.setData({ codeCountdown: 60 })
    const timer = setInterval(() => {
      const c = this.data.codeCountdown - 1
      this.setData({ codeCountdown: c })
      if (c <= 0) clearInterval(timer)
    }, 1000)
  },

  // 输入事件
  onPhoneInput(e) { this.setData({ phone: e.detail.value }) },
  onPasswordInput(e) { this.setData({ password: e.detail.value }) },
  onCodeInput(e) { this.setData({ verifyCode: e.detail.value }) },

  // 登录
  async onLogin() {
    if (this.data.loading) return
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' })
      return
    }

    if (!this.data.phone || this.data.phone.length < 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' }); return
    }

    if (this.data.loginMode === 'password') {
      if (!this.data.password) {
        wx.showToast({ title: '请输入密码', icon: 'none' }); return
      }
    } else {
      if (!this.data.verifyCode) {
        wx.showToast({ title: '请输入验证码', icon: 'none' }); return
      }
    }

    this.setData({ loading: true })
    try {
      // 调用后端登录接口，返回 { token, identity, role, ... }
      const data = await post('/auth/login', this.data.loginMode === 'password'
        ? { phone: this.data.phone, password: this.data.password }
        : { phone: this.data.phone, code: this.data.verifyCode })

      const { token, identity, role } = data
      wx.setStorageSync('token', token)
      wx.setStorageSync('identity', identity)
      wx.setStorageSync('role', role)
      app.globalData.token = token
      app.globalData.identity = identity
      app.globalData.role = role
      app.checkRole()

      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => this.navigateToIndex(), 500)
    } catch (err) {
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  navigateToIndex() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onAgreeChange(e) {
    this.setData({ agreed: e.detail.value.length > 0 })
  },

  goToRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  },

  onRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  }
})
