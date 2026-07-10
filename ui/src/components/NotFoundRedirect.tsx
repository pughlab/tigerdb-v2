import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Dimmer, Segment, Icon } from "semantic-ui-react";

export default function NotFoundRedirect({
  isLoggedIn,
}: Readonly<{
  isLoggedIn: boolean;
}>) {
  const navigate = useNavigate();

  const redirectRoute = isLoggedIn ? "/home" : "/public";
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(redirectRoute, { replace: true });
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate, redirectRoute]);

  return (
    <Segment placeholder textAlign="center">
      <Dimmer active inverted>
        <Icon size="massive" name="react" loading color="grey" />
        <div style={{ marginTop: "1em", color: "grey", fontSize: "2.2em" }}>
          Loading...
        </div>
      </Dimmer>
    </Segment>
  );
}
