import {
  CategoryAxis,
  easing,
  EAutoRange,
  EAxisAlignment,
  EDataSeriesType,
  EExecuteOn,
  EFillPaletteMode,
  ELabelAlignment,
  ENumericFormat,
  ESeriesType,
  EStrokePaletteMode,
  FastCandlestickRenderableSeries,
  FastColumnRenderableSeries,
  FastLineRenderableSeries,
  FastMountainRenderableSeries,
  GradientParams,
  HorizontalLineAnnotation,
  IFillPaletteProvider,
  IRenderableSeries,
  IStrokePaletteProvider,
  MouseWheelZoomModifier,
  NumberRange,
  NumericAxis,
  OhlcDataSeries,
  OhlcSeriesInfo,
  parseColorToUIntArgb,
  Point,
  RolloverModifier,
  RubberBandXyZoomModifier,
  SciChartSurface,
  SciChartVerticalGroup,
  SeriesInfo,
  SmartDateLabelProvider,
  VerticalLineAnnotation,
  XyDataSeries,
  ZoomExtentsModifier,
  ZoomPanModifier,
} from "scichart";
import { fetchChart } from "./fetchChart";
import { appTheme } from "./theme";

const getTradingData = async (startPoints?: number, maxPoints?: number) => {
  const {
    ohlcv: {
      dateValues,
      openValues,
      highValues,
      lowValues,
      closeValues,
      volumeValues,
    },
    indicators,
    annotations,
  } = await fetchChart();

  if (maxPoints && startPoints && maxPoints) {
    return {
      dateValues: dateValues.slice(startPoints, startPoints + maxPoints),
      openValues: openValues.slice(startPoints, startPoints + maxPoints),
      highValues: highValues.slice(startPoints, startPoints + maxPoints),
      lowValues: lowValues.slice(startPoints, startPoints + maxPoints),
      closeValues: closeValues.slice(startPoints, startPoints + maxPoints),
      volumeValues: volumeValues.slice(startPoints, startPoints + maxPoints),
    };
  }

  return {
    dateValues,
    openValues,
    highValues,
    lowValues,
    closeValues,
    volumeValues,
    indicators,
    annotations,
  };
};

// Override the standard legend displayed by RolloverModifier
const getTooltipLegendTemplate = (seriesInfos: SeriesInfo[]) => {
  let outputSvgString = "";

  // Foreach series there will be a seriesInfo supplied by SciChart. This contains info about the series under the house
  seriesInfos.forEach((seriesInfo, index) => {
    const y = 20 + index * 20;
    const textColor = seriesInfo.stroke;
    let legendText = seriesInfo.formattedYValue;
    if (seriesInfo.dataSeriesType === EDataSeriesType.Ohlc) {
      const o = seriesInfo as OhlcSeriesInfo;
      legendText = `Open=${o.formattedOpenValue} High=${o.formattedHighValue} Low=${o.formattedLowValue} Close=${o.formattedCloseValue}`;
    }
    outputSvgString += `<text x="8" y="${y}" font-size="13" font-family="Verdana" fill="${textColor}">
            ${seriesInfo.seriesName}: ${legendText}
        </text>`;
  });

  return `<svg width="100%" height="100%">
                ${outputSvgString}
            </svg>`;
};

// Override the Renderableseries to display on the scichart overview
const _getOverviewSeries = (defaultSeries: IRenderableSeries) => {
  if (defaultSeries.type === ESeriesType.CandlestickSeries) {
    // Swap the default candlestick series on the overview chart for a mountain series. Same data
    return new FastMountainRenderableSeries(
      defaultSeries.parentSurface.webAssemblyContext2D,
      {
        dataSeries: defaultSeries.dataSeries,
        fillLinearGradient: new GradientParams(
          new Point(0, 0),
          new Point(0, 1),
          [
            { color: appTheme.VividSkyBlue + "77", offset: 0 },
            { color: "Transparent", offset: 1 },
          ]
        ),
        stroke: appTheme.VividSkyBlue,
      }
    );
  }
  // hide all other series
  return undefined;
};

