import pako from 'pako'

export async function extractTextFromPng(file: File): Promise<any> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const signature = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]
  for (let i=0;i<signature.length;i++) {
    if (bytes[i] !== signature[i]) throw new Error('非法PNG文件')
  }
  let offset = signature.length
  while (offset < bytes.length) {
    const length = (bytes[offset]<<24)|(bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3]
    const type = String.fromCharCode(bytes[offset+4],bytes[offset+5],bytes[offset+6],bytes[offset+7])
    if (type === 'tEXt' || type==='zTXt') {
      const data = bytes.slice(offset+8,offset+8+length)
      let text:string
      if (type==='zTXt') {
        const nullIndex = data.indexOf(0)
        const compressed = data.slice(nullIndex+2)
        text = new TextDecoder().decode(pako.inflate(compressed))
      } else {
        text = new TextDecoder().decode(data)
      }
      if (text.startsWith('chara')) {
        const json = atob(text.slice(6))
        return JSON.parse(json)
      }
    }
    offset += 8 + length + 4
  }
  throw new Error('未找到嵌入数据')
}

export async function embedTextIntoPng(file: File, data: any): Promise<Blob> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const signature = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]
  const chunks: any[] = []
  let offset = signature.length
  while (offset < bytes.length) {
    const length = (bytes[offset]<<24)|(bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3]
    const type = String.fromCharCode(bytes[offset+4],bytes[offset+5],bytes[offset+6],bytes[offset+7])
    const chunkData = bytes.slice(offset+8,offset+8+length)
    const crc = bytes.slice(offset+8+length,offset+8+length+4)
    if (type !== 'tEXt' && type !== 'zTXt') {
      chunks.push({length,type,data:chunkData,crc})
    }
    offset += 8 + length + 4
  }
  const jsonStr = JSON.stringify(data)
  const b64 = btoa(unescape(encodeURIComponent(jsonStr)))
  const payload = `chara\0${b64}`
  const textBytes = new TextEncoder().encode(payload)
  const chunkType = 'tEXt'
  const crc = crc32([...chunkType].map(c=>c.charCodeAt(0)).concat(Array.from(textBytes)))
  const out: number[] = []
  out.push(...signature)
  for (const chunk of chunks) {
    if (chunk.type === 'IEND') {
      pushChunk(out,textBytes,chunkType,crc)
    }
    pushChunk(out,chunk.data,chunk.type,bytesToNum(chunk.crc))
  }
  return new Blob([new Uint8Array(out)],{type:'image/png'})
}

function pushChunk(out:number[], data:Uint8Array, type:string, crc:number) {
  const length = data.length
  out.push((length>>>24)&0xff,(length>>>16)&0xff,(length>>>8)&0xff,length&0xff)
  out.push(...[...type].map(c=>c.charCodeAt(0)))
  out.push(...data)
  out.push((crc>>>24)&0xff,(crc>>>16)&0xff,(crc>>>8)&0xff,crc&0xff)
}

function bytesToNum(bytes:Uint8Array):number {
  return (bytes[0]<<24)|(bytes[1]<<16)|(bytes[2]<<8)|bytes[3]
}

function crc32(bytes:number[]):number {
  let crc = 0xffffffff
  const table:number[] = []
  for(let n=0;n<256;n++) {
    let c = n
    for(let k=0;k<8;k++) c = (c & 1)?(0xedb88320^(c>>>1)):(c>>>1)
    table[n]=c
  }
  for (const b of bytes) {
    crc = table[(crc^b)&0xff]^(crc>>>8)
  }
  return (crc^0xffffffff)>>>0
}
