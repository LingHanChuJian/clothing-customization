import { post } from '@/utils/otherRequest';

export async function uploadImage(data) {
  return post('/oss/upload/putBase64String', data, {
    headers: {
        'Content-Type': 'application/json',
        server: true,
        signature: 'eyJidWNrZXQiOiJhaXRvb2xzIiwiZm9yY2VTYXZlS2V5Ijp0cnVlLCJzYXZlS2V5IjoiXC9zdG9yYWdlXC97dG9waWN9XC97aW1nX3R5cGV9XC97eWVhcn17bW9ufXtkYXl9XC97ZmlsZVNoYTF9ey5zdWZmaXh9IiwicmV0dXJuQm9keSI6IntcImNvZGVcIjoxLFwibXNnXCI6XCJcdTRlMGFcdTRmMjBcdTYyMTBcdTUyOWZcIixcImRhdGFcIjp7XCJwcmV2aWV3XCI6XCJodHRwczpcL1wvcGljLmppbmd6ZWVyLmNvbVwiLFwidXJsXCI6XCJcL3N0b3JhZ2VcL3t0b3BpY31cL3tpbWdfdHlwZX1cL3t5ZWFyfXttb259e2RheX1cL3tmaWxlU2hhMX17LnN1ZmZpeH1cIixcImhhc2hcIjpcIntldGFnfVwiLFwiZnNpemVcIjpcIntzaXplfVwiLFwid2lkdGhcIjpcInt3aWR0aH1cIixcImhlaWdodFwiOlwie2hlaWdodH1cIn19In18MjBlMmQwZjMwNTE4NmIyMmMyNzNhOTljYWZiOWVlZjUzOWU3ZjRlYjg5ODg0Yjg2MDI2ZmJiOTgwZjZmYjMwMQ=='
    }
  });
}
