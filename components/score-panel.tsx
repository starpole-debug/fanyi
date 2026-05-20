"use client";

import { useState, useTransition } from "react";

type ScorePayload = {
  overallScore: number;
  overallComment: string;
  strengths: string[];
  weaknesses: string[];
  criteriaScores: Record<string, number>;
};

export function ScorePanel({ translationId }: { translationId: string }) {
  const [score, setScore] = useState<ScorePayload | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleScore() {
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/score/${translationId}`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        setScore(null);
        setError(payload.error || "评分失败。");
        return;
      }

      setScore(payload);
    });
  }

  return (
    <div className="section">
      <div className="section-head">
        <h3>AI 评分</h3>
        <button className="btn-secondary" type="button" onClick={handleScore} disabled={isPending}>
          {isPending ? "评分中..." : "重新评分"}
        </button>
      </div>

      {error ? <div className="callout callout-danger">{error}</div> : null}

      {score ? (
        <div className="score-box">
          <p>
            <strong>{score.overallScore}</strong> / 10
          </p>
          <p>{score.overallComment}</p>
          <p>优点：{score.strengths.join("；") || "暂无"}</p>
          <p>问题：{score.weaknesses.join("；") || "暂无"}</p>
        </div>
      ) : (
        <div className="empty-state">想看这条译文的质量判断时，点一下评分就行。</div>
      )}
    </div>
  );
}
