// Direct test for Next.js API
const testNextjsAPI = async () => {
  try {
    console.log('🧪 Testing Next.js API directly for OCBC...')
    
    const response = await fetch('http://localhost:3000/api/professional-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Direct-Test'
      },
      body: JSON.stringify({ symbol: 'O39.SI' })
    })

    console.log('📊 Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(HTTP error! status:  - )
    }

    const data = await response.json()
    console.log('✅ Data source:', data.dataSource)
    console.log('📊 Analysis thesis:', data.analysis.investmentThesis.substring(0, 100) + '...')
    
    if (data.analysis.investmentThesis.includes('compelling Singapore banking investment')) {
      console.log('🎉 SUCCESS: Professional OCBC analysis returned!')
    } else {
      console.log('❌ ISSUE: Still returning generic fallback')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testNextjsAPI()
