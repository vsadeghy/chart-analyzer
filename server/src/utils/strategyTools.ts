import type { Chart, UpdateEmitter } from "~/types";
import { type Indicators } from "../bot/indicators";

export function strategyTools(updateEmitter: UpdateEmitter) {
  let chart: Chart;
  let indicators: Indicators;
  updateEmitter.on("update", (data) => {
    chart = data.chart;
    indicators = data.indicators;
  });
  return {
    checkDivergence,
    getBoxHeight,
    timeIndex: binarySearch,
  };
  function checkDivergence(startTime?: number) {
    const from = !startTime ? 0 : binarySearch(chart.dates, startTime);
    if (from === -1) return;
    return [
      getBuyDivergence(chart, indicators, "stochastics", from),
      getBuyDivergence(chart, indicators, "macd", from),
      getSellDivergence(chart, indicators, "stochastics", from),
      getSellDivergence(chart, indicators, "macd", from),
    ]
      .flatMap((x) => x)
      .toSorted((a, b) => a - b)
      .at(-1);
  }
  function getBoxHeight(idx: number) {
    const { tenkan, kijun } = indicators.ichimoku;
    const boxwidth = (() => {
      for (let i = idx - 51 + 1; i < idx; i++) {
        if (idx - i < 9) continue;
        const Tprev = tenkan[i - 1];
        const Kprev = kijun[i - 1];
        if (!Tprev || !Kprev) continue;

        const Tcur = tenkan[i];
        const Kcur = kijun[i];
        if ((Tprev < Kprev && Tcur > Kcur) || (Tprev > Kprev && Tcur < Kcur)) {
          // this.annotations.chart.x.push(i);
          return 26;
        }
      }
      return 51;
    })();
    let lowest = Infinity;
    let highest = -Infinity;
    for (let i = idx - boxwidth; i <= idx; i++) {
      lowest = Math.min(lowest, chart.lows[i]);
      highest = Math.max(highest, chart.highs[i]);
    }
    return highest - lowest;
  }
  function getBuyDivergence(
    chart: Chart,
    indicators: Indicators,
    on: keyof Pick<Indicators, "stochastics" | "macd">,
    from = 0
  ) {
    const indicator =
      on === "macd" ? indicators.macd.histogram : indicators[on];
    const indicatorMiddle = on === "stochastics" ? 50 : 0;

    if (indicator.length < 2) return [];
    const lowSwings = getSwings(indicator, (l, mid, r) => mid < l && mid < r);

    const divergence: number[] = [];
    for (let i = from; i < lowSwings.length - 1; i++) {
      const leftIdx = lowSwings[i];
      const rightIdx = lowSwings[i + 1];
      const leftSwing = indicator[leftIdx];
      const rightSwing = indicator[rightIdx];
      if (leftSwing > indicatorMiddle || rightSwing > indicatorMiddle) continue;

      // if there is no divergence, i.e. chart doesn't go in the opposite direction
      if (
        (leftSwing < rightSwing &&
          chart.lows[leftIdx] <= chart.lows[rightIdx]) ||
        (leftSwing > rightSwing && chart.lows[leftIdx] >= chart.lows[rightIdx])
      ) {
        continue;
      }

      const { tenkan, kijun } = indicators.ichimoku;
      if (
        (tenkan[leftIdx] < tenkan[rightIdx] &&
          kijun[leftIdx] < kijun[rightIdx]) ||
        (tenkan[leftIdx] > tenkan[rightIdx] && kijun[leftIdx] > kijun[rightIdx])
      ) {
        //continue;
      }

      let highestMidIndicator = 0;
      let highestMidCandle = 0;
      for (let j = leftIdx; j < rightIdx; j++) {
        highestMidIndicator = Math.max(highestMidIndicator, indicator[j]);
        if (highestMidIndicator >= indicatorMiddle) {
          highestMidIndicator = indicatorMiddle;
        }
        highestMidCandle = Math.max(highestMidCandle, chart.lows[j]);
      }

      // if the difference between current and previous is more that 2x the next one
      const rightIndicatorHight = Math.abs(rightSwing - highestMidIndicator);
      const leftIndicatorHight = Math.abs(leftSwing - highestMidIndicator);
      if (rightIndicatorHight < leftIndicatorHight / 2) {
        continue;
      }
      const rightCandleHight = Math.abs(
        chart.lows[rightIdx] - highestMidCandle
      );
      const leftCandleHight = Math.abs(chart.lows[leftIdx] - highestMidCandle);
      if (rightCandleHight > leftCandleHight * 1.25) {
        //continue;
      }
      divergence.push(chart.dates[rightIdx]);
      // annotations[on].x.push(leftIdx);
      // annotations[on].y.push(rightIdx);
    }
    return divergence;
  }
  function getSellDivergence(
    chart: Chart,
    indicators: Indicators,
    on: keyof Pick<Indicators, "stochastics" | "macd">,
    from = 0
  ) {
    const indicator =
      on === "macd" ? indicators.macd.histogram : indicators[on];
    const indicatorMiddle = on === "stochastics" ? 50 : 0;

    if (indicator.length < 2) return [];
    const highSwings = getSwings(indicator, (l, mid, r) => mid > l && mid > r);

    const divergence: number[] = [];
    for (let i = from; i < highSwings.length - 1; i++) {
      const leftIdx = highSwings[i];
      const rightIdx = highSwings[i + 1];
      const leftSwing = indicator[leftIdx];
      const rightSwing = indicator[rightIdx];
      if (leftSwing < indicatorMiddle || rightSwing < indicatorMiddle) {
        continue;
      }
      // if there is no divergence, i.e. chart doesn't go in the opposite direction
      if (
        (leftSwing < rightSwing &&
          chart.highs[leftIdx] <= chart.highs[rightIdx]) ||
        (leftSwing > rightSwing &&
          chart.highs[leftIdx] >= chart.highs[rightIdx])
      ) {
        continue;
      }

      const { tenkan, kijun: kijun } = indicators.ichimoku;
      if (
        (tenkan[leftIdx] < tenkan[rightIdx] &&
          kijun[leftIdx] < kijun[rightIdx]) ||
        (tenkan[leftIdx] > tenkan[rightIdx] && kijun[leftIdx] > kijun[rightIdx])
      ) {
        continue;
      }

      let lowestMidIndicator = 0;
      let lowestMidCandle = 0;
      for (let j = leftIdx; j < rightIdx; j++) {
        lowestMidIndicator = Math.min(lowestMidIndicator, indicator[j]);
        if (lowestMidIndicator <= indicatorMiddle) {
          lowestMidIndicator = indicatorMiddle;
        }
        lowestMidCandle = Math.min(lowestMidCandle, chart.highs[j]);
      }

      // if the difference between current and previous is more that 2x the next one
      const rightIndicatorHeight = Math.abs(rightSwing - lowestMidIndicator);
      const leftIndicatorHeight = Math.abs(leftSwing - lowestMidIndicator);
      if (rightIndicatorHeight < leftIndicatorHeight / 2) {
        continue;
      }

      const rightCandleHeight = Math.abs(
        chart.highs[rightIdx] - lowestMidCandle
      );
      const leftCandleHeight = Math.abs(chart.highs[leftIdx] - lowestMidCandle);
      if (rightCandleHeight > leftCandleHeight * 1.25) {
        continue;
      }

      divergence.push(chart.dates[rightIdx]);
      // annotations[on].x.push(leftIdx);
      // annotations[on].y.push(rightIdx);
    }
    return divergence;
  }
  function getSwings(
    indicator: number[],
    filter: (l: number, mid: number, r: number) => boolean,
    from?: number
  ) {
    if (indicator.length < 3) return [];
    let swings: number[] = [];
    for (let i = 1; i < (from ?? indicator.length - 1); i++) {
      if (filter(indicator[i - 1], indicator[i], indicator[i + 1])) {
        swings.push(i);
      }
    }
    return swings;
  }
}

function binarySearch<T>(array: T[], el: T) {
  let left = 0;
  let right = array.length - 1;
  while (right >= left) {
    const mid = ~~((left + right) / 2);
    const res = array[mid];
    if (res < el) left = mid + 1;
    else if (res > el) right = mid - 1;
    else return mid;
  }
  return -1;
}
