import type { Candle, Chart, One } from "~/types";
import { fixed } from "~/utils";

type MacdCache = { fast: number; slow: number; signal: number };
type MacdSrc = (candle: Candle) => number;
export class IndicatorsManager {
  private options = {
    stochastics: {
      KLen: 12,
      KSmooth: 1,
      DSmooth: 3,
    },

    ichimoku: {
      tenkan: 9,
      kijun: 26,
    },

    macd: {
      fast: 12,
      slow: 26,
      signal: 9,
      source: ((candle: Candle) =>
        fixed((candle.high + candle.low) / 2, 1)) as MacdSrc,
    },
  };
  private extraStoch;
  private extraIchimoku;
  extras;
  constructor(options?: Partial<typeof this.options>) {
    this.options = { ...this.options, ...options };
    this.extraIchimoku =
      Math.max(this.options.ichimoku.kijun, this.options.ichimoku.tenkan) - 1;
    this.extraStoch =
      this.options.stochastics.DSmooth +
      this.options.stochastics.KSmooth +
      this.options.stochastics.KLen -
      3;
    this.extras = Math.max(this.extraStoch, this.extraIchimoku) + 1;
  }
  private getStochastics(
    chart: Pick<Chart, "highs" | "lows" | "closes">,
    last = false
  ) {
    const stoch = (_chart: typeof chart, period: number) => {
      const result: number[] = [];
      const requiredLength = this.extraStoch - 1;
      const startIdx = last ? chart.highs.length - requiredLength : 0;
      for (let i = startIdx; i <= _chart.highs.length - period; i++) {
        let high = -Infinity;
        let low = Infinity;
        for (let j = i; j < i + period; j++) {
          high = Math.max(high, _chart.highs[j]);
          low = Math.min(low, _chart.lows[j]);
        }

        const close = _chart.closes[i];
        const stoch = fixed(((close - low) / (high - low)) * 100);
        result.push(stoch);
      }
      return result;
    };

    const sma = (data: number[], period: number) => {
      const result = [data.slice(0, period).reduce((acc, cur) => acc + cur)];
      for (let i = 0; i < data.length - period; i++) {
        result.push(result[i] - data[i] + data[i + period]);
      }
      return result.map((x) => fixed(x / period, 2));
    };

    const { KLen, KSmooth, DSmooth } = this.options.stochastics;
    const stochastics = sma(sma(stoch(chart, KLen), KSmooth), DSmooth);
    return stochastics;
  }
  private getIchimoku(chart: Pick<Chart, "highs" | "lows">, last = false) {
    const donchain = (period: number) => {
      const result: number[] = [];
      const length = chart.highs.length - period;
      const startIdx = last ? length : 0;
      for (let i = startIdx; i <= length; i++) {
        let high = -Infinity;
        let low = Infinity;
        for (let j = i; j < i + period; j++) {
          high = Math.max(high, chart.highs[j]);
          low = Math.min(low, chart.lows[j]);
        }
        const donchian = fixed((high + low) / 2);
        result.push(donchian);
      }
      return result;
    };
    const ichimokuOptions = this.options.ichimoku;
    const tenkan = donchain(ichimokuOptions.tenkan);
    const kijun = donchain(ichimokuOptions.kijun);
    return { tenkan, kijun };
  }
  private getMACD(chart: Pick<Chart, "highs" | "lows">, _cache?: MacdCache) {
    const ema = (period: number, data: number, prev: number) => {
      const alpha = 2 / (period + 1);
      return fixed(alpha * data + (1 - alpha) * prev, 1);
    };

    const source = chart.highs.map((h, i) => fixed((h + chart.lows[i]) / 2, 1));
    const length = source.length;

    const fast = [_cache?.fast ?? source[length - 1]];
    const slow = [_cache?.slow ?? source[length - 1]];
    const macd = [fast[0] - slow[0]];
    const signal = [_cache?.signal ?? macd[0]];
    const histogram = [macd[0] - signal[0]];

    const endIdx = _cache ? 1 : length;
    const options = this.options.macd;
    for (let i = 1; i <= endIdx; i++) {
      fast.push(ema(options.fast, source[endIdx - i], fast[i - 1]));
      slow.push(ema(options.slow, source[endIdx - i], slow[i - 1]));
      macd.push(fast[i] - slow[i]);
      signal.push(ema(options.signal, macd[i], signal[i - 1]));
      histogram.push(macd[i] - signal[i]);
    }

    macd.reverse();
    histogram.reverse();
    return {
      macd,
      histogram,
      _cache: {
        fast: fast[fast.length - 1],
        slow: slow[slow.length - 1],
        signal: signal[signal.length - 1],
      } as NonNullable<typeof _cache>,
    };
  }

  getIndicators(chart: Chart) {
    const data = {
      stochastics: this.getStochastics(chart),
      ichimoku: this.getIchimoku(chart),
      macd: this.getMACD(chart),
    };
    return data;
  }
  getLastIndicators(chart: Chart, macdCache: MacdCache) {
    const stoch = this.getStochastics(chart, true);
    const { tenkan, kijun } = this.getIchimoku(chart, true);
    const { macd: mcd, histogram, _cache } = this.getMACD(chart, macdCache);
    const data = {
      stochastic: stoch[0],
      ichimoku: { tenkan: tenkan[0], kijun: kijun[0] },
      macd: { macd: mcd[0], histogram: histogram[0], _cache },
    };
    return data;
  }
}
export type Indicators = ReturnType<
  typeof IndicatorsManager.prototype.getIndicators
>;
export type LastIndicators = One<Indicators>;
