import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      api.get("/users/me")
        .then((r) => setUser(r.data))
        .catch(() => { localStorage.clear(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
    return data.user;
  };

  // `credential` is the ID token handed back by Google Identity Services on
  // the frontend. Already-verified email + no OTP step — the backend signs
  // the user straight in (creating the account on first sign-in).
  const googleLogin = async (credential) => {
    const { data } = await api.post("/auth/google", { credential });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (body) => {
    // Registration now returns a verification-required response (no tokens yet).
    const { data } = await api.post("/auth/register", body);
    return data; // { verification_required, email, message }
  };

  const verifyEmail = async (email, otp) => {
    const { data } = await api.post("/auth/verify-email", { email, otp });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
    return data.user;
  };

  const resendVerification = async (email) => {
    await api.post("/auth/resend-verification", { email });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = "/";
  };

  const refreshUser = async () => {
    const { data } = await api.get("/users/me");
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, register, verifyEmail, resendVerification, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
