/**
 * 订单详情页
 */
const { get, post } = require('../../utils/request')

Page({
  data: {
    id: '',
    order: { products: [], tasks: [] },
    statusClass: 'tag-progress',
    showPrice: true,
    isCustomer: false,
    isClerk: false
  },

  onLoad(options) {
    this.setData({ id: options.id })
    const role = wx.getStorageSync('role') || ''
    this.setData({
      showPrice: role !== '客户',
      isCustomer: role === '客户',
      isClerk: role === '装企文员'
    })
    this.loadDetail()
  },

  async loadDetail() {
    try {
      const order = await get(`/orders/${this.data.id}`)
      this.setData({
        order,
        statusClass: this.getStatusClass(order.status)
      })
    } catch (e) {
      // mock for demo
      const order = {
        id: 'O001', orderNo: 'DD20260405001', status: '生产中', source: '品牌门店',
        brand: '某某品牌 · 某某系列', customer: '张先生', phone: '13812341234',
        address: '杭州市西湖区xxx小区3幢101', total: 15800, createdAt: '2026-04-01',
        productionStatus: 3,
        products: [
          { name: '木门（卧室）', spec: '2100×900mm', qty: 3, room: '主卧/次卧/书房' },
          { name: '合金门（卫生间）', spec: '2400×800mm 双开门定制', qty: 2, room: '卫生间/阳台' }
        ],
        tasks: [
          { id: 'T001', type: '安装', status: '已派单' }
        ]
      }
      this.setData({
        order,
        statusClass: this.getStatusClass(order.status)
      })
    }
  },

  getStatusClass(status) {
    const pendingStatuses = ['待确认', '已确认', '已发货', '已到货', '已派送', '待安装']
    if (pendingStatuses.indexOf(status) >= 0) return 'tag-pending'
    if (status === '已完成') return 'tag-done'
    if (status === '已取消') return 'tag-cancel'
    return 'tag-progress'
  },

  callPhone() { wx.makePhoneCall({ phoneNumber: this.data.order.phone }) },

  goToTask(e) {
    wx.navigateTo({ url: `/pages/task-detail/task-detail?id=${e.currentTarget.dataset.id}` })
  },

  async confirmOrder() {
    try {
      await post(`/orders/${this.data.id}/confirm`)
      wx.showToast({ title: '已确认', icon: 'success' })
      this.loadDetail()
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async confirmReceive() {
    wx.showModal({
      title: '确认收货', content: '确认安装完成吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await post(`/orders/${this.data.id}/receive`)
            wx.showToast({ title: '已确认', icon: 'success' })
            this.loadDetail()
          } catch (e) {
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  }
})
