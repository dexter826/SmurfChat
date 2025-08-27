import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { logoutUser } from '../firebase/services';
import { Spin } from 'antd';

export const AuthContext = React.createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState({});
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(true);

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
        history.push('/');
        return;
      }

      // reset user info
      setUser({});
      setIsLoading(false);
      history.push('/login');
    });

    // clean function
    return () => {
      unsubscibed();
    };
  }, [history]);

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <AuthContext.Provider value={{ user, logout: handleLogout }}>
      {isLoading ? <Spin style={{ position: 'fixed', inset: 0 }} /> : children}
    </AuthContext.Provider>
  );
}
