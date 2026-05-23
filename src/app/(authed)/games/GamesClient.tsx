"use client";

import { useState } from "react";
import type { FamilyMember } from "@/lib/types";
import { getDisplayName } from "@/lib/helpers";

const TRIVIA = [
  { q: "What state is the Liberty Bell in?", a: "Pennsylvania" },
  { q: "How many books are in the Old Testament?", a: "39" },
  { q: "Who painted the Sistine Chapel ceiling?", a: "Michelangelo" },
  { q: "What is the longest river in the world?", a: "The Nile" },
  { q: "What planet is known as the Red Planet?", a: "Mars" },
  { q: "How many U.S. states begin with the letter 'M'?", a: "Eight (Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana)" },
  { q: "Who wrote 'Pride and Prejudice'?", a: "Jane Austen" },
];

const WOULD_YOU_RATHER = [
  "Would you rather travel back in time or to the future?",
  "Would you rather have a family vacation at the beach or in the mountains?",
  "Would you rather eat only sweet foods or only savory foods for a year?",
  "Would you rather be able to fly or be invisible?",
  "Would you rather host Thanksgiving or Christmas dinner?",
  "Would you rather always sing instead of speak, or dance everywhere you go?",
  "Would you rather read every book ever written or watch every movie ever made?",
];

const MEMORY_PROMPTS = [
  "Share your earliest happy childhood memory.",
  "What's a family tradition you hope continues forever?",
  "Tell about a time you laughed until you cried with family.",
  "What's the best gift you ever received from a family member?",
  "Describe your favorite family vacation.",
  "What's a story Grandma or Grandpa told that you'll never forget?",
  "Share a meal you'll always remember and who you ate it with.",
];

type Game = "trivia" | "wouldyou" | "memory" | "dice" | "vacuum";

export function GamesClient({ family }: { family: FamilyMember[] }) {
  const [game, setGame] = useState<Game | null>(null);
  const [content, setContent] = useState<React.ReactNode>(null);

  const showContent = (g: Game) => {
    if (g === "trivia") {
      const item = TRIVIA[Math.floor(Math.random() * TRIVIA.length)];
      setContent(
        <>
          <div>{item.q}</div>
          <details style={{ marginTop: 12, color: "var(--cream)" }}>
            <summary style={{ cursor: "pointer", color: "var(--gold-soft)", fontSize: "0.9rem" }}>Reveal Answer</summary>
            <div style={{ marginTop: 6 }}>{item.a}</div>
          </details>
        </>,
      );
    } else if (g === "wouldyou") {
      setContent(WOULD_YOU_RATHER[Math.floor(Math.random() * WOULD_YOU_RATHER.length)]);
    } else if (g === "memory") {
      setContent(MEMORY_PROMPTS[Math.floor(Math.random() * MEMORY_PROMPTS.length)]);
    } else if (g === "vacuum") {
      setContent(
        <iframe
          src="/vacuum-game.html"
          title="Vacuum Quest"
          style={{
            width: "100%",
            maxWidth: 520,
            height: 660,
            display: "block",
            margin: "0 auto",
            border: "2px solid var(--gold)",
            borderRadius: 10,
            background: "#a6dbe6",
          }}
        />,
      );
    } else {
      const roll = Math.ceil(Math.random() * Math.max(family.length, 1));
      const person = family[roll - 1];
      setContent(
        <>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🎲 {roll}</div>
          <div>It&apos;s <strong>{getDisplayName(person)}</strong>&apos;s turn.</div>
        </>,
      );
    }
  };

  const play = (g: Game) => {
    setGame(g);
    showContent(g);
  };

  const titles: Record<Game, string> = {
    trivia: "Family Trivia",
    wouldyou: "Would You Rather",
    memory: "Memory Lane",
    dice: "Roll the Dice",
    vacuum: "Vacuum Quest",
  };

  const tiles: { g: Game; title: string; desc: string }[] = [
    { g: "trivia", title: "Family Trivia", desc: "Random trivia for friendly competition." },
    { g: "wouldyou", title: "Would You Rather", desc: "Conversation starters." },
    { g: "memory", title: "Memory Lane", desc: "Prompts to share family memories." },
    { g: "dice", title: "Roll the Dice", desc: "Random number for picking who's next." },
    { g: "vacuum", title: "Vacuum Quest", desc: "Tidy the family room in Greta's arcade game." },
  ];

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {tiles.map((t) => (
          <div
            key={t.g}
            onClick={() => play(t.g)}
            style={{
              background: "var(--cream-soft)",
              border: "1px solid var(--line)",
              borderTop: "4px solid var(--gold)",
              padding: 16,
              textAlign: "center",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            <h3 style={{ margin: "0 0 6px", color: "var(--navy)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
              {t.title}
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>{t.desc}</p>
          </div>
        ))}
      </div>

      {game && (
        <div
          style={{
            background: "var(--navy)",
            color: "var(--cream)",
            padding: 22,
            borderRadius: 6,
            marginTop: 16,
            textAlign: "center",
            border: "1px solid var(--gold)",
            minHeight: 100,
          }}
        >
          <h3 style={{ margin: "0 0 10px", color: "var(--gold-soft)", fontFamily: "'Garamond', serif", fontWeight: "normal" }}>
            {titles[game]}
          </h3>
          <div style={{ fontSize: "1.1rem", fontStyle: "italic", marginBottom: 12 }}>{content}</div>
          {game !== "vacuum" && (
            <button
              className="btn btn-gold"
              onClick={() => showContent(game)}
              style={{ marginRight: 6 }}
            >
              Another One
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setGame(null)}>
            Close
          </button>
        </div>
      )}
    </>
  );
}
