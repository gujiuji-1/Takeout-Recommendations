const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const MODEL_API_URL = process.env.MODEL_API_URL || 'https://api.deepseek.com/v1/chat/completions'
const MODEL_API_KEY = process.env.MODEL_API_KEY || ''
const MODEL_TIMEOUT = 8000

async function callModel(prompt) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('请求超时'))
    }, MODEL_TIMEOUT)

    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的美食推荐师，擅长根据用户口味偏好和预算推荐合适的菜品组合。请用中文回答。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })

    const options = {
      hostname: new URL(MODEL_API_URL).hostname,
      path: new URL(MODEL_API_URL).pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MODEL_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      clearTimeout(timeout)
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.choices && result.choices[0] && result.choices[0].message) {
            resolve(result.choices[0].message.content)
          } else {
            reject(new Error('API返回格式错误'))
          }
        } catch (err) {
          reject(err)
        }
      })
    })

    req.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    req.write(postData)
    req.end()
  })
}

function buildPrompt(userProfile, candidates, budget) {
  return `用户口味偏好标签：${userProfile.preferenceTags.join('、')}

用户历史高频菜品：${userProfile.topDishes.join('、') || '暂无'}

用户总订单数：${userProfile.totalOrders} 次

预算：¥${budget}

候选菜品列表（价格在预算±30%范围内且口味匹配）：
${candidates.map((dish, index) => 
  `${index + 1}. 【${dish.shopName}】${dish.name} - ¥${dish.price} - 口味标签：${dish.tags.join('、')}`
).join('\n')}

请从候选菜品中选出3-5道菜组成一餐推荐给用户，要求：
1. 总价尽量接近预算
2. 菜品搭配合理（如包含主食、配菜等）
3. 口味符合用户偏好

请按照以下格式输出：
【推荐理由】简短说明推荐逻辑
【推荐菜品】
1. 菜品名称 - 店铺 - 价格
2. 菜品名称 - 店铺 - 价格
...

不要输出任何多余内容，只按上述格式输出。`
}

function parseRecommendation(response, candidates) {
  const reasonMatch = response.match(/【推荐理由】(.+?)(?=\n【推荐菜品】|$)/)
  const reason = reasonMatch ? reasonMatch[1].trim() : '根据您的口味偏好和预算为您推荐'
  
  const dishesMatch = response.match(/【推荐菜品】([\s\S]*)/)
  let recommendations = []
  
  if (dishesMatch) {
    const dishLines = dishesMatch[1].trim().split('\n')
    dishLines.forEach(line => {
      const match = line.match(/(\d+)\.\s*(.+?)\s*-\s*(.+?)\s*-\s*¥([\d.]+)/)
      if (match) {
        const dishName = match[2].trim()
        const shopName = match[3].trim()
        const price = parseFloat(match[4])
        
        const originalDish = candidates.find(d => 
          d.name === dishName && d.shopName === shopName && Math.abs(d.price - price) < 0.01
        )
        
        if (originalDish) {
          recommendations.push(originalDish)
        }
      }
    })
  }
  
  return { reason, recommendations }
}

function fallbackRecommend(candidates, userProfile) {
  const tagMap = {
    spicy: 'spicy',
    hot: 'spicy',
    sweet: 'sweet',
    light: 'light',
    salty: 'salty',
    sour: 'sour',
    creamy: 'creamy',
    umami: 'umami'
  }
  
  const userTags = userProfile.preferenceTags || []
  
  const scoredCandidates = candidates.map(dish => {
    let score = 0
    dish.tags.forEach(tag => {
      if (userTags.includes(tag)) {
        score += 10
      } else if (userTags.some(ut => tagMap[ut] === tagMap[tag])) {
        score += 5
      }
    })
    return { ...dish, score }
  })
  
  scoredCandidates.sort((a, b) => b.score - a.score)
  
  const top5 = scoredCandidates.slice(0, 5)
  
  return {
    reason: '根据您的口味偏好，为您推荐以下菜品',
    recommendations: top5
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { budget } = event
  
  if (!budget || budget <= 0) {
    return {
      success: false,
      error: '预算参数无效'
    }
  }

  try {
    const userRes = await db.collection('users').where({
      openid: OPENID
    }).get()

    if (userRes.data.length === 0) {
      return {
        success: false,
        error: '用户不存在，请先设置偏好'
      }
    }

    const user = userRes.data[0]
    const userTags = user.preferenceTags || []
    
    if (!userTags || userTags.length === 0) {
      return {
        success: false,
        error: '请先设置口味偏好'
      }
    }

    const minPrice = budget * 0.7
    const maxPrice = budget * 1.3

    const dishesRes = await db.collection('dishes')
      .where({
        price: db.command.gte(minPrice).and(db.command.lte(maxPrice)),
        tags: db.command.in(userTags)
      })
      .get()

    const dishes = dishesRes.data

    const shopsRes = await db.collection('shops').get()
    const shopMap = {}
    shopsRes.data.forEach(shop => {
      shopMap[shop._id] = shop.name
    })

    const candidates = dishes.map(dish => ({
      ...dish,
      shopName: shopMap[dish.shopId] || '未知店铺'
    }))

    if (candidates.length === 0) {
      return {
        success: false,
        error: '暂无符合条件的菜品'
      }
    }

    const orderCount = user.historyOrders ? user.historyOrders.length : 0
    const dishFrequency = {}
    user.historyOrders?.forEach(order => {
      dishFrequency[order.dishName] = (dishFrequency[order.dishName] || 0) + 1
    })
    const topDishes = Object.entries(dishFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)

    const userProfile = {
      preferenceTags: userTags,
      topDishes,
      totalOrders: orderCount
    }

    let result
    let useFallback = false

    try {
      const prompt = buildPrompt(userProfile, candidates, budget)
      const modelResponse = await callModel(prompt)
      result = parseRecommendation(modelResponse, candidates)
      
      if (!result.recommendations || result.recommendations.length === 0) {
        throw new Error('解析推荐结果失败')
      }
    } catch (err) {
      console.error('大模型调用失败，使用降级推荐:', err.message)
      useFallback = true
      result = fallbackRecommend(candidates, userProfile)
    }

    return {
      success: true,
      data: {
        recommendations: result.recommendations,
        reason: result.reason,
        useFallback
      }
    }

  } catch (err) {
    console.error('推荐失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}