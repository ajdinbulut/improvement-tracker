import React, { useState, useEffect } from "react";

/**
 * Improvement Sheet Tracker – v3 ⭐️
 * --------------------------------------------------
 * • Full‑screen layout  
 * • Grade per checklist item (1‑5)  
 * • **NEW:** History snapshots, “Save to history”, “Reset” (without saving)  
 * • Everything persists in localStorage (metrics, progress, history)  
 * --------------------------------------------------
 */

// ────────────────────────────────────────────────────────────────────────────
// helpers & constants
// ────────────────────────────────────────────────────────────────────────────
const DAYS = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
const GAMES_PER_DAY = 5;
const GRADES = [1, 2, 3, 4, 5];

function useLocalStorage(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored);
      return typeof defaultValue === "function" ? defaultValue() : defaultValue;
    } catch {
      return typeof defaultValue === "function" ? defaultValue() : defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState];
}

const createEmptyProgress = (metricsCount) =>
  DAYS.map(() => Array.from({ length: GAMES_PER_DAY }, () => Array(metricsCount).fill(0)));

// average grade helper
const calcAverage = (progress) => {
  let total = 0,
    count = 0;
  progress.forEach((day) =>
    day.forEach((game) =>
      game.forEach((g) => {
        if (g > 0) {
          total += g;
          count += 1;
        }
      })
    )
  );
  return count ? (total / count).toFixed(2) : "–";
};

// ────────────────────────────────────────────────────────────────────────────
// main component
// ────────────────────────────────────────────────────────────────────────────
export default function App() {
  // Checklist items
  const [metrics, setMetrics] = useLocalStorage("metrics", () => [
    "Did I think about what I'm playing for?",
    "Did I track enemy jungle & ping?",
    "Did I gank randomly instead of farming?",
    "Did I check enemy wards before ganking?",
  ]);

  // Progress matrix  day→game→metric→grade
  const [progress, setProgress] = useLocalStorage("progress", () =>
    createEmptyProgress(metrics.length)
  );

  // History snapshots array
  const [history, setHistory] = useLocalStorage("history", () => []);

  // sync progress when metrics length changes
  useEffect(() => {
    setProgress((prev) => {
      const empty = createEmptyProgress(metrics.length);
      return prev.map((day, dIdx) =>
        day.map((game, gIdx) => {
          const diff = metrics.length - game.length;
          if (diff > 0) return [...game, ...Array(diff).fill(0)];
          if (diff < 0) return game.slice(0, metrics.length);
          return game;
        })
      ) ?? empty;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics.length]);

  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // ────────────────── handlers ──────────────────
  const setGrade = (gameIdx, metricIdx, grade) => {
    setProgress((prev) => {
      const copy = typeof structuredClone === "function" ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
      copy[selectedDayIdx][gameIdx][metricIdx] = grade;
      return copy;
    });
  };

  const addMetric = (text) => {
    const t = text.trim();
    if (t) setMetrics((prev) => [...prev, t]);
  };
  const deleteMetric = (idx) => setMetrics((prev) => prev.filter((_, i) => i !== idx));

  const saveSnapshot = () => {
    const snapshot = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      metrics,
      progress,
      avg: calcAverage(progress),
    };
    setHistory((prev) => [...prev, snapshot]);
  };

  const resetProgress = () => {
    setProgress(createEmptyProgress(metrics.length));
  };

  // ──────────────────────────────────────────────────────────────────────────
  // UI
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black text-gray-200 p-4 font-sans flex flex-col">
      <h1 className="text-4xl font-bold text-center mb-6">Improvement Sheet Tracker</h1>

      {/* action buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button onClick={saveSnapshot} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 transition">
          💾 Save to history
        </button>
        <button onClick={resetProgress} className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-500 transition">
          ♻️ Reset current
        </button>
      </div>

      {/* day selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {DAYS.map((d, i) => (
          <button
            key={d}
            onClick={() => setSelectedDayIdx(i)}
            className={`px-4 py-2 rounded-lg border transition hover:scale-105 ${
              i === selectedDayIdx ? "bg-purple-600 border-purple-400" : "bg-gray-800 border-gray-600"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* checklist manager */}
      <section className="bg-gray-900/60 p-4 rounded-xl shadow-lg w-full mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Checklist</h2>
        {metrics.map((q, idx) => (
          <div key={idx} className="flex items-center gap-3 mb-2">
            <span className="flex-1 truncate">{q}</span>
            <button onClick={() => deleteMetric(idx)} className="text-red-400 hover:text-red-200 px-2 py-1 rounded-lg bg-red-600/10">
              ✕
            </button>
          </div>
        ))}
        <NewMetricForm onAdd={addMetric} />
      </section>

      {/* progress table */}
      <section className="flex-1 overflow-auto bg-gray-900/60 p-4 rounded-xl shadow-lg w-full">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-2 border-b border-gray-700 sticky left-0 bg-gray-900/80 backdrop-blur">Game #</th>
              {metrics.map((m, idx) => (
                <th key={idx} className="px-3 py-2 border-b border-gray-700 max-w-xs truncate">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: GAMES_PER_DAY }, (_, gameIdx) => (
              <tr key={gameIdx} className={gameIdx % 2 === 0 ? "bg-gray-800" : "bg-gray-700/60"}>
                <td className="px-2 py-2 border-b border-gray-700 sticky left-0 bg-gray-900/80 backdrop-blur font-medium">
                  {gameIdx + 1}
                </td>
                {metrics.map((_, metricIdx) => (
                  <td key={metricIdx} className="px-3 py-2 border-b border-gray-700 text-center">
                    <select
                      value={progress[selectedDayIdx][gameIdx][metricIdx]}
                      onChange={(e) => setGrade(gameIdx, metricIdx, Number(e.target.value))}
                      className="bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-gray-200 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value={0}>–</option>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* history snapshots */}
      <section className="bg-gray-900/60 p-4 rounded-xl shadow-lg w-full mt-8 max-h-72 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">History</h2>
        {history.length === 0 ? (
          <p className="text-gray-400">No snapshots saved yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((snap) => (
              <li key={snap.id} className="flex justify-between bg-gray-800 rounded-lg p-2">
                <span>{new Date(snap.timestamp).toLocaleString()}</span>
                <span>Avg: {snap.avg}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// NewMetricForm
// ────────────────────────────────────────────────────────────────────────────
function NewMetricForm({ onAdd }) {
  const [input, setInput] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(input);
    setInput("");
  };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Add new checklist item…"
        className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
      />
      <button type="submit" className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 transition">
        ➕ Add
      </button>
    </form>
  );
}