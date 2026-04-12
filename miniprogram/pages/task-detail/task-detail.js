/**
 * 任务详情页
 */
const { get, post } = require('../../utils/request')

Page({
  data: {
    id: '',
    task: { products: [], images: [] },
    statusClass: 'tag-progress',
    canSubmit: false,
    canAccept: false,
    canUpload: false,
    isInstallTask: false
  },

  onLoad(options) {
    this.setData({ id: options.id })
    this.loadDetail()
  },

  async loadDetail() {
    try {
      const task = await get(`/tasks/${this.data.id}`)
      const role = wx.getStorageSync('role')
      const workerRoles = ['量尺师傅', '安装师傅', '维修师傅', '送货师傅']
      const isWorker = workerRoles.indexOf(role) >= 0

      this.setData({
        task: task || {},
        statusClass: this.getStatusClass(task.status),
        canSubmit: isWorker && task.status === '已派单',
        canAccept: isWorker && task.status === '已派单',
        canUpload: isWorker,
        isInstallTask: task.type === '安装'
      })
    } catch (e) { console.log(e) }
  },

  getStatusClass(status) {
    if (status === '待派单') return 'tag-pending'
    if (status === '已派单') return 'tag-pending'
    if (status === '已完成') return 'tag-done'
    if (status === '已取消') return 'tag-cancel'
    if (status === '部分完成') return 'tag-progress'
    return 'tag-progress'
  },

  callPhone() {
    wx.makePhoneCall({ phoneNumber: this.data.task.phone })
  },

  previewImage(e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: e.currentTarget.dataset.urls })
  },

  uploadImage() {
    const that = this
    wx.chooseImage({
      count: 9,
      success(res) {
        const images = [...that.data.task.images, ...res.tempFilePaths]
        that.setData({ 'task.images': images })
      }
    })
  },

  goToSubmit() {
    wx.navigateTo({ url: `/pages/task-submit/task-submit?id=${this.data.id}` })
  },

  goToOrder() {
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${this.data.task.orderId}` })
  },

  async onAccept() {
    await post(`/tasks/${this.data.id}/accept`)
    wx.showToast({ title: '已接单', icon: 'success' })
    this.loadDetail()
  },

  async onReject() {
    wx.showModal({
      title: '确认拒单', content: '确认拒绝吗？',
      success: (res) => {
        if (res.confirm) {
          post(`/tasks/${this.data.id}/reject`).then(() => {
            wx.showToast({ title: '已拒单', icon: 'success' })
            wx.navigateBack()
          })
        }
      }
    })
  }
})
