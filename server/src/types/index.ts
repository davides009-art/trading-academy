import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: number;
}

export interface JwtPayload {
  userId: number;
  email: string;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VisualConfig {
  type: 'candlestick' | 'diagram';
  data?: CandleData[];
  markers?: Array<{
    time: number;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: string;
    text: string;
  }>;
  priceLines?: Array<{
    price: number;
    color: string;
    lineWidth: number;
    lineStyle: number;
    axisLabelVisible: boolean;
    title: string;
  }>;
}

export interface DrillZone {
  type: 'support' | 'resistance' | 'liquidity' | 'order_block';
  priceFrom: number;
  priceTo: number;
  tolerance?: number;
}

export interface DrillPoint {
  type: 'swing_high' | 'swing_low' | 'entry' | 'bos' | 'choch';
  price: number;
  barIndex: number;
  direction?: 'bullish' | 'bearish';
  tolerance?: number;
  barTolerance?: number;
}

export interface DrillAnswerSet {
  zones?: DrillZone[];
  points?: DrillPoint[];
  description: string;
}

export interface DrillUserInput {
  zones?: Array<{
    type: string;
    priceFrom: number;
    priceTo: number;
  }>;
  points?: Array<{
    type: string;
    price: number;
    barIndex?: number;
    direction?: string;
  }>;
}
