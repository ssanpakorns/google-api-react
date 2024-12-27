import { useState, useEffect } from "react";
import { GoogleLogin, GoogleLogout } from "react-google-login";
import { gapi } from "gapi-script";
import { useAuth } from "../../AuthContext"; // Import the custom hook
// import { jwtDecode } from 'jwt-decode';

export default function Login() {
  const [profile, setProfile] = useState(null);
  const { login, logout } = useAuth(); // Use the context methods

  const clientId =
    "203839487252-3ak600daa8gq81q1jn0ld1e76isnlkb7.apps.googleusercontent.com";

  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        clientId: clientId,
        scope: "",
      });
    };

    gapi.load("client:auth2", initClient);
  }, []);

  const handleLoginSuccess = (credentialResponse) => {
    setProfile(credentialResponse.profileObj);
    login(credentialResponse.profileObj); // Store profile data in context
    console.log("Login Success:", credentialResponse);
  };

  const handleLoginFailure = (response) => {
    console.log("Login Failed:", response);
  };

  const logOut = () => {
    setProfile(null);
    logout(); // Clear profile from context
  };

  return (
    <div>
      {profile ? (
        <div>
          <GoogleLogout
            clientId={clientId}
            onLogoutSuccess={logOut}
            buttonText="Logout"
          />
        </div>
      ) : (
        <GoogleLogin
          clientId={clientId}
          buttonText="Login"
          onSuccess={handleLoginSuccess}
          onFailure={handleLoginFailure}
          cookiePolicy={"single_host_origin"}
          isSignedIn={true}
        />
      )}
    </div>
  );
}
