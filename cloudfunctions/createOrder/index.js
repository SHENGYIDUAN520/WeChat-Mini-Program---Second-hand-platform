// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const buyerId = wxContext.OPENID
  const { goodsId, sellerId, price } = event
  
  // 检查参数
  if (!goodsId || !sellerId || !price) {
    return {
      success: false,
      message: '参数不完整'
    }
  }
  
  // 检查商品是否存在且可购买
  try {
    const goodsRes = await db.collection('goods').doc(goodsId).get()
    const goods = goodsRes.data
    
    if (!goods) {
      return {
        success: false,
        message: '商品不存在'
      }
    }
    
    if (goods.status !== 'on_sale') {
      return {
        success: false,
        message: '商品已下架或已售出'
      }
    }
    
    if (goods._openid === buyerId) {
      return {
        success: false,
        message: '不能购买自己发布的商品'
      }
    }
    
    // 创建订单
    const orderData = {
      goodsId,
      sellerId,
      buyerId,
      price: Number(price),
      status: 'pending', // 待卖家确认
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const orderRes = await db.collection('orders').add({
      data: orderData
    })
    
    if (orderRes._id) {
      // 更新商品状态为交易中
      await db.collection('goods').doc(goodsId).update({
        data: {
          status: 'trading',
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        orderId: orderRes._id,
        message: '下单成功'
      }
    } else {
      return {
        success: false,
        message: '创建订单失败'
      }
    }
  } catch (err) {
    console.error('创建订单失败', err)
    return {
      success: false,
      message: '系统错误，请稍后再试',
      error: err
    }
  }
} 