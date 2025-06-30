#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Financial data aggregator class
class FinancialDataAggregator {
  constructor() {
    this.fmpApiKey = process.env.FINANCIAL_MODELING_PREP_API_KEY;
    this.alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.newsApiKey = process.env.NEWSAPI_KEY;
  }

  async getCompanyOverview(symbol) {
    try {
      // Get data from Financial Modeling Prep
      const [profile, ratios, metrics] = await Promise.allSettled([
        this.getFMPCompanyProfile(symbol),
        this.getFMPFinancialRatios(symbol),
        this.getFMPKeyMetrics(symbol)
      ]);

      return {
        profile: profile.status === 'fulfilled' ? profile.value : null,
        ratios: ratios.status === 'fulfilled' ? ratios.value : null,
        metrics: metrics.status === 'fulfilled' ? metrics.value : null
      };
    } catch (error) {
      console.error('Error getting company overview:', error);
      return null;
    }
  }

  async getFMPCompanyProfile(symbol) {
    const url = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${this.fmpApiKey}`;
    const response = await axios.get(url);
    return response.data[0];
  }

  async getFMPFinancialRatios(symbol) {
    const url = `https://financialmodelingprep.com/api/v3/ratios/${symbol}?apikey=${this.fmpApiKey}&limit=1`;
    const response = await axios.get(url);
    return response.data[0];
  }

  async getFMPKeyMetrics(symbol) {
    const url = `https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?apikey=${this.fmpApiKey}&limit=1`;
    const response = await axios.get(url);
    return response.data[0];
  }

  async getPeerComparison(symbol) {
    try {
      const url = `https://financialmodelingprep.com/api/v4/stock_peers?symbol=${symbol}&apikey=${this.fmpApiKey}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error getting peer comparison:', error);
      return null;
    }
  }

  async getNewsAndSentiment(symbol) {
    try {
      const url = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&limit=10&apikey=${this.fmpApiKey}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error getting news:', error);
      return null;
    }
  }

  async getMarketData(symbol) {
    try {
      const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${this.fmpApiKey}`;
      const response = await axios.get(url);
      return response.data[0];
    } catch (error) {
      console.error('Error getting market data:', error);
      return null;
    }
  }
}

// Professional investment analysis generator
class InvestmentAnalysisGenerator {
  constructor(geminiModel) {
    this.model = geminiModel;
  }

  async generateProfessionalAnalysis(symbol, financialData) {
    const prompt = this.buildAnalysisPrompt(symbol, financialData);
    
    try {
      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      });

      return this.parseAnalysisResponse(result.response.text());
    } catch (error) {
      console.error('Error generating analysis:', error);
      throw error;
    }
  }

  buildAnalysisPrompt(symbol, data) {
    const { overview, marketData, peers, news } = data;
    
    return `You are a senior equity research analyst at a top-tier investment bank. Generate a professional investment analysis for ${symbol} with the sophistication level of Goldman Sachs or Morgan Stanley research.

COMPANY DATA:
${JSON.stringify(overview, null, 2)}

MARKET DATA:
${JSON.stringify(marketData, null, 2)}

PEER COMPARISON:
${JSON.stringify(peers, null, 2)}

RECENT NEWS:
${JSON.stringify(news, null, 2)}

Generate a comprehensive investment analysis with the following structure:

**INVESTMENT THESIS**
Provide a clear, concise investment thesis (50-75 words)

**ARGUMENTS SUPPORTING THESIS (BULLISH):**
Generate 3-4 compelling bullish arguments with:
- Specific financial metrics and ratios
- Peer comparisons where relevant
- Growth drivers and catalysts
- Competitive advantages
- Use professional language like "compelling valuation", "superior yield", "growth engine"

**COUNTER-ARGUMENTS & KEY RISKS:**
Generate 3-4 key risk factors with:
- Specific vulnerabilities and sensitivities
- Market/sector risks
- Operational challenges
- Valuation concerns
- Use language like "exposure", "sensitivity", "headwinds"

**FINANCIAL HIGHLIGHTS:**
- Key valuation metrics (P/E, P/B, EV/EBITDA)
- Profitability metrics (ROE, ROA, margins)
- Financial strength indicators
- Dividend/yield information

**RECOMMENDATION:**
- Clear BUY/HOLD/SELL recommendation
- Price target with methodology
- Time horizon
- Confidence level

Use specific numbers, percentages, and financial jargon. Reference sector averages and peer comparisons. Make it sound like it came from a professional equity research report.

Format the output as clean JSON with this structure:
{
  "investmentThesis": "string",
  "bullishArguments": ["string1", "string2", "string3"],
  "bearishArguments": ["string1", "string2", "string3"],
  "financialHighlights": {
    "valuation": "string",
    "profitability": "string",
    "financialStrength": "string",
    "dividend": "string"
  },
  "recommendation": {
    "rating": "BUY/HOLD/SELL",
    "priceTarget": number,
    "timeHorizon": "string",
    "confidence": "HIGH/MEDIUM/LOW"
  }
}`;
  }

  parseAnalysisResponse(response) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      
      // If no JSON found, return the raw response
      return { rawResponse: response };
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return { rawResponse: response, error: 'Failed to parse JSON response' };
    }
  }
}

// Initialize components
const dataAggregator = new FinancialDataAggregator();
const analysisGenerator = new InvestmentAnalysisGenerator(model);

// Create MCP server
const server = new Server(
  {
    name: 'financial-analysis-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_professional_analysis',
        description: 'Generate professional-quality investment analysis using Gemini 2.5 Flash',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol to analyze (e.g., AAPL, MSFT)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_financial_data',
        description: 'Aggregate comprehensive financial data from multiple sources',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol to get data for',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'compare_peers',
        description: 'Get peer comparison analysis for a stock',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol for peer comparison',
            },
          },
          required: ['symbol'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_professional_analysis': {
        const { symbol } = args;
        
        // Aggregate all financial data
        const [overview, peers, news, marketData] = await Promise.allSettled([
          dataAggregator.getCompanyOverview(symbol),
          dataAggregator.getPeerComparison(symbol),
          dataAggregator.getNewsAndSentiment(symbol),
          dataAggregator.getMarketData(symbol)
        ]);

        const financialData = {
          overview: overview.status === 'fulfilled' ? overview.value : null,
          peers: peers.status === 'fulfilled' ? peers.value : null,
          news: news.status === 'fulfilled' ? news.value : null,
          marketData: marketData.status === 'fulfilled' ? marketData.value : null
        };

        // Generate professional analysis using Gemini
        const analysis = await analysisGenerator.generateProfessionalAnalysis(symbol, financialData);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        };
      }

      case 'get_financial_data': {
        const { symbol } = args;
        const data = await dataAggregator.getCompanyOverview(symbol);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'compare_peers': {
        const { symbol } = args;
        const peers = await dataAggregator.getPeerComparison(symbol);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(peers, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Financial Analysis MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});