/**
 * 维修管理页（客户 + 管理员/文员 + 师傅）
 */
const { get, post } = require('../../utils/request')

Page({
  data: {
    list: [],
    displayList: [],
    activeTab: '全部',
    showCreateBtn: false
  },

  onShow() {
    const role = wx.getStorageSync('role') || ''
    const canCreate = ['客户', '装企文员', '项目经理', '导购'].indexOf(role) >= 0
    this.setData({ showCreateBtn: canCreate })
    this.loadList()
  },

  async loadList() {
    try {
      const list = await get('/maintenance/list')
      this.setData({
        list: (list || []).map(i => ({
          ...i,
          statusClass: this.getStatusClass(i.status)
        })),
        displayList: (list || []).map(i => ({
          ...i,
          statusClass: this.getStatusClass(i.status)
        }))
      })
    } catch (e) {
      const mock = [
        { id: 'M001', status: '已派单', description: '木门关不上', address: '杭州市西湖区xxx小区3幢101', createdAt: '2026-04-05', responsibility: '', statusClass: 'tag-progress' },
        { id: 'M002', status: '已完成', description: '合金门变形', address: '杭州市拱墅区xxx花园', createdAt: '2026-04-01', responsibility: '工厂', statusClass: 'tag-done' }
      ]
      this.setData({ list: mock, displayList: mock })
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    if (tab === '全部') {
      this.setData({ displayList: this.data.list })
    } else {
      this.setData({ displayList: this.data.list.filter(i => i.status === tab) })
    }
  },

  getStatusClass(s) {
    if (s === '待派单') return 'tag-pending'
    if (s === '已完成') return 'tag-done'
    if (s === '已取消') return 'tag-cancel'
    if (s === '部分完成') return 'tag-progress'
    return 'tag-progress'
  },

  createMaintenance() {
    wx.navigateTo({ url: '/pages/create-task/create-task?type=维修' })
  },

  goToDetail(e) {
    wx.navigateTo({ url: `/pages/maintenance-detail/maintenance-detail?id=${e.currentTarget.dataset.id}` })
  }
})
