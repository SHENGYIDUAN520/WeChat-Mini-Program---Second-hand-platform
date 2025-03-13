const db = wx.cloud.database()

Page({
  data: {
    goodsId: '',
    goods: null,
    seller: null,
    loading: true,
    isOwner: false,
    isFavorite: false
  },

  onLoad: function(options) {
    const goodsId = options.id
    this.setData({
      goodsId: goodsId
    })
    this.loadGoodsDetail(goodsId)
  },

  loadGoodsDetail: function(goodsId) {
    this.setData({
      loading: true
    })
    
    // 检查goodsId是否有效
    if (!goodsId) {
      wx.showToast({
        title: '商品ID无效',
        icon: 'none'
      })
      this.setData({
        loading: false
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    // 获取商品详情
    db.collection('goods')
      .doc(goodsId)
      .get()
      .then(res => {
        const goods = res.data
        
        // 更新浏览次数
        db.collection('goods').doc(goodsId).update({
          data: {
            views: db.command.inc(1)
          }
        })
        
        // 获取卖家信息
        return db.collection('users')
          .where({
            openid: goods._openid
          })
          .get()
          .then(userRes => {
            const seller = userRes.data[0] || { nickName: '未知用户' }
            
            // 判断是否是自己的商品
            const isOwner = getApp().globalData.isLogin && 
                           getApp().globalData.userInfo && 
                           getApp().globalData.userInfo.openid === goods._openid
            
            this.setData({
              goods: goods,
              seller: seller,
              loading: false,
              isOwner: isOwner
            })
            
            // 检查是否已收藏
            if (getApp().globalData.isLogin) {
              this.checkFavorite()
            }
          })
      })
      .catch(err => {
        console.error('加载商品详情失败:', err)
        this.setData({
          loading: false
        })
        
        // 显示更友好的错误提示
        if (err.errCode === -1 || err.errMsg.includes('cannot find document')) {
          wx.showModal({
            title: '提示',
            content: '该商品不存在或已被删除',
            showCancel: false,
            success: () => {
              wx.navigateBack()
            }
          })
        } else {
          wx.showToast({
            title: '加载失败，请重试',
            icon: 'none'
          })
        }
      })
  },

  // 检查是否已收藏
  checkFavorite: function() {
    if (!getApp().globalData.isLogin) {
      return
    }

    const userId = getApp().globalData.userInfo.openid
    
    db.collection('favorites')
      .where({
        userId: userId,
        goodsId: this.data.goodsId
      })
      .get()
      .then(res => {
        this.setData({
          isFavorite: res.data.length > 0
        })
      })
      .catch(err => {
        console.error('检查收藏状态失败：', err)
      })
  },

  // 切换收藏状态
  toggleFavorite: function() {
    if (!getApp().globalData.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再收藏',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
      return
    }

    wx.showLoading({
      title: '处理中...',
      mask: true
    })
    
    wx.cloud.callFunction({
      name: 'toggleFavorite',
      data: {
        goodsId: this.data.goodsId
      },
      success: (res) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          this.setData({
            isFavorite: res.result.isFavorite
          })
          
          wx.showToast({
            title: res.result.message,
            icon: 'success'
          })
        } else {
          console.error('收藏失败：', res.result)
          wx.showToast({
            title: res.result.message || '操作失败，请重试',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('调用收藏云函数失败：', err)
        wx.hideLoading()
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 预览图片
  previewImage: function(e) {
    const current = e.currentTarget.dataset.src
    wx.previewImage({
      current: current,
      urls: this.data.goods.images
    })
  },

  // 联系卖家
  contactSeller: function() {
    if (!getApp().globalData.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再联系卖家',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/chat/chat?targetUserId=${this.data.goods._openid}&goodsId=${this.data.goodsId}`
    })
  },

  // 购买商品
  buyGoods: function() {
    if (!getApp().globalData.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再购买',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
      return
    }
    
    wx.showModal({
      title: '确认购买',
      content: `确定要购买"${this.data.goods.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          // 创建订单
          wx.cloud.callFunction({
            name: 'createOrder',
            data: {
              goodsId: this.data.goodsId,
              sellerId: this.data.goods._openid,
              price: this.data.goods.price
            },
            success: (res) => {
              if (res.result && res.result.success) {
                // 更新商品状态为已售出
                db.collection('goods').doc(this.data.goodsId).update({
                  data: {
                    status: 2
                  }
                }).then(() => {
                  wx.showToast({
                    title: '购买成功',
                    icon: 'success'
                  })
                  
                  // 刷新页面
                  this.loadGoodsDetail(this.data.goodsId)
                })
              } else {
                wx.showToast({
                  title: res.result.message || '购买失败，请重试',
                  icon: 'none'
                })
              }
            },
            fail: (err) => {
              console.error(err)
              wx.showToast({
                title: '购买失败，请重试',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 编辑商品
  editGoods: function() {
    wx.navigateTo({
      url: `/pages/edit-goods/edit-goods?id=${this.data.goodsId}`
    })
  },

  // 下架商品
  offShelfGoods: function() {
    wx.showModal({
      title: '确认下架',
      content: '确定要下架该商品吗？',
      success: (res) => {
        if (res.confirm) {
          db.collection('goods').doc(this.data.goodsId).update({
            data: {
              status: 0
            }
          }).then(() => {
            wx.showToast({
              title: '下架成功',
              icon: 'success'
            })
            
            // 刷新页面
            this.loadGoodsDetail(this.data.goodsId)
          }).catch(err => {
            console.error(err)
            wx.showToast({
              title: '操作失败，请重试',
              icon: 'none'
            })
          })
        }
      }
    })
  },

  // 重新上架
  relistGoods: function() {
    db.collection('goods').doc(this.data.goodsId).update({
      data: {
        status: 1
      }
    }).then(() => {
      wx.showToast({
        title: '上架成功',
        icon: 'success'
      })
      
      // 刷新页面
      this.loadGoodsDetail(this.data.goodsId)
    }).catch(err => {
      console.error(err)
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      })
    })
  }
}) 