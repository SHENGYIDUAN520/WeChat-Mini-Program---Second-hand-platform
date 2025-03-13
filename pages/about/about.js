// pages/about/about.js
Page({
  data: {
    // 页面数据
  },

  onLoad: function (options) {
    // 页面加载时执行
  },

  onShareAppMessage: function () {
    // 用户点击右上角分享
    return {
      title: '校园二手交易平台 - 关于我们',
      path: '/pages/about/about'
    }
  },

  // 复制联系方式
  copyContact: function (e) {
    const text = e.currentTarget.dataset.text
    wx.setClipboardData({
      data: text,
      success: function () {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        })
      }
    })
  }
}) 