import { useAuth } from "../../auth/AuthContext.tsx";
import Portal from '../Portal'
import PublicPortal from '../PublicPortal'
import CookieConsent from "../CookieConsent";

const RenderOnAuthenticated = () => {
    const { keycloak } = useAuth();

    const isLoggedIn = keycloak.authenticated;

    return (
        <>
            {isLoggedIn ? <Portal/> : <PublicPortal/>}
            <CookieConsent />
        </>
    );
};

export default RenderOnAuthenticated;