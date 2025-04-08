Page({
  onLoad: function() {
    wx.cloud.callFunction({
      name: 'initCategories',
      success: res => {
        console.log('初始化分类成功', res)
        wx.showToast({
          title: '初始化成功',
          icon: 'success'
        })
      },
      fail: err => {
        console.error('初始化分类失败', err)
        wx.showToast({
          title: '初始化失败',
          icon: 'none'
        })
      }
    })
  }
}) 