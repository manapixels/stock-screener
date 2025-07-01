import { NextRequest, NextResponse } from 'next/server'
import { generateProfessionalAnalysis } from '../../../lib/services/gemini-analysis'
import { analysisCache } from '../../../lib/services/analysis-cache'

export async function POST(request: Request) {
  try {
    const { symbol } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol parameter is required' }, { status: 400 })
    }

    console.log(`🚀 Professional analysis requested for: ${symbol}`)

    const result = await generateProfessionalAnalysis(symbol)
    
    // Check if result is an error with fallback
    if ('error' in result && 'fallback' in result && 'analysis' in result) {
      console.log(`⚠️ Analysis failed for ${symbol}, returning fallback`)
      // Return the fallback analysis with error details in headers
      const response = Response.json(result.analysis)
      response.headers.set('X-Analysis-Fallback', 'true')
      response.headers.set('X-Analysis-Error', result.error)
      return response
    }
    
    // Check if result is a regular error
    if ('error' in result) {
      console.error(`❌ Analysis error for ${symbol}:`, result.error)
      return Response.json({
        error: result.error,
        details: result.details || 'Unable to generate analysis'
      }, { status: 500 })
    }
    
    console.log(`✅ Professional analysis complete for ${symbol}`)
    console.log(`📊 Cache stats: ${JSON.stringify(analysisCache.getStats())}`)
    
    return Response.json(result)
  } catch (error) {
    console.error(`❌ Unexpected error in professional analysis:`, error)
    
    return Response.json({
      error: 'Unable to generate analysis at this time',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Support GET method for backward compatibility
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    console.log('❌ Missing symbol parameter')
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  console.log(`🚀 Professional analysis (GET) requested for: ${symbol}`)

  try {
    const result = await generateProfessionalAnalysis(symbol)
    
    // Check if result is an error with fallback
    if ('error' in result && 'fallback' in result && 'analysis' in result) {
      console.log(`⚠️ Analysis failed for ${symbol}, returning fallback`)
      // Return the fallback analysis with error details in headers
      const response = NextResponse.json(result.analysis)
      response.headers.set('X-Analysis-Fallback', 'true')
      response.headers.set('X-Analysis-Error', result.error)
      return response
    }
    
    // Check if result is a regular error
    if ('error' in result) {
      console.error(`❌ Analysis error for ${symbol}:`, result.error)
      return NextResponse.json({
        error: result.error,
        details: result.details || 'Unable to generate analysis'
      }, { status: 500 })
    }
    
    console.log(`✅ Professional analysis complete for ${symbol}`)
    console.log(`📊 Cache stats: ${JSON.stringify(analysisCache.getStats())}`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error(`❌ Unexpected error in professional analysis:`, error)
    
    return NextResponse.json({
      error: 'Unable to generate analysis at this time',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 