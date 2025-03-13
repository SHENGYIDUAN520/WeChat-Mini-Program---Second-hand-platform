Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      nickName: '',
      avatarUrl: '',
      gender: 0,
      campus: '',
      signature: ''
    },
    campusList: ['北京大学', '清华大学', '复旦大学', '上海交通大学', '浙江大学', '南京大学', '武汉大学', '中山大学'],
    campusIndex: -1,
    signatureLength: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadUserInfo();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo: function () {
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 设置校区索引
    let campusIndex = -1;
    if (userInfo.campus) {
      campusIndex = this.data.campusList.findIndex(item => item === userInfo.campus);
    }
    
    this.setData({
      userInfo: userInfo,
      campusIndex: campusIndex >= 0 ? campusIndex : 0,
      signatureLength: userInfo.signature ? userInfo.signature.length : 0
    });
  },

  /**
   * 返回上一页
   */
  navigateBack: function () {
    wx.navigateBack({
      delta: 1
    });
  },

  /**
   * 选择头像
   */
  chooseAvatar: function () {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        // 显示加载中
        wx.showLoading({
          title: '上传中...',
          mask: true
        });
        
        // 模拟上传过程
        setTimeout(function () {
          const tempFilePath = res.tempFilePaths[0];
          
          // 更新头像
          let userInfo = that.data.userInfo;
          userInfo.avatarUrl = tempFilePath;
          
          that.setData({
            userInfo: userInfo
          });
          
          wx.hideLoading();
          wx.showToast({
            title: '头像已更新',
            icon: 'success'
          });
        }, 1500);
      }
    });
  },

  /**
   * 输入昵称
   */
  inputNickname: function (e) {
    let userInfo = this.data.userInfo;
    userInfo.nickName = e.detail.value;
    
    this.setData({
      userInfo: userInfo
    });
  },

  /**
   * 选择性别
   */
  selectGender: function (e) {
    const gender = parseInt(e.currentTarget.dataset.gender);
    let userInfo = this.data.userInfo;
    userInfo.gender = gender;
    
    this.setData({
      userInfo: userInfo
    });
  },

  /**
   * 选择校区
   */
  selectCampus: function (e) {
    const index = e.detail.value;
    let userInfo = this.data.userInfo;
    userInfo.campus = this.data.campusList[index];
    
    this.setData({
      userInfo: userInfo,
      campusIndex: index
    });
  },

  /**
   * 输入个性签名
   */
  inputSignature: function (e) {
    let userInfo = this.data.userInfo;
    userInfo.signature = e.detail.value;
    
    this.setData({
      userInfo: userInfo,
      signatureLength: e.detail.value.length
    });
  },

  /**
   * 保存个人资料
   */
  saveProfile: function () {
    const that = this;
    const userInfo = this.data.userInfo;
    
    // 验证昵称
    if (!userInfo.nickName || userInfo.nickName.trim() === '') {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载中
    wx.showLoading({
      title: '保存中...',
      mask: true
    });
    
    // 模拟保存过程
    setTimeout(function () {
      // 保存到本地存储
      wx.setStorageSync('userInfo', userInfo);
      
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 返回上一页
      setTimeout(function () {
        wx.navigateBack({
          delta: 1
        });
      }, 1500);
    }, 1000);
  }
}) 