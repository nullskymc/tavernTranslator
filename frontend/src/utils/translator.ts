import axios from 'axios'

const MODEL_NAME = process.env.NEXT_PUBLIC_MODEL_NAME || ''
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''

export async function translateCard(card: any): Promise<any> {
  const data = card.data || {}
  const fields = ['description','personality','scenario','first_mes','mes_example','system_prompt']
  for (const field of fields) {
    if (data[field]) {
      data[field] = await translateField(field, data[field])
    }
  }
  if (Array.isArray(data.alternate_greetings) && data.alternate_greetings.length>0) {
    data.alternate_greetings = await Promise.all(
      data.alternate_greetings.map(g=>translateField('alternate_greetings',g))
    )
  }
  card.data = data
  return card
}

async function translateField(field: string, text: string): Promise<string> {
  const endpoint = `${API_BASE.replace(/\/$/,'')}/chat/completions`
  const payload = {
    model: MODEL_NAME,
    messages: [
      { role: 'user', content: text }
    ],
    max_tokens: 4096
  }
  const headers: any = { 'Content-Type': 'application/json' }
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`
  const res = await axios.post(endpoint, payload, { headers })
  return res.data.choices[0].message.content
}
