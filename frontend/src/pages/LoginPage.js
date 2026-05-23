import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { roleBySlug } from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Eye, EyeOff, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { role: roleSlug } = useParams();
  const navigate = useNavigate();
  const role = roleBySlug(roleSlug);
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center wms-grid-bg">
        <div className="text-center">
          <div className="text-neutral-700 font-medium">Unknown role</div>
          <Link to="/login" className="text-sm text-neutral-500 underline mt-2 inline-block">
            Go back
          </Link>
        </div>
      </div>
    );
  }

  const Icon = role.icon;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await login({ email: email.trim().toLowerCase(), password, role: role.key });
      toast.success(`Welcome back, ${user.full_name}`);
      navigate(`/dashboard/${role.slug}`, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Login failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen wms-grid-bg flex flex-col">
      <header className="px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Warehouse OS</div>
            <div className="text-xs text-neutral-500 -mt-0.5">Inventory & Operations</div>
          </div>
        </div>
        <Link
          to="/login"
          data-testid="back-to-roles"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Change role
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${role.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-400">Signing in as</div>
                <div className="text-base font-semibold text-neutral-900">{role.label}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700">Email</label>
                <input
                  data-testid="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@warehouse.com"
                  className="mt-1 w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 placeholder-neutral-400"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700">Password</label>
                <div className="relative mt-1">
                  <input
                    data-testid="login-password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 placeholder-neutral-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-neutral-400 hover:text-neutral-700"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div data-testid="login-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                data-testid="login-submit"
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  <>Sign in</>
                )}
              </button>
            </form>

            {role.demoEmail && (
              <div className="mt-5 text-xs text-neutral-500 bg-neutral-50 border border-neutral-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-neutral-700">Demo credentials</div>
                  <button
                    type="button"
                    data-testid="autofill-demo"
                    onClick={() => {
                      setEmail(role.demoEmail);
                      setPassword(role.demoPassword);
                      setError("");
                    }}
                    className="text-[11px] font-medium text-neutral-700 hover:text-neutral-900 underline underline-offset-2"
                  >
                    Use demo
                  </button>
                </div>
                Email: <span className="font-mono">{role.demoEmail}</span><br />
                Password: <span className="font-mono">{role.demoPassword}</span>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-xs text-neutral-400">
            Protected by JWT. Your session is encrypted.
          </div>
        </div>
      </main>
    </div>
  );
}
