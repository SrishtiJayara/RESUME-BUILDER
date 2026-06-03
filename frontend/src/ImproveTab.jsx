import React, { useState } from "react";
import { api } from "../utils/api.js";
import { Zap, TrendingUp, Layers, Type, Sparkles } from "lucide-react";

export default function ImproveTab() {
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleImprove() {
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await api.improve(resumeText, targetRole);
      setResult(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="card fade-up">
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label>Paste Your Resume</label>
            <textarea rows={10} placeholder="Paste your resume text here…" value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
          </div>
          <div>
            <label>Target Role (optional)</label>
            <input type="text" placeholder="e.g. Senior Engineer" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              Specifying a target role gives you more tailored suggestions from Groq's AI.
            </p>
          </div>
        </div>
        <button className="btn btn-accent" onClick={handleImprove} disabled={loading || !resumeText.trim()}>
          {loading ? <span className="spinner" style={{ borderTopColor: "white" }} /> : <Sparkles size={15} />}
          {loading ? "Analyzing with Groq…" : "Get AI Suggestions"}
        </button>
        {error && <p style={{ marginTop: 12, color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 13 }}>⚠ {error}</p>}
      </div>

      {result && (
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Overall feedback */}
          <div className="card fade-up" style={{ borderLeft: "4px solid var(--accent)", paddingLeft: 24 }}>
            <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10 }}>
              Overall Assessment
            </h3>
            <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 16, lineHeight: 1.8 }}>
              {result.overallFeedback}
            </p>
          </div>

          {/* Improved Summary */}
          {result.improvedSummary && (
            <div className="card fade-up fade-up-1" style={{ background: "var(--ink)", color: "var(--paper)" }}>
              <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--border)", marginBottom: 12 }}>
                ✦ Rewritten Professional Summary
              </h3>
              <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 15, lineHeight: 1.9, color: "var(--paper)" }}>
                {result.improvedSummary}
              </p>
            </div>
          )}

          {/* Quick wins */}
          {result.quickWins?.length > 0 && (
            <div className="card fade-up fade-up-2">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gold)", marginBottom: 16 }}>
                <Zap size={13} /> Quick Wins
              </h3>
              {result.quickWins.map((qw, i) => (
                <div key={i} style={{ padding: "14px 16px", background: "var(--cream)", borderRadius: 2, marginBottom: 10 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>⚠ {qw.issue}</p>
                  <p style={{ fontSize: 13, color: "var(--muted)" }}>→ {qw.fix}</p>
                </div>
              ))}
            </div>
          )}

          {/* Impact improvements */}
          {result.impactImprovements?.length > 0 && (
            <div className="card fade-up fade-up-3">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 16 }}>
                <TrendingUp size={13} /> Line-by-Line Rewrites
              </h3>
              {result.impactImprovements.map((item, i) => (
                <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < result.impactImprovements.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span className="tag" style={{ marginBottom: 10 }}>{item.section}</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                    <div style={{ padding: "12px 14px", background: "#fff0ee", borderRadius: 2, borderLeft: "3px solid var(--accent)" }}>
                      <p style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--accent)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Before</p>
                      <p style={{ fontSize: 13, lineHeight: 1.6 }}>{item.original}</p>
                    </div>
                    <div style={{ padding: "12px 14px", background: "#eef6f0", borderRadius: 2, borderLeft: "3px solid var(--success)" }}>
                      <p style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--success)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>After</p>
                      <p style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 500 }}>{item.improved}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>💡 {item.reason}</p>
                </div>
              ))}
            </div>
          )}

          {/* Structure & Content Advice */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {result.structureAdvice?.length > 0 && (
              <div className="card fade-up fade-up-4">
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 14 }}>
                  <Layers size={13} /> Structure Tips
                </h3>
                {result.structureAdvice.map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <span style={{ color: "var(--gold)", flexShrink: 0 }}>◆</span>
                    <span style={{ fontSize: 13 }}>{tip}</span>
                  </div>
                ))}
              </div>
            )}
            {result.contentAdvice?.length > 0 && (
              <div className="card fade-up fade-up-4">
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 14 }}>
                  <Type size={13} /> Content Tips
                </h3>
                {result.contentAdvice.map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <span style={{ color: "var(--gold)", flexShrink: 0 }}>◆</span>
                    <span style={{ fontSize: 13 }}>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Power words */}
          {result.powerWords?.length > 0 && (
            <div className="card fade-up">
              <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 14 }}>
                ⚡ Power Words to Use
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.powerWords.map((w, i) => (
                  <span key={i} className="tag tag-warn" style={{ fontWeight: 600 }}>{w}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
