/**
 * 快速创建任务（点对点）
 */
const { post } = require('../../utils/request')

Page({
  data: {
    form: { type: '安装', customer: '', phone: '', address: '', orderNo: '', description: '', remark: '' },
    brands: ['某某品牌·某某系列', '某某品牌·某某系列', '某某品牌·某某系列'],
    brandIndex: -1,
    photos: [],
    submitting: false
  },

  selectType(e) { this.setData({ 'form.type': e.currentTarget.dataset.type }) },
  onInput(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  onBrandChange(e) { this.setData({ brandIndex: e.detail.value }) },

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

  async onSubmit() {
    const { form, photos } = this.data
    if (!form.type || !form.customer || !form.phone || !form.address) {
      return wx.showToast({ title: '请填写必要信息', icon: 'none' })
    }
    if (form.type === '维修' && !form.description) {
      return wx.showToast({ title: '请填写故障描述', icon: 'none' })
    }
    this.setData({ submitting: true })
    try {
      await post('/tasks/create', { ...form, photos })
      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {
      wx.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
