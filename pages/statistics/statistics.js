const db = wx.cloud.database()
const _ = db.command
const app = getApp()

Page({
  data: {
    isAdmin: false,
    loading: true,
    activeTab: 0, // 0-交易统计，1-商品分析，2-用户分析
    
    // 交易统计数据
    tradeStats: {
      totalTrade: 0,      // 总交易额
      totalOrders: 0,     // 总订单数
      completedOrders: 0, // 已完成订单数
      canceledOrders: 0,  // 已取消订单数
      pendingOrders: 0,   // 待处理订单数
      weeklyTrend: []     // 周交易趋势
    },
    
    // 商品分析数据
    goodsStats: {
      totalGoods: 0,       // 总商品数
      onSaleGoods: 0,      // 在售商品数
      soldGoods: 0,        // 已售商品数
      offShelfGoods: 0,    // 下架商品数
      categoryDistribution: [], // 分类分布
      priceDistribution: [] // 价格分布
    },
    
    // 用户分析数据
    userStats: {
      totalUsers: 0,       // 总用户数
      activeUsers: 0,      // 活跃用户数
      newUsers: 0,         // 新增用户数
      userGrowth: []       // 用户增长趋势
    }
  },

  onLoad: function() {
    // 检查是否为管理员
    this.checkAdminStatus()
  },
  
  // 检查管理员状态
  checkAdminStatus: function() {
    if (!app.globalData.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再查看数据统计',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
      return
    }
    
    const userId = app.globalData.userInfo.openid
    
    // 检查是否为管理员
    db.collection('admins')
      .where({
        userId: userId
      })
      .get()
      .then(res => {
        const isAdmin = res.data.length > 0
        
        this.setData({
          isAdmin: isAdmin
        })
        
        if (isAdmin) {
          // 加载统计数据
          this.loadTradeStats()
          this.loadGoodsStats()
          this.loadUserStats()
        } else {
          wx.showModal({
            title: '提示',
            content: '您没有权限查看数据统计',
            showCancel: false,
            success: () => {
              wx.switchTab({
                url: '/pages/profile/profile'
              })
            }
          })
        }
      })
  },
  
  // 切换标签页
  switchTab: function(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      activeTab: index
    })
  },
  
  // 加载交易统计数据
  loadTradeStats: function() {
    wx.cloud.callFunction({
      name: 'getTradeStats',
      success: (res) => {
        if (res.result && res.result.success) {
          this.setData({
            'tradeStats': res.result.data,
            loading: false
          })
        } else {
          this.setData({
            loading: false
          })
          wx.showToast({
            title: '加载交易数据失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error(err)
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '加载交易数据失败',
          icon: 'none'
        })
      }
    })
  },
  
  // 加载商品分析数据
  loadGoodsStats: function() {
    wx.cloud.callFunction({
      name: 'getGoodsStats',
      success: (res) => {
        if (res.result && res.result.success) {
          this.setData({
            'goodsStats': res.result.data
          })
        } else {
          wx.showToast({
            title: '加载商品数据失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error(err)
        wx.showToast({
          title: '加载商品数据失败',
          icon: 'none'
        })
      }
    })
  },
  
  // 加载用户分析数据
  loadUserStats: function() {
    wx.cloud.callFunction({
      name: 'getUserStats',
      success: (res) => {
        if (res.result && res.result.success) {
          this.setData({
            'userStats': res.result.data
          })
        } else {
          wx.showToast({
            title: '加载用户数据失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error(err)
        wx.showToast({
          title: '加载用户数据失败',
          icon: 'none'
        })
      }
    })
  },
  
  // 导出数据
  exportData: function() {
    wx.showToast({
      title: '导出功能暂未开放',
      icon: 'none'
    })
  }
}) 