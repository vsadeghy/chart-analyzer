import { ChartData } from "@/types";

interface IOhlcvValues {
  dateValues: number[];
  openValues: number[];
  highValues: number[];
  lowValues: number[];
  closeValues: number[];
  volumeValues: number[];
}

export const fetchChart = () => {
  type Annotation = {
    chartlines: { x1: number; x2: number; y1: number; y2: number }[];
  } & { [key: string]: { x: number[]; y: number[] } };

  type Res = {
    ohlcv: IOhlcvValues;
    indicators: ChartData["indicators"];
    annotations: Annotation;
  };
  if (typeof window !== "undefined") {
    const url = "http://localhost:4000";
    return fetch(url).then(async (response) => {
      const res = await response.json();
      const result = res as unknown as ChartData & {
        annotations: Annotation;
      };
      const chart = result.chart;
      const ohlcv: IOhlcvValues = {
        dateValues: chart.dates,
        openValues: chart.opens,
        highValues: chart.highs,
        lowValues: chart.lows,
        closeValues: chart.closes,
        volumeValues: chart.volumes,
      };
      return {
        ohlcv,
        indicators: result.indicators,
        annotations: result.annotations,
      };
    }) as Promise<Res>;
  }

  return Promise.resolve({} as Res);
};
