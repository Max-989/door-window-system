/**
 * 订单列表页
 */
const { get } = require('../../utils/request')

Page({
  data: {
    orders: [],
    displayOrders: [],
    activeTab: '全部',
    keyword: '',
    showPrice: true,
    isClerk: false
  },

  onLoad() {
    const role = wx.getStorageSync('role') || ''
    this.setData({
      showPrice: role !== '客户',
      isClerk: role === '装企文员'
    })
  },

  onShow() { this.loadOrders() },
  onPullDownRefresh() { this.loadOrders().then(() => wx.stopPullDownRefresh()) },

  async loadOrders() {
    try {
      const list = await get('/orders')
      const orders = (list || []).map(o => ({
        ...o,
        statusClass: this.getStatusClass(o.status)
      }))
      this.setData({ orders, displayOrders: orders })
    } catch (e) {
      // mock data for demo
      const mock = [
        { id: 'O001', orderNo: 'DD20260405001', status: '生产中', customer: '张先生', address: '杭州市西湖区xxx小区3幢101', total: 15800, createdAt: '2026-04-01', products: '木门×3 合金门×2', statusClass: 'tag-progress' },
        { id: 'O002', orderNo: 'DD20260405002', status: '待安装', customer: '李女士', address: '杭州市拱墅区xxx花园', total: 22000, createdAt: '2026-04-02', products: '防盗门×1 木门×4', statusClass: 'tag-pending' },
        { id: 'O003', orderNo: 'DD20260405003', status: '已完成', customer: '王先生', address: '杭州市滨江区xxx公寓', total: 8500, createdAt: '2026-03-20', products: '合金门×2', statusClass: 'tag-done' }
      ]
      this.setData({ orders: mock, displayOrders: mock })
    }
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
    this.filterOrders()
  },

  onSearch(e) { this.setData({ keyword: e.detail.value }) },
  doSearch() { this.filterOrders() },

  filterOrders() {
    const { activeTab, keyword, orders } = this.data
    let list = [...orders]
    if (activeTab !== '全部') list = list.filter(o => o.status === activeTab)
    if (keyword) list = list.filter(o => o.orderNo.includes(keyword) || o.customer.includes(keyword))
    this.setData({ displayOrders: list })
  },

  getStatusClass(status) {
    const pendingStatuses = ['待确认', '已确认', '已发货', '已到货', '已派送', '待安装']
    if (pendingStatuses.indexOf(status) >= 0) return 'tag-pending'
    if (status === '已完成') return 'tag-done'
    if (status === '已取消') return 'tag-cancel'
    return 'tag-progress'
  },

  goToDetail(e) {
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${e.currentTarget.dataset.id}` })
  }
})
