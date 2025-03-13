// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { orderId, rating, content, reviewType } = event
  
  if (!orderId) {
    return {
      success: false,
      message: '订单ID不能为空'
    }
  }

  if (!rating || rating < 1 || rating > 5) {
    return {
      success: false,
      message: '评分必须在1-5之间'
    }
  }

  if (!content || content.trim() === '') {
    return {
      success: false,
      message: '评价内容不能为空'
    }
  }

  if (!reviewType || (reviewType !== 'buyer' && reviewType !== 'seller')) {
    return {
      success: false,
      message: '评价类型不正确'
    }
  }

  try {
    // 获取订单信息
    const orderRes = await db.collection('orders').doc(orderId).get()
    if (!orderRes.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    const order = orderRes.data
    
    // 检查权限：只有买家或卖家可以评价订单
    if (reviewType === 'buyer' && order.sellerId !== wxContext.OPENID) {
      return {
        success: false,
        message: '只有卖家可以评价买家'
      }
    }

    if (reviewType === 'seller' && order.buyerId !== wxContext.OPENID) {
      return {
        success: false,
        message: '只有买家可以评价卖家'
      }
    }

    // 检查订单状态：只有已完成的订单才能评价
    if (order.status !== 'completed') {
      return {
        success: false,
        message: '只有已完成的订单才能评价'
      }
    }

    // 检查是否已经评价过
    const reviewRes = await db.collection('reviews').where({
      orderId: orderId,
      reviewerId: wxContext.OPENID,
      reviewType: reviewType
    }).get()

    if (reviewRes.data.length > 0) {
      return {
        success: false,
        message: '您已经评价过该订单'
      }
    }

    // 创建评价记录
    const reviewData = {
      orderId: orderId,
      goodsId: order.goodsId,
      reviewerId: wxContext.OPENID, // 评价人ID
      targetId: reviewType === 'buyer' ? order.buyerId : order.sellerId, // 被评价人ID
      rating: rating,
      content: content,
      reviewType: reviewType, // 'buyer'表示卖家评价买家，'seller'表示买家评价卖家
      createTime: db.serverDate()
    }

    const result = await db.collection('reviews').add({
      data: reviewData
    })

    // 更新用户的评分
    const targetId = reviewType === 'buyer' ? order.buyerId : order.sellerId
    
    // 获取用户当前的所有评价
    const userReviews = await db.collection('reviews').where({
      targetId: targetId,
      reviewType: reviewType
    }).get()
    
    // 计算平均评分
    let totalRating = 0
    userReviews.data.forEach(review => {
      totalRating += review.rating
    })
    
    const avgRating = userReviews.data.length > 0 ? totalRating / userReviews.data.length : 5
    
    // 更新用户评分
    await db.collection('users').where({
      _openid: targetId
    }).update({
      data: {
        [`${reviewType}Rating`]: avgRating,
        [`${reviewType}ReviewCount`]: userReviews.data.length
      }
    })

    return {
      success: true,
      message: '评价成功'
    }
  } catch (err) {
    console.error('提交评价失败', err)
    return {
      success: false,
      message: '提交评价失败',
      error: err
    }
  }
} 