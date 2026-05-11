import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../hooks/useAuth.js";

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (cred) => {
    try {
      await signIn(cred.credential);
      navigate("/");
    } catch (err) {
      console.error("Sign-in failed:", err);
    }
  };

  return (
    <div className="tq-signin">
      <div className="tq-signin-card">
        <div className="tq-brand-mark tq-signin-mark">TQ</div>
        <h1 className="tq-signin-title">TypeQuest</h1>
        <p className="tq-signin-tag">Level up every word you type.</p>

        <ul className="tq-signin-features">
          <li>📊 Real-time word count, WPM, and streak tracking</li>
          <li>🏆 40+ badges across volume, speed, and consistency</li>
          <li>📈 Full analytics dashboard with heatmaps</li>
          <li>🔒 Privacy-first — we track counts, never content</li>
        </ul>

        <div className="tq-signin-cta">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => console.error("Google login error")}
            theme="filled_black"
            shape="pill"
            text="continue_with"
          />
        </div>
        <p className="tq-signin-foot">
          By signing in you agree to our privacy policy. No document content is ever stored.
        </p>
      </div>
    </div>
  );
}
