/**
 * 个人中心页
 */
const { get } = require('../../utils/request')
const { logout } = require('../../utils/auth')

Page({
  data: {
    userInfo: {},
    role: '',
    isWorker: false,
    isForeman: false,
    isClerk: false,
    showWorkerInfo: false,
    salary: { monthly: 5800, balance: 35800, taskCount: 18 },
    teamInfo: { memberCount: 5, todayTasks: 8, monthCommission: 3200 }
  },

  onShow() {
    const role = wx.getStorageSync('role') || ''
    const userInfo = wx.getStorageSync('userInfo') || {}
    const workerRoles = ['量尺师傅', '安装师傅', '维修师傅', '送货师傅']
    const isWorker = workerRoles.includes(role)
    const isForeman = role === '工头'
    const isClerk = role === '装企文员'
    this.setData({
      userInfo, role, isWorker, isForeman, isClerk,
      showWorkerInfo: isWorker || isForeman,
      'userInfo.avatar': userInfo.avatar || ''
    })
    if (isWorker || isForeman) this.loadSalary()
    if (isForeman) this.loadTeamInfo()
  },

  async loadSalary() {
    try {
      const data = await get('/worker/salary')
      this.setData({
        salary: data || this.data.salary
      })
    } catch (e) { /* use mock */ }
  },

  async loadTeamInfo() {
    try {
      const data = await get('/foreman/team-info')
      this.setData({ teamInfo: data || this.data.teamInfo })
    } catch (e) { /* use mock */ }
  },

  viewSalaryDetail() {
    wx.showToast({ title: '工资详情即将开放', icon: 'none' })
  },

  viewTeam() {
    wx.navigateTo({ url: '/pages/team/team' })
  },

  viewCommission() {
    wx.navigateTo({ url: '/pages/team/team?tab=commission' })
  },

  goToOrders() {
    wx.switchTab({ url: '/pages/order-list/order-list' })
  },

  goToMaintenance() {
    wx.navigateTo({ url: '/pages/maintenance/maintenance' })
  },

  editInfo() {
    wx.showToast({ title: '个人信息编辑即将开放', icon: 'none' })
  },

  editBankCard() {
    wx.showModal({
      title: '银行卡号',
      editable: true,
      placeholderText: '请输入银行卡号',
      content: wx.getStorageSync('bankCard') || '',
      success(res) {
        if (res.confirm && res.content) {
          wx.setStorageSync('bankCard', res.content)
          wx.showToast({ title: '保存成功', icon: 'success' })
        }
      }
    })
  },

  bindPhone() {
    wx.showToast({ title: '请到登录页绑定', icon: 'none' })
  },

  about() {
    wx.showModal({ title: '关于', content: '门窗安装管理系统 v1.0.0', showCancel: false })
  },

  logout() {
    wx.showModal({
      title: '提示', content: '确认退出登录吗？',
      success(res) {
        if (res.confirm) logout()
      }
    })
  }
})
