import { useKeycloak } from "../../keycloak/KeycloakContext";
import Portal from '../Portal'
import PublicPortal from '../PublicPortal'
import CookieConsent from "../CookieConsent";

const RenderOnAuthenticated = () => {
    const { keycloak } = useKeycloak();

    const isLoggedIn = keycloak.authenticated;

    return (
        <>
            {isLoggedIn ? <Portal/> : <PublicPortal/>}
            <CookieConsent />
        </>
    );
};

export default RenderOnAuthenticated;