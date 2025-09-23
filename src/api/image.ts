import { post } from '@/utils/request';

export async function uploadImage(data: FormData) {
  return post('/basic-api/oss/upload/putBase64String', data, {
    header: {
        server: true,
        signature: 'eyJidWNrZXQiOiJhbmFseXNpcyIsImZvcmNlU2F2ZUtleSI6dHJ1ZSwic2F2ZUtleSI6Ilwvc3RvcmFnZVwve3RvcGljfVwve2ltZ190eXBlfVwve3llYXJ9e21vbn17ZGF5fVwve2ZpbGVTaGExfXsuc3VmZml4fSIsInJldHVybkJvZHkiOiJ7XCJjb2RlXCI6MSxcIm1zZ1wiOlwiXHU0ZTBhXHU0ZjIwXHU2MjEwXHU1MjlmXCIsXCJkYXRhXCI6e1wicHJldmlld1wiOlwiaHR0cHM6XC9cL3BpYy5qaW5nemVlci5jb21cIixcInVybFwiOlwiXC9zdG9yYWdlXC97dG9waWN9XC97aW1nX3R5cGV9XC97eWVhcn17bW9ufXtkYXl9XC97ZmlsZVNoYTF9ey5zdWZmaXh9XCIsXCJoYXNoXCI6XCJ7ZXRhZ31cIixcImZzaXplXCI6XCJ7c2l6ZX1cIixcIndpZHRoXCI6XCJ7d2lkdGh9XCIsXCJoZWlnaHRcIjpcIntoZWlnaHR9XCJ9fSJ9fDJmOWRmYTBkNjc5ZDRlMGJjOWE2NTZhYWRiYzkzZTI3ZjAwMTRjNDU5YzJiMTQ3MDNlY2RmYmZkYjVkOWE0ZGE'
    }
  });
}
