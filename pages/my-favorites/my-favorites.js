const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    favorites: [],
    loading: true,
    page: 0,
    pageSize: 10,
    hasMore: true,
    isEmpty: false
  },

  onLoad: function (options) {
    this.loadFavorites()
  },

  onPullDownRefresh: function () {
    this.setData({
      favorites: [],
      page: 0,
      hasMore: true,
      isEmpty: false
    })
    this.loadFavorites().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreFavorites()
    }
  },

  // 加载收藏列表
  loadFavorites: function () {
    this.setData({
      loading: true
    })

    const app = getApp()
    if (!app.globalData.userInfo) {
      this.setData({
        loading: false,
        isEmpty: true
      })
      return Promise.resolve()
    }

    return db.collection('favorites')
      .where({
        _openid: app.globalData.userInfo.openid
      })
      .orderBy('createTime', 'desc')
      .skip(this.data.page * this.data.pageSize)
      .limit(this.data.pageSize)
      .get()
      .then(res => {
        if (res.data.length === 0 && this.data.page === 0) {
          this.setData({
            loading: false,
            isEmpty: true
          })
          return
        }

        const hasMore = res.data.length === this.data.pageSize
        
        // 获取收藏的商品详情
        const goodsIds = res.data.map(item => item.goodsId)
        
        if (goodsIds.length === 0) {
          this.setData({
            loading: false,
            hasMore: hasMore,
            page: this.data.page + 1
          })
          return
        }
        
        return db.collection('goods')
          .where({
            _id: _.in(goodsIds)
          })
          .get()
          .then(goodsRes => {
            // 将商品信息合并到收藏记录中
            const goodsMap = {}
            goodsRes.data.forEach(goods => {
              goodsMap[goods._id] = goods
            })
            
            const favorites = res.data.map(favorite => {
              return {
                ...favorite,
                goods: goodsMap[favorite.goodsId] || null
              }
            }).filter(item => item.goods !== null) // 过滤掉已删除的商品
            
            this.setData({
              favorites: [...this.data.favorites, ...favorites],
              loading: false,
              hasMore: hasMore,
              page: this.data.page + 1,
              isEmpty: favorites.length === 0 && this.data.page === 0
            })
          })
      })
      .catch(err => {
        console.error(err)
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      })
  },

  // 加载更多收藏
  loadMoreFavorites: function () {
    if (this.data.loading) return
    
    this.loadFavorites()
  },

  // 取消收藏
  cancelFavorite: function (e) {
    const index = e.currentTarget.dataset.index
    const favorite = this.data.favorites[index]
    
    wx.showModal({
      title: '提示',
      content: '确定取消收藏该商品吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '取消中',
          })
          
          db.collection('favorites')
            .doc(favorite._id)
            .remove()
            .then(() => {
              // 更新商品的收藏数
              return wx.cloud.callFunction({
                name: 'updateGoodsFavoriteCount',
                data: {
                  goodsId: favorite.goodsId,
                  type: 'decrease'
                }
              })
            })
            .then(() => {
              wx.hideLoading()
              
              // 更新本地数据
              let favorites = this.data.favorites
              favorites.splice(index, 1)
              
              this.setData({
                favorites: favorites,
                isEmpty: favorites.length === 0
              })
              
              wx.showToast({
                title: '已取消收藏',
                icon: 'success'
              })
            })
            .catch(err => {
              console.error(err)
              wx.hideLoading()
              wx.showToast({
                title: '取消失败',
                icon: 'none'
              })
            })
        }
      }
    })
  },

  // 跳转到商品详情
  goToDetail: function (e) {
    const goodsId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${goodsId}`
    })
  }
}) 