const app = getApp()

Page({
  data: {
    userInfo: null,
    historyOrders: [],
    isLoading: false,
    tagMap: {
      spicy: '🌶️ 麻辣',
      hot: '🔥 香辣',
      sweet: '🍬 酸甜',
      light: '🥬 清淡',
      salty: '🧂 咸鲜',
      sour: '🍋 酸爽',
      creamy: '🥛 奶香',
      umami: '🍄 鲜美'
    }
  },

  onShow: async function () {
    await this.loadUserInfo()
    await this.loadHistoryOrders()
  },

  async loadUserInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'initUser',
        data: {}
      })
      if (res.result && res.result.success) {
        app.globalData.userInfo = res.result.data
        this.setData({
          userInfo: res.result.data
        })
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
    }
  },

  async loadHistoryOrders() {
    const userInfo = app.globalData.userInfo
    if (!userInfo || !userInfo.historyOrders) {
      this.setData({ historyOrders: [] })
      return
    }
    
    const orders = userInfo.historyOrders.reverse().slice(0, 20)
    this.setData({ historyOrders: orders })
  },

  goToPreferences() {
    wx.navigateTo({
      url: '/pages/preferences/preferences'
    })
  },

  formatTime(timestamp) {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  getTagNames(tags) {
    if (!tags || !Array.isArray(tags)) return []
    return tags.map(tag => this.data.tagMap[tag] || tag)
  },

  handleClearOrders() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await wx.cloud.callFunction({
              name: 'initUser',
              data: {
                clearOrders: true
              }
            })
            await this.loadHistoryOrders()
            wx.showToast({
              title: '已清空',
              icon: 'success'
            })
          } catch (err) {
            console.error('清空失败:', err)
            wx.showToast({
              title: '清空失败',
              icon: 'none'
            })
          }
        }
      }
    })
  }
})