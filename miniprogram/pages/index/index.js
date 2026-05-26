const app = getApp()

Page({
  data: {
    budget: '',
    recommendations: [],
    isLoading: false,
    showRecommendations: false,
    recommendationReason: ''
  },

  onLoad: function () {
    this.checkUserPreferences()
  },

  async checkUserPreferences() {
    const userInfo = app.globalData.userInfo
    if (!userInfo || !userInfo.preferenceTags || userInfo.preferenceTags.length === 0) {
      wx.showModal({
        title: '提示',
        content: '请先设置您的口味偏好',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/mine/mine'
          })
        }
      })
    }
  },

  handleBudgetInput(e) {
    const value = e.detail.value
    this.setData({
      budget: value
    })
  },

  async handleRecommend() {
    const budget = parseFloat(this.data.budget)
    if (!budget || budget <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      })
      return
    }

    this.setData({
      isLoading: true,
      showRecommendations: false
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'getRecommendation',
        data: {
          budget: budget
        }
      })

      if (res.result && res.result.success) {
        this.setData({
          recommendations: res.result.data.recommendations,
          recommendationReason: res.result.data.reason,
          showRecommendations: true
        })
      } else {
        wx.showToast({
          title: '推荐失败，请重试',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('推荐失败:', err)
      wx.showToast({
        title: '推荐失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({
        isLoading: false
      })
    }
  },

  async handleOrder(e) {
    const dish = e.currentTarget.dataset.dish
    try {
      const res = await wx.cloud.callFunction({
        name: 'addOrder',
        data: {
          dishId: dish._id,
          dishName: dish.name,
          shopId: dish.shopId,
          shopName: dish.shopName,
          price: dish.price
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '下单成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: '下单失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('下单失败:', err)
      wx.showToast({
        title: '下单失败',
        icon: 'none'
      })
    }
  }
})