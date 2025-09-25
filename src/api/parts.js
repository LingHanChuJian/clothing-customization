import { post, get } from '@/utils/request';

// 获取版型信息
export async function getPatternDetail(data) {
  return get('/design/pattern/detail', data, {
    headers: {
      server: true,
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
}

export async function createPart(data) {
  return post('/design/pattern/partsCreate', data, {
    headers: {
      server: true,
      "X-Requested-With": "XMLHttpRequest"
    }
  });
}

export async function updatePartSpecData(data) {
  return post('/design/pattern/updateSpecDatas', data, {
    headers: {
      server: true,
      "X-Requested-With": "XMLHttpRequest"
    }
  });
}

export async function updatePartSizeData(data) {
  return post('/design/pattern/updateSizeData', data, {
    headers: {
      server: true,
      "X-Requested-With": "XMLHttpRequest"
    }
  });
}
