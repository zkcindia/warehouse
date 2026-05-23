import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("wms_token"));
  const [loading, setLoading] = useState(true);

  const authHeaders = useCallback(() => {
    const t = localStorage.getItem("wms_token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, []);

  const fetchMe = useCallback(async (overrideToken) => {
    const t = overrideToken || localStorage.getItem("wms_token");
    if (!t) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setUser(res.data);
      return res.data;
    } catch (e) {
      localStorage.removeItem("wms_token");
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async ({ email, password, role }) => {
    const res = await axios.post(`${API}/auth/login`, { email, password, role });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem("wms_token", newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem("wms_token");
    setToken(null);
    setUser(null);
  };

  const value = { user, token, loading, login, logout, fetchMe, authHeaders, API };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
