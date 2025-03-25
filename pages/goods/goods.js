const db = wx.cloud.database()
const _ = db.command
const app = getApp()

Page({
  data: {
    goodsList: [],
    categories: [],
    selectedCategory: '',
    searchValue: '',
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 0,
    pageSize: 10,
    sortType: 'time', // time-最新发布，price-价格，views-热度
    sortOrder: 'desc', // desc-降序，asc-升序
    showFilter: false,
    showBackToTop: false,
    isRefreshing: false,
    scrollTop: 0,
    priceRange: 'all', // all, under50, 50to100, 100to200, above200
    onlyNew: false
  },

  onLoad: function(options) {
    console.log('goods页面接收到的参数:', options);
    
    // 如果有分类参数，设置选中的分类
    if (options.category) {
      // 分类ID可能为数字
      const categoryId = options.category;
      
      this.setData({
        selectedCategory: categoryId
      });
      
      // 设置标题为分类名称
      if (options.categoryName) {
        try {
          const categoryName = decodeURIComponent(options.categoryName);
          wx.setNavigationBarTitle({
            title: categoryName || '商品列表'
          });
          console.log('设置导航栏标题:', categoryName);
        } catch (err) {
          console.error('解码分类名称失败', err);
        }
      }
    }
    
    // 如果有搜索参数，设置搜索值
    if (options.search) {
      this.setData({
        searchValue: options.search
      });
    }
    
    // 加载分类列表
    this.loadCategories();
    
    // 加载商品列表
    this.loadGoodsList(true);
  },
  
  // 加载分类列表
  loadCategories: function() {
    wx.showLoading({
      title: '加载中...',
    })
    
    db.collection('categories')
      .orderBy('sort', 'asc')
      .get()
      .then(res => {
        this.setData({
          categories: res.data
        })
        wx.hideLoading()
      })
      .catch(err => {
        console.error('加载分类失败', err)
        wx.hideLoading()
        wx.showToast({
          title: '加载分类失败',
          icon: 'none'
        })
      })
  },
  
  // 加载商品列表
  loadGoodsList: function(refresh = false) {
    if (refresh) {
      this.setData({
        page: 0,
        goodsList: [],
        loading: true,
        hasMore: true
      });
    } else {
      if (!this.data.hasMore || this.data.loadingMore) {
        return;
      }
      this.setData({
        loadingMore: true
      });
    }
    
    const page = this.data.page;
    const pageSize = this.data.pageSize;
    
    // 构建查询条件
    let query = {
      status: 'on_sale' // 只查询在售商品
    };
    
    // 如果有选中分类，添加分类条件
    if (this.data.selectedCategory) {
      // 尝试通过category_id或category字段查询
      // 在控制台输出日志便于调试
      console.log('查询分类:', this.data.selectedCategory);
      
      // 使用逻辑或查询，同时匹配category_id和category字段
      query = db.command.or([
        { category_id: this.data.selectedCategory },
        { category: this.data.selectedCategory }
      ]);
    }
    
    // 如果有搜索关键词，添加标题搜索条件
    if (this.data.searchValue) {
      query.title = db.RegExp({
        regexp: this.data.searchValue,
        options: 'i'
      })
    }
    
    // 添加价格区间条件
    if (this.data.priceRange !== 'all') {
      switch (this.data.priceRange) {
        case 'under50':
          query.price = _.lt(50)
          break
        case '50to100':
          query.price = _.gte(50).and(_.lt(100))
          break
        case '100to200':
          query.price = _.gte(100).and(_.lt(200))
          break
        case 'above200':
          query.price = _.gte(200)
          break
      }
    }
    
    // 只看新品条件
    if (this.data.onlyNew) {
      // 计算7天前的日期
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      query.createTime = _.gte(sevenDaysAgo)
    }
    
    // 构建排序条件
    let orderField = 'createTime'
    if (this.data.sortType === 'price') {
      orderField = 'price'
    } else if (this.data.sortType === 'views') {
      orderField = 'viewCount'
    }
    
    let orderDirection = 'desc'
    if (this.data.sortOrder === 'asc') {
      orderDirection = 'asc'
    }
    
    // 查询商品列表
    db.collection('goods')
      .where(query)
      .orderBy(orderField, orderDirection)
      .skip(page * pageSize)
      .limit(pageSize)
      .get()
      .then(res => {
        const newGoods = res.data.map(item => {
          // 处理日期格式
          if (item.createTime) {
            const date = new Date(item.createTime)
            item.createTime = `${date.getMonth() + 1}月${date.getDate()}日`
          }
          
          // 判断是否为新品（7天内发布）
          if (item.createTime) {
            const now = new Date()
            const createTime = new Date(item.createTime)
            const diffDays = Math.floor((now - createTime) / (24 * 3600 * 1000))
            item.isNew = diffDays <= 7
          }
          
          return item
        })
        
        // 更新页面数据
        this.setData({
          goodsList: [...this.data.goodsList, ...newGoods],
          loading: false,
          loadingMore: false,
          hasMore: newGoods.length === pageSize,
          page: page + 1,
          isRefreshing: false
        })
      })
      .catch(err => {
        console.error('加载商品失败', err)
        this.setData({
          loading: false,
          loadingMore: false,
          isRefreshing: false
        })
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        })
      })
  },
  
  // 切换分类
  switchCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id;
    
    // 如果点击的是当前选中的分类，则取消选中
    if (categoryId === this.data.selectedCategory) {
      this.setData({
        selectedCategory: ''
      });
      
      // 重置标题
      wx.setNavigationBarTitle({
        title: '商品列表'
      });
    } else {
      this.setData({
        selectedCategory: categoryId
      });
      
      // 设置标题为分类名称
      if (categoryId) {
        // 从分类列表中查找对应的分类名称
        const categoryItem = this.data.categories.find(item => item._id === categoryId);
        if (categoryItem) {
          wx.setNavigationBarTitle({
            title: categoryItem.name
          });
        }
      }
    }
    
    // 重新加载商品列表
    this.setData({
      page: 0,
      goodsList: [],
      hasMore: true
    });
    this.loadGoodsList(true);
  },
  
  // 搜索商品
  onSearch: function(e) {
    const value = e.detail.value
    
    this.setData({
      searchValue: value
    })
    
    // 重新加载商品列表
    this.loadGoodsList(true)
  },
  
  // 清空搜索
  clearSearch: function() {
    this.setData({
      searchValue: ''
    })
    
    // 重新加载商品列表
    this.loadGoodsList(true)
  },
  
  // 显示/隐藏筛选面板
  toggleFilter: function() {
    this.setData({
      showFilter: !this.data.showFilter
    })
  },
  
  // 切换排序方式
  switchSort: function(e) {
    const type = e.currentTarget.dataset.type
    
    if (this.data.sortType === type) {
      // 如果点击的是当前排序方式，切换排序顺序
      this.setData({
        sortOrder: this.data.sortOrder === 'desc' ? 'asc' : 'desc'
      })
    } else {
      // 如果点击的是不同的排序方式，切换排序方式并设置为降序
      this.setData({
        sortType: type,
        sortOrder: 'desc'
      })
    }
    
    // 重新加载商品列表
    this.loadGoodsList(true)
  },
  
  // 切换价格区间
  switchPriceRange: function(e) {
    const range = e.currentTarget.dataset.range
    
    this.setData({
      priceRange: this.data.priceRange === range ? 'all' : range
    })
    
    // 重新加载商品列表
    this.loadGoodsList(true)
  },
  
  // 切换只看新品
  toggleOnlyNew: function() {
    this.setData({
      onlyNew: !this.data.onlyNew
    })
    
    // 重新加载商品列表
    this.loadGoodsList(true)
  },
  
  // 查看商品详情
  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    })
  },
  
  // 跳转到发布页面
  goToPublish: function() {
    wx.switchTab({
      url: '/pages/publish/publish'
    })
  },
  
  // 回到顶部
  backToTop: function() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
  },
  
  // 页面滚动事件
  onPageScroll: function(e) {
    // 记录滚动位置
    this.setData({
      scrollTop: e.scrollTop
    })
    
    // 控制回到顶部按钮显示/隐藏
    if (e.scrollTop > 300 && !this.data.showBackToTop) {
      this.setData({
        showBackToTop: true
      })
    } else if (e.scrollTop <= 300 && this.data.showBackToTop) {
      this.setData({
        showBackToTop: false
      })
    }
  },
  
  // 下拉刷新
  onPullDownRefresh: function() {
    this.setData({
      isRefreshing: true
    })
    this.loadGoodsList(true)
    wx.stopPullDownRefresh()
  },
  
  // 上拉加载更多
  onReachBottom: function() {
    this.loadGoodsList()
  },
  
  // 分享
  onShareAppMessage: function() {
    let title = '二次元周边交易平台'
    if (this.data.selectedCategory) {
      const category = this.data.categories.find(item => item._id === this.data.selectedCategory)
      if (category) {
        title = `${category.name} - 二次元周边交易平台`
      }
    }
    
    return {
      title: title,
      path: `/pages/goods/goods?category=${this.data.selectedCategory}&search=${this.data.searchValue}`
    }
  },
  
  // 分享到朋友圈
  onShareTimeline: function() {
    let title = '二次元周边交易平台'
    if (this.data.selectedCategory) {
      const category = this.data.categories.find(item => item._id === this.data.selectedCategory)
      if (category) {
        title = `${category.name} - 二次元周边交易平台`
      }
    }
    
    return {
      title: title,
      query: `category=${this.data.selectedCategory}&search=${this.data.searchValue}`
    }
  }
}) 