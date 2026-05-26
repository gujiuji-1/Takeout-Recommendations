const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get()

    if (userRes.data.length === 0) {
      const newUser = {
        openid: OPENID,
        preferenceTags: event.preferenceTags || [],
        favoredDishes: event.favoredDishes || [],
        historyOrders: [],
        createdAt: Date.now()
      }
      
      await db.collection('users').add({
        data: newUser
      })
      
      return {
        success: true,
        data: newUser
      }
    } else {
      const existingUser = userRes.data[0]
      const updateData = {}
      
      if (event.preferenceTags !== undefined) {
        updateData.preferenceTags = event.preferenceTags
      }
      if (event.favoredDishes !== undefined) {
        updateData.favoredDishes = event.favoredDishes
      }
      if (event.clearOrders === true) {
        updateData.historyOrders = []
      }
      
      if (Object.keys(updateData).length > 0) {
        await db.collection('users').where({
          openid: OPENID
        }).update({
          data: updateData
        })
        
        const updatedRes = await db.collection('users').where({
          openid: OPENID
        }).get()
        
        return {
          success: true,
          data: updatedRes.data[0]
        }
      }
      
      return {
        success: true,
        data: existingUser
      }
    }
  } catch (err) {
    console.error('用户初始化失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}