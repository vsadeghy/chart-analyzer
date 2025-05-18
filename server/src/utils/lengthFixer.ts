import type { Indicators } from "~/bot/indicators";
import type { Chart } from "~/types";

export const lengthFixer = (length: number) => (data: number[]) => {
  return data.slice(0, length).toReversed();
};

export const chartFixer = (length: number) => {
  const toFixed = lengthFixer(length);
  return {
    fixChart: (chart: Chart): Chart => ({
      dates: toFixed(chart.dates),
      opens: toFixed(chart.opens),
      highs: toFixed(chart.highs),
      lows: toFixed(chart.lows),
      closes: toFixed(chart.closes),
      volumes: toFixed(chart.volumes),
    }),
    fixIndicators: (indicators: Indicators): Indicators => ({
      stochastics: toFixed(indicators.stochastics),
      ichimoku: {
        tenkan: toFixed(indicators.ichimoku.tenkan),
        kijun: toFixed(indicators.ichimoku.kijun),
      },
      macd: {
        macd: toFixed(indicators.macd.macd),
        histogram: toFixed(indicators.macd.histogram),
        _cache: indicators.macd._cache,
      },
    }),
  };
};
