import { createRouter, createWebHistory } from 'vue-router'
import DXFSloperJson from '../components/DXFSloperJson.vue'
import ChangingParameters from '../components/ChangingParameters.vue'
import TShirtSloperJson from '../components/TShirtSloperJson.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: DXFSloperJson
  },
  {
    path: '/dxf-sloper-json',
    name: 'DXFSloperJson',
    component: DXFSloperJson
  },
  {
    path: '/changing-parameters',
    name: 'ChangingParameters',
    component: ChangingParameters
  },
  {
    path: '/t-shirt-sloper-json',
    name: 'TShirtSloperJson',
    component: TShirtSloperJson
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 