export const getChartsInitializationAPI = () => {
  // We can group together charts using VerticalChartGroup type
  const verticalGroup = new SciChartVerticalGroup();

  const dataPromise = getTradingData();

  let chart1XAxis: CategoryAxis;
  let chart2XAxis: CategoryAxis;
  let chart3XAxis: CategoryAxis;
  const axisAlignment = EAxisAlignment.Right;

  const upCol = appTheme.VividGreen;
  const downCol = appTheme.MutedRed;
  const opacity = "AA";

  // CHART 1
  const drawPriceChart = async (rootElement: string | HTMLDivElement) => {
    const [chart, data] = await Promise.all([
      SciChartSurface.create(rootElement, {
        // prevent default size settings
        disableAspect: true,
        theme: appTheme.SciChartJsTheme,
      }),
      dataPromise,
    ]);
    const { wasmContext, sciChartSurface } = chart;
    const {
      dateValues,
      openValues,
      highValues,
      lowValues,
      closeValues,
      volumeValues,
      indicators,
      annotations,
    } = data;

    chart1XAxis = new CategoryAxis(wasmContext, {
      drawLabels: false,
      drawMajorTickLines: false,
      drawMinorTickLines: false,
    });
    sciChartSurface.xAxes.add(chart1XAxis);

    const yAxis = new NumericAxis(wasmContext, {
      maxAutoTicks: 5,
      autoRange: EAutoRange.Always,
      growBy: new NumberRange(0.3, 0.11),
      labelFormat: ENumericFormat.Decimal,
      labelPrecision: 1,
      cursorLabelFormat: ENumericFormat.Decimal,
      cursorLabelPrecision: 1,
      labelPrefix: "$",
      axisAlignment,
    });
    sciChartSurface.yAxes.add(yAxis);

    // OHLC DATA SERIES
    const usdDataSeries = new OhlcDataSeries(wasmContext, {
      dataSeriesName: "BTC/USDT",
      xValues: dateValues,
      openValues,
      highValues,
      lowValues,
      closeValues,
    });
    const fcRendSeries = new FastCandlestickRenderableSeries(wasmContext, {
      dataSeries: usdDataSeries,
      stroke: appTheme.ForegroundColor, // Used for legend template
      brushUp: upCol + "77",
      brushDown: downCol + "77",
      strokeUp: upCol,
      strokeDown: downCol,
    });
    sciChartSurface.renderableSeries.add(fcRendSeries);

    const { tenkan, kijun } = indicators!.ichimoku;
    const tenkanData = new XyDataSeries(wasmContext, {
      xValues: dateValues,
      yValues: tenkan,
      dataSeriesName: "Tenkan",
    });
    const tenkanSeries = new FastLineRenderableSeries(wasmContext, {
      dataSeries: tenkanData,
      stroke: appTheme.VividBlue,
      strokeThickness: 1,
    });
    sciChartSurface.renderableSeries.add(tenkanSeries);

    const kijunData = new XyDataSeries(wasmContext, {
      xValues: dateValues,
      yValues: kijun,
      dataSeriesName: "Kijun",
    });
    const kijunSeries = new FastLineRenderableSeries(wasmContext, {
      dataSeries: kijunData,
      stroke: appTheme.VividRed,
      strokeThickness: 1,
    });
    sciChartSurface.renderableSeries.add(kijunSeries);

    for (const annotx of annotations!.chart.x) {
      sciChartSurface.annotations.add(
        new VerticalLineAnnotation({
          x1: annotx,
        })
      );
    }
    for (const annoty of annotations!.chart.y) {
      sciChartSurface.annotations.add(
        new HorizontalLineAnnotation({
          y1: annoty,
          stroke: appTheme.VividRed,
        })
      );
    }

    //for (const lines of annotations!.chartlines) {
    //  sciChartSurface.annotations.add(
    //    new LineAnnotation({
    //      x1: lines.x1,
    //      x2: lines.x2,
    //      y1: lines.y1,
    //      y2: lines.y2,
    //      stroke: appTheme.VividRed,
    //    })
    //  );
    //}

    sciChartSurface.chartModifiers.add(
      new ZoomPanModifier({ enableZoom: true }),
      new ZoomExtentsModifier(),
      new MouseWheelZoomModifier(),
      new RubberBandXyZoomModifier({
        executeOn: EExecuteOn.MouseRightButton,
        easingFunction: easing.inOutExpo,
      }),
      new RolloverModifier({
        modifierGroup: "cursorGroup",
        showTooltip: false,
        tooltipLegendTemplate: getTooltipLegendTemplate,
      })
    );

    verticalGroup.addSurfaceToGroup(sciChartSurface);

    return { wasmContext, sciChartSurface };
  };

  // CHART 2 - MACD
  const drawMacdChart = async (rootElement: string | HTMLDivElement) => {
    const [
      { wasmContext, sciChartSurface },
      { dateValues, closeValues, indicators, annotations },
    ] = await Promise.all([
      SciChartSurface.create(rootElement, {
        // prevent default size settings
        disableAspect: true,
        theme: appTheme.SciChartJsTheme,
      }),
      dataPromise,
    ]);

    chart2XAxis = new CategoryAxis(wasmContext, {
      drawLabels: false,
      drawMajorTickLines: false,
      drawMinorTickLines: false,
    });
    sciChartSurface.xAxes.add(chart2XAxis);

    const yAxis = new NumericAxis(wasmContext, {
      autoRange: EAutoRange.Always,
      growBy: new NumberRange(0.1, 0.1),
      axisAlignment,
      labelPrecision: 2,
      cursorLabelPrecision: 2,
      labelStyle: { alignment: ELabelAlignment.Right },
    });
    yAxis.labelProvider.numericFormat = ENumericFormat.Decimal;
    sciChartSurface.yAxes.add(yAxis);

    const bandSeries = new FastLineRenderableSeries(wasmContext, {
      dataSeries: new XyDataSeries(wasmContext, {
        dataSeriesName: "MACD",
        xValues: dateValues,
        yValues: indicators!.macd.macd,
      }),
      stroke: appTheme.MutedBlue,
    });
    sciChartSurface.renderableSeries.add(bandSeries);

    const columnSeries = new FastColumnRenderableSeries(wasmContext, {
      dataSeries: new XyDataSeries(wasmContext, {
        dataSeriesName: "Histogram",
        xValues: dateValues,
        yValues: indicators!.macd.histogram,
      }),
      paletteProvider: new MacdHistogramPaletteProvider(
        upCol + "AA",
        downCol + "AA"
      ),
      dataPointWidth: 0.5,
    });
    for (const annotx of annotations!.macd.x) {
      sciChartSurface.annotations.add(
        new VerticalLineAnnotation({
          x1: annotx,
        })
      );
    }
    for (const annoty of annotations!.macd.y) {
      sciChartSurface.annotations.add(
        new VerticalLineAnnotation({
          x1: annoty,
          stroke: appTheme.VividRed,
        })
      );
    }
    sciChartSurface.renderableSeries.add(columnSeries);

    sciChartSurface.chartModifiers.add(
      new ZoomPanModifier({ enableZoom: true }),
      new ZoomExtentsModifier(),
      new MouseWheelZoomModifier(),
      new RolloverModifier({
        modifierGroup: "cursorGroup",
        showTooltip: false,
        tooltipLegendTemplate: getTooltipLegendTemplate,
      })
    );

    verticalGroup.addSurfaceToGroup(sciChartSurface);

    return { wasmContext, sciChartSurface };
  };

  // CHART 3 - Stochastic
  const drawStochasticChart = async (rootElement: string | HTMLDivElement) => {
    const [
      { wasmContext, sciChartSurface },
      { dateValues, indicators, annotations },
    ] = await Promise.all([
      SciChartSurface.create(rootElement, {
        // prevent default size settings
        disableAspect: true,
        theme: appTheme.SciChartJsTheme,
      }),
      dataPromise,
    ]);

    chart3XAxis = new CategoryAxis(wasmContext, {
      autoRange: EAutoRange.Once,
      labelProvider: new SmartDateLabelProvider(),
    });
    sciChartSurface.xAxes.add(chart3XAxis);

    const yAxis = new NumericAxis(wasmContext, {
      autoRange: EAutoRange.Always,
      growBy: new NumberRange(0.1, 0.1),
      axisAlignment,
      labelPrecision: 2,
      cursorLabelPrecision: 2,
      labelStyle: { alignment: ELabelAlignment.Right },
    });
    yAxis.labelProvider.numericFormat = ENumericFormat.Decimal;
    sciChartSurface.yAxes.add(yAxis);

    const stochRenderableSeries = new FastLineRenderableSeries(wasmContext, {
      dataSeries: new XyDataSeries(wasmContext, {
        dataSeriesName: "Stoch",
        xValues: dateValues,
        yValues: indicators!.stochastics,
      }),
      stroke: appTheme.MutedBlue,
      strokeThickness: 2,
    });
    sciChartSurface.renderableSeries.add(stochRenderableSeries);
    for (const annotx of annotations!.stochastics.x) {
      sciChartSurface.annotations.add(
        new VerticalLineAnnotation({
          x1: annotx,
        })
      );
    }
    for (const annoty of annotations!.stochastics.y) {
      sciChartSurface.annotations.add(
        new VerticalLineAnnotation({
          x1: annoty,
          stroke: appTheme.VividRed,
        })
      );
    }

    sciChartSurface.chartModifiers.add(
      new ZoomPanModifier({ enableZoom: true }),
      new ZoomExtentsModifier(),
      new MouseWheelZoomModifier(),
      new RolloverModifier({
        modifierGroup: "cursorGroup",
        showTooltip: false,
        tooltipLegendTemplate: getTooltipLegendTemplate,
      })
    );

    verticalGroup.addSurfaceToGroup(sciChartSurface);

    return { wasmContext, sciChartSurface };
  };

  // DRAW OVERVIEW
  // Must be done after main chart creation
  //const drawOverview =
  //  (mainSurface: SciChartSurface) =>
  //  async (rootElement: string | HTMLDivElement) => {
  //    console.log("in drawOverview mainSurface: ", mainSurface);
  //    const overview = await SciChartOverview.create(mainSurface, rootElement, {
  //      // prevent default size settings
  //      disableAspect: true,
  //      theme: appTheme.SciChartJsTheme,
  //      transformRenderableSeries: getOverviewSeries,
  //    });
  //
  //    return {sciChartSurface: overview.overviewSciChartSurface};
  //  };

  const configureAfterInit = () => {
    const synchronizeAxes = () => {
      // TODO refactor using AxisSynchroniser

      // SYNCHRONIZE VISIBLE RANGES
      chart1XAxis.visibleRangeChanged.subscribe((data1) => {
        if (!data1) return;
        chart2XAxis.visibleRange = data1.visibleRange;
        chart3XAxis.visibleRange = data1.visibleRange;
      });
      chart2XAxis.visibleRangeChanged.subscribe((data1) => {
        if (!data1) return;
        chart1XAxis.visibleRange = data1.visibleRange;
        chart3XAxis.visibleRange = data1.visibleRange;
      });
      chart3XAxis.visibleRangeChanged.subscribe((data1) => {
        if (!data1) return;
        chart1XAxis.visibleRange = data1.visibleRange;
        chart2XAxis.visibleRange = data1.visibleRange;
      });
    };

    synchronizeAxes();

    // Force showing the latest 200 bars
    const oneDay = 600; // One day in javascript Date() has a value of 600
    const twoHundredDays = oneDay * 200; // 200 days in JS date
    const twoHundredDaysSciChartFormat = twoHundredDays / 1000; // SciChart expects date.getTime() / 1000
    chart1XAxis.visibleRange = new NumberRange(
      chart1XAxis.visibleRange.max - twoHundredDaysSciChartFormat,
      chart1XAxis.visibleRange.max
    );
  };

  return {
    drawPriceChart,
    drawMacdChart,
    drawStochasticChart,
    //drawOverview,
    configureAfterInit,
  };
};

