// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 查询所有状态为数字1的商品
    const oldStatusGoods = await db.collection('goods')
      .where({
        status: 1
      })
      .get()
    
    console.log(`找到 ${oldStatusGoods.data.length} 个状态为数字1的商品`)
    
    // 如果没有找到状态为数字1的商品，尝试查询状态为字符串"1"的商品
    if (oldStatusGoods.data.length === 0) {
      const stringStatusGoods = await db.collection('goods')
        .where({
          status: "1"
        })
        .get()
      
      console.log(`找到 ${stringStatusGoods.data.length} 个状态为字符串"1"的商品`)
      
      // 批量更新这些商品的状态为字符串 'on_sale'
      const stringUpdatePromises = stringStatusGoods.data.map(good => {
        return db.collection('goods').doc(good._id).update({
          data: {
            status: 'on_sale'
          }
        })
      })
      
      // 等待所有更新完成
      if (stringUpdatePromises.length > 0) {
        await Promise.all(stringUpdatePromises)
      }
      
      return {
        success: true,
        message: `成功更新${stringStatusGoods.data.length}个状态为字符串"1"的商品`
      }
    }
    
    // 批量更新这些商品的状态为字符串 'on_sale'
    const updatePromises = oldStatusGoods.data.map(good => {
      return db.collection('goods').doc(good._id).update({
        data: {
          status: 'on_sale'
        }
      })
    })
    
    // 等待所有更新完成
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises)
    }
    
    return {
      success: true,
      message: `成功更新${oldStatusGoods.data.length}个状态为数字1的商品`
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '更新失败',
      error: err
    }
  }
} 