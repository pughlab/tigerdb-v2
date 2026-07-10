import React from "react";
import { Header, Icon, Segment } from "semantic-ui-react";
export default function ThemedSegment({
  text = "",
  icon = "exclamation",
  basic = false,
  color = "",
  loading = false,
  children,
}: Readonly<{
  text?: string | Element;
  icon?: string;
  basic?: boolean;
  color?: string;
  loading?: boolean;
  buttons?: [Element];
  children?: React.ReactNode;
}>) {
  return (
    <Segment placeholder basic={basic} color={color} loading={loading}>
      <Header icon>
        <Icon name={icon} />
        {text}
      </Header>
      {children}
    </Segment>
  );
}
