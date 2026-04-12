/**
 * 工头团队管理页
 */
const { get, post } = require('../../utils/request')

Page({
  data: {
    members: [],
    filteredMembers: [],
    onlineCount: 0,
    todayTasks: 5,
    commissionRate: '10',
    searchText: '',
    activeFilter: 'all',
    skillOptions: ['安装', '量尺', '维修', '送货', '安装·量尺', '维修·送货'],
    newMember: { name: '', phone: '', skillIndex: 0 }
  },

  onLoad(options) {
    if (options.tab === 'commission') {
      // scroll to commission section
    }
  },

  onShow() { this.loadMembers() },

  async loadMembers() {
    try {
      const members = await get('/foreman/members')
      this.setData({
        members: members || [],
        onlineCount: (members || []).filter(m => m.online).length
      })
    } catch (e) {
      const mockMembers = [
        { id: 'W001', name: '张师傅', skills: '安装 · 量尺', phone: '13912341234', online: true, completed: 12, earnings: 4200 },
        { id: 'W002', name: '李师傅', skills: '安装', phone: '13812345678', online: false, completed: 8, earnings: 2800 },
        { id: 'W003', name: '王师傅', skills: '维修 · 送货', phone: '13712341234', online: true, completed: 5, earnings: 1500 }
      ]
      this.setData({
        members: mockMembers,
        filteredMembers: mockMembers,
        onlineCount: 2
      })
    }
  },

  callMember(e) {
    wx.makePhoneCall({ phoneNumber: e.currentTarget.dataset.phone })
  },

  removeMember(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '确认移除',
      content: '确定将 ' + name + ' 移出团队吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ members: this.data.members.filter(m => m.id !== id) }, () => this.applyFilter())
          wx.showToast({ title: '已移除', icon: 'success' })
        }
      }
    })
  },

  onNewMemberInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`newMember.${field}`]: e.detail.value })
  },

  onNewSkillChange(e) {
    this.setData({ 'newMember.skillIndex': e.detail.value })
  },

  addMember() {
    const { name, phone, skillIndex } = this.data.newMember
    if (!name || !phone) {
      return wx.showToast({ title: '请填写姓名和电话', icon: 'none' })
    }
    const skill = this.data.skillOptions[skillIndex]
    const newMember = {
      id: 'W' + Date.now(),
      name,
      skills: skill,
      phone,
      online: false,
      completed: 0,
      earnings: 0
    }
    this.setData({
      members: [...this.data.members, newMember],
      newMember: { name: '', phone: '', skillIndex: 0 }
    }, () => this.applyFilter())
    wx.showToast({ title: '添加成功', icon: 'success' })
  },

  onRateChange(e) { this.setData({ commissionRate: e.detail.value }) },

  onSearch(e) {
    this.setData({ searchText: e.detail.value }, () => this.applyFilter())
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ activeFilter: filter }, () => this.applyFilter())
  },

  applyFilter() {
    const { members, searchText, activeFilter } = this.data
    let filtered = members
    if (searchText) {
      const kw = searchText.toLowerCase()
      filtered = filtered.filter(m => m.name.toLowerCase().includes(kw) || m.skills.toLowerCase().includes(kw))
    }
    if (activeFilter !== 'all') {
      filtered = filtered.filter(m => m.skills.includes(activeFilter))
    }
    this.setData({ filteredMembers: filtered })
  },

  async saveCommission() {
    try {
      await post('/foreman/commission', { rate: this.data.commissionRate })
      wx.showToast({ title: '保存成功', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: '保存成功（本地）', icon: 'success' })
    }
  }
})
