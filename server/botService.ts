import ccxt from 'ccxt';
import { EventEmitter } from 'events';

export interface BotConfig {
  exchange: string;
  apiKey: string;
  secret: string;
  symbol: string; // e.g., 'BTC/USDT'
  amount: number; // Base amount to trade
  strategy: 'grid' | 'dca' | 'sniper';
  gridSpacingPercent?: number; // For grid strategy
}

export interface TradeLog {
  id: string;
  timestamp: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  status: string;
}

class TradingBot extends EventEmitter {
  private client: ccxt.Exchange | null = null;
  private config: BotConfig | null = null;
  private isActive: boolean = false;
  private logs: TradeLog[] = [];
  private loopInterval: NodeJS.Timeout | null = null;

  // State for simple grid
  private lastPrice: number = 0;
  private lastTradePrice: number = 0;

  constructor() {
    super();
  }

  async configure(config: BotConfig) {
    try {
      this.config = config;
      // Initialize ccxt client dynamically
      const exchangeClass = (ccxt as any)[config.exchange];
      if (!exchangeClass) {
        throw new Error(`Exchange ${config.exchange} is not supported by ccxt.`);
      }

      this.client = new exchangeClass({
        apiKey: config.apiKey,
        secret: config.secret,
        enableRateLimit: true,
      });

      // Test connection by fetching balance or ticker
      await this.client!.fetchTicker(config.symbol);
      this.logSystem(`Connected to ${config.exchange} successfully. Pair: ${config.symbol}`);
      return true;
    } catch (error: any) {
      this.logSystem(`Configuration failed: ${error.message}`);
      return false;
    }
  }

  start() {
    if (!this.client || !this.config) {
      throw new Error("Bot not configured yet.");
    }
    if (this.isActive) return;

    this.isActive = true;
    this.logSystem(`Bot Started - Strategy: ${this.config.strategy}`);
    
    // Initial fetch to set baseline price
    this.client.fetchTicker(this.config.symbol).then(ticker => {
      this.lastPrice = ticker.last || 0;
      this.lastTradePrice = ticker.last || 0;
      this.runLoop();
    }).catch(err => this.logSystem(`Failed to fetch initial price: ${err.message}`));
  }

  stop() {
    this.isActive = false;
    if (this.loopInterval) {
      clearTimeout(this.loopInterval);
      this.loopInterval = null;
    }
    this.logSystem('Bot Stopped.');
  }

  getStatus() {
    return {
      isActive: this.isActive,
      config: this.config ? { 
        exchange: this.config.exchange, 
        symbol: this.config.symbol, 
        strategy: this.config.strategy 
      } : null,
      logs: this.logs,
      lastPrice: this.lastPrice
    };
  }

  private async runLoop() {
    if (!this.isActive || !this.client || !this.config) return;

    try {
      const ticker = await this.client.fetchTicker(this.config.symbol);
      this.lastPrice = ticker.last || 0;

      if (this.config.strategy === 'grid') {
        await this.executeGridLogic();
      } else if (this.config.strategy === 'dca') {
         // simple dca placeholder
      }

    } catch (error: any) {
      this.logSystem(`Loop error: ${error.message}`);
    }

    // Schedule next loop (e.g. every 10 seconds to avoid hitting rate limits)
    if (this.isActive) {
      this.loopInterval = setTimeout(() => this.runLoop(), 10000);
    }
  }

  private async executeGridLogic() {
    if (!this.client || !this.config) return;
    
    const spacing = (this.config.gridSpacingPercent || 1) / 100;
    const currentPrice = this.lastPrice;

    // Check if price moved up enough to sell
    if (currentPrice >= this.lastTradePrice * (1 + spacing)) {
      await this.placeOrder('SELL', currentPrice);
      this.lastTradePrice = currentPrice;
    } 
    // Check if price moved down enough to buy
    else if (currentPrice <= this.lastTradePrice * (1 - spacing)) {
      await this.placeOrder('BUY', currentPrice);
      this.lastTradePrice = currentPrice;
    }
  }

  private async placeOrder(side: 'BUY' | 'SELL', price: number) {
    if (!this.client || !this.config) return;
    
    try {
      this.logSystem(`Attempting to place ${side} order for ${this.config.amount} at ${price}`);
      
      const order = await this.client.createMarketOrder(this.config.symbol, side.toLowerCase() as any, this.config.amount);
      
      const logEntry: TradeLog = {
        id: order.id,
        timestamp: new Date().toISOString(),
        type: side,
        price: order.price || price,
        amount: order.amount || this.config.amount,
        status: order.status
      };
      
      this.logs.unshift(logEntry);
      if (this.logs.length > 100) this.logs.pop(); // keep last 100
      
      this.emit('trade', logEntry);
      
    } catch (error: any) {
      this.logSystem(`Order failed: ${error.message}`);
    }
  }

  private logSystem(message: string) {
    console.log(`[BOT] ${message}`);
    const logEntry: TradeLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      type: 'BUY', // Using as placeholder
      price: 0,
      amount: 0,
      status: `SYSTEM: ${message}`
    };
    this.logs.unshift(logEntry);
    if (this.logs.length > 100) this.logs.pop();
    this.emit('log', logEntry);
  }
}

// Export a singleton instance
export const botInstance = new TradingBot();
