// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { orderId, reviewType } = event
  
  if (!orderId) {
    return {
      success: false,
      message: '订单ID不能为空'
    }
  }

  if (!reviewType || (reviewType !== 'buyer' && reviewType !== 'seller')) {
    return {
      success: false,
      message: '评价类型不正确'
    }
  }

  try {
    // 查询是否已经评价过
    const reviewRes = await db.collection('reviews').where({
      orderId: orderId,
      reviewerId: wxContext.OPENID,
      reviewType: reviewType
    }).get()

    return {
      success: true,
      data: {
        hasReviewed: reviewRes.data.length > 0,
        review: reviewRes.data[0] || null
      }
    }
  } catch (err) {
    console.error('检查评价状态失败', err)
    return {
      success: false,
      message: '检查评价状态失败',
      error: err
    }
  }
} 