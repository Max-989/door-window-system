/**
 * 注册页逻辑 - 三种注册流程（装企 / 乙方 / 客户）
 */
const USE_MOCK = true

// Mock 注册API
function mockRegister(data) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        code: 0,
        data: {
          token: 'mock_token_' + Date.now(),
          userId: 'mock_user_' + Date.now()
        }
      })
    }, 800)
  })
}

Page({
  data: {
    loading: false,
    selectedIdentity: 0, // 0=装企, 1=乙方, 2=客户
    // 通用字段
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    verifyCode: '',
    codeCountdown: 0,
    // 装企专属
    role: '项目经理',
    companyName: '',
    brandName: '',
    agreed: false
  },

  // 选择身份
  onSelectIdentity(e) {
    this.setData({
      selectedIdentity: e.currentTarget.dataset.index,
      role: '项目经理',
      companyName: '',
      brandName: '',
      verifyCode: ''
    })
  },

  // 选择角色（仅装企）
  onSelectRole(e) {
    this.setData({ role: e.currentTarget.dataset.role })
  },

  // 获取验证码（客户）
  onGetCode() {
    if (this.data.codeCountdown > 0) return
    if (!this.data.phone || this.data.phone.length !== 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    wx.showToast({ title: '验证码已发送', icon: 'success' })
    this.setData({ codeCountdown: 60 })
    this._codeTimer = setInterval(() => {
      const c = this.data.codeCountdown - 1
      this.setData({ codeCountdown: c })
      if (c <= 0) clearInterval(this._codeTimer)
    }, 1000)
  },

  // 输入事件
  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }) },
  onPasswordInput(e) { this.setData({ password: e.detail.value }) },
  onConfirmPasswordInput(e) { this.setData({ confirmPassword: e.detail.value }) },
  onCodeInput(e) { this.setData({ verifyCode: e.detail.value }) },
  onCompanyNameInput(e) { this.setData({ companyName: e.detail.value }) },
  onBrandNameInput(e) { this.setData({ brandName: e.detail.value }) },
  onAgreeChange(e) { this.setData({ agreed: e.detail.value.length > 0 }) },

  // 校验手机号
  isValidPhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone)
  },

  // 表单校验
  validate() {
    const { name, phone, password, confirmPassword, verifyCode, selectedIdentity, companyName, brandName } = this.data

    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' }); return false
    }
    if (!phone || !this.isValidPhone(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' }); return false
    }

    // 装企/乙方需要密码
    if (selectedIdentity !== 2) {
      if (!password) {
        wx.showToast({ title: '请输入密码', icon: 'none' }); return false
      }
      if (password.length < 6) {
        wx.showToast({ title: '密码不少于6位', icon: 'none' }); return false
      }
      if (password !== confirmPassword) {
        wx.showToast({ title: '两次密码不一致', icon: 'none' }); return false
      }
    }

    // 装企需要角色和装企信息
    if (selectedIdentity === 0) {
      if (!companyName.trim()) {
        wx.showToast({ title: '请输入装企名称', icon: 'none' }); return false
      }
      if (!brandName.trim()) {
        wx.showToast({ title: '请输入品牌名称', icon: 'none' }); return false
      }
    }

    // 客户需要验证码
    if (selectedIdentity === 2) {
      if (!verifyCode) {
        wx.showToast({ title: '请输入验证码', icon: 'none' }); return false
      }
    }

    return true
  },

  // 注册
  async onRegister() {
    if (this.data.loading) return
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' })
      return
    }
    if (!this.validate()) return

    this.setData({ loading: true })

    try {
      const { selectedIdentity, name, phone, password, verifyCode, role, companyName, brandName } = this.data

      // 构建请求参数
      let params
      if (selectedIdentity === 0) {
        // 装企注册
        params = { type: 'contractor', name, phone, password, role, companyName, brandName }
      } else if (selectedIdentity === 1) {
        // 乙方注册
        params = { type: 'partner', name, phone, password }
      } else {
        // 客户注册
        params = { type: 'customer', name, phone, verifyCode }
      }

      let res
      if (USE_MOCK) {
        res = await mockRegister(params)
      } else {
        // TODO: 对接后端注册API
        // res = await wx.request({ url: '...', method: 'POST', data: params })
      }

      if (res.code === 0) {
        // 乙方：待审核
        if (selectedIdentity === 1) {
          wx.showModal({
            title: '注册成功',
            content: '您的账号正在等待管理员审核，审核通过后即可登录',
            showCancel: false,
            confirmText: '我知道了',
            success: () => {
              wx.navigateBack()
            }
          })
          return
        }

        // 装企/客户：自动登录
        wx.setStorageSync('token', res.data.token)
        wx.setStorageSync('identity', params.type)
        wx.setStorageSync('role', params.type === 'customer' ? '客户' : role)

        const app = getApp()
        app.globalData.identity = params.type
        app.globalData.role = params.type === 'customer' ? '客户' : role

        wx.showToast({ title: '注册成功', icon: 'success' })
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' })
        }, 500)
      } else {
        wx.showToast({ title: res.msg || '注册失败', icon: 'none' })
      }
    } catch (err) {
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 查看协议
  onViewAgreement() {
    wx.showToast({ title: '协议页面待接入', icon: 'none' })
  },

  // 跳转登录
  goToLogin() {
    wx.navigateBack()
  },

  onUnload() {
    if (this._codeTimer) clearInterval(this._codeTimer)
  }
})
