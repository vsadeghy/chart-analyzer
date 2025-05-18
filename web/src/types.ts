type Chart = {
  dates: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
};
type Indicators = {
  stochastics: number[];
  ichimoku: {
    tenkan: number[];
    kijun: number[];
  };
  macd: {
    macd: number[];
    histogram: number[];
  };
};

export type ChartData = {
  chart: Chart;
  indicators: Indicators;
  len: number;
};
