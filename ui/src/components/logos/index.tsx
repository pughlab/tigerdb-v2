import logo from "./logo.png";
import {
  Image,
  Container,
  Message,
  Header,
  Divider,
  type SemanticSIZES,
} from "semantic-ui-react";
import { BarChart } from "../visualizations/bar/BarChart.tsx";
import CalendarHeatmapVisualization from "../visualizations/heatmap/calendar/CalendarHeatmapVisualization";

const DEFAULT_SIZE: SemanticSIZES = "medium"

export function Logo({ size = DEFAULT_SIZE, ...props }) {
  return <Image size={size ?? DEFAULT_SIZE} src={logo} {...props} />;
}

export function StatsPortal() {
  return (
    <Container>
      <Divider horizontal>
        <Header as="h1">
          <Header.Content>STATS</Header.Content>
        </Header>
      </Divider>
      <Divider horizontal content="CURATION TRACKER" />
      <CalendarHeatmapVisualization />
      <Message style={{ color: "white", backgroundColor: "#1f1f1f" }}>
        <BarChart />
      </Message>
    </Container>
  );
}
