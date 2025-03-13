const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    orderId: '',
    order: null,
    goods: null,
    seller: null,
    rating: 5,
    content: '',
    images: [],
    anonymous: false,
    submitting: false,
    maxImageCount: 3,
    tags: ['质量好', '描述相符', '态度好', '发货快', '价格合理', '包装好'],
    selectedTags: [],
    loading: true,
    isReviewer: false, // 是否为评价者（买家或卖家）
    reviewType: '' // 'buyer' 或 'seller'
  },

  onLoad: function(options) {
    const { orderId, type } = options
    
    if (!orderId || !type) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    // 检查是否已登录
    if (!app.globalData.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再评价',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
      return
    }
    
    this.setData({
      orderId: orderId,
      reviewType: type,
      isReviewer: type === 'buyer' ? true : false
    })
    
    // 加载订单信息
    this.loadOrderDetail()
  },
  
  // 加载订单详情
  loadOrderDetail: function() {
    this.setData({
      loading: true
    })
    
    wx.cloud.callFunction({
      name: 'getOrderDetail',
      data: {
        orderId: this.data.orderId
      },
      success: (res) => {
        if (res.result && res.result.success) {
          const order = res.result.data.order
          const goods = res.result.data.goods
          const buyer = res.result.data.buyer
          const seller = res.result.data.seller
          
          // 确定目标用户（被评价者）
          const targetUser = this.data.reviewType === 'buyer' ? seller : buyer
          
          this.setData({
            order: order,
            goods: goods,
            targetUser: targetUser,
            loading: false
          })
          
          // 检查是否已评价
          this.checkReviewStatus()
        } else {
          this.setData({
            loading: false
          })
          wx.showToast({
            title: '加载订单失败',
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
          title: '加载订单失败',
          icon: 'none'
        })
      }
    })
  },
  
  // 检查是否已评价
  checkReviewStatus: function() {
    const currentUserId = app.globalData.userInfo.openid
    const reviewType = this.data.reviewType
    
    wx.cloud.callFunction({
      name: 'checkReview',
      data: {
        orderId: this.data.orderId,
        reviewType: reviewType
      },
      success: (res) => {
        if (res.result && res.result.success) {
          const hasReviewed = res.result.data.hasReviewed
          
          if (hasReviewed) {
            wx.showModal({
              title: '提示',
              content: '您已经评价过该订单',
              showCancel: false,
              success: () => {
                wx.navigateBack()
              }
            })
          }
        }
      }
    })
  },
  
  // 设置评分
  setRating: function(e) {
    const rating = e.currentTarget.dataset.rating
    this.setData({
      rating: rating
    })
  },
  
  // 输入评价内容
  onInputContent: function(e) {
    this.setData({
      content: e.detail.value
    })
  },
  
  // 选择标签
  toggleTag: function(e) {
    const tag = e.currentTarget.dataset.tag
    const selectedTags = this.data.selectedTags
    
    const index = selectedTags.indexOf(tag)
    if (index > -1) {
      selectedTags.splice(index, 1)
    } else {
      if (selectedTags.length < 3) {
        selectedTags.push(tag)
      } else {
        wx.showToast({
          title: '最多选择3个标签',
          icon: 'none'
        })
        return
      }
    }
    
    this.setData({
      selectedTags: selectedTags
    })
  },
  
  // 切换匿名评价
  toggleAnonymous: function() {
    this.setData({
      anonymous: !this.data.anonymous
    })
  },
  
  // 选择图片
  chooseImage: function() {
    const count = this.data.maxImageCount - this.data.images.length
    if (count <= 0) {
      wx.showToast({
        title: `最多上传${this.data.maxImageCount}张图片`,
        icon: 'none'
      })
      return
    }
    
    wx.chooseMedia({
      count: count,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      success: res => {
        // 获取选中的图片临时路径
        let tempFiles = res.tempFiles
        let tempFilePaths = tempFiles.map(file => file.tempFilePath)
        
        // 添加到图片数组
        this.setData({
          images: [...this.data.images, ...tempFilePaths]
        })
      }
    })
  },
  
  // 预览图片
  previewImage: function(e) {
    const current = e.currentTarget.dataset.src
    wx.previewImage({
      current: current,
      urls: this.data.images
    })
  },
  
  // 删除图片
  deleteImage: function(e) {
    const index = e.currentTarget.dataset.index
    let images = this.data.images
    images.splice(index, 1)
    this.setData({
      images: images
    })
  },
  
  // 提交评价
  submitReview: function() {
    // 验证评价内容
    if (!this.data.content.trim()) {
      wx.showToast({
        title: '请输入评价内容',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      submitting: true
    })
    
    wx.showLoading({
      title: '提交中',
    })
    
    // 上传图片
    const uploadTasks = this.data.images.map(filePath => {
      return new Promise((resolve, reject) => {
        const cloudPath = `review_images/${this.data.orderId}_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}.${filePath.match(/\.(\w+)$/)[1]}`
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: filePath,
          success: res => {
            resolve(res.fileID)
          },
          fail: err => {
            reject(err)
          }
        })
      })
    })
    
    Promise.all(uploadTasks)
      .then(fileIDs => {
        // 创建评价记录
        return db.collection('reviews').add({
          data: {
            orderId: this.data.orderId,
            goodsId: this.data.goods._id,
            sellerId: this.data.order.sellerId,
            buyerId: this.data.order.buyerId,
            rating: this.data.rating,
            content: this.data.content,
            tags: this.data.selectedTags,
            images: fileIDs,
            anonymous: this.data.anonymous,
            createTime: db.serverDate()
          }
        })
      })
      .then(() => {
        // 更新订单状态为已评价
        return db.collection('orders').doc(this.data.orderId).update({
          data: {
            status: 4, // 假设4表示已评价
            reviewTime: db.serverDate()
          }
        })
      })
      .then(() => {
        // 更新卖家评分
        return wx.cloud.callFunction({
          name: 'updateUserRating',
          data: {
            userId: this.data.order.sellerId,
            rating: this.data.rating,
            type: 'seller'
          }
        })
      })
      .then(() => {
        wx.hideLoading()
        this.setData({
          submitting: false
        })
        
        wx.showToast({
          title: '评价成功',
          icon: 'success'
        })
        
        // 延迟返回
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      })
      .catch(err => {
        console.error(err)
        wx.hideLoading()
        this.setData({
          submitting: false
        })
        
        wx.showToast({
          title: '评价失败，请重试',
          icon: 'none'
        })
      })
  }
}) 