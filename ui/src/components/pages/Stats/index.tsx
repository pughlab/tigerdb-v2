import {
  Container,
  Segment,
} from "semantic-ui-react";

import { StatsPortal } from "../../logos";

export default function Stats() {
  return (
    <Container as={Segment}>
      <Segment>
        <StatsPortal />
      </Segment>
    </Container>
  );
}
