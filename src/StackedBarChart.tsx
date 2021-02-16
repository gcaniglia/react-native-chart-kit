import React from "react";
import { View, ViewStyle, ScrollView } from "react-native";
import { G, Rect, Svg, Text } from "react-native-svg";

import AbstractChart, {
  AbstractChartConfig,
  AbstractChartProps
} from "./AbstractChart";

export interface StackedBarChartData {
  labels: string[];
  legend: string[];
  data: number[][];
  barColors: string[];
}

export interface StackedBarChartProps extends AbstractChartProps {
  /**
   * E.g.
   * ```javascript
   * const data = {
   *   labels: ["Test1", "Test2"],
   *   legend: ["L1", "L2", "L3"],
   *   data: [[60, 60, 60], [30, 30, 60]],
   *   barColors: ["#dfe4ea", "#ced6e0", "#a4b0be"]
   * };
   * ```
   */
  data: StackedBarChartData;
  width: number;
  visibleWidth?: number;
  height: number;
  chartConfig: AbstractChartConfig;
  hideLegend: boolean;
  style?: Partial<ViewStyle>;
  barPercentage?: number;
  decimalPlaces?: number;
  /**
   * Show vertical labels - default: True.
   */
  withVerticalLabels?: boolean;
  /**
   * Show horizontal labels - default: True.
   */
  withHorizontalLabels?: boolean;
  /**
   * The number of horizontal lines
   */
  segments?: number;

  percentile?: boolean;
  /**
   * Callback that is called when a data point is clicked.
   */
  onDataPointClick?: (data: { index: number; x: number; y: number }) => void;
}

type StackedBarChartState = {
  isSelectedIndex: number;
};

class StackedBarChart extends AbstractChart<
  StackedBarChartProps,
  StackedBarChartState
