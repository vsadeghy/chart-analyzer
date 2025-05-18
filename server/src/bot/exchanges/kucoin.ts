import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { env } from "~/env";
import type { Chart, ChartOptions, Exchange } from "~/types";
import { fixed, tryCatch, periodToSeconds } from "~/utils";

export class KucoinEchange implements Exchange {
  async getChart(options: ChartOptions) {
    const { symbol, period, fresh, length } = options;
    const chartName = `${symbol}-kucoin-${length}x${period}.json`;
    const chartPath = path.join(import.meta.dirname, "charts", chartName);

    const isFresh = fresh || env.NODE_ENV === "production";
    if (!isFresh && existsSync(chartPath)) {
      const chart: Chart = await import(`./charts/${chartName}`);
      return chart;
    }
    const periodSeconds = periodToSeconds(period);
    const endAt = ~~(Date.now() / 1000);
    const startAt = endAt - length * periodSeconds;

    const url = `https://api.kucoin.com/api/v1/market/candles?symbol=${symbol}&type=${period}&startAt=${startAt}&endAt=${endAt}`;
    const { data } = await tryCatch(fetch(url));
    if (!data) throw new Error("failed to fetch chart");
    const { data: json } = await tryCatch(
      data.json() as Promise<{ code: string; data: number[][] }>
    );
    if (!json) throw new Error("failed to fetch chart");
    if (json.code !== "200000") throw Error("data error");

    const chart = json.data.reduce(
      (acc, cdata) => {
        const [time, open, close, high, low, volume, _amount] =
          cdata.map(fixed);
        acc.dates.push(time);
        acc.opens.push(open);
        acc.highs.push(high);
        acc.lows.push(low);
        acc.closes.push(close);
        acc.volumes.push(volume);
        return acc;
      },
      {
        dates: [],
        opens: [],
        highs: [],
        lows: [],
        closes: [],
        volumes: [],
      } as Chart
    );
    const { error } = await tryCatch(
      writeFile(chartPath, JSON.stringify(chart))
    );
    if (error) console.error("Failed to write chart to file", { error });
    return chart;
  }
}
