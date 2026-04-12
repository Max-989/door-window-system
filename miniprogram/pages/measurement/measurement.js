/**
 * 量尺预约页面（导购/项目经理使用）
 */
const { post } = require('../../utils/request')

Page({
  data: {
    form: { customer: '', phone: '', address: '', remark: '' },
    stores: ['门店A', '门店B', '门店C'],
    storeIndex: 0,
    doorTypes: ['木门', '合金门（平开门）', '合金门（推拉门）', '防盗门'],
    rooms: [{ room: '', doorType: '', qty: '1' }],
    creator: '',
    submitting: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    this.setData({ creator: userInfo.name || '' })
  },

  onInput(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  onStoreChange(e) { this.setData({ storeIndex: e.detail.value }) },

  onRoomInput(e) {
    const { index, field } = e.currentTarget.dataset
    this.setData({ [`rooms[${index}].${field}`]: e.detail.value })
  },

  onDoorTypeChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ [`rooms[${index}].doorType`]: this.data.doorTypes[e.detail.value] })
  },

  addRoom() {
    this.setData({ rooms: [...this.data.rooms, { room: '', doorType: '', qty: '1' }] })
  },

  removeRoom(e) {
    this.setData({ rooms: this.data.rooms.filter((_, i) => i !== e.currentTarget.dataset.index) })
  },

  async onSubmit() {
    const { form, rooms } = this.data
    if (!form.customer || !form.phone || !form.address) {
      return wx.showToast({ title: '请填写必要信息', icon: 'none' })
    }
    const validRooms = rooms.filter(r => r.room && r.doorType)
    if (validRooms.length === 0) {
      return wx.showToast({ title: '请至少填写一个房间', icon: 'none' })
    }
    this.setData({ submitting: true })
    try {
      await post('/measurement/create', { ...form, store: this.data.stores[this.data.storeIndex], rooms: validRooms })
      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {
      wx.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
