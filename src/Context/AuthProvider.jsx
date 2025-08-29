import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { logoutUser } from "../firebase/services";
import { useAlert } from "./AlertProvider";

export const AuthContext = React.createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState({});
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(true);
  const { confirm } = useAlert();

  React.useEffect(() => {
    const unsubscibed = onAuthStateChanged(auth, (user) => {
      if (user) {
        const { displayName, email, uid, photoURL } = user;
        setUser({
          displayName,
          email,
          uid,
          photoURL,
        });
        setIsLoading(false);
        history.push("/");
        return;
      }

      // reset user info
      setUser({});
      setIsLoading(false);
      history.push("/login");
    });

    // clean function
    return () => {
      unsubscibed();
    };
  }, [history]);

  const handleLogout = async () => {
    const confirmed = await confirm('Bạn có chắc chắn muốn đăng xuất không?');
    if (confirmed) {
      await logoutUser();
    }
  };

  return (
    <AuthContext.Provider value={{ user, logout: handleLogout }}>
      {isLoading ? (
        <div
          style={{ position: "fixed", inset: 0 }}
          className="flex items-center justify-center"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-skybrand-500 border-t-transparent" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
