require('dotenv').config()
const express = require('express')
const fetch = require('node-fetch')

const app = express()
const PORT = 9876
const WINDOW_SIZE = 10
const FETCH_TIMEOUT = 500
const numberStore = []

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const ACCESS_TOKEN = process.env.ACCESS_TOKEN


const primeUrl = 'http://20.244.56.144/evaluation-service/primes'
const fiboUrl = 'http://20.244.56.144/evaluation-service/fibo'
const evenUrl = 'http://20.244.56.144/evaluation-service/even'
const randUrl = 'http://20.244.56.144/evaluation-service/rand'

app.get('/numbers/:numberid', async (req, res) => {
  const { numberid } = req.params
  let url

  
  switch (numberid) {
    case 'p':
      url = primeUrl
      break
    case 'f':
      url = fiboUrl
      break
    case 'e':
      url = evenUrl
      break
    case 'r':
      url = randUrl
      break
    default:
      return res.status(400).json({ error: 'Invalid number ID. Use p, f, e, or r.' })
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort()
  }, FETCH_TIMEOUT)

  let fetchedNumbers = [];

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'ClientId': CLIENT_ID,
        'ClientSecret': CLIENT_SECRET
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error (${response.status}):`, errorText)
      return res.status(response.status).json({ error: `API Error: ${errorText}` })
    }

    const data = await response.json()
    fetchedNumbers = data.numbers
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(408).json({ error: 'Request to third-party API timed out' })
    }
    return res.status(500).json({ error: `Error fetching numbers: ${error.message}` })
  }

  const windowPrevState = [...numberStore]

  fetchedNumbers.forEach((num) => {
    if (!numberStore.includes(num)) {
      if (numberStore.length >= WINDOW_SIZE) {
        numberStore.shift()
      }
      numberStore.push(num)
    }
  });

  const windowCurrState = [...numberStore]
  const average = (numberStore.reduce((acc, num) => acc + num, 0) / numberStore.length).toFixed(2)

  res.json({
    windowPrevState,
    windowCurrState,
    numbers: fetchedNumbers,
    avg: parseFloat(average),
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
