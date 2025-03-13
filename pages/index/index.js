// pages/index/index.js
const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    goodsList: [],
    loading: true,
    searchValue: '',
    categories: [
      {
        id: 1,
        name: '电子产品',
        icon: '/images/category/digital.png',
        sort: 1
      },
      {
        id: 2,
        name: '图书教材',
        icon: '/images/category/books.png',
        sort: 2
      },
      {
        id: 3,
        name: '生活用品',
        icon: '/images/category/daily.png',
        sort: 3
      },
      {
        id: 4,
        name: '服装鞋帽',
        icon: '/images/category/clothing.png',
        sort: 4
      },
      {
        id: 5,
        name: '运动户外',
        icon: '/images/category/sports.png',
        sort: 5
      },
      {
        id: 6,
        name: '美妆护肤',
        icon: '/images/category/beauty.png',
        sort: 6
      },
      {
        id: 7,
        name: '乐器',
        icon: '/images/category/music.png',
        sort: 7
      },
      {
        id: 8,
        name: '其他',
        icon: '/images/category/other.png',
        sort: 8
      }
    ],
    selectedCategory: '',
    sortType: 'time', // time-最新发布, price-价格升序, price-desc-价格降序
    hasMore: true,
    page: 0,
    pageSize: 10,
    banners: [
      {
        id: 1,
        image: '/images/covers/banner1.jpg',
        title: '校园二手交易平台',
        url: '/pages/about/about'
      },
      {
        id: 2,
        image: '/images/covers/banner2.jpg',
        title: '新品上架优惠多',
        url: '/pages/goods/goods?type=new'
      },
      {
        id: 3,
        image: '/images/covers/banner3.jpg',
        title: '校园闲置换钱',
        url: '/pages/publish/publish'
      },
      {
        id: 4,
        image: '/images/covers/banner4.jpg',
        title: '品质二手商品',
        url: '/pages/goods-list/goods-list?categoryId=1'
      },
      {
        id: 5,
        image: '/images/covers/banner5.jpg',
        title: '校园二手交易',
        url: '/pages/goods-list/goods-list?categoryId=2'
      }
    ],
    recommendGoods: [], // 推荐商品
    newGoods: [] // 最新上架商品
  },

  onLoad: function() {
    this.loadCategories()
    this.loadRecommendGoods()
    this.loadNewGoods()
    this.loadGoods()
  },

  onPullDownRefresh: function() {
    this.setData({
      goodsList: [],
      recommendGoods: [],
      newGoods: [],
      page: 0,
      hasMore: true
    })
    
    Promise.all([
      this.loadRecommendGoods(),
      this.loadNewGoods(),
      this.loadGoods()
    ]).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreGoods()
    }
  },

  // 加载分类
  loadCategories: function() {
    // 使用本地数据，不再从云数据库加载
    console.log('使用本地分类数据');
    // 如果需要从云数据库加载，可以取消下面的注释
    /*
    db.collection('categories')
      .orderBy('sort', 'asc')
      .get()
      .then(res => {
        this.setData({
          categories: res.data
        })
      })
    */
  },

  // 加载推荐商品
  loadRecommendGoods: function() {
    return db.collection('goods')
      .where({
        status: 'on_sale' // 只查询在售商品
      })
      .orderBy('views', 'desc') // 按浏览量降序排序
      .limit(4) // 只取4个
      .get()
      .then(res => {
        // 处理数据
        const goods = res.data.map(item => {
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
        
        this.setData({
          recommendGoods: goods
        })
      })
      .catch(err => {
        console.error('加载推荐商品失败', err)
      })
  },

  // 加载最新上架商品
  loadNewGoods: function() {
    return db.collection('goods')
      .where({
        status: 'on_sale' // 只查询在售商品
      })
      .orderBy('createTime', 'desc') // 按创建时间降序排序
      .limit(4) // 只取4个
      .get()
      .then(res => {
        // 处理数据
        const goods = res.data.map(item => {
          // 处理日期格式
          if (item.createTime) {
            const date = new Date(item.createTime)
            item.createTime = `${date.getMonth() + 1}月${date.getDate()}日`
          }
          
          // 判断是否为热门（浏览量大于50）
          item.isHot = item.views > 50
          
          return item
        })
        
        this.setData({
          newGoods: goods
        })
      })
      .catch(err => {
        console.error('加载最新商品失败', err)
      })
  },

  // 加载商品
  loadGoods: function() {
    this.setData({
      loading: true
    })

    // 构建查询条件
    let query = db.collection('goods').where({
      status: 'on_sale' // 只查询在售商品
    })

    // 添加分类筛选
    if (this.data.selectedCategory) {
      query = query.where({
        category: this.data.selectedCategory
      })
    }

    // 添加搜索关键词筛选
    if (this.data.searchValue) {
      query = query.where(_.or([
        {
          title: db.RegExp({
            regexp: this.data.searchValue,
            options: 'i'
          })
        },
        {
          description: db.RegExp({
            regexp: this.data.searchValue,
            options: 'i'
          })
        }
      ]))
    }

    // 添加排序
    if (this.data.sortType === 'time') {
      query = query.orderBy('createTime', 'desc')
    } else if (this.data.sortType === 'price') {
      query = query.orderBy('price', 'asc')
    } else if (this.data.sortType === 'price-desc') {
      query = query.orderBy('price', 'desc')
    }

    // 分页查询
    return query
      .skip(this.data.page * this.data.pageSize)
      .limit(this.data.pageSize)
      .get()
      .then(res => {
        const hasMore = res.data.length === this.data.pageSize
        
        this.setData({
          goodsList: [...this.data.goodsList, ...res.data],
          loading: false,
          hasMore: hasMore,
          page: this.data.page + 1
        })
      })
      .catch(err => {
        console.error(err)
        this.setData({
          loading: false
        })
      })
  },

  // 加载更多商品
  loadMoreGoods: function() {
    if (this.data.loading) return
    
    this.loadGoods()
  },

  // 搜索输入变化
  onSearchInput: function(e) {
    this.setData({
      searchValue: e.detail.value
    })
  },

  // 执行搜索
  onSearch: function() {
    this.setData({
      goodsList: [],
      page: 0,
      hasMore: true
    })
    this.loadGoods()
  },

  // 清除搜索
  clearSearch: function() {
    this.setData({
      searchValue: '',
      goodsList: [],
      page: 0,
      hasMore: true
    })
    this.loadGoods()
  },

  // 选择分类
  selectCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id
    
    this.setData({
      selectedCategory: this.data.selectedCategory === categoryId ? '' : categoryId,
      goodsList: [],
      page: 0,
      hasMore: true
    })
    
    this.loadGoods()
  },

  // 切换排序方式
  changeSortType: function(e) {
    const type = e.currentTarget.dataset.type
    
    this.setData({
      sortType: type,
      goodsList: [],
      page: 0,
      hasMore: true
    })
    
    this.loadGoods()
  },

  // 查看商品详情
  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 导航到分类页面
  navigateToCategory: function(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/goods/goods?category=${id}`
    })
  },

  // 导航到更多页面
  navigateToMore() {
    wx.navigateTo({
      url: '/pages/goods/goods'
    })
  },

  // 导航到商品详情
  navigateToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/goods-detail/goods-detail?id=${id}`
    })
  },

  // 加载更多
  loadMore() {
    if (!this.data.hasMore || this.data.loading) return
    
    this.setData({ loading: true })
    
    // 模拟加载更多数据
    setTimeout(() => {
      // 这里应该是调用API获取更多数据
      // 为了演示，我们假设没有更多数据了
      this.setData({
        loading: false,
        hasMore: false
      })
    }, 1000)
  },

  // 页面上拉触底事件
  onReachBottom() {
    this.loadMore()
  },

  // 下拉刷新
  onPullDownRefresh() {
    // 重新加载数据
    this.setData({
      loading: true,
      hasMore: true
    })
    
    setTimeout(() => {
      this.setData({
        loading: false
      })
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 跳转到搜索页面
  navigateToSearch: function() {
    wx.navigateTo({
      url: '/pages/search/search'
    })
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '二次元周边交易平台',
      query: ''
    }
  },

  // 轮播图切换事件
  swiperChange: function(e) {
    // 可以在这里处理轮播图切换事件
    // console.log('当前轮播图索引：', e.detail.current)
  },

  // 点击轮播图跳转
  navigateToBanner: function(e) {
    const id = e.currentTarget.dataset.id;
    const banner = this.data.banners.find(item => item.id === id);
    if (banner && banner.url) {
      wx.navigateTo({
        url: banner.url
      });
    }
  },

  // 添加一个方法来调用updateGoodsStatus云函数
  updateGoodsStatus: function() {
    wx.showLoading({
      title: '更新中...',
    })
    
    wx.cloud.callFunction({
      name: 'updateGoodsStatus',
      success: res => {
        wx.hideLoading()
        console.log('更新商品状态成功', res)
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
      },
      fail: err => {
        wx.hideLoading()
        console.error('更新商品状态失败', err)
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        })
      }
    })
  },
})