> {
  state = {
    isSelectedIndex: this.props.data.data.length - 1
  };

  getBarRadius = (ret: string | any[], x: string | any[]) => {
    return this.props.chartConfig.barRadius && ret.length === x.length - 1
      ? this.props.chartConfig.barRadius
      : 0;
  };

  renderBars = ({
    data,
    width,
    height,
    paddingTop,
    paddingRight,
    border,
    colors,
    stackedBar = false,
    onDataPointClick
  }: Pick<
    Omit<AbstractChartConfig, "data">,
    "width" | "height" | "paddingRight" | "paddingTop" | "stackedBar"
  > & {
    border: number;
    colors: string[];
    data: number[][];
    onDataPointClick: StackedBarChartProps["onDataPointClick"];
  }) =>
    data.map((x, i) => {
      const ret = [];
      let h = 0;
      let st = paddingTop;
      const { visibleWidth } = this.props;
      const barWidth = (1 / 6) * visibleWidth;
      const initX = (1 / 12) * visibleWidth;
      const nextX = barWidth + initX;
      // alternately, we can calculate based on total width instead of visibleWidth:
      // const initX = (data.length * 2) + data.length + 5 // 5 is the number of "segments" to center the first bar

      const sum = this.props.percentile ? x.reduce((a, b) => a + b, 0) : border;
      const barsAreaHeight = (height / 4) * 3;
      for (let z = 0; z < x.length; z++) {
        h = barsAreaHeight * (x[z] / sum);
        const y = barsAreaHeight - h + st;
        const xC = initX + i * nextX;
        const onPress = () => {
          if (!onDataPointClick) {
            return;
          }

          this.setState({
            isSelectedIndex: i
          });

          onDataPointClick({
            index: i,
            x: xC,
            y: y
          });
        };

        ret.push(
          <Rect
            key={Math.random()}
            x={xC}
            y={y}
            rx={this.getBarRadius(ret, x)}
            ry={this.getBarRadius(ret, x)}
            width={barWidth}
            height={h}
            fill={colors[z]}
            onPress={onPress}
          />
        );

        if (!this.props.hideLegend) {
          ret.push(
            <Text
              key={Math.random()}
              x={xC + 7 + barWidth / 2}
              textAnchor="end"
              y={h > 15 ? y + 15 : y + 7}
              {...this.getPropsForLabels()}
            >
              {x[z]}
            </Text>
          );
        }

        st -= h;
      }

      return ret;
    });

  renderLegend = ({
    legend,
    colors,
    width,
    height
  }: Pick<AbstractChartConfig, "width" | "height"> & {
    legend: string[];
    colors: string[];
  }) =>
    legend.map((x, i) => {
      return (
        <G key={Math.random()}>
          <Rect
            width="16px"
            height="16px"
            fill={colors[i]}
            rx={8}
            ry={8}
            x={width * 0.71}
            y={height * 0.7 - i * 50}
          />
          <Text
            x={width * 0.78}
            y={height * 0.76 - i * 50}
            {...this.getPropsForLabels()}
          >
            {x}
          </Text>
        </G>
      );
    });

  render() {
    // increase paddingTop and the Svg height to add space above the graph
    const paddingTop = 15;
    const paddingRight = 40;

    const {
      width,
      visibleWidth,
      height,
      style = {},
      data,
      withHorizontalLabels = true,
      withVerticalLabels = true,
      segments = 4,
      decimalPlaces,
      percentile = false,
      onDataPointClick
    } = this.props;

    const config = {
      width,
      height
    };

    let border = 0;

    let max = 0;
    for (let i = 0; i < data.data.length; i++) {
      const actual = data.data[i].reduce((pv, cv) => pv + cv, 0);
      if (actual > max) {
        max = actual;
      }
    }

    if (percentile) {
      border = 100;
    } else {
      border = max;
    }

    var stackedBar = data.legend && data.legend.length == 0 ? false : true;
    // Add paddingRight to center the most recent bar within the graph
    return (
      <View style={{ flexDirection: "row", paddingRight: 100 }}>
        <View>
          <Svg height={height} width={40}>
            {this.renderDefs({
              ...config,
              ...this.props.chartConfig
            })}
            <G>
              {withHorizontalLabels
                ? this.renderHorizontalLabels({
                    ...config,
                    count: segments,
                    data: [0, border],
                    paddingTop,
                    paddingRight,
                    decimalPlaces
                  })
                : null}
            </G>
          </Svg>
        </View>
        <View>
          <ScrollView
            horizontal={true}
            ref={ref => {
              this.scrollView = ref;
            }}
            onContentSizeChange={() =>
              this.scrollView.scrollToEnd({ animated: false })
            }
            showsHorizontalScrollIndicator={false}
          >
            <Svg height={height} width={width}>
              {this.renderDefs({
                ...config,
                ...this.props.chartConfig
              })}
              <G>
                {this.renderHorizontalLines({
                  ...config,
                  count: segments,
                  paddingTop
                })}
              </G>
              <G>
                {withVerticalLabels
                  ? this.renderVerticalLabels({
                      ...config,
                      visibleWidth,
                      labels: data.labels,
                      paddingRight: paddingRight,
                      stackedBar,
                      paddingTop,
                      horizontalOffset: 0,
                      onDataPointClick,
                      isSelectedIndex: this.state.isSelectedIndex
                    })
                  : null}
              </G>
              <G>
                {this.renderBars({
                  ...config,
                  data: data.data,
                  border,
                  colors: this.props.data.barColors,
                  paddingTop,
                  paddingRight: 0, // remove extra padding between leftmost bar and y axis
                  stackedBar,
                  onDataPointClick
                })}
              </G>
              {data.legend &&
                data.legend.length != 0 &&
                this.renderLegend({
                  ...config,
                  legend: data.legend,
                  colors: this.props.data.barColors
                })}
            </Svg>
          </ScrollView>
        </View>
      </View>
    );
  }
}

export default StackedBarChart;
