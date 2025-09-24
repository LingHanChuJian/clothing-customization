import { post } from '@/utils/request';

export async function uploadImage(data) {
  return post('/oss/upload/putBase64String', data, {
    header: {
        server: true,
        'Access-Control-Allow-Origin': '*',
        'content-type': 'application/json; charset=utf-8',
        signature: 'eyJidWNrZXQiOiIxMTEiLCJmb3JjZVNhdmVLZXkiOnRydWUsInNhdmVLZXkiOiJcL3N0b3JhZ2VcL3t0b3BpY31cL3tpbWdfdHlwZX1cL3t5ZWFyfXttb259e2RheX1cL3tmaWxlTmFtZX17ZmlsZVNoYTF9ey5zdWZmaXh9IiwicmV0dXJuQm9keSI6IntcImNvZGVcIjoxLFwibXNnXCI6XCJcdTRlMGFcdTRmMjBcdTYyMTBcdTUyOWZcIixcImRhdGFcIjp7XCJwcmV2aWV3XCI6XCJodHRwOlwvXC9maWxlLmNtcy56XCIsXCJ1cmxcIjpcIlwvc3RvcmFnZVwve3RvcGljfVwve2ltZ190eXBlfVwve3llYXJ9e21vbn17ZGF5fVwve2ZpbGVOYW1lfXtmaWxlU2hhMX17LnN1ZmZpeH1cIixcImhhc2hcIjpcIntldGFnfVwiLFwiZnNpemVcIjpcIntzaXplfVwiLFwid2lkdGhcIjpcInt3aWR0aH1cIixcImhlaWdodFwiOlwie2hlaWdodH1cIn19In18MDE3NzI3YjNkNDc5NGU3ZGQ3YmVjYjNlMWZmZGVlYmY4OWFmOTZmY2I5NDU3ZmU0MGZhZmM4NjBkM2FlM2MzOA=='
    }
  });
}
