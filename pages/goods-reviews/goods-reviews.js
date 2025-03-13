const app = getApp()

Page({
  data: {
    goodsId: '',
    goodsTitle: '',
    reviews: [],
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true,
    stats: {
      total: 0,
      avgRating: 0,
      ratingDistribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0
      }
    }
  },

  onLoad: function(options) {
    const { goodsId, title } = options
    
    if (!goodsId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    this.setData({
      goodsId: goodsId,
      goodsTitle: title || '商品评价'
    })
    
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: this.data.goodsTitle + '的评价'
    })
    
    // 加载评价列表
    this.loadReviews()
  },
  
  // 加载评价列表
  loadReviews: function() {
    const { goodsId, page, pageSize } = this.data
    
    this.setData({
      loading: true
    })
    
    wx.cloud.callFunction({
      name: 'getReviews',
      data: {
        goodsId: goodsId,
        reviewType: 'seller', // 只查询买家对卖家的评价（即商品评价）
        page: page,
        pageSize: pageSize
      },
      success: (res) => {
        if (res.result && res.result.success) {
          const { reviews, total } = res.result.data
          
          // 计算评分统计
          if (page === 1) {
            this.calculateStats(reviews, total)
          }
          
          this.setData({
            reviews: page === 1 ? reviews : this.data.reviews.concat(reviews),
            loading: false,
            hasMore: this.data.reviews.length < total
          })
        } else {
          this.setData({
            loading: false
          })
          wx.showToast({
            title: '加载评价失败',
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
          title: '加载评价失败',
          icon: 'none'
        })
      }
    })
  },
  
  // 计算评分统计
  calculateStats: function(reviews, total) {
    if (reviews.length === 0) {
      return
    }
    
    let totalRating = 0
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    }
    
    reviews.forEach(review => {
      totalRating += review.rating
      distribution[review.rating] += 1
    })
    
    const avgRating = totalRating / reviews.length
    
    this.setData({
      'stats.total': total,
      'stats.avgRating': avgRating,
      'stats.ratingDistribution': distribution
    })
  },
  
  // 加载更多
  loadMore: function() {
    if (!this.data.hasMore || this.data.loading) {
      return
    }
    
    this.setData({
      page: this.data.page + 1
    })
    
    this.loadReviews()
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    this.setData({
      reviews: [],
      page: 1,
      hasMore: true
    })
    
    this.loadReviews()
    
    wx.stopPullDownRefresh()
  },
  
  // 触底加载更多
  onReachBottom: function() {
    this.loadMore()
  },
  
  // 查看用户评价
  viewUserReviews: function(e) {
    const { userid, username } = e.currentTarget.dataset
    
    wx.navigateTo({
      url: `/pages/user-reviews/user-reviews?userId=${userid}&userName=${username}&type=seller`
    })
  }
}) 