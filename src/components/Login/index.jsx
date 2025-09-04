import React, { useState } from "react";
import { FaGoogle } from "react-icons/fa";
import {
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { generateKeywords } from "../../firebase/utils/keywords";
import {
  loginWithEmailAndPassword,
} from "../../firebase/services";
import { useTheme } from "../../Context/ThemeProvider";
import Register from "./Register";
const googleProvider = new GoogleAuthProvider();

export default function Login() {
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useTheme();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await signInWithPopup(auth, googleProvider);
      const { user } = result;
      const additionalUserInfo = getAdditionalUserInfo(result);

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // User document doesn't exist, create it
        await setDoc(userDocRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          uid: user.uid,
          providerId: additionalUserInfo.providerId,
          keywords: [
            ...generateKeywords(user.displayName?.toLowerCase()),
            ...generateKeywords(user.email?.toLowerCase()),
          ],
        });
      }
    } catch (error) {
      setError("Đăng nhập Google thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setLoading(true);
    setError("");

    const { email, password } = form;

    // Validate inputs
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email không hợp lệ!");
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự!");
      setLoading(false);
      return;
    }

    const { error: authError } = await loginWithEmailAndPassword(
      email,
      password
    );

    if (authError) {
      setError(getVietnameseErrorMessage(authError));
    }

    setLoading(false);
  };

  const getVietnameseErrorMessage = (errorMessage) => {
    if (errorMessage.includes("user-not-found")) {
      return "Không tìm thấy tài khoản với email này.";
    }
    if (errorMessage.includes("wrong-password")) {
      return "Mật khẩu không chính xác.";
    }
    if (errorMessage.includes("invalid-email")) {
      return "Email không hợp lệ.";
    }
    if (errorMessage.includes("too-many-requests")) {
      return "Quá nhiều lần thử. Vui lòng thử lại sau.";
    }
    return "Đăng nhập thất bại. Vui lòng thử lại.";
  };

  if (showRegister) {
    return <Register onSwitchToLogin={() => setShowRegister(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Banner and description */}
          <div className="hidden lg:flex flex-col items-center justify-center text-center space-y-6">
            <img
              src="/banner.png"
              alt="SmurfChat Banner"
              className="w-full max-w-md h-auto object-contain"
            />
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-skybrand-600 dark:text-skybrand-400">
                SmurfChat
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md">
                Kết nối với bạn bè và gia đình thông qua tin nhắn và nhiều tính
                năng thú vị khác.
              </p>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-slate-900">
              <h2 className="mb-6 text-center text-2xl font-bold text-skybrand-600 dark:text-skybrand-400">
                Đăng nhập
              </h2>

              {error && (
                <div className="mb-4 rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                  <div className="flex items-start justify-between">
                    <span>{error}</span>
                    <button
                      className="ml-3 text-xs underline"
                      onClick={() => setError("")}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                    placeholder="Mật khẩu"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </div>
                <button
                  className="w-full rounded-md bg-skybrand-600 px-4 py-2 text-sm font-medium text-white hover:bg-skybrand-700 disabled:opacity-50"
                  onClick={handleEmailLogin}
                  disabled={loading || !form.email || !form.password}
                >
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>
              </div>

              <div className="my-5 text-center text-xs text-slate-500">
                Hoặc
              </div>

              <button
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-700"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <span className="inline-flex items-center gap-2">
                  <FaGoogle /> Đăng nhập bằng Google
                </span>
              </button>

              <div className="mt-6 text-center text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Chưa có tài khoản?{" "}
                </span>
                <button
                  className="text-skybrand-600 hover:text-skybrand-700 font-medium underline dark:text-skybrand-400 dark:hover:text-skybrand-300"
                  onClick={() => setShowRegister(true)}
                >
                  Đăng ký ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
