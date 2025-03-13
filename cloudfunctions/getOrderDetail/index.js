// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { orderId } = event
  
  if (!orderId) {
    return {
      success: false,
      message: '订单ID不能为空'
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
    
    // 检查权限：只有买家或卖家可以查看订单
    if (order.buyerId !== wxContext.OPENID && order.sellerId !== wxContext.OPENID) {
      return {
        success: false,
        message: '无权查看该订单'
      }
    }

    // 获取商品信息
    const goodsRes = await db.collection('goods').doc(order.goodsId).get()
    
    // 获取买家信息
    const buyerRes = await db.collection('users').where({
      _openid: order.buyerId
    }).get()
    
    // 获取卖家信息
    const sellerRes = await db.collection('users').where({
      _openid: order.sellerId
    }).get()

    return {
      success: true,
      data: {
        order,
        goods: goodsRes.data || {},
        buyer: buyerRes.data[0] || {},
        seller: sellerRes.data[0] || {}
      }
    }
  } catch (err) {
    console.error('获取订单详情失败', err)
    return {
      success: false,
      message: '获取订单详情失败',
      error: err
    }
  }
} 