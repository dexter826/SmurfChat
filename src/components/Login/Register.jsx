import React, { useState } from "react";
import { registerWithEmailAndPassword } from "../../firebase/services";
import { useTheme } from "../../Context/ThemeProvider";

export default function Register({ onSwitchToLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isMountedRef = React.useRef(true);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  useTheme();

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setError("");
    setSuccess("");

    const { email, password, displayName, confirmPassword } = form;
    if (!displayName || displayName.length < 2) {
      if (isMountedRef.current) {
        setError("Tên hiển thị phải có ít nhất 2 ký tự!");
        setLoading(false);
      }
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (isMountedRef.current) {
        setError("Email không hợp lệ!");
        setLoading(false);
      }
      return;
    }
    if (!password || password.length < 6) {
      if (isMountedRef.current) {
        setError("Mật khẩu phải có ít nhất 6 ký tự!");
        setLoading(false);
      }
      return;
    }
    if (password !== confirmPassword) {
      if (isMountedRef.current) {
        setError("Mật khẩu xác nhận không khớp!");
        setLoading(false);
      }
      return;
    }

    const { error: authError } = await registerWithEmailAndPassword(
      email,
      password,
      displayName
    );
    if (authError) {
      if (isMountedRef.current) {
        setError(getVietnameseErrorMessage(authError));
      }
    } else {
      if (isMountedRef.current) {
        setSuccess(
          "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản."
        );
      }
    }
    if (isMountedRef.current) {
      setLoading(false);
    }
  };

  const getVietnameseErrorMessage = (errorMessage) => {
    if (errorMessage.includes("email-already-in-use")) {
      return "Email này đã được sử dụng. Vui lòng chọn email khác.";
    }
    if (errorMessage.includes("weak-password")) {
      return "Mật khẩu phải có ít nhất 6 ký tự.";
    }
    if (errorMessage.includes("invalid-email")) {
      return "Email không hợp lệ.";
    }
    return "Đã xảy ra lỗi. Vui lòng thử lại.";
  };

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
                Tham gia cộng đồng SmurfChat để kết nối với bạn bè và chia sẻ
                những khoảnh khắc đáng nhớ.
              </p>
            </div>
          </div>

          {/* Right side - Register form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-slate-900">
              <h2 className="mb-6 text-center text-2xl font-bold text-skybrand-600 dark:text-skybrand-400">
                Đăng ký tài khoản
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

              {success && (
                <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
                  <div className="flex items-start justify-between">
                    <span>{success}</span>
                    <button
                      className="ml-3 text-xs underline"
                      onClick={() => setSuccess("")}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tên hiển thị
                    </label>
                    <input
                      autoComplete="name"
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                      placeholder="Tên hiển thị"
                      value={form.displayName}
                      onChange={(e) =>
                        setForm({ ...form, displayName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Email
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
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
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                        placeholder="Mật khẩu"
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                        placeholder="Xác nhận mật khẩu"
                        value={form.confirmPassword}
                        onChange={(e) =>
                          setForm({ ...form, confirmPassword: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        title={
                          showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                        }
                      >
                        {showConfirmPassword ? (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md bg-skybrand-600 px-4 py-2 text-sm font-medium text-white hover:bg-skybrand-700 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? "Đang đăng ký..." : "Đăng ký"}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Đã có tài khoản?{" "}
                </span>
                <button
                  className="text-skybrand-600 hover:text-skybrand-700 font-medium underline dark:text-skybrand-400 dark:hover:text-skybrand-300"
                  onClick={onSwitchToLogin}
                >
                  Đăng nhập ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
