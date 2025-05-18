import Emittery from "emittery";
import { Indicators } from "./bot/indicators";
export type Period =
  | "1min"
  | "5min"
  | "15min"
  | "30min"
  | "1hour"
  | "4hour"
  | "6hour"
  | "12hour"
  | "1day";

export type ChartSymbol = "BTC-USDT" | "ETH-USDT";

export type ChartOptions = {
  symbol: ChartSymbol;
  period: Period;
  fresh?: boolean;
};

type Emit = {
  newCandle: Candle;
};
export type UpdateEmitter = Emittery<{
  update: { chart: Chart; indicators: Indicators };
}>;
export class MyEmitter extends Emittery<Emit> {}
export interface Exchange extends MyEmitter {
  getChart(length: number): Promise<Chart>;
  buy(): any;
  sell(): any;
  getNewCandle(): Promise<Candle>;
  startCandleMonitoring(): void;
  stopCandleMonitoring(): void;
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Chart = {
  dates: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
};

export type One<T> = T extends unknown[]
  ? T[number]
  : T extends object
    ? {
        [K in keyof T as K extends `${infer U}s` ? U : K]: One<T[K]>;
      }
    : T;

export type Candle = One<Chart>;
