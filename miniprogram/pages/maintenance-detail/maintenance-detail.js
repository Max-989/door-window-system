/**
 * 维修工单详情（含责任划分审核）
 */
const { get, post } = require('../../utils/request')

Page({
  data: {
    id: '',
    item: {},
    isWorker: false,
    showResponsibility: false,
    responsibilityList: ['工厂', '物流', '安装', '量尺', '送货', '工地'],
    form: { siteDesc: '', respRemark: '' },
    photos: [],
    submitting: false
  },

  onLoad(options) {
    this.setData({ id: options.id })
    const role = wx.getStorageSync('role') || ''
    const workerRoles = ['量尺师傅', '安装师傅', '维修师傅', '送货师傅']
    const adminRoles = ['装企文员', '项目经理', '系统管理员', '管理员', '导购']
    this.setData({
      isWorker: workerRoles.includes(role),
      showResponsibility: adminRoles.includes(role)
    })
    this.loadDetail()
  },

  async loadDetail() {
    try {
      const item = await get(`/maintenance/${this.data.id}`)
      this.setData({ item: item || {} })
    } catch (e) {
      this.setData({ item: { id: this.data.id, status: '待派单', customer: '张先生', phone: '13812341234', address: '杭州市西湖区xxx小区', description: '木门关不上', createdAt: '2026-04-05', images: [] } })
    }
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value })
  },

  selectResp(e) {
    this.setData({ 'form.responsibility': e.currentTarget.dataset.value })
  },

  addPhoto() {
    const that = this
    wx.chooseImage({
      count: 9 - that.data.photos.length,
      success(res) { that.setData({ photos: [...that.data.photos, ...res.tempFilePaths] }) }
    })
  },

  delPhoto(e) {
    this.setData({ photos: this.data.photos.filter((_, i) => i !== e.currentTarget.dataset.index) })
  },

  previewImage(e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: e.currentTarget.dataset.urls })
  },

  callPhone() {
    wx.makePhoneCall({ phoneNumber: this.data.item.phone })
  },

  async onSubmitSite() {
    if (!this.data.form.siteDesc) return wx.showToast({ title: '请填写现场描述', icon: 'none' })
    if (this.data.photos.length === 0) return wx.showToast({ title: '请上传现场照片', icon: 'none' })
    this.setData({ submitting: true })
    try {
      await post(`/maintenance/${this.data.id}/site-report`, { siteDesc: this.data.form.siteDesc, photos: this.data.photos })
      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {
      wx.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  async onConfirmResp() {
    if (!this.data.form.responsibility) return wx.showToast({ title: '请选择责任方', icon: 'none' })
    this.setData({ submitting: true })
    try {
      await post(`/maintenance/${this.data.id}/responsibility`, { responsibility: this.data.form.responsibility, respRemark: this.data.form.respRemark })
      wx.showToast({ title: '已确认', icon: 'success' })
      this.loadDetail()
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  onCancel() {
    wx.navigateBack()
  }
})
