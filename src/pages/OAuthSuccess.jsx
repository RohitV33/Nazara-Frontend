import { useEffect } from "react";

export default function OAuthSuccess() {

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const user = {
          id: payload.id,
          email: payload.email,
          name: payload.name || payload.email.split("@")[0],
          role: payload.role || "user",
        };
        localStorage.setItem("user", JSON.stringify(user));
      } catch (e) {
        console.error("Token decode failed", e);
      }

      window.location.href = "/";

    } else {
      window.location.href = "/login";
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-ink-500 text-sm animate-pulse">Logging you in...</p>
    </div>
  );
}