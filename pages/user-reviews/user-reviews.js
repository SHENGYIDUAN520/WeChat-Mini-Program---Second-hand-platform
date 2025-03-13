const app = getApp()

Page({
  data: {
    userId: '',
    userName: '',
    reviewType: 'seller', // 默认显示卖家评价
    reviews: [],
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad: function(options) {
    const { userId, userName, type } = options
    
    if (!userId) {
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
      userId: userId,
      userName: userName || '未知用户',
      reviewType: type || 'seller'
    })
    
    // 加载评价列表
    this.loadReviews()
  },
  
  // 切换评价类型
  switchType: function(e) {
    const type = e.currentTarget.dataset.type
    
    if (type === this.data.reviewType) {
      return
    }
    
    this.setData({
      reviewType: type,
      reviews: [],
      page: 1,
      hasMore: true
    })
    
    this.loadReviews()
  },
  
  // 加载评价列表
  loadReviews: function() {
    const { userId, reviewType, page, pageSize } = this.data
    
    this.setData({
      loading: true
    })
    
    wx.cloud.callFunction({
      name: 'getReviews',
      data: {
        userId: userId,
        reviewType: reviewType,
        page: page,
        pageSize: pageSize
      },
      success: (res) => {
        if (res.result && res.result.success) {
          const { reviews, total } = res.result.data
          
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
  }
}) 