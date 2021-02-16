import React, { Component } from "react";
import { Animated } from "react-native";
import {
  Defs,
  Line,
  LinearGradient,
  Stop,
  Text,
  Rect,
  G
} from "react-native-svg";

import { ChartConfig, Dataset, PartialBy } from "./HelperTypes";

export interface AbstractChartProps {
  fromZero?: boolean;
  fromNumber?: number;
  chartConfig?: AbstractChartConfig;
  yAxisLabel?: string;
  yAxisSuffix?: string;
  yLabelsOffset?: number;
  yAxisInterval?: number;
  xAxisLabel?: string;
  xLabelsOffset?: number;
  hidePointsAtIndex?: number[];
  /**
   * Callback that is called when a data point is clicked.
   */
  onDataPointClick?: (data: { index: number; x: number; y: number }) => void;
}

export interface AbstractChartConfig extends ChartConfig {
  count?: number;
  data?: Dataset[];
  width?: number;
  height?: number;
  paddingTop?: number;
  paddingRight?: number;
  horizontalLabelRotation?: number;
  formatYLabel?: (yLabel: string) => string;
  labels?: string[];
  horizontalOffset?: number;
  stackedBar?: boolean;
  verticalLabelRotation?: number;
  formatXLabel?: (xLabel: string) => string;
  isSelectedIndex?: number;
}

export type AbstractChartState = {
  isSelectedIndex?: number;
  scrollableDotHorizontalOffset?: Animated.Value;
  maxValue?: number;
  minValue?: number;
  valueCache?: object;
};

class AbstractChart<
  IProps extends AbstractChartProps,
  IState extends AbstractChartState
