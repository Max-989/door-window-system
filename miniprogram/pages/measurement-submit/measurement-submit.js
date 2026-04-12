/**
 * 量尺师傅提交量尺结果
 */
const { get, post, uploadImage } = require('../../utils/request')

Page({
  data: {
    id: '',
    task: {},
    doorTypes: ['木门', '合金门（平开门）', '合金门（推拉门）', '防盗门', '卫生间门', '其他'],
    rooms: [{ room: '', doorType: '', typeIndex: 0, qty: '1', width: '', height: '', remark: '' }],
    photos: [],
    form: { remark: '' },
    submitting: false
  },

  onLoad(options) {
    this.setData({ id: options.id })
    this.loadTask()
  },

  async loadTask() {
    try {
      const task = await get(`/tasks/${this.data.id}`)
      const rooms = (task.rooms || []).map(r => ({
        ...r,
        doorType: r.doorType || '',
        qty: String(r.qty || '1'),
        width: String(r.width || ''),
        height: String(r.height || ''),
        remark: r.remark || '',
        typeIndex: this.data.doorTypes.indexOf(r.doorType)
      }))
      this.setData({ task: task || {}, rooms: rooms.length > 0 ? rooms : [{ room: '', doorType: '', typeIndex: 0, qty: '1', width: '', height: '', remark: '' }] })
    } catch (e) {
      console.log(e)
    }
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value })
  },

  onRoomInput(e) {
    const { index, field } = e.currentTarget.dataset
    this.setData({ [`rooms[${index}].${field}`]: e.detail.value })
  },

  onDoorTypeChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      [`rooms[${index}].typeIndex`]: e.detail.value,
      [`rooms[${index}].doorType`]: this.data.doorTypes[e.detail.value]
    })
  },

  addRoom() {
    this.setData({ rooms: [...this.data.rooms, { room: '', doorType: '', typeIndex: 0, qty: '1', width: '', height: '', remark: '' }] })
  },

  removeRoom(e) {
    this.setData({ rooms: this.data.rooms.filter((_, i) => i !== e.currentTarget.dataset.index) })
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

  async onSubmit() {
    if (this.data.photos.length === 0) return wx.showToast({ title: '请上传现场照片', icon: 'none' })
    const validRooms = this.data.rooms.filter(r => r.room && r.doorType)
    if (validRooms.length === 0) return wx.showToast({ title: '请至少填写一个房间', icon: 'none' })
    this.setData({ submitting: true })
    try {
      // 上传所有图片
      const uploadedPhotos = []
      for (const tempPath of this.data.photos) {
        const url = await uploadImage(tempPath, { showLoading: false })
        uploadedPhotos.push(url)
      }

      await post(`/tasks/${this.data.id}/measurement-complete`, {
        rooms: this.data.rooms,
        photos: uploadedPhotos,
        remark: this.data.form.remark
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
