import { createRouter, createWebHistory } from 'vue-router'
import DXFSloperJson from '../components/DXFSloperJson.vue'
import ChangingParameters from '../components/ChangingParameters.vue'
import TShirtSloperJson from '../components/TShirtSloperJson.vue'
import StandardPositioning from '../components/StandardPositioning.vue'
import BatchReplaceColors from '../components/BatchReplaceColors.vue'
import DXFParameters from '../components/DXFParameters.vue'

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
  },
  {
    path: '/standard-positioning',
    name: 'StandardPositioning',
    component: StandardPositioning
  },
  {
    path: '/batch-replace-colors',
    name: 'BatchReplaceColors',
    component: BatchReplaceColors
  },
  {
    path: '/dxf-parameters',
    name: 'DXFParameters',
    component: DXFParameters
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 