// Currency formatting utilities following international standards

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  position: 'before' | 'after';
  space: boolean;
}

// Comprehensive currency configuration following ISO 4217 and UX best practices
export const CURRENCY_CONFIG: Record<string, CurrencyInfo> = {
  // Major Global Currencies
  'USD': { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, position: 'before', space: false },
  'EUR': { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, position: 'after', space: true },
  'GBP': { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, position: 'before', space: false },
  'JPY': { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, position: 'before', space: false },
  
  // Asia-Pacific
  'SGD': { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, position: 'before', space: false },
  'HKD': { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2, position: 'before', space: false },
  'AUD': { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, position: 'before', space: false },
  'CAD': { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2, position: 'before', space: false },
  'CNY': { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2, position: 'before', space: false },
  'KRW': { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0, position: 'before', space: false },
  'INR': { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, position: 'before', space: false },
  
  // European
  'CHF': { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2, position: 'before', space: true },
  'SEK': { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimals: 2, position: 'after', space: true },
  'NOK': { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', decimals: 2, position: 'after', space: true },
  'DKK': { code: 'DKK', symbol: 'kr', name: 'Danish Krone', decimals: 2, position: 'after', space: true },
  
  // Fallback for unknown currencies
  'DEFAULT': { code: '', symbol: '', name: 'Unknown Currency', decimals: 2, position: 'before', space: true }
};

/**
 * Format currency amount according to international standards
 * @param amount - The numeric amount to format
 * @param currencyCode - The 3-letter currency code (ISO 4217)
 * @param options - Formatting options
 */
export interface FormatCurrencyOptions {
  showCode?: boolean;        // Show currency code (e.g., "SGD 6.97" vs "S$6.97")
  showSymbol?: boolean;      // Show currency symbol
  compact?: boolean;         // Use compact notation for large numbers (1.2M, 1.5B)
  precision?: number;        // Override default decimal places
  context?: 'price' | 'change' | 'volume' | 'marketcap'; // Context for formatting decisions
}

export function formatCurrency(
  amount: number | string, 
  currencyCode: string = 'USD', 
  options: FormatCurrencyOptions = {}
): string {
  const {
    showCode = true,
    showSymbol = false,
    compact = false,
    precision,
    context = 'price'
  } = options;

  // Parse amount
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return 'N/A';

  // Get currency info
  const currencyInfo = CURRENCY_CONFIG[currencyCode.toUpperCase()] || CURRENCY_CONFIG['DEFAULT'];
  const decimals = precision !== undefined ? precision : currencyInfo.decimals;

  // Format the number
  let formattedAmount: string;
  
  if (compact && Math.abs(numAmount) >= 1000000) {
    // Compact notation for large amounts (market cap, volume)
    formattedAmount = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(numAmount);
  } else {
    // Standard formatting
    formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(numAmount);
  }

  // Apply currency display logic
  if (showCode && !showSymbol) {
    // Standard format: "SGD 6.97", "USD 150.25"
    return `${currencyInfo.code} ${formattedAmount}`;
  } else if (showSymbol && !showCode) {
    // Symbol format: "S$6.97", "$150.25"
    const space = currencyInfo.space ? ' ' : '';
    if (currencyInfo.position === 'before') {
      return `${currencyInfo.symbol}${space}${formattedAmount}`;
    } else {
      return `${formattedAmount}${space}${currencyInfo.symbol}`;
    }
  } else if (showCode && showSymbol) {
    // Both: "SGD S$6.97" (for detailed views)
    const space = currencyInfo.space ? ' ' : '';
    const symbolPart = currencyInfo.position === 'before' 
      ? `${currencyInfo.symbol}${space}${formattedAmount}`
      : `${formattedAmount}${space}${currencyInfo.symbol}`;
    return `${currencyInfo.code} ${symbolPart}`;
  } else {
    // Just number (fallback)
    return formattedAmount;
  }
}

/**
 * Format price change with proper currency and styling
 */
export function formatPriceChange(
  change: number | string,
  changePercent: number | string,
  currencyCode: string = 'USD'
): { amount: string; percent: string; isPositive: boolean } {
  const numChange = typeof change === 'string' ? parseFloat(change) : change;
  const numPercent = typeof changePercent === 'string' ? parseFloat(changePercent) : changePercent;
  
  const isPositive = numChange >= 0;
  const sign = isPositive ? '+' : '';
  
  return {
    amount: `${sign}${formatCurrency(Math.abs(numChange), currencyCode, { showCode: false, showSymbol: true })}`,
    percent: `${sign}${numPercent.toFixed(2)}%`,
    isPositive
  };
}

/**
 * Get currency info from stock symbol
 */
export function getCurrencyFromSymbol(symbol: string): string {
  const suffixToCurrency: Record<string, string> = {
    '.SI': 'SGD',
    '.L': 'GBP', 
    '.T': 'JPY',
    '.HK': 'HKD',
    '.TO': 'CAD',
    '.AX': 'AUD',
    '.F': 'EUR',
    '.PA': 'EUR',
    '.BO': 'INR',
    '.SZ': 'CNY',
    '.KS': 'KRW'
  };

  for (const [suffix, currency] of Object.entries(suffixToCurrency)) {
    if (symbol.includes(suffix)) {
      return currency;
    }
  }
  
  return 'USD'; // Default to USD for US stocks
}

/**
 * Smart currency formatting based on context
 */
export function formatCurrencyByContext(
  amount: number | string,
  currencyCode: string,
  context: 'price' | 'change' | 'volume' | 'marketcap' | 'target'
): string {
  switch (context) {
    case 'price':
    case 'target':
      // Main prices: "SGD 6.97"
      return formatCurrency(amount, currencyCode, { showCode: true, showSymbol: false });
    
    case 'change':
      // Price changes: "+S$0.15"
      return formatCurrency(amount, currencyCode, { showCode: false, showSymbol: true });
    
    case 'volume':
      // Volume: "SGD 2.5M" (compact)
      return formatCurrency(amount, currencyCode, { showCode: true, compact: true });
    
    case 'marketcap':
      // Market cap: "SGD 15.8B" (compact)
      return formatCurrency(amount, currencyCode, { showCode: true, compact: true });
    
    default:
      return formatCurrency(amount, currencyCode);
  }
}