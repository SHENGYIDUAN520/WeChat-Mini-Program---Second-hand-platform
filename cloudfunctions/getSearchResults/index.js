// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()
const _ = db.command
const MAX_LIMIT = 100

// 云函数入口函数
exports.main = async (event, context) => {
  const { keyword, categoryId, sortType, page = 0, pageSize = 10 } = event
  
  // 构建查询条件
  const query = {
    status: 1 // 只查询在售商品
  }
  
  // 添加关键词搜索
  if (keyword && keyword.trim() !== '') {
    query._or = [
      {
        title: db.RegExp({
          regexp: keyword,
          options: 'i'
        })
      },
      {
        description: db.RegExp({
          regexp: keyword,
          options: 'i'
        })
      },
      {
        tags: db.RegExp({
          regexp: keyword,
          options: 'i'
        })
      }
    ]
  }
  
  // 添加分类筛选
  if (categoryId) {
    query.categoryId = categoryId
  }
  
  try {
    // 获取符合条件的总数
    const countResult = await db.collection('goods').where(query).count()
    const total = countResult.total
    
    // 构建排序条件
    let orderField = 'createTime'
    let orderDirection = 'desc'
    
    if (sortType === 'price-asc') {
      orderField = 'price'
      orderDirection = 'asc'
    } else if (sortType === 'price-desc') {
      orderField = 'price'
      orderDirection = 'desc'
    } else if (sortType === 'views') {
      orderField = 'viewCount'
      orderDirection = 'desc'
    }
    
    // 查询数据
    const goodsResult = await db.collection('goods')
      .where(query)
      .orderBy(orderField, orderDirection)
      .skip(page * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取卖家信息
    const sellerIds = [...new Set(goodsResult.data.map(item => item._openid))]
    const userTasks = sellerIds.map(id => {
      return db.collection('users').where({ _openid: id }).get()
    })
    
    const userResults = await Promise.all(userTasks)
    const userMap = {}
    
    userResults.forEach(result => {
      if (result.data.length > 0) {
        const user = result.data[0]
        userMap[user._openid] = {
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          campus: user.campus,
          rating: user.sellerRating || 0
        }
      }
    })
    
    // 组装返回数据
    const goods = goodsResult.data.map(item => {
      const seller = userMap[item._openid] || {
        nickName: '未知用户',
        avatarUrl: '',
        campus: '',
        rating: 0
      }
      
      return {
        ...item,
        seller
      }
    })
    
    return {
      code: 0,
      data: {
        goods,
        total,
        hasMore: total > (page + 1) * pageSize
      },
      message: '获取成功'
    }
  } catch (err) {
    console.error('搜索商品失败', err)
    return {
      code: -1,
      data: null,
      message: '搜索失败'
    }
  }
} 