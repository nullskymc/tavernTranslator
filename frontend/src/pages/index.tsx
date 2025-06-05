import Head from 'next/head'
import { useState } from 'react'
import Translator from '../components/Translator'

export default function Home() {
  return (
    <div>
      <Head>
        <title>Tavern Translator</title>
      </Head>
      <main>
        <h1>Tavern Translator</h1>
        <Translator />
      </main>
    </div>
  )
}
