// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const MAX_LIMIT = 100

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { userId, reviewType, goodsId, page = 1, pageSize = 10 } = event
  
  // 构建查询条件
  const condition = {}
  
  if (userId) {
    // 查询指定用户的评价（作为被评价者）
    condition.targetId = userId
  }
  
  if (reviewType) {
    // 查询指定类型的评价（买家评价或卖家评价）
    condition.reviewType = reviewType
  }
  
  if (goodsId) {
    // 查询指定商品的评价
    condition.goodsId = goodsId
  }
  
  try {
    // 获取评价总数
    const countResult = await db.collection('reviews')
      .where(condition)
      .count()
    const total = countResult.total
    
    // 计算分页
    const skip = (page - 1) * pageSize
    
    // 获取评价列表
    const reviewsRes = await db.collection('reviews')
      .where(condition)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    // 获取评价者信息
    const reviewerIds = [...new Set(reviewsRes.data.map(item => item.reviewerId))]
    const reviewerList = await db.collection('users').where({
      _openid: _.in(reviewerIds)
    }).get()
    
    // 构建评价者信息映射
    const reviewerMap = {}
    reviewerList.data.forEach(user => {
      reviewerMap[user._openid] = user
    })
    
    // 组装评价数据
    const reviews = reviewsRes.data.map(review => {
      const reviewer = reviewerMap[review.reviewerId] || {}
      return {
        ...review,
        reviewer: {
          avatarUrl: reviewer.avatarUrl || '',
          nickName: reviewer.nickName || '未知用户'
        }
      }
    })
    
    return {
      success: true,
      data: {
        total,
        reviews,
        page,
        pageSize
      }
    }
  } catch (err) {
    console.error('获取评价列表失败', err)
    return {
      success: false,
      message: '获取评价列表失败',
      error: err
    }
  }
} 