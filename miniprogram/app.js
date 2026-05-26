App({
  onLaunch: async function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'your-env-id',
        traceUser: true,
      })
    }
    this.globalData = {}
    await this.checkUserInit()
  },

  async checkUserInit() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'initUser',
        data: {}
      })
      if (res.result && res.result.success) {
        this.globalData.userInfo = res.result.data
      }
    } catch (err) {
      console.error('用户初始化失败:', err)
    }
  },

  globalData: {
    userInfo: null
  }
})