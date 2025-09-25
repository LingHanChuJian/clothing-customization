import { post } from '@/utils/request';

export async function createPart(data) {
  return post('/design/pattern/partsCreate', data, {
    headers: {
      server: true,
      "X-Requested-With": "XMLHttpRequest"
    }
  });
}

export async function updatePartSpecData(data) {
  return post('/design/pattern/updateSpecData', data, {
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
