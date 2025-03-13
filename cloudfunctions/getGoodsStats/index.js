// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 检查是否为管理员
    const adminCheck = await db.collection('admins')
      .where({
        userId: wxContext.OPENID
      })
      .get()
    
    if (adminCheck.data.length === 0) {
      return {
        success: false,
        message: '无权限访问'
      }
    }
    
    // 获取商品总数
    const totalGoodsRes = await db.collection('goods').count()
    const totalGoods = totalGoodsRes.total
    
    // 获取各状态商品数量
    const goodsStatusRes = await db.collection('goods')
      .aggregate()
      .group({
        _id: '$status',
        count: $.sum(1)
      })
      .end()
    
    // 解析商品状态数据
    let onSaleGoods = 0
    let soldGoods = 0
    let offShelfGoods = 0
    
    goodsStatusRes.list.forEach(item => {
      if (item._id === 1) { // 在售
        onSaleGoods = item.count
      } else if (item._id === 2) { // 已售
        soldGoods = item.count
      } else if (item._id === 0) { // 下架
        offShelfGoods = item.count
      }
    })
    
    // 获取分类分布
    const categoryDistributionRes = await db.collection('goods')
      .aggregate()
      .group({
        _id: '$category',
        count: $.sum(1)
      })
      .end()
    
    // 获取分类名称
    const categories = await db.collection('categories').get()
    const categoryMap = {}
    
    categories.data.forEach(category => {
      categoryMap[category._id] = category.name
    })
    
    // 构建分类分布数据
    const categoryDistribution = categoryDistributionRes.list.map(item => {
      return {
        category: categoryMap[item._id] || '未分类',
        count: item.count
      }
    })
    
    // 获取价格分布
    const priceRanges = [
      { min: 0, max: 50, label: '0-50元' },
      { min: 50, max: 100, label: '50-100元' },
      { min: 100, max: 200, label: '100-200元' },
      { min: 200, max: 500, label: '200-500元' },
      { min: 500, max: 1000, label: '500-1000元' },
      { min: 1000, max: Number.MAX_SAFE_INTEGER, label: '1000元以上' }
    ]
    
    const priceDistribution = []
    
    // 查询每个价格区间的商品数量
    for (const range of priceRanges) {
      const countRes = await db.collection('goods')
        .where({
          price: _.gte(range.min).and(_.lt(range.max))
        })
        .count()
      
      priceDistribution.push({
        range: range.label,
        count: countRes.total
      })
    }
    
    return {
      success: true,
      data: {
        totalGoods,
        onSaleGoods,
        soldGoods,
        offShelfGoods,
        categoryDistribution,
        priceDistribution
      }
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '获取数据失败'
    }
  }
} 