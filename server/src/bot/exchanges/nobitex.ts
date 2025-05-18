import { CronJob } from "cron";
import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import {
  type HistoryResponse,
  Nobitex,
  type Symbols as NobitexSymbols,
  type TimeFrame,
} from "nobitex";
import path from "path";
import { env } from "~/env";
import type { Candle, Chart, ChartOptions, Exchange, Period } from "~/types";
import { MyEmitter } from "~/types";
import { fixed, tryCatch, periodToSeconds, retry } from "~/utils";

type Symbols = ChartOptions["symbol"];
const symbols: { [key in Symbols]: NobitexSymbols } = {
  "BTC-USDT": "BTCUSDT",
  "ETH-USDT": "ETHUSDT",
};
const resolutions: { [key in Period]: TimeFrame } = {
  "1min": "1m",
  "5min": "5m",
  "15min": "15m",
  "30min": "30m",
  "1hour": "1h",
  "4hour": "4h",
  "6hour": "6h",
  "12hour": "12h",
  "1day": "1d",
};

type NobitexResponse =
  | { s: "no_data" }
  | ({ s: "ok" } & HistoryResponse)
  | { s: "error"; errmsg: string };

export class NobitexExchange extends MyEmitter implements Exchange {
  private readonly api = new Nobitex(env.NOBITX_API_KEY);
  private cronJob: CronJob | null = null;
  private interval;
  private nextCandleTime = 0;
  constructor(private options: ChartOptions) {
    super();
    this.interval = periodToSeconds(this.options.period);
  }

  // TODO: Implement your own buy function
  async buy() {
    // TODO: Umcomment once you got an API key
    // const { srcCurrency, dstCurrency } = symbolToSrcDst(this.options.symbol);
    // const { data: balance, error } = await tryCatch(
    //   this.api.balance(srcCurrency)
    // );
    // if (error) throw new Error("Failed to fetch balance: " + error);
    // if (balance.status !== "ok")
    //   throw new Error("Failed to fetch balance: " + error);
    // if (+balance.balance <= 0) throw new Error("Insufficient balance");
    // const buyPrice = +balance.balance / 10;
    // const buyPromise = this.api.addOrder(
    //   "buy",
    //   srcCurrency,
    //   dstCurrency,
    //   "" + buyPrice,
    //   0, // no need if execution is market
    //   "market"
    // );
    // TEST: not tested yet. test it or implement your own
    // const {data: order, error: orderError} = await tryCatch(buyPromise);
    // if (orderError) throw new Error("Failed to buy: " + orderError);
  }
  // TODO: Implement your own buy function
  async sell() {
    // TODO: Umcomment once you got an API key
    // const { srcCurrency, dstCurrency } = symbolToSrcDst(this.options.symbol);
    // const { data: balance, error } = await tryCatch(
    //   this.api.balance(dstCurrency)
    // );
    // if (error) throw new Error("Failed to fetch balance: " + error);
    // if (balance.status !== "ok") throw new Error("Failed to fetch balance");
    // if (+balance.balance <= 0) throw new Error("Insufficient balance");
    // const buyPrice = +balance.balance / 10;
    // const sellPromise = this.api.addOrder(
    //   "sell",
    //   srcCurrency,
    //   dstCurrency,
    //   "" + buyPrice,
    //   0, // no need if execution is market
    //   "market"
    // );
    // TEST: not tested yet. test it or implement your own
    // const {data: order, error: orderError} = await tryCatch(sellPromise);
    // if (orderError) throw new Error("Failed to buy: " + orderError);
  }

  async getChart(length: number) {
    const { symbol, period, fresh } = this.options;
    const chartName = `${symbol}-nobitex-${length}x${period}.json`;
    const chartPath = path.join(import.meta.dirname, "charts", chartName);

    const isFresh = fresh || env.NODE_ENV === "production";
    if (!isFresh && existsSync(chartPath)) {
      const chart: Chart = await import(`./charts/${chartName}`);
      return chart;
    }
    const to = ~~(Date.now() / 1000) - this.interval; // because we don't want the open candle
    const from = to - length * this.interval;

    const { data, error } = await tryCatch(
      this.api.ohlcv(
        symbols[symbol],
        resolutions[period],
        from,
        to
      ) as unknown as Promise<NobitexResponse>
    );
    if (error) throw new Error("Failed to fetch chart: " + error);
    if (data.s === "error")
      throw new Error("Failed to fetch chart: " + data.errmsg);
    if (data.s === "no_data") throw new Error("Wrong time interval");

    const chart = {
      dates: data.t.map((x) => fixed(x)).toReversed(),
      opens: data.o.map((x) => fixed(x)).toReversed(),
      highs: data.h.map((x) => fixed(x)).toReversed(),
      lows: data.l.map((x) => fixed(x)).toReversed(),
      closes: data.c.map((x) => fixed(x)).toReversed(),
      volumes: data.v.map((x) => fixed(x)).toReversed(),
    };

    /*
     * chart.dates[0] is the last closed candle
     * chart.dates[0] + 1 is the current candle
     * chart.dates[0] + 2 is when the current closes
     */
    this.nextCandleTime = chart.dates[0] + this.interval * 2;
    const chartDir = path.dirname(chartPath);
    if (!existsSync(chartDir)) mkdirSync(chartDir, { recursive: true });
    const { error: saveError } = await tryCatch(
      writeFile(chartPath, JSON.stringify(chart, null, 2))
    );
    if (saveError)
      console.error("Failed to write chart to file", { saveError });
    return chart;
  }

  async getNewCandle() {
    if (this.nextCandleTime > Date.now()) throw new Error("Candle not ready");

    const { symbol, period } = this.options;
    const to = this.nextCandleTime;
    const from = this.nextCandleTime - this.interval;
    const { data, error } = await tryCatch(
      this.api.ohlcv(
        symbols[symbol],
        resolutions[period],
        from,
        to
      ) as unknown as Promise<NobitexResponse>
    );
    if (error) throw new Error("failed to fetch chart: " + error);
    if (data.s === "error")
      throw new Error("failed to fetch chart: " + data.errmsg);
    if (data.s === "no_data" || data.t.length !== 1)
      throw new Error("wrong time interval");

    const newCandle: Candle = {
      open: fixed(data.o[0]),
      high: fixed(data.h[0]),
      low: fixed(data.l[0]),
      close: fixed(data.c[0]),
      volume: fixed(data.v[0]),
      date: fixed(data.t[0]),
    };
    return newCandle;
  }

  async startCandleMonitoring() {
    if (this.cronJob) {
      return console.log("Candle monitoring already started");
    }

    const timeout = this.nextCandleTime - Date.now() / 1000;
    setTimeout(this.setupCronJob.bind(this), timeout);
  }

  private setupCronJob() {
    let cronTime = secondsToCron(this.interval);
    this.cronJob = new CronJob(
      cronTime,
      async () => {
        const { data: newCandle, error } = await retry(
          this.getNewCandle.bind(this),
          "getting new candle",
          Infinity,
          5000
        );
        if (error) throw error;
        this.nextCandleTime = newCandle.date + this.interval;
        this.emit("newCandle", newCandle);
      },
      null,
      true
    );
  }
  stopCandleMonitoring() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.clearListeners();
  }
}

function secondsToCron(seconds: number) {
  if (seconds < 60) return `*/${seconds} * * * * *`;
  let minutes = ~~(seconds / 60);
  if (minutes < 60) return `* */${minutes} * * * *`;
  let hours = ~~(minutes / 60);
  if (hours < 24) return `* * */${hours} * * *`;
  let days = ~~(hours / 24);
  return `* * * */${days} * *`;
}
