const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  const { dishId, dishName, shopId, shopName, price } = event
  
  if (!dishId || !dishName || !shopId || !shopName || price === undefined) {
    return {
      success: false,
      error: '参数不全'
    }
  }

  try {
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get()

    if (userRes.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }

    const orderItem = {
      dishId,
      dishName,
      shopId,
      shopName,
      price: parseFloat(price),
      timestamp: Date.now()
    }

    await db.collection('users').where({
      openid: OPENID
    }).update({
      data: {
        historyOrders: db.command.push(orderItem)
      }
    })

    return {
      success: true,
      data: orderItem
    }
  } catch (err) {
    console.error('下单失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}