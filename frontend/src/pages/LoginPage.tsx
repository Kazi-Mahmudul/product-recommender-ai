import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuthAlerts } from "../hooks/useAuthAlerts";
import { GoogleLogin } from "@react-oauth/google";
import { ArrowLeft } from "lucide-react";


interface LoginPageProps {
  darkMode: boolean;
}
export default function LoginPage({ darkMode }: LoginPageProps) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
      await login(form.email, form.password);
      // Show success alert without user data since it will be updated after login
      await authAlerts.showLoginSuccess();
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
      await authAlerts.showAuthError(err.message || "Login failed");
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
      await authAlerts.showGoogleLoginSuccess();
      navigate("/");
    } catch (error: any) {
      setError(error.message || "Google authentication failed");
      await authAlerts.showAuthError(error.message || "Google authentication failed");
    } finally {
      setLoading(false);
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
              <input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
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

          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={async () => {
              const errorMsg = "Google authentication failed";
              setError(errorMsg);
              await authAlerts.showAuthError(errorMsg);
            }}
            useOneTap={false}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
          />

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
