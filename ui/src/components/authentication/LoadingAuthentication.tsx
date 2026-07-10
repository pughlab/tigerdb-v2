import { Segment, Card, Icon } from "semantic-ui-react";
import { Logo } from "../logos";

export default function LoadingAuthentication() {
  return (
    <Segment basic textAlign="center">
      <Card.Group centered>
        <Card>
          <Logo />
          <Card.Content extra textAlign="center">
            <div>
              {`Loading TIGERdb... `}
              <Icon name="spinner" loading />
            </div>
          </Card.Content>
        </Card>
      </Card.Group>
    </Segment>
  );
}
