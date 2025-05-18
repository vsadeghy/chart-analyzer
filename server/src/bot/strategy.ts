import type { Candle, Chart, Exchange, Prettify } from "~/types";
import { chartFixer, retry } from "~/utils";
import {
  IndicatorsManager,
  LastIndicators,
  type Indicators,
} from "./indicators";
import { NobitexExchange } from "./exchanges";

export class Strategy {
  private chart = {} as Chart;
  private indicatorManager;
  private indicators = {} as Indicators;
  private annotations: Prettify<
    Record<
      "chart" | keyof Pick<Indicators, "macd" | "stochastics">,
      { x: number[]; y: number[] }
    > & { chartlines: { x1: number; y1: number; x2: number; y2: number }[] }
  > = {
    chart: {
      x: [],
      y: [],
    },
    stochastics: {
      x: [],
      y: [],
    },
    macd: {
      x: [],
      y: [],
    },
    chartlines: [],
  };
  private position?: "buying" | "selling";
  constructor(private exchange: NobitexExchange) {
    this.indicatorManager = new IndicatorsManager();
    this.exchange.on("newCandle", this.update.bind(this));
  }

  getChart() {
    return this.chart;
  }
  getIndicators() {
    const { macd, stochastics, ichimoku } = this.indicators;
    return {
      stochastics,
      ichimoku,
      macd: {
        macd: macd.macd,
        histogram: macd.histogram,
      },
    };
  }
  getAnnotations() {
    return this.annotations;
  }

  async init() {
    const length = 600;
    const { data: chart, error } = await retry(
      () => this.exchange.getChart(length + this.indicatorManager.extras),
      "getting chart"
    );
    if (error) throw error;

    const indicators = this.indicatorManager.getIndicators(chart);
    const fixer = chartFixer(length);
    this.chart = fixer.fixChart(chart);
    this.indicators = fixer.fixIndicators(indicators);
  }

  private update(newCandle: Candle) {
    this.addCandle(newCandle);
    const newIndicators = this.indicatorManager.getLastIndicators(
      this.chart,
      this.indicators.macd._cache
    );
    this.addIndicators(newIndicators);
    this.checkMarket();
  }

  private addCandle(candle: Candle) {
    const { open, high, low, close, volume, date } = candle;
    this.chart.dates.push(date);
    this.chart.opens.push(open);
    this.chart.highs.push(high);
    this.chart.lows.push(low);
    this.chart.closes.push(close);
    this.chart.volumes.push(volume);
  }

  private addIndicators(newIndicators: LastIndicators) {
    const {
      stochastic,
      ichimoku: { tenkan, kijun },
      macd: { macd: macdIndicator, histogram, _cache },
    } = newIndicators;
    this.indicators.stochastics.push(stochastic);
    this.indicators.ichimoku.tenkan.push(tenkan);
    this.indicators.ichimoku.kijun.push(kijun);
    this.indicators.macd.macd.push(macdIndicator);
    this.indicators.macd.histogram.push(histogram);
    this.indicators.macd._cache = _cache;
  }

  async run() {
    if (!this.chart.dates.length) {
      throw new Error("Call init first");
    }
    await this.exchange.startCandleMonitoring();
    this.checkMarket();
  }
  private checkMarket() {
    if (!this.position || this.position === "selling") {
      if (this.canBuy()) this.buy();
    } else {
      if (this.canSell()) this.sell();
    }
  }
  // TODO: Implement your own buy conditon
  private canBuy() {
    return this.position !== "buying";
  }
  // TODO: Implement your own sell conditon
  private canSell() {
    return this.position !== "selling";
  }
  private async buy() {
    this.exchange.buy();
  }
  private sell() {
    this.exchange.sell();
  }
}
