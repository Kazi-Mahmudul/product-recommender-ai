import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuthAlerts } from "../hooks/useAuthAlerts";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";


interface LoginPageProps {
  darkMode: boolean;
}
export default function LoginPage({ darkMode }: LoginPageProps) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const authAlerts = useAuthAlerts(darkMode);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(form.email, form.password);
      // Show success alert without user data since it will be updated after login
      await authAlerts.showLoginSuccess();

      if (user?.is_admin) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
      await authAlerts.showAuthError(err.message || "Login failed");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
      // The function will redirect to Google OAuth page
    } catch (error: any) {
      setError(error.message || "Google authentication failed");
      await authAlerts.showAuthError(error.message || "Google authentication failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand/5 via-white to-brand-darkGreen/10 dark:from-brand/20 dark:via-gray-900 dark:to-brand-darkGreen/20 px-4">
      {/* Decorative elements */}
      <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-brand/10 filter blur-3xl -z-10 animate-float"></div>
      <div
        className="absolute bottom-20 right-1/4 w-64 h-64 rounded-full bg-brand-darkGreen/10 filter blur-3xl -z-10 animate-float"
        style={{ animationDelay: "2s" }}
      ></div>

      <div className="w-full max-w-md relative">
        <Link
          to="/"
          className="absolute -top-12 left-0 flex items-center gap-1 text-brand hover:text-brand-darkGreen transition-colors duration-200"
        >
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </Link>

        <form
          onSubmit={handleSubmit}
          className="w-full p-8 bg-white dark:bg-neutral-900 rounded-3xl shadow-soft-lg flex flex-col gap-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand/5 rounded-full filter blur-3xl -z-10"></div>

          <div className="text-center mb-2">
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-white">
              Welcome Back
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
              Login to your Peyechi account
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-semantic-danger text-sm text-center bg-semantic-danger/10 py-2 px-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="rounded-xl py-3 font-medium text-white bg-brand hover:bg-brand-darkGreen hover:text-hover-light transition-colors duration-200 shadow-sm"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="relative flex items-center my-4">
            <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700"></div>
            <span className="flex-shrink mx-3 text-neutral-500 dark:text-neutral-400 text-sm">
              or
            </span>
            <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors w-full"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4" />
              <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.57C14.73 18.23 13.48 18.64 12 18.64C9.14 18.64 6.71 16.69 5.84 14.09H2.18V16.96C4 20.53 7.7 23 12 23Z" fill="#34A853" />
              <path d="M5.84 14.09C5.62 13.43 5.49 12.73 5.49 12C5.49 11.27 5.62 10.57 5.84 9.91V7.04H2.18C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.18 16.96L5.84 14.09Z" fill="#FBBC05" />
              <path d="M12 5.36C13.62 5.36 15.06 5.93 16.21 7.04L19.36 4.03C17.45 2.24 14.97 1 12 1C7.7 1 4 3.47 2.18 7.04L5.84 9.91C6.71 7.31 9.14 5.36 12 5.36Z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="text-center text-sm mt-2">
            Don't have an account?{" "}
            <button
              type="button"
              className="text-brand hover:text-brand-darkGreen transition-colors duration-200 font-medium"
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
