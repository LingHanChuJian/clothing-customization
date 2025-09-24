import { post } from '@/utils/request';

export async function createPart(data) {
  return post('/design/pattern/partsCreate', data, {
    header: {
      server: true,
    }
  });
}

export async function updatePartSpecData(data) {
  return post('/design/pattern/updateSpecData', data, {
    header: {
      server: true,
    }
  });
}

export async function updatePartSizeData(data) {
  return post('/design/pattern/updateSizeData', data, {
    header: {
      server: true,
    }
  });
}
