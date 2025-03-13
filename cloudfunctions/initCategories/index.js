// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 检查categories集合是否存在数据
    const countResult = await db.collection('categories').count()
    
    // 如果已经有数据，则不重复添加
    if (countResult.total > 0) {
      return {
        success: true,
        message: '分类数据已存在，无需重复初始化',
        count: countResult.total
      }
    }
    
    // 定义分类数据
    const categories = [
      { 
        name: '电子产品', 
        icon: '/images/category/digital.png',
        sort: 1,
        description: '手机、电脑、相机等电子设备'
      },
      { 
        name: '图书教材', 
        icon: '/images/category/books.png',
        sort: 2,
        description: '教材、课外书、考研资料等'
      },
      { 
        name: '生活用品', 
        icon: '/images/category/daily.png',
        sort: 3,
        description: '日常生活用品、宿舍用品等'
      },
      { 
        name: '服装鞋帽', 
        icon: '/images/category/clothing.png',
        sort: 4,
        description: '衣服、鞋子、帽子、包包等'
      },
      { 
        name: '运动户外', 
        icon: '/images/category/others.png',
        sort: 5,
        description: '运动器材、户外装备等'
      },
      {
        name: '美妆护肤',
        icon: '/images/category/beauty.png',
        sort: 6,
        description: '化妆品、护肤品、香水等'
      },
      {
        name: '乐器',
        icon: '/images/category/music.png',
        sort: 7,
        description: '吉他、钢琴、电子琴等乐器'
      },
      {
        name: '其他',
        icon: '/images/category/other.png',
        sort: 8,
        description: '其他类别商品'
      }
    ]
    
    // 批量添加分类数据
    const addPromises = categories.map(category => {
      return db.collection('categories').add({
        data: {
          ...category,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    })
    
    // 等待所有添加操作完成
    await Promise.all(addPromises)
    
    return {
      success: true,
      message: '分类数据初始化成功',
      count: categories.length
    }
    
  } catch (error) {
    console.error('初始化分类数据失败', error)
    return {
      success: false,
      message: '初始化分类数据失败',
      error: error
    }
  }
} 