/**
 * An example PaletteProvider applied to the volume column series. It will return green / red
 * fills and strokes when the main price data bar is up or down
 */
class VolumePaletteProvider
  implements IStrokePaletteProvider, IFillPaletteProvider
{
  public readonly strokePaletteMode: EStrokePaletteMode =
    EStrokePaletteMode.SOLID;
  public readonly fillPaletteMode: EFillPaletteMode = EFillPaletteMode.SOLID;
  private priceData: OhlcDataSeries;
  private volumeUpArgb: number;
  private volumnDownArgb: number;

  constructor(
    priceData: OhlcDataSeries,
    volumeUpColor: string,
    volumeDownColor: string
  ) {
    this.priceData = priceData;
    this.volumeUpArgb = parseColorToUIntArgb(volumeUpColor);
    this.volumnDownArgb = parseColorToUIntArgb(volumeDownColor);
  }

  onAttached(parentSeries: IRenderableSeries): void {}

  onDetached(): void {}

  overrideFillArgb(xValue: number, yValue: number, index: number): number {
    const open = this.priceData.getNativeOpenValues().get(index);
    const close = this.priceData.getNativeCloseValues().get(index);

    return close >= open ? this.volumeUpArgb : this.volumnDownArgb;
  }

  overrideStrokeArgb(xValue: number, yValue: number, index: number): number {
    return this.overrideFillArgb(xValue, yValue, index);
  }
}

// tslint:disable-next-line:max-classes-per-file
class MacdHistogramPaletteProvider
  implements IStrokePaletteProvider, IFillPaletteProvider
{
  public readonly strokePaletteMode: EStrokePaletteMode =
    EStrokePaletteMode.SOLID;
  public readonly fillPaletteMode: EFillPaletteMode = EFillPaletteMode.SOLID;
  private aboveZeroArgb: number;
  private belowZeroArgb: number;

  constructor(aboveZeroColor: string, belowZeroColor: string) {
    this.aboveZeroArgb = parseColorToUIntArgb(aboveZeroColor);
    this.belowZeroArgb = parseColorToUIntArgb(belowZeroColor);
  }

  onAttached(parentSeries: IRenderableSeries): void {}

  onDetached(): void {}

  overrideFillArgb(xValue: number, yValue: number, index: number): number {
    return yValue >= 0 ? this.aboveZeroArgb : this.belowZeroArgb;
  }

  overrideStrokeArgb(xValue: number, yValue: number, index: number): number {
    return this.overrideFillArgb(xValue, yValue, index);
  }
}
