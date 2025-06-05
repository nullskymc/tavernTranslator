import { useState } from 'react'
import { extractTextFromPng, embedTextIntoPng } from '../utils/png'
import { translateCard } from '../utils/translator'

export default function Translator() {
  const [file, setFile] = useState<File | null>(null)
  const [logs, setLogs] = useState<string>('')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleTranslate = async () => {
    if (!file) return
    try {
      setLogs('从PNG提取数据...\n')
      const data = await extractTextFromPng(file)
      setLogs(l => l + '调用翻译API...\n')
      const translated = await translateCard(data)
      setLogs(l => l + '嵌入译文到PNG...\n')
      const blob = await embedTextIntoPng(file, translated)
      setDownloadUrl(URL.createObjectURL(blob))
      setLogs(l => l + '完成!\n')
    } catch (err: any) {
      setLogs(l => l + '错误: ' + err.message + '\n')
    }
  }

  return (
    <div>
      <input type="file" accept="image/png" onChange={handleFileChange} />
      <button onClick={handleTranslate} disabled={!file}>开始翻译</button>
      {downloadUrl && <a href={downloadUrl} download="translated.png">下载图片</a>}
      <pre>{logs}</pre>
    </div>
  )
}
