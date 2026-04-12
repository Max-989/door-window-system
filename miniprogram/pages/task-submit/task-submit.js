/**
 * 提交完工报告
 */
const { get, post, uploadImage } = require('../../utils/request')

Page({
  data: {
    id: '',
    task: {},
    form: { qty: '', extraRemark: '', remark: '', completeType: 'full', partialReason: '' },
    photos: [],
    rooms: [],
    extras: [],
    isInstall: false,
    measurementImages: [],
    deliveryImages: [],
    submitting: false
  },

  onLoad(options) {
    this.setData({ id: options.id })
    this.loadTask()
  },

  async loadTask() {
    try {
      const task = await get(`/tasks/${this.data.id}`)
      const isInstall = task.type === '安装'
      const rooms = (task.products || []).map(p => ({ room: p.room, name: p.name, qty: p.qty || 1 }))
      this.setData({
        task,
        isInstall,
        rooms,
        'form.qty': String(task.products ? task.products.reduce((s, p) => s + (p.qty || 0), 0) : ''),
        measurementImages: task.measurementImages || [],
        deliveryImages: task.deliveryImages || []
      })
    } catch (e) { console.log(e) }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  selectCompleteType(e) {
    this.setData({ 'form.completeType': e.currentTarget.dataset.type })
  },

  onRoomQtyChange(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({ [`rooms[${idx}].qty`]: e.detail.value })
  },

  addExtra() {
    this.setData({ extras: [...this.data.extras, { name: '', qty: '', desc: '' }] })
  },

  removeExtra(e) {
    this.setData({ extras: this.data.extras.filter((_, i) => i !== e.currentTarget.dataset.index) })
  },

  onExtraInput(e) {
    const { index, field } = e.currentTarget.dataset
    this.setData({ [`extras[${index}].${field}`]: e.detail.value })
  },

  addPhoto() {
    const that = this
    wx.chooseImage({
      count: 9 - that.data.photos.length,
      success(res) {
        that.setData({ photos: [...that.data.photos, ...res.tempFilePaths] })
      }
    })
  },

  deletePhoto(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({ photos: this.data.photos.filter((_, i) => i !== idx) })
  },

  previewPhoto(e) {
    wx.previewImage({ current: this.data.photos[e.currentTarget.dataset.index], urls: this.data.photos })
  },

  previewImage(e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: e.currentTarget.dataset.urls })
  },

  goToOrder() {
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${this.data.task.orderId}` })
  },

  async onSubmit() {
    if (!this.data.form.qty) return wx.showToast({ title: '请填写安装数量', icon: 'none' })
    if (this.data.photos.length === 0) return wx.showToast({ title: '请上传现场照片', icon: 'none' })
    if (this.data.form.completeType === 'partial' && !this.data.form.partialReason) {
      return wx.showToast({ title: '请填写未完成原因', icon: 'none' })
    }

    this.setData({ submitting: true })
    try {
      // 上传所有图片
      const uploadedPhotos = []
      for (const tempPath of this.data.photos) {
        const url = await uploadImage(tempPath, { showLoading: false })
        uploadedPhotos.push(url)
      }

      await post(`/tasks/${this.data.id}/complete`, {
        qty: this.data.form.qty,
        extraRemark: this.data.form.extraRemark,
        remark: this.data.form.remark,
        rooms: this.data.rooms,
        extras: this.data.extras,
        photos: uploadedPhotos,
        completeType: this.data.form.completeType,
        partialReason: this.data.form.partialReason
      })
      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {
      wx.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
