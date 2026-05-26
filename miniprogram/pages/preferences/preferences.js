const app = getApp()

Page({
  data: {
    tags: [
      { id: 'spicy', name: '🌶️ 麻辣', selected: false },
      { id: 'hot', name: '🔥 香辣', selected: false },
      { id: 'sweet', name: '🍬 酸甜', selected: false },
      { id: 'light', name: '🥬 清淡', selected: false },
      { id: 'salty', name: '🧂 咸鲜', selected: false },
      { id: 'sour', name: '🍋 酸爽', selected: false },
      { id: 'creamy', name: '🥛 奶香', selected: false },
      { id: 'umami', name: '🍄 鲜美', selected: false }
    ],
    dishes: [],
    selectedDishes: [],
    isLoading: false
  },

  onLoad: async function () {
    await this.loadDishes()
    await this.loadUserPreferences()
  },

  async loadDishes() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('dishes').get()
      this.setData({
        dishes: res.data.map(dish => ({
          ...dish,
          selected: false
        }))
      })
    } catch (err) {
      console.error('加载菜品失败:', err)
    }
  },

  async loadUserPreferences() {
    const userInfo = app.globalData.userInfo
    if (userInfo && userInfo.preferenceTags) {
      const newTags = this.data.tags.map(tag => ({
        ...tag,
        selected: userInfo.preferenceTags.includes(tag.id)
      }))
      this.setData({ tags: newTags })
    }
    if (userInfo && userInfo.favoredDishes) {
      this.setData({
        selectedDishes: userInfo.favoredDishes
      })
    }
  },

  toggleTag(e) {
    const tagId = e.currentTarget.dataset.tagId
    const newTags = this.data.tags.map(tag => {
      if (tag.id === tagId) {
        return { ...tag, selected: !tag.selected }
      }
      return tag
    })
    this.setData({ tags: newTags })
  },

  toggleDish(e) {
    const dishId = e.currentTarget.dataset.dishId
    const dishName = e.currentTarget.dataset.dishName
    
    let newSelectedDishes = [...this.data.selectedDishes]
    const index = newSelectedDishes.indexOf(dishId)
    
    if (index > -1) {
      newSelectedDishes.splice(index, 1)
    } else {
      if (newSelectedDishes.length >= 5) {
        wx.showToast({
          title: '最多选择5道喜欢的菜品',
          icon: 'none'
        })
        return
      }
      newSelectedDishes.push(dishId)
    }
    
    const newDishes = this.data.dishes.map(dish => ({
      ...dish,
      selected: newSelectedDishes.includes(dish._id)
    }))
    
    this.setData({
      selectedDishes: newSelectedDishes,
      dishes: newDishes
    })
  },

  async handleSave() {
    const selectedTags = this.data.tags.filter(tag => tag.selected).map(tag => tag.id)
    
    if (selectedTags.length === 0) {
      wx.showToast({
        title: '请至少选择一个口味标签',
        icon: 'none'
      })
      return
    }
    
    if (this.data.selectedDishes.length < 3) {
      wx.showToast({
        title: '请至少选择3道喜欢的菜品',
        icon: 'none'
      })
      return
    }

    this.setData({ isLoading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'initUser',
        data: {
          preferenceTags: selectedTags,
          favoredDishes: this.data.selectedDishes
        }
      })

      if (res.result && res.result.success) {
        app.globalData.userInfo = res.result.data
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('保存失败:', err)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  }
})