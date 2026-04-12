/**
 * 门窗安装管理系统 - 小程序入口
 * 角色路由：登录后根据 identity + role 决定 tabBar 和页面权限
 */

App({
  onLaunch() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
      const identity = wx.getStorageSync('identity') || ''
      const role = wx.getStorageSync('role') || ''
      this.globalData.identity = identity
      this.globalData.role = role
      this.updateTabBar(identity, role)
    }
  },

  // 登录成功后调用，从 storage 读取后端返回的 identity + role
  checkRole() {
    const identity = wx.getStorageSync('identity') || ''
    const role = wx.getStorageSync('role') || ''
    this.globalData.identity = identity
    this.globalData.role = role
    this.updateTabBar(identity, role)
  },

  updateTabBar(identity, role) {
    let tabBarList = []

    if (identity === 'customer') {
      // 客户：首页 + 订单 + 我的
      tabBarList = [
        { pagePath: 'pages/index/index', text: '首页' },
        { pagePath: 'pages/order-list/order-list', text: '订单' },
        { pagePath: 'pages/profile/profile', text: '我的' }
      ]
    } else if (identity === 'contractor') {
      // 装企：首页 + 订单 + 我的
      tabBarList = [
        { pagePath: 'pages/index/index', text: '首页' },
        { pagePath: 'pages/order-list/order-list', text: '订单' },
        { pagePath: 'pages/profile/profile', text: '我的' }
      ]
    } else if (identity === 'partner') {
      // 乙方：首页 + 任务 + 订单 + 我的
      tabBarList = [
        { pagePath: 'pages/index/index', text: '首页' },
        { pagePath: 'pages/task-list/task-list', text: '任务' },
        { pagePath: 'pages/order-list/order-list', text: '订单' },
        { pagePath: 'pages/profile/profile', text: '我的' }
      ]
    }

    this.globalData.tabBarList = tabBarList
  },

  getTabBarConfig(identity, role) {
    this.updateTabBar(identity, role)
    const list = this.globalData.tabBarList.map(item => ({
      ...item,
      iconPath: `assets/tab/${this.getTabIcon(item.text)}.png`,
      selectedIconPath: `assets/tab/${this.getTabIcon(item.text)}-active.png`
    }))
    return list
  },

  getTabIcon(text) {
    const map = { '首页': 'home', '任务': 'task', '订单': 'order', '我的': 'profile', '团队': 'team', '维修': 'maintenance' }
    return map[text] || 'home'
  },

  globalData: {
    token: '',
    identity: '', // contractor / partner / customer
    role: '',
    userInfo: null,
    tabBarList: [],
    baseUrl: 'https://your-api-domain.com/api/v1',
    useMock: true
  }
})
