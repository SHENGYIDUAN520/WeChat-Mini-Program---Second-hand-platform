const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    isAdmin: false,
    loading: false,
    activeTab: 0,
    tabs: ['商品管理', '用户管理', '数据统计', '系统设置'],
    goodsList: [],
    userList: [],
    statistics: {
      totalUsers: 0,
      totalGoods: 0,
      totalOrders: 0,
      totalAmount: 0,
      todayUsers: 0,
      todayGoods: 0,
      todayOrders: 0,
      todayAmount: 0
    },
    goodsPage: 0,
    userPage: 0,
    pageSize: 10,
    hasMoreGoods: true,
    hasMoreUsers: true,
    searchKeyword: '',
    goodsStatus: -1, // -1: 全部, 0: 下架, 1: 在售, 2: 已售出
    categories: []
  },

  onLoad: function (options) {
    // 检查是否是管理员
    this.checkAdminStatus()
  },

  onPullDownRefresh: function () {
    this.refreshCurrentTab().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom: function () {
    const { activeTab } = this.data
    if (activeTab === 0 && this.data.hasMoreGoods) {
      this.loadMoreGoods()
    } else if (activeTab === 1 && this.data.hasMoreUsers) {
      this.loadMoreUsers()
    }
  },

  // 检查管理员状态
  checkAdminStatus: function () {
    this.setData({
      loading: true
    })

    wx.cloud.callFunction({
      name: 'checkAdmin',
      success: res => {
        const isAdmin = res.result && res.result.isAdmin
        this.setData({
          isAdmin: isAdmin,
          loading: false
        })

        if (isAdmin) {
          // 加载分类
          this.loadCategories()
          // 加载初始数据
          this.loadGoodsList()
        } else {
          wx.showModal({
            title: '提示',
            content: '您没有管理员权限',
            showCancel: false,
            success: () => {
              wx.switchTab({
                url: '/pages/index/index'
              })
            }
          })
        }
      },
      fail: err => {
        console.error('检查管理员状态失败', err)
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '系统错误',
          icon: 'none'
        })
      }
    })
  },

  // 切换标签页
  switchTab: function (e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      activeTab: index
    })

    this.refreshCurrentTab()
  },

  // 刷新当前标签页数据
  refreshCurrentTab: function () {
    const { activeTab } = this.data
    
    if (activeTab === 0) {
      // 商品管理
      this.setData({
        goodsList: [],
        goodsPage: 0,
        hasMoreGoods: true
      })
      return this.loadGoodsList()
    } else if (activeTab === 1) {
      // 用户管理
      this.setData({
        userList: [],
        userPage: 0,
        hasMoreUsers: true
      })
      return this.loadUserList()
    } else if (activeTab === 2) {
      // 数据统计
      return this.loadStatistics()
    } else {
      return Promise.resolve()
    }
  },

  // 加载分类
  loadCategories: function () {
    db.collection('categories')
      .get()
      .then(res => {
        this.setData({
          categories: res.data
        })
      })
      .catch(err => {
        console.error('加载分类失败', err)
      })
  },

  // 加载商品列表
  loadGoodsList: function () {
    this.setData({
      loading: true
    })

    // 构建查询条件
    let query = db.collection('goods')
    
    // 添加状态筛选
    if (this.data.goodsStatus !== -1) {
      query = query.where({
        status: this.data.goodsStatus
      })
    }
    
    // 添加关键词搜索
    if (this.data.searchKeyword) {
      query = query.where(_.or([
        {
          title: db.RegExp({
            regexp: this.data.searchKeyword,
            options: 'i'
          })
        },
        {
          description: db.RegExp({
            regexp: this.data.searchKeyword,
            options: 'i'
          })
        }
      ]))
    }
    
    return query
      .orderBy('createTime', 'desc')
      .skip(this.data.goodsPage * this.data.pageSize)
      .limit(this.data.pageSize)
      .get()
      .then(res => {
        const hasMore = res.data.length === this.data.pageSize
        
        this.setData({
          goodsList: [...this.data.goodsList, ...res.data],
          goodsPage: this.data.goodsPage + 1,
          hasMoreGoods: hasMore,
          loading: false
        })
      })
      .catch(err => {
        console.error('加载商品列表失败', err)
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      })
  },

  // 加载更多商品
  loadMoreGoods: function () {
    if (this.data.loading) return
    this.loadGoodsList()
  },

  // 加载用户列表
  loadUserList: function () {
    this.setData({
      loading: true
    })

    // 构建查询条件
    let query = db.collection('users')
    
    // 添加关键词搜索
    if (this.data.searchKeyword) {
      query = query.where(_.or([
        {
          nickName: db.RegExp({
            regexp: this.data.searchKeyword,
            options: 'i'
          })
        },
        {
          campus: db.RegExp({
            regexp: this.data.searchKeyword,
            options: 'i'
          })
        }
      ]))
    }
    
    return query
      .orderBy('createTime', 'desc')
      .skip(this.data.userPage * this.data.pageSize)
      .limit(this.data.pageSize)
      .get()
      .then(res => {
        const hasMore = res.data.length === this.data.pageSize
        
        this.setData({
          userList: [...this.data.userList, ...res.data],
          userPage: this.data.userPage + 1,
          hasMoreUsers: hasMore,
          loading: false
        })
      })
      .catch(err => {
        console.error('加载用户列表失败', err)
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      })
  },

  // 加载更多用户
  loadMoreUsers: function () {
    if (this.data.loading) return
    this.loadUserList()
  },

  // 加载统计数据
  loadStatistics: function () {
    this.setData({
      loading: true
    })

    return wx.cloud.callFunction({
      name: 'getStatistics',
      success: res => {
        if (res.result && res.result.success) {
          this.setData({
            statistics: res.result.data,
            loading: false
          })
        } else {
          this.setData({
            loading: false
          })
          wx.showToast({
            title: '加载统计数据失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        console.error('加载统计数据失败', err)
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    })
  },

  // 搜索
  onSearchInput: function (e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 执行搜索
  doSearch: function () {
    const { activeTab } = this.data
    
    if (activeTab === 0) {
      this.setData({
        goodsList: [],
        goodsPage: 0,
        hasMoreGoods: true
      })
      this.loadGoodsList()
    } else if (activeTab === 1) {
      this.setData({
        userList: [],
        userPage: 0,
        hasMoreUsers: true
      })
      this.loadUserList()
    }
  },

  // 切换商品状态筛选
  changeGoodsStatus: function (e) {
    const status = parseInt(e.currentTarget.dataset.status)
    this.setData({
      goodsStatus: status,
      goodsList: [],
      goodsPage: 0,
      hasMoreGoods: true
    })
    this.loadGoodsList()
  },

  // 查看商品详情
  viewGoodsDetail: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    })
  },

  // 查看用户详情
  viewUserDetail: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/profile/profile?userId=${id}`
    })
  },

  // 下架商品
  takeDownGoods: function (e) {
    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    
    wx.showModal({
      title: '确认下架',
      content: '确定要下架该商品吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中',
          })
          
          wx.cloud.callFunction({
            name: 'updateGoodsStatus',
            data: {
              goodsId: id,
              status: 0 // 下架状态
            },
            success: res => {
              wx.hideLoading()
              
              if (res.result && res.result.success) {
                // 更新本地数据
                const goodsList = this.data.goodsList
                goodsList[index].status = 0
                
                this.setData({
                  goodsList: goodsList
                })
                
                wx.showToast({
                  title: '下架成功',
                  icon: 'success'
                })
              } else {
                wx.showToast({
                  title: '操作失败',
                  icon: 'none'
                })
              }
            },
            fail: err => {
              console.error('下架商品失败', err)
              wx.hideLoading()
              wx.showToast({
                title: '操作失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 上架商品
  putOnGoods: function (e) {
    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    
    wx.showModal({
      title: '确认上架',
      content: '确定要上架该商品吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中',
          })
          
          wx.cloud.callFunction({
            name: 'updateGoodsStatus',
            data: {
              goodsId: id,
              status: 1 // 在售状态
            },
            success: res => {
              wx.hideLoading()
              
              if (res.result && res.result.success) {
                // 更新本地数据
                const goodsList = this.data.goodsList
                goodsList[index].status = 1
                
                this.setData({
                  goodsList: goodsList
                })
                
                wx.showToast({
                  title: '上架成功',
                  icon: 'success'
                })
              } else {
                wx.showToast({
                  title: '操作失败',
                  icon: 'none'
                })
              }
            },
            fail: err => {
              console.error('上架商品失败', err)
              wx.hideLoading()
              wx.showToast({
                title: '操作失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 删除商品
  deleteGoods: function (e) {
    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该商品吗？此操作不可恢复！',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中',
          })
          
          wx.cloud.callFunction({
            name: 'deleteGoods',
            data: {
              goodsId: id
            },
            success: res => {
              wx.hideLoading()
              
              if (res.result && res.result.success) {
                // 更新本地数据
                const goodsList = this.data.goodsList
                goodsList.splice(index, 1)
                
                this.setData({
                  goodsList: goodsList
                })
                
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
              } else {
                wx.showToast({
                  title: '删除失败',
                  icon: 'none'
                })
              }
            },
            fail: err => {
              console.error('删除商品失败', err)
              wx.hideLoading()
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 禁用用户
  banUser: function (e) {
    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    
    wx.showModal({
      title: '确认禁用',
      content: '确定要禁用该用户吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中',
          })
          
          wx.cloud.callFunction({
            name: 'updateUserStatus',
            data: {
              userId: id,
              status: 0 // 禁用状态
            },
            success: res => {
              wx.hideLoading()
              
              if (res.result && res.result.success) {
                // 更新本地数据
                const userList = this.data.userList
                userList[index].status = 0
                
                this.setData({
                  userList: userList
                })
                
                wx.showToast({
                  title: '禁用成功',
                  icon: 'success'
                })
              } else {
                wx.showToast({
                  title: '操作失败',
                  icon: 'none'
                })
              }
            },
            fail: err => {
              console.error('禁用用户失败', err)
              wx.hideLoading()
              wx.showToast({
                title: '操作失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 启用用户
  enableUser: function (e) {
    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    
    wx.showModal({
      title: '确认启用',
      content: '确定要启用该用户吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中',
          })
          
          wx.cloud.callFunction({
            name: 'updateUserStatus',
            data: {
              userId: id,
              status: 1 // 正常状态
            },
            success: res => {
              wx.hideLoading()
              
              if (res.result && res.result.success) {
                // 更新本地数据
                const userList = this.data.userList
                userList[index].status = 1
                
                this.setData({
                  userList: userList
                })
                
                wx.showToast({
                  title: '启用成功',
                  icon: 'success'
                })
              } else {
                wx.showToast({
                  title: '操作失败',
                  icon: 'none'
                })
              }
            },
            fail: err => {
              console.error('启用用户失败', err)
              wx.hideLoading()
              wx.showToast({
                title: '操作失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 初始化分类数据
  initCategories: function () {
    this.setData({
      loading: true
    })
    
    wx.showLoading({
      title: '初始化中...',
    })
    
    wx.cloud.callFunction({
      name: 'initCategories',
      success: res => {
        console.log('初始化分类数据成功', res)
        wx.hideLoading()
        this.setData({
          loading: false
        })
        
        if (res.result && res.result.success) {
          wx.showToast({
            title: '初始化成功',
            icon: 'success'
          })
          
          // 重新加载分类
          this.loadCategories()
        } else {
          wx.showToast({
            title: '初始化失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        console.error('初始化分类数据失败', err)
        wx.hideLoading()
        this.setData({
          loading: false
        })
        wx.showToast({
          title: '初始化失败',
          icon: 'none'
        })
      }
    })
  }
}) 