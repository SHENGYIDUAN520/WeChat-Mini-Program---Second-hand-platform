const db = wx.cloud.database()
const _ = db.command

Page({
  /**
   * 页面的初始数据
   */
  data: {
    title: '',
    price: '',
    originalPrice: '',
    description: '',
    location: '',
    images: [],
    category: '',
    categories: [],
    condition: 8, // 默认8成新
    uploading: false,
    formErrors: {}, // 表单错误信息
    showSuccessModal: false, // 发布成功弹窗
    animationData: {}, // 动画数据
    publishedGoodId: '' // 发布成功的商品ID
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadCategories()
    
    // 创建动画实例
    this.animation = wx.createAnimation({
      duration: 500,
      timingFunction: 'ease',
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 页面显示时的入场动画
    this.animation.opacity(0).step()
    this.setData({
      animationData: this.animation.export()
    })
    
    setTimeout(() => {
      this.animation.opacity(1).translateY(0).step()
      this.setData({
        animationData: this.animation.export()
      })
    }, 100)
  },

  /**
   * 加载商品分类
   */
  loadCategories: function () {
    wx.showLoading({
      title: '加载中',
    })
    
    db.collection('categories').get().then(res => {
      this.setData({
        categories: res.data
      })
      wx.hideLoading()
    }).catch(err => {
      console.error('加载分类失败', err)
      wx.hideLoading()
      wx.showToast({
        title: '加载分类失败',
        icon: 'none'
      })
    })
  },

  /**
   * 输入标题
   */
  onInputTitle: function (e) {
    this.setData({
      title: e.detail.value,
      'formErrors.title': ''
    })
  },

  /**
   * 输入价格
   */
  onInputPrice: function (e) {
    this.setData({
      price: e.detail.value,
      'formErrors.price': ''
    })
  },

  /**
   * 输入原价
   */
  onInputOriginalPrice: function (e) {
    this.setData({
      originalPrice: e.detail.value
    })
  },

  /**
   * 输入描述
   */
  onInputDescription: function (e) {
    this.setData({
      description: e.detail.value,
      'formErrors.description': ''
    })
  },

  /**
   * 输入交易地点
   */
  onInputLocation: function (e) {
    this.setData({
      location: e.detail.value
    })
  },

  /**
   * 选择分类
   */
  onCategoryChange: function (e) {
    this.setData({
      category: e.detail.value,
      'formErrors.category': ''
    })
  },

  /**
   * 选择新旧程度
   */
  onConditionChange: function (e) {
    this.setData({
      condition: e.detail.value
    })
  },

  /**
   * 选择图片
   */
  chooseImage: function () {
    const count = 9 - this.data.images.length
    if (count <= 0) {
      wx.showToast({
        title: '最多上传9张图片',
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
          images: [...this.data.images, ...tempFilePaths],
          'formErrors.images': ''
        })
      }
    })
  },

  /**
   * 预览图片
   */
  previewImage: function (e) {
    const current = e.currentTarget.dataset.src
    wx.previewImage({
      current: current,
      urls: this.data.images
    })
  },

  /**
   * 删除图片
   */
  deleteImage: function (e) {
    const index = e.currentTarget.dataset.index
    let images = this.data.images
    images.splice(index, 1)
    this.setData({
      images: images
    })
  },

  /**
   * 验证表单
   */
  validateForm: function () {
    let isValid = true
    let errors = {}

    // 验证标题
    if (!this.data.title.trim()) {
      errors.title = '请输入商品标题'
      isValid = false
    } else if (this.data.title.length > 30) {
      errors.title = '标题最多30个字'
      isValid = false
    }

    // 验证价格
    if (!this.data.price) {
      errors.price = '请输入商品价格'
      isValid = false
    } else if (isNaN(Number(this.data.price)) || Number(this.data.price) <= 0) {
      errors.price = '请输入有效的价格'
      isValid = false
    }

    // 验证分类
    if (this.data.category === '') {
      errors.category = '请选择商品分类'
      isValid = false
    }

    // 验证描述
    if (!this.data.description.trim()) {
      errors.description = '请输入商品描述'
      isValid = false
    } else if (this.data.description.length < 10) {
      errors.description = '描述至少10个字'
      isValid = false
    }

    // 验证图片
    if (this.data.images.length === 0) {
      errors.images = '请至少上传一张图片'
      isValid = false
    }

    this.setData({
      formErrors: errors
    })

    // 如果有错误，添加抖动动画
    if (!isValid) {
      this.shakeForm()
    }

    return isValid
  },

  /**
   * 表单抖动动画
   */
  shakeForm: function () {
    wx.vibrateShort({
      type: 'medium'
    })
    
    this.animation.translateX(-10).step()
    this.animation.translateX(10).step()
    this.animation.translateX(-5).step()
    this.animation.translateX(5).step()
    this.animation.translateX(0).step()
    
    this.setData({
      animationData: this.animation.export()
    })
  },

  /**
   * 提交表单
   */
  submitForm: function () {
    // 表单验证
    if (!this.validateForm()) {
      return
    }

    // 检查用户登录状态
    const app = getApp()
    if (!app.globalData.isLogin || !app.globalData.userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: function (res) {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
      return
    }

    // 设置上传中状态
    this.setData({
      uploading: true
    })

    wx.showLoading({
      title: '发布中...',
      mask: true
    })

    console.log('开始上传图片...')
    // 上传图片
    this.uploadImages().then(fileIDs => {
      console.log('图片上传成功，fileIDs:', fileIDs)
      // 创建商品记录
      return this.createGood(fileIDs)
    }).then(res => {
      console.log('商品创建成功，结果:', res)
      wx.hideLoading()
      
      // 保存发布成功的商品ID
      this.setData({
        uploading: false,
        showSuccessModal: true,
        publishedGoodId: res._id
      })
      
      // 显示成功动画
      this.showSuccessAnimation()
    }).catch(err => {
      console.error('发布失败', err)
      wx.hideLoading()
      this.setData({
        uploading: false
      })
      wx.showToast({
        title: '发布失败，请重试: ' + (err.message || err.errMsg || '未知错误'),
        icon: 'none',
        duration: 3000
      })
    })
  },

  /**
   * 上传图片到云存储
   */
  uploadImages: function () {
    return new Promise((resolve, reject) => {
      if (this.data.images.length === 0) {
        resolve([])
        return
      }

      const uploadTasks = this.data.images.map(filePath => {
        return wx.cloud.uploadFile({
          cloudPath: `goods/${Date.now()}-${Math.floor(Math.random() * 1000000)}.${filePath.match(/\.(\w+)$/)[1]}`,
          filePath: filePath
        })
      })

      Promise.all(uploadTasks).then(results => {
        const fileIDs = results.map(res => res.fileID)
        resolve(fileIDs)
      }).catch(err => {
        reject(err)
      })
    })
  },

  /**
   * 创建商品记录
   */
  createGood: function (fileIDs) {
    const categoryData = this.data.categories[this.data.category]
    const goodData = {
      title: this.data.title,
      price: parseFloat(this.data.price),
      originalPrice: this.data.originalPrice ? parseFloat(this.data.originalPrice) : null,
      description: this.data.description,
      location: this.data.location,
      images: fileIDs,
      categoryId: categoryData._id,
      categoryName: categoryData.name,
      condition: parseInt(this.data.condition),
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      status: 'on_sale', // 修改为字符串 'on_sale'，与my-goods.js中保持一致
      views: 0,
      likes: 0
    }
    
    console.log('准备创建商品，数据:', goodData)
    
    return db.collection('goods').add({
      data: goodData
    })
  },

  /**
   * 显示成功动画
   */
  showSuccessAnimation: function () {
    // 可以添加更多动画效果
  },

  /**
   * 查看发布的商品
   */
  goToDetail: function () {
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${this.data.publishedGoodId}`
    })
  },

  /**
   * 返回首页
   */
  goToHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  /**
   * 分享
   */
  onShareAppMessage: function() {
    return {
      title: '发布二次元周边',
      path: '/pages/publish/publish'
    }
  }
}) 