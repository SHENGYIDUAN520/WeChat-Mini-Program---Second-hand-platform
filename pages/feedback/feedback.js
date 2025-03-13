const db = wx.cloud.database()
const app = getApp()

Page({
  data: {
    feedbackType: '', // bug, suggestion, complaint, other
    content: '',
    contact: '',
    images: [],
    canSubmit: false,
    showSuccess: false
  },

  onLoad: function (options) {
    // 默认选择第一个反馈类型
    this.setData({
      feedbackType: 'bug'
    })
    this.checkCanSubmit()
  },

  // 选择反馈类型
  selectType: function (e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      feedbackType: type
    })
    this.checkCanSubmit()
  },

  // 输入反馈内容
  inputContent: function (e) {
    this.setData({
      content: e.detail.value
    })
    this.checkCanSubmit()
  },

  // 输入联系方式
  inputContact: function (e) {
    this.setData({
      contact: e.detail.value
    })
  },

  // 选择图片
  chooseImage: function () {
    const that = this
    wx.chooseImage({
      count: 3 - that.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        // 返回选定照片的本地文件路径列表
        that.setData({
          images: [...that.data.images, ...res.tempFilePaths]
        })
      }
    })
  },

  // 预览图片
  previewImage: function (e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    })
  },

  // 删除图片
  deleteImage: function (e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.images
    images.splice(index, 1)
    this.setData({
      images: images
    })
  },

  // 检查是否可以提交
  checkCanSubmit: function () {
    const { feedbackType, content } = this.data
    const canSubmit = feedbackType && content.trim().length > 0
    this.setData({
      canSubmit: canSubmit
    })
  },

  // 提交反馈
  submitFeedback: function () {
    if (!this.data.canSubmit) return

    const that = this
    const { feedbackType, content, contact, images } = this.data

    // 检查登录状态
    if (!app.globalData.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再提交反馈',
        showCancel: false,
        success: function (res) {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/profile/profile'
            })
          }
        }
      })
      return
    }

    wx.showLoading({
      title: '提交中...'
    })

    // 上传图片
    const uploadTasks = []
    if (images.length > 0) {
      images.forEach(imagePath => {
        uploadTasks.push(
          new Promise((resolve, reject) => {
            const extension = imagePath.split('.').pop()
            const cloudPath = `feedback/${Date.now()}-${Math.floor(Math.random() * 1000)}.${extension}`
            
            wx.cloud.uploadFile({
              cloudPath: cloudPath,
              filePath: imagePath,
              success: res => {
                resolve(res.fileID)
              },
              fail: err => {
                console.error(err)
                reject(err)
              }
            })
          })
        )
      })
    }

    Promise.all(uploadTasks)
      .then(fileIDs => {
        // 添加反馈到数据库
        return db.collection('feedback').add({
          data: {
            type: feedbackType,
            content: content,
            contact: contact,
            images: fileIDs,
            createTime: db.serverDate(),
            status: 'pending' // pending, processing, resolved
          }
        })
      })
      .then(() => {
        wx.hideLoading()
        that.setData({
          showSuccess: true
        })
      })
      .catch(err => {
        console.error(err)
        wx.hideLoading()
        wx.showToast({
          title: '提交失败，请重试',
          icon: 'none'
        })
      })
  },

  // 返回个人中心
  backToProfile: function () {
    wx.navigateBack()
  }
}) 