> extends Component<AbstractChartProps & IProps, AbstractChartState & IState> {
  calcScaler = (data: number[]) => {
    if (this.props.fromZero) {
      return Math.max(...data, 0) - Math.min(...data, 0) || 1;
    } else if (this.props.fromNumber) {
      return (
        Math.max(...data, this.props.fromNumber) -
          Math.min(...data, this.props.fromNumber) || 1
      );
    } else {
      return Math.max(...data) - Math.min(...data) || 1;
      // TODO: round to a more reasonable number and adjust the bars accordingly
      // the below line will round the numbers, but then the bars will be wrong
      // return Math.ceil(y/5)*5;
    }
  };

  calcBaseHeight = (data: number[], height: number) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    if (min >= 0 && max >= 0) {
      return height;
    } else if (min < 0 && max <= 0) {
      return 0;
    } else if (min < 0 && max > 0) {
      return (height * max) / this.calcScaler(data);
    }
  };

  calcHeight = (val: number, data: number[], height: number) => {
    const max = Math.max(...data);
    const min = Math.min(...data);

    if (min < 0 && max > 0) {
      return height * (val / this.calcScaler(data));
    } else if (min >= 0 && max >= 0) {
      return this.props.fromZero
        ? height * (val / this.calcScaler(data))
        : height * ((val - min) / this.calcScaler(data));
    } else if (min < 0 && max <= 0) {
      return this.props.fromZero
        ? height * (val / this.calcScaler(data))
        : height * ((val - max) / this.calcScaler(data));
    }
  };

  getPropsForBackgroundLines() {
    const { propsForBackgroundLines = {} } = this.props.chartConfig;
    return {
      stroke: this.props.chartConfig.color(0.2),
      strokeDasharray: "5, 10",
      strokeWidth: 1,
      ...propsForBackgroundLines
    };
  }

  getPropsForLabels() {
    const {
      propsForLabels = {},
      color,
      labelColor = color
    } = this.props.chartConfig;
    return {
      fontSize: 12,
      fill: labelColor(0.8),
      ...propsForLabels
    };
  }

  getPropsForVerticalLabels() {
    const {
      propsForVerticalLabels = {},
      color,
      labelColor = color
    } = this.props.chartConfig;
    return {
      fill: labelColor(0.8),
      ...propsForVerticalLabels
    };
  }

  getPropsForHorizontalLabels() {
    const {
      propsForHorizontalLabels = {},
      color,
      labelColor = color
    } = this.props.chartConfig;
    return {
      fill: labelColor(0.8),
      ...propsForHorizontalLabels
    };
  }

  renderHorizontalLines = config => {
    const { count, width, height, paddingTop, paddingRight } = config;
    const basePosition = height - height / 4;

    return [...new Array(count + 1)].map((_, i) => {
      const y = (basePosition / count) * i + paddingTop;
      return (
        <Line
          key={Math.random()}
          x1={paddingRight}
          y1={y}
          x2={width}
          y2={y}
          {...this.getPropsForBackgroundLines()}
        />
      );
    });
  };

  renderHorizontalLine = config => {
    const { width, height, paddingTop, paddingRight } = config;
    return (
      <Line
        key={Math.random()}
        x1={paddingRight}
        y1={height - height / 4 + paddingTop}
        x2={width}
        y2={height - height / 4 + paddingTop}
        {...this.getPropsForBackgroundLines()}
      />
    );
  };

  renderHorizontalLabels = (
    config: Omit<AbstractChartConfig, "data"> & { data: number[] }
  ) => {
    const {
      count,
      data,
      height,
      paddingTop,
      paddingRight,
      horizontalLabelRotation = 0,
      decimalPlaces = 2,
      formatYLabel = (yLabel: string) => yLabel
    } = config;

    const {
      yAxisLabel = "",
      yAxisSuffix = "",
      yLabelsOffset = 12
    } = this.props;
    return new Array(count === 1 ? 1 : count + 1).fill(1).map((_, i) => {
      let yLabel = String(i * count);

      if (count === 1) {
        yLabel = `${yAxisLabel}${formatYLabel(
          data[0].toFixed(decimalPlaces)
        )}${yAxisSuffix}`;
      } else {
        const label = this.props.fromZero
          ? (this.calcScaler(data) / count) * i + Math.min(...data, 0)
          : (this.calcScaler(data) / count) * i + Math.min(...data);
        yLabel = `${yAxisLabel}${formatYLabel(
          label.toFixed(decimalPlaces)
        )}${yAxisSuffix}`;
      }

      const basePosition = height - height / 4;
      const x = paddingRight - yLabelsOffset;
      const y =
        count === 1 && this.props.fromZero
          ? paddingTop + 4
          : (height * 3) / 4 - (basePosition / count) * i + paddingTop;
      return (
        <Text
          rotation={horizontalLabelRotation}
          origin={`${x}, ${y}`}
          key={Math.random()}
          x={x}
          textAnchor="end"
          y={y}
          {...this.getPropsForLabels()}
          {...this.getPropsForHorizontalLabels()}
        >
          {yLabel}
        </Text>
      );
    });
  };

  renderVerticalLabels = ({
    labels = [],
    height,
    visibleWidth,
    paddingTop,
    horizontalOffset = 0,
    verticalLabelRotation = 0,
    formatXLabel = xLabel => xLabel,
    onDataPointClick,
    isSelectedIndex
  }: Pick<
    AbstractChartConfig,
    | "labels"
    | "width"
    | "height"
    | "paddingRight"
    | "paddingTop"
    | "horizontalOffset"
    | "stackedBar"
    | "verticalLabelRotation"
    | "formatXLabel"
    | "isSelectedIndex"
  > & {
    onDataPointClick?: AbstractChartProps["onDataPointClick"];
  }) => {
    const {
      xAxisLabel = "",
      xLabelsOffset = 0,
      hidePointsAtIndex = []
    } = this.props;

    const fontSize = 12;

    return labels.map((label, i) => {
      if (hidePointsAtIndex.includes(i)) {
        return null;
      }

      const barWidth = (1 / 6) * visibleWidth;
      const initX = (1 / 12) * visibleWidth;
      const nextX = barWidth + initX;
      const x = initX + initX + i * nextX;
      const y = (height * 3) / 4 + paddingTop + fontSize * 2 + xLabelsOffset;

      const onPress = () => {
        if (!onDataPointClick) {
          return;
        }

        this.setState({
          isSelectedIndex: i
        });

        onDataPointClick({
          index: i,
          x: x,
          y: y
        });
      };

      if (i === isSelectedIndex) {
        return (
          <G key={Math.random()}>
            <Rect
              key={Math.random()}
              x={x - barWidth * 0.5}
              y={y - 20}
              fill={"white"}
              width={barWidth}
              height={20}
              onPress={onPress}
            />
            <Text
              origin={`${x}, ${y}`}
              rotation={verticalLabelRotation}
              key={Math.random()}
              x={x}
              y={y}
              fontWeight={"bold"}
              textAnchor={verticalLabelRotation === 0 ? "middle" : "start"}
              {...this.getPropsForLabels()}
              {...this.getPropsForVerticalLabels()}
              onPress={onPress}
            >
              {`${formatXLabel(label)}${xAxisLabel}`}
            </Text>
            <Rect
              key={Math.random()}
              x={x - barWidth * 0.3}
              y={y + 4}
              fill={"#99e5ea"}
              width={barWidth * 0.625}
              height={3}
              onPress={onPress}
            />
          </G>
        );
      } else {
        return (
          <G key={Math.random()}>
            <Rect
              key={Math.random()}
              x={x - barWidth * 0.5}
              y={y - 20}
              fill={"white"}
              width={barWidth}
              height={20}
              onPress={onPress}
            />
            <Text
              origin={`${x}, ${y}`}
              rotation={verticalLabelRotation}
              key={Math.random()}
              x={x}
              y={y}
              textAnchor={verticalLabelRotation === 0 ? "middle" : "start"}
              {...this.getPropsForLabels()}
              {...this.getPropsForVerticalLabels()}
              onPress={onPress}
            >
              {`${formatXLabel(label)}${xAxisLabel}`}
            </Text>
          </G>
        );
      }
    });
  };

  renderVerticalLines = ({
    data,
    width,
    height,
    paddingTop,
    paddingRight
  }: Omit<
    Pick<
      AbstractChartConfig,
      "data" | "width" | "height" | "paddingRight" | "paddingTop"
    >,
    "data"
  > & { data: number[] }) => {
    const { yAxisInterval = 1 } = this.props;

    return [...new Array(Math.ceil(data.length / yAxisInterval))].map(
      (_, i) => {
        return (
          <Line
            key={Math.random()}
            x1={Math.floor(
              ((width - paddingRight) / (data.length / yAxisInterval)) * i +
                paddingRight
            )}
            y1={0}
            x2={Math.floor(
              ((width - paddingRight) / (data.length / yAxisInterval)) * i +
                paddingRight
            )}
            y2={height - height / 4 + paddingTop}
            {...this.getPropsForBackgroundLines()}
          />
        );
      }
    );
  };

  renderVerticalLine = ({
    height,
    paddingTop,
    paddingRight
  }: Pick<AbstractChartConfig, "height" | "paddingRight" | "paddingTop">) => (
    <Line
      key={Math.random()}
      x1={Math.floor(paddingRight)}
      y1={0}
      x2={Math.floor(paddingRight)}
      y2={height - height / 4 + paddingTop}
      {...this.getPropsForBackgroundLines()}
    />
  );

  renderDefs = (
    config: Pick<
      PartialBy<
        AbstractChartConfig,
        | "backgroundGradientFromOpacity"
        | "backgroundGradientToOpacity"
        | "fillShadowGradient"
        | "fillShadowGradientOpacity"
      >,
      | "width"
      | "height"
      | "backgroundGradientFrom"
      | "backgroundGradientTo"
      | "useShadowColorFromDataset"
      | "data"
      | "backgroundGradientFromOpacity"
      | "backgroundGradientToOpacity"
      | "fillShadowGradient"
      | "fillShadowGradientOpacity"
    >
  ) => {
    const {
      width,
      height,
      backgroundGradientFrom,
      backgroundGradientTo,
      useShadowColorFromDataset,
      data
    } = config;

    const fromOpacity = config.hasOwnProperty("backgroundGradientFromOpacity")
      ? config.backgroundGradientFromOpacity
      : 1.0;
    const toOpacity = config.hasOwnProperty("backgroundGradientToOpacity")
      ? config.backgroundGradientToOpacity
      : 1.0;

    const fillShadowGradient = config.hasOwnProperty("fillShadowGradient")
      ? config.fillShadowGradient
      : this.props.chartConfig.color(1.0);

    const fillShadowGradientOpacity = config.hasOwnProperty(
      "fillShadowGradientOpacity"
    )
      ? config.fillShadowGradientOpacity
      : 0.1;

    return (
      <Defs>
        <LinearGradient
          id="backgroundGradient"
          x1={0}
          y1={height}
          x2={width}
          y2={0}
          gradientUnits="userSpaceOnUse"
        >
          <Stop
            offset="0"
            stopColor={backgroundGradientFrom}
            stopOpacity={fromOpacity}
          />
          <Stop
            offset="1"
            stopColor={backgroundGradientTo}
            stopOpacity={toOpacity}
          />
        </LinearGradient>
        {useShadowColorFromDataset ? (
          data.map((dataset, index) => (
            <LinearGradient
              id={`fillShadowGradient_${index}`}
              key={`${index}`}
              x1={0}
              y1={0}
              x2={0}
              y2={height}
              gradientUnits="userSpaceOnUse"
            >
              <Stop
                offset="0"
                stopColor={
                  dataset.color ? dataset.color(1.0) : fillShadowGradient
                }
                stopOpacity={fillShadowGradientOpacity}
              />
              <Stop
                offset="1"
                stopColor={
                  dataset.color
                    ? dataset.color(fillShadowGradientOpacity)
                    : fillShadowGradient
                }
                stopOpacity="0"
              />
            </LinearGradient>
          ))
        ) : (
          <LinearGradient
            id="fillShadowGradient"
            x1={0}
            y1={0}
            x2={0}
            y2={height}
            gradientUnits="userSpaceOnUse"
          >
            <Stop
              offset="0"
              stopColor={fillShadowGradient}
              stopOpacity={fillShadowGradientOpacity}
            />
            <Stop offset="1" stopColor={fillShadowGradient} stopOpacity="0" />
          </LinearGradient>
        )}
      </Defs>
    );
  };
}

export default AbstractChart;
