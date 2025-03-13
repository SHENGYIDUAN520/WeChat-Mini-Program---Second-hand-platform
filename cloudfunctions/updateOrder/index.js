// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID
  const { orderId, status } = event
  
  // 检查参数
  if (!orderId || status === undefined) {
    return {
      success: false,
      message: '参数不完整'
    }
  }
  
  try {
    // 获取订单信息
    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data
    
    if (!order) {
      return {
        success: false,
        message: '订单不存在'
      }
    }
    
    // 检查权限（只有买家或卖家可以更新订单）
    if (userId !== order.buyerId && userId !== order.sellerId) {
      return {
        success: false,
        message: '无权操作此订单'
      }
    }
    
    // 检查订单状态是否可以更新
    if (order.status === 2 || order.status === 3) {
      return {
        success: false,
        message: '订单已完成或已取消，无法更新'
      }
    }
    
    // 检查操作权限
    if (status === 1 && userId !== order.sellerId) {
      // 只有卖家可以确认订单
      return {
        success: false,
        message: '只有卖家可以确认订单'
      }
    }
    
    // 更新订单状态
    await db.collection('orders').doc(orderId).update({
      data: {
        status: status,
        updateTime: db.serverDate()
      }
    })
    
    // 如果订单完成或取消，更新商品状态
    if (status === 2) { // 完成交易
      await db.collection('goods').doc(order.goodsId).update({
        data: {
          status: 'sold',
          updateTime: db.serverDate()
        }
      })
      
      // 创建交易记录
      await db.collection('transactions').add({
        data: {
          orderId: orderId,
          goodsId: order.goodsId,
          sellerId: order.sellerId,
          buyerId: order.buyerId,
          price: order.price,
          createTime: db.serverDate()
        }
      })
    } else if (status === 3) { // 取消订单
      await db.collection('goods').doc(order.goodsId).update({
        data: {
          status: 'on_sale',
          updateTime: db.serverDate()
        }
      })
    }
    
    // 创建消息通知
    const targetUserId = userId === order.sellerId ? order.buyerId : order.sellerId
    let messageContent = ''
    
    switch (status) {
      case 1:
        messageContent = '卖家已确认订单，请及时联系进行交易'
        break
      case 2:
        messageContent = '订单已完成，感谢您的使用'
        break
      case 3:
        messageContent = userId === order.sellerId ? '卖家已取消订单' : '买家已取消订单'
        break
      default:
        messageContent = '订单状态已更新'
    }
    
    await db.collection('messages').add({
      data: {
        fromId: userId,
        toId: targetUserId,
        content: messageContent,
        orderId: orderId,
        goodsId: order.goodsId,
        isRead: false,
        createTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      message: '操作成功'
    }
  } catch (err) {
    console.error('更新订单失败', err)
    return {
      success: false,
      message: '系统错误，请稍后再试',
      error: err
    }
  }
} 