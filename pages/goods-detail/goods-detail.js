Page({
  data: {
    goods: null,
    seller: null,
    loading: true,
    isFavorite: false,
    isOwner: false,
    showShareMenu: false
  },

  onLoad: function(options) {
    if (options.id) {
      this.setData({
        goodsId: options.id
      })
      this.loadGoodsDetail()
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  onShow: function() {
    // 检查是否已收藏
    this.checkFavoriteStatus()
  },

  // 加载商品详情
  loadGoodsDetail: function() {
    wx.showLoading({
      title: '加载中',
    })
    
    const db = wx.cloud.database()
    
    db.collection('goods')
      .doc(this.data.goodsId)
      .get()
      .then(res => {
        const goods = res.data
        
        // 检查是否是商品所有者
        const app = getApp()
        const isOwner = app.globalData.userInfo && app.globalData.userInfo.openid === goods._openid
        
        this.setData({
          goods: goods,
          loading: false,
          isOwner: isOwner
        })
        
        // 增加浏览量
        if (!isOwner) {
          this.increaseViewCount()
        }
        
        // 获取卖家信息
        this.getSellerInfo(goods._openid)
        
        // 检查是否已收藏
        this.checkFavoriteStatus()
        
        wx.hideLoading()
      })
      .catch(err => {
        console.error(err)
        wx.hideLoading()
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      })
  },

  // 增加浏览量
  increaseViewCount: function() {
    wx.cloud.callFunction({
      name: 'increaseViewCount',
      data: {
        goodsId: this.data.goodsId
      }
    }).catch(err => {
      console.error('增加浏览量失败', err)
    })
  },

  // 检查是否已收藏
  checkFavoriteStatus: function() {
    const app = getApp()
    if (!app.globalData.userInfo) {
      return
    }
    
    const db = wx.cloud.database()
    
    db.collection('favorites')
      .where({
        _openid: app.globalData.userInfo.openid,
        goodsId: this.data.goodsId
      })
      .get()
      .then(res => {
        this.setData({
          isFavorite: res.data.length > 0
        })
      })
      .catch(err => {
        console.error('检查收藏状态失败', err)
      })
  },

  // 收藏/取消收藏
  toggleFavorite: function() {
    const app = getApp()
    if (!app.globalData.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    if (this.data.isOwner) {
      wx.showToast({
        title: '不能收藏自己的商品',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({
      title: this.data.isFavorite ? '取消中' : '收藏中',
    })
    
    const db = wx.cloud.database()
    
    if (this.data.isFavorite) {
      // 取消收藏
      db.collection('favorites')
        .where({
          _openid: app.globalData.userInfo.openid,
          goodsId: this.data.goodsId
        })
        .get()
        .then(res => {
          if (res.data.length > 0) {
            return db.collection('favorites').doc(res.data[0]._id).remove()
          }
          return Promise.reject('未找到收藏记录')
        })
        .then(() => {
          // 更新商品收藏数
          return wx.cloud.callFunction({
            name: 'updateGoodsFavoriteCount',
            data: {
              goodsId: this.data.goodsId,
              type: 'decrease'
            }
          })
        })
        .then(() => {
          wx.hideLoading()
          this.setData({
            isFavorite: false
          })
          wx.showToast({
            title: '已取消收藏',
            icon: 'success'
          })
        })
        .catch(err => {
          console.error('取消收藏失败', err)
          wx.hideLoading()
          wx.showToast({
            title: '操作失败',
            icon: 'none'
          })
        })
    } else {
      // 添加收藏
      db.collection('favorites')
        .add({
          data: {
            goodsId: this.data.goodsId,
            createTime: db.serverDate()
          }
        })
        .then(() => {
          // 更新商品收藏数
          return wx.cloud.callFunction({
            name: 'updateGoodsFavoriteCount',
            data: {
              goodsId: this.data.goodsId,
              type: 'increase'
            }
          })
        })
        .then(() => {
          wx.hideLoading()
          this.setData({
            isFavorite: true
          })
          wx.showToast({
            title: '收藏成功',
            icon: 'success'
          })
        })
        .catch(err => {
          console.error('收藏失败', err)
          wx.hideLoading()
          wx.showToast({
            title: '操作失败',
            icon: 'none'
          })
        })
    }
  },

  // 联系卖家
  contactSeller: function() {
    if (!getApp().globalData.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/chat/chat?targetUserId=${this.data.goods._openid}&goodsId=${this.data.goodsId}`
    })
  },

  // 分享
  onShareAppMessage: function() {
    return {
      title: this.data.goods.title,
      path: `/pages/goods-detail/goods-detail?id=${this.data.goodsId}`,
      imageUrl: this.data.goods.images[0]
    }
  },

  // 显示分享菜单
  showShare: function() {
    this.setData({
      showShareMenu: true
    })
  },

  // 隐藏分享菜单
  hideShare: function() {
    this.setData({
      showShareMenu: false
    })
  },

  // 分享到朋友圈
  shareToMoments: function() {
    // 微信小程序暂不支持直接分享到朋友圈
    // 可以提示用户保存图片后手动分享
    wx.showModal({
      title: '分享到朋友圈',
      content: '保存商品图片，可分享到朋友圈',
      confirmText: '保存图片',
      success: res => {
        if (res.confirm) {
          this.saveImage()
        }
      }
    })
    this.hideShare()
  },

  // 保存图片
  saveImage: function() {
    wx.showLoading({
      title: '保存中',
    })
    
    wx.downloadFile({
      url: this.data.goods.images[0],
      success: res => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading()
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            })
          },
          fail: err => {
            wx.hideLoading()
            console.error('保存图片失败', err)
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            })
          }
        })
      },
      fail: err => {
        wx.hideLoading()
        console.error('下载图片失败', err)
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    })
  },

  buyNow: function() {
    if (!wx.getStorageSync('userInfo')) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    const that = this;
    wx.showModal({
      title: '确认购买',
      content: '确定要购买这个商品吗？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '创建订单中',
          });
          
          // 创建订单
          wx.cloud.callFunction({
            name: 'createOrder',
            data: {
              goodsId: that.data.goods._id,
              sellerId: that.data.goods._openid,
              price: that.data.goods.price
            },
            success: res => {
              wx.hideLoading();
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '下单成功',
                  icon: 'success'
                });
                
                // 跳转到订单详情页
                setTimeout(() => {
                  wx.navigateTo({
                    url: '/pages/order-detail/order-detail?id=' + res.result.orderId
                  });
                }, 1500);
              } else {
                wx.showToast({
                  title: res.result.message || '下单失败',
                  icon: 'none'
                });
              }
            },
            fail: err => {
              wx.hideLoading();
              wx.showToast({
                title: '下单失败，请重试',
                icon: 'none'
              });
              console.error('[云函数] [createOrder] 调用失败：', err);
            }
          });
        }
      }
    });
  },

  // 获取卖家信息
  getSellerInfo: function(sellerId) {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      data: {
        userId: sellerId
      },
      success: (res) => {
        if (res.result && res.result.success) {
          this.setData({
            seller: res.result.data
          })
        }
      }
    })
  },

  // 查看卖家评价
  viewSellerReviews: function() {
    if (!this.data.seller || !this.data.seller._openid) {
      return
    }
    
    wx.navigateTo({
      url: `/pages/user-reviews/user-reviews?userId=${this.data.seller._openid}&userName=${this.data.seller.nickName || '未知用户'}&type=seller`
    })
  },

  // 查看商品评价
  viewGoodsReviews: function() {
    if (!this.data.goods || !this.data.goods._id) {
      return
    }
    
    wx.navigateTo({
      url: `/pages/goods-reviews/goods-reviews?goodsId=${this.data.goods._id}&title=${this.data.goods.title || '商品'}`
    })
  }
}) 