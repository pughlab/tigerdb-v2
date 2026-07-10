import { useState } from "react";
import { Button, Container, Message } from "semantic-ui-react";

const consent: string | null = localStorage.getItem("cookie-consent");

export default function CookieConsent() {
  const [consentGiven, setConsentGiven] = useState(consent === "true");

  function handleAccept() {
    localStorage.setItem("cookie-consent", "true");
    setConsentGiven(true);
  }

  function handleDecline() {
    localStorage.setItem("cookie-consent", "false");
    setConsentGiven(false);
  }

  if (consentGiven) {
    return null;
  }

  return (
    <Container
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: "flex",
        padding: "10px 0",
        justifyContent: "center",
      }}
    >
      <Message>
        <Message.Header>Cookies policy</Message.Header>
        <Message.Content>
          We use cookies for authentication purposes. By continuing, you accept
          usage of these cookies.
          <Button
            onClick={handleAccept}
            style={{ marginLeft: "10px" }}
            color="black"
          >
            Accept
          </Button>
          <Button onClick={handleDecline}>Decline</Button>
        </Message.Content>
      </Message>
    </Container>
  );
}
