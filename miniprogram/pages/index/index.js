/**
 * 首页逻辑 - 根据 identity + role 显示不同内容
 */
const { get } = require('../../utils/request')

Page({
  data: {
    userInfo: {},
    role: '',
    identity: '',
    // 身份判断
    isWorker: false,
    isCompany: false,
    isCustomer: false,
    isForeman: false,
    isAdmin: false,
    isWarehouse: false,
    // 装企首页菜单
    contractorMenus: [
      { icon: '📦', text: '我的订单', action: 'goToOrders' },
      { icon: '🔧', text: '提交安装需求', action: 'goToCreateTask' },
      { icon: '🛠', text: '提交维修需求', action: 'goToMaintenance' }
    ],
    // 乙方管理类菜单
    adminMenus: [
      { icon: '📋', text: '待办任务', action: 'goToTask' },
      { icon: '📦', text: '订单管理', action: 'goToOrders' },
      { icon: '👥', text: '人员管理', action: 'goToTeam' }
    ],
    // 乙方师傅菜单
    workerMenus: [
      { icon: '📋', text: '待办任务', action: 'goToTask' },
      { icon: '✅', text: '提交完工', action: 'goToTaskSubmit' }
    ],
    // 仓库菜单
    warehouseMenus: [
      { icon: '📋', text: '库存待办', action: 'goToTask' },
      { icon: '📊', text: '盘点', action: 'goToMeasurement' }
    ],
    // 工头菜单
    foremanMenus: [
      { icon: '📋', text: '本组任务', action: 'goToTask' },
      { icon: '👥', text: '团队管理', action: 'goToTeam' }
    ],
    // 客户菜单
    customerMenus: [
      { icon: '📦', text: '我的订单', action: 'goToOrders' },
      { icon: '📈', text: '订单进度', action: 'goToOrders' }
    ],
    // 当前显示的菜单
    currentMenus: [],
    stats: { pending: 2, assigned: 3, progress: 1, done: 15 },
    recentTasks: []
  },

  onShow() {
    const identity = wx.getStorageSync('identity') || ''
    const role = wx.getStorageSync('role') || ''
    const userInfo = wx.getStorageSync('userInfo') || {}

    const workerRoles = ['量尺师傅', '安装师傅', '维修师傅', '送货师傅']
    const adminRoles = ['管理员', '文员', '装企文员']

    this.setData({
      role,
      identity,
      userInfo,
      isWorker: workerRoles.includes(role),
      isCompany: identity === 'contractor',
      isCustomer: identity === 'customer',
      isForeman: role === '工头',
      isAdmin: adminRoles.includes(role),
      isWarehouse: role === '仓库人员'
    })

    // 根据 identity + role 选择菜单
    let menus = []
    if (identity === 'customer') {
      menus = this.data.customerMenus
    } else if (identity === 'contractor') {
      menus = this.data.contractorMenus
    } else if (identity === 'partner') {
      if (adminRoles.includes(role)) {
        menus = this.data.adminMenus
      } else if (role === '仓库人员') {
        menus = this.data.warehouseMenus
      } else if (role === '工头') {
        menus = this.data.foremanMenus
      } else {
        menus = this.data.workerMenus
      }
    }
    this.setData({ currentMenus: menus })

    this.loadRecentTasks()
  },

  async loadRecentTasks() {
    try {
      const list = await get('/tasks')
      const recentTasks = (list || []).map(item => ({
        ...item,
        statusClass: this.getStatusClass(item.status)
      }))
      this.setData({ recentTasks: recentTasks.slice(0, 5) })
    } catch (e) { console.log(e) }
  },

  getStatusClass(status) {
    if (status.includes('待')) return 'tag-pending'
    if (status.includes('完')) return 'tag-done'
    if (status.includes('取消')) return 'tag-cancel'
    return 'tag-progress'
  },

  // 菜单统一跳转
  onMenuTap(e) {
    const action = e.currentTarget.dataset.action
    if (this[action]) this[action]()
  },

  goToTask(e) {
    const status = e.currentTarget.dataset ? e.currentTarget.dataset.status : ''
    wx.navigateTo({ url: `/pages/task-list/task-list${status ? '?status=' + status : ''}` })
  },
  goToTaskSubmit() { wx.navigateTo({ url: '/pages/task-submit/task-submit' }) },
  goToTeam() { wx.navigateTo({ url: '/pages/team/team' }) },
  goToCreateTask() { wx.navigateTo({ url: '/pages/create-task/create-task' }) },
  goToMeasurement() { wx.navigateTo({ url: '/pages/measurement/measurement' }) },
  goToOrders() { wx.switchTab({ url: '/pages/order-list/order-list' }) },
  goToMaintenance() { wx.navigateTo({ url: '/pages/maintenance/maintenance' }) },
  goToTaskDetail(e) {
    wx.navigateTo({ url: `/pages/task-detail/task-detail?id=${e.currentTarget.dataset.id}` })
  }
})
