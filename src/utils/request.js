import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10 * 60 * 1000
})

// 请求拦截器：自动携带 token
request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
}, error => {
  return Promise.reject(error)
})

// 响应拦截器：通用错误处理
request.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code === 200) {
      return data.data
    } else {
      return Promise.reject(new Error(data.message || '请求失败'))
    }
  },
  error => {
    // 统一错误提示
    if (error.response) {
      // 401 处理
      if (error.response.status === 401) {
        localStorage.removeItem('token')
        // window.location.href = '/login'
      }
      return Promise.reject(new Error(error.response.data?.message || '请求失败'))
    }
    return Promise.reject(error)
  }
)

// 通用方法封装
export function get(url, params, config) {
  return request.get(url, { params, ...config })
}

export function post(url, data, config) {
  return request.post(url, data, config)
}

export function put(url, data, config) {
  return request.put(url, data, config)
}

export function del(url, config) {
  return request.delete(url, config)
}

export default request