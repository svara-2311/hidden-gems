"use client";

import { forwardRef } from "react";
import type { SavedGem } from "@/lib/savedGems";

// An Instagram-story-sized (9:16) render of the user's gem collection.
// Rendered off-screen and captured to a PNG by html-to-image.

export const STORY_W = 1080;
export const STORY_H = 1920;

const CREAM = "#F5F0E8";
const RUST = "#BA5A37";
const INK = "#1C1917";
const MUTE = "#78716C";
const LINE = "#E7E1D6";
const SERIF = "Georgia, 'Times New Roman', serif";

const MAX_SHOWN = 8;

export const GemStoryCard = forwardRef<HTMLDivElement, { gems: SavedGem[] }>(
  function GemStoryCard({ gems }, ref) {
    const shown = gems.slice(0, MAX_SHOWN);
    const extra = gems.length - shown.length;

    return (
      <div
        ref={ref}
        style={{
          width: STORY_W,
          height: STORY_H,
          background: CREAM,
          padding: "96px 90px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: INK,
        }}
      >
        {/* Brand */}
        <div
          style={{
            fontSize: 30,
            letterSpacing: 10,
            fontWeight: 700,
            color: RUST,
            textTransform: "uppercase",
          }}
        >
          ☕ Hidden Gems
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 104,
            fontWeight: 700,
            lineHeight: 1.02,
            marginTop: 28,
          }}
        >
          My Coffee Gems
        </div>
        <div style={{ fontSize: 36, color: MUTE, marginTop: 24 }}>
          {gems.length} SF Bay Area spot{gems.length === 1 ? "" : "s"} worth the detour
        </div>

        <div style={{ height: 2, background: LINE, margin: "56px 0 8px" }} />

        {/* List */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 40, marginTop: 48 }}>
          {shown.map((gem, i) => (
            <div key={gem.id} style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
              <div
                style={{
                  flexShrink: 0,
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  background: RUST,
                  color: CREAM,
                  fontFamily: SERIF,
                  fontSize: 32,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: SERIF, fontSize: 50, fontWeight: 700, lineHeight: 1.1 }}>
                  {gem.name}
                </div>
                <div style={{ fontSize: 30, color: MUTE, marginTop: 6 }}>
                  ◦ {gem.neighborhood}
                </div>
                {gem.famous_for && (
                  <div style={{ fontSize: 30, color: RUST, marginTop: 8, fontStyle: "italic" }}>
                    Known for {gem.famous_for}
                  </div>
                )}
              </div>
            </div>
          ))}
          {extra > 0 && (
            <div style={{ fontSize: 34, color: MUTE, fontStyle: "italic", marginTop: 8 }}>
              + {extra} more gem{extra === 1 ? "" : "s"} in my collection…
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: `2px solid ${LINE}`,
            paddingTop: 40,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 32,
          }}
        >
          <span style={{ fontFamily: SERIF, fontStyle: "italic", color: INK }}>
            Find your coffee spot
          </span>
          <span style={{ fontWeight: 700, color: RUST }}>hidden-gems-wine.vercel.app</span>
        </div>
      </div>
    );
  }
);
