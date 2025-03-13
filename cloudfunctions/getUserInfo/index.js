// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { userId } = event
  
  if (!userId) {
    return {
      success: false,
      message: '用户ID不能为空'
    }
  }

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({
      _openid: userId
    }).get()

    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    const user = userRes.data[0]
    
    // 如果没有评分信息，设置默认值
    if (!user.buyerRating) {
      user.buyerRating = 5
    }
    
    if (!user.sellerRating) {
      user.sellerRating = 5
    }
    
    if (!user.buyerReviewCount) {
      user.buyerReviewCount = 0
    }
    
    if (!user.sellerReviewCount) {
      user.sellerReviewCount = 0
    }

    return {
      success: true,
      data: user
    }
  } catch (err) {
    console.error('获取用户信息失败', err)
    return {
      success: false,
      message: '获取用户信息失败',
      error: err
    }
  }
} 