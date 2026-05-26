const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const shops = [
  {
    name: '川味小厨',
    description: '正宗川菜，麻辣鲜香',
    tags: ['spicy', 'hot'],
    createdAt: Date.now()
  },
  {
    name: '轻食沙拉',
    description: '健康轻食，营养均衡',
    tags: ['light', 'salty'],
    createdAt: Date.now()
  },
  {
    name: '粤式茶餐厅',
    description: '地道粤菜，鲜美可口',
    tags: ['sweet', 'umami'],
    createdAt: Date.now()
  }
]

const dishes = [
  { name: '麻婆豆腐', price: 28, tags: ['spicy', 'hot'], description: '经典川菜，麻辣鲜香' },
  { name: '水煮鱼', price: 68, tags: ['spicy', 'hot'], description: '鲜嫩鱼片，麻辣入味' },
  { name: '回锅肉', price: 38, tags: ['spicy', 'salty'], description: '肥而不腻，下饭神器' },
  { name: '宫保鸡丁', price: 32, tags: ['spicy', 'sweet'], description: '酸甜微辣，口感丰富' },
  { name: '酸辣土豆丝', price: 18, tags: ['sour', 'spicy'], description: '酸辣爽口，开胃小菜' },
  
  { name: '凯撒沙拉', price: 36, tags: ['light', 'salty'], description: '新鲜蔬菜，凯撒酱' },
  { name: '鸡胸肉沙拉', price: 42, tags: ['light', 'salty'], description: '高蛋白低卡，健身首选' },
  { name: '牛油果沙拉', price: 48, tags: ['light', 'creamy'], description: '营养丰富，口感绵密' },
  { name: '三文鱼沙拉', price: 58, tags: ['light', 'umami'], description: '新鲜三文鱼，清爽美味' },
  { name: '田园蔬菜沙拉', price: 28, tags: ['light', 'salty'], description: '多种蔬菜，健康之选' },
  
  { name: '叉烧饭', price: 38, tags: ['sweet', 'salty'], description: '蜜汁叉烧，香甜可口' },
  { name: '白切鸡', price: 48, tags: ['light', 'umami'], description: '皮滑肉嫩，原汁原味' },
  { name: '豉油鸡', price: 42, tags: ['salty', 'umami'], description: '豉油香浓，肉质鲜嫩' },
  { name: '虾饺皇', price: 32, tags: ['umami', 'salty'], description: '皮薄馅大，鲜美多汁' },
  { name: '干炒牛河', price: 36, tags: ['salty', 'umami'], description: '河粉爽滑，牛肉鲜嫩' }
]

exports.main = async (event, context) => {
  try {
    const shopsRes = await db.collection('shops').get()
    if (shopsRes.data.length === 0) {
      for (const shop of shops) {
        await db.collection('shops').add({ data: shop })
      }
      console.log('店铺数据初始化完成')
    } else {
      console.log('店铺数据已存在')
    }

    const currentShops = await db.collection('shops').get()
    const shopMap = {}
    currentShops.data.forEach(shop => {
      shopMap[shop.name] = shop._id
    })

    const dishesRes = await db.collection('dishes').get()
    if (dishesRes.data.length === 0) {
      let dishIndex = 0
      for (let i = 0; i < 3; i++) {
        const shopName = shops[i].name
        const shopId = shopMap[shopName]
        for (let j = 0; j < 5; j++) {
          await db.collection('dishes').add({
            data: {
              ...dishes[dishIndex],
              shopId,
              shopName,
              createdAt: Date.now()
            }
          })
          dishIndex++
        }
      }
      console.log('菜品数据初始化完成')
    } else {
      console.log('菜品数据已存在')
    }

    return {
      success: true,
      message: '数据库初始化完成'
    }
  } catch (err) {
    console.error('数据库初始化失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}