/**
 * 任务列表页
 */
const { get, post } = require('../../utils/request')

Page({
  data: {
    activeTab: '全部',
    tasks: [],
    displayTasks: [],
    isWorker: false,
    showTypeFilter: false,
    types: ['全部类型', '量尺', '安装', '维修', '送货'],
    typeIndex: 0
  },

  onLoad(options) {
    if (options.status) this.setData({ activeTab: options.status })
    const role = wx.getStorageSync('role') || ''
    const workerRoles = ['量尺师傅', '安装师傅', '维修师傅', '送货师傅']
    const clerkRoles = ['装企文员', '项目经理', '导购']
    this.setData({
      isWorker: workerRoles.indexOf(role) >= 0,
      showTypeFilter: workerRoles.indexOf(role) >= 0 || clerkRoles.indexOf(role) >= 0
    })
    this.loadTasks()
  },

  onShow() { this.loadTasks() },

  onPullDownRefresh() {
    this.loadTasks().then(() => wx.stopPullDownRefresh())
  },

  async loadTasks() {
    try {
      const list = await get('/tasks')
      const tasks = (list || []).map(t => ({
        ...t,
        statusClass: this.getStatusClass(t.status)
      }))
      this.setData({ tasks, displayTasks: tasks })
    } catch (e) { console.log(e) }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.filterTasks()
  },

  onTypeChange(e) {
    this.setData({ typeIndex: e.detail.value })
    this.filterTasks()
  },

  filterTasks() {
    const { activeTab, typeIndex, types } = this.data
    let filtered = [...this.data.tasks]
    if (activeTab !== '全部') filtered = filtered.filter(t => t.status === activeTab)
    const type = types[typeIndex]
    if (type && type !== '全部类型') filtered = filtered.filter(t => t.type === type)
    this.setData({ displayTasks: filtered })
  },

  getStatusClass(status) {
    if (status === '待派单') return 'tag-pending'
    if (status === '已派单') return 'tag-pending'
    if (status === '已完成') return 'tag-done'
    if (status === '已取消') return 'tag-cancel'
    if (status === '部分完成') return 'tag-progress'
    return 'tag-progress'
  },

  goToDetail(e) {
    wx.navigateTo({ url: `/pages/task-detail/task-detail?id=${e.currentTarget.dataset.id}` })
  },

  async onAccept(e) {
    const id = e.currentTarget.dataset.id
    try {
      await post(`/tasks/${id}/accept`)
      wx.showToast({ title: '已接单', icon: 'success' })
      this.loadTasks()
    } catch (err) { console.log(err) }
  },

  onReject(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认拒单',
      content: '确定要拒绝此任务吗？',
      success: (res) => {
        if (res.confirm) {
          post(`/tasks/${id}/reject`).then(() => {
            wx.showToast({ title: '已拒单', icon: 'success' })
            this.loadTasks()
          }).catch(err => console.log(err))
        }
      }
    })
  }
})
