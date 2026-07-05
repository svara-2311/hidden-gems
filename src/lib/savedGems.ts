import { useEffect, useState } from "react";

const STORAGE_KEY = "hidden-gems:saved";
export const SAVED_GEMS_EVENT = "hidden-gems:saved-changed";

export interface SavedGem {
  id: string;
  name: string;
  neighborhood: string;
  vibe_tags?: string[];
  match_blurb?: string;
  famous_for?: string;
}

function readSavedGems(): SavedGem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedGem[]) : [];
  } catch {
    return [];
  }
}

function writeSavedGems(gems: SavedGem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gems));
  window.dispatchEvent(new Event(SAVED_GEMS_EVENT));
}

export function getSavedGems(): SavedGem[] {
  return readSavedGems();
}

export function isGemSaved(id: string): boolean {
  return readSavedGems().some((gem) => gem.id === id);
}

// Toggles the saved state for a gem and returns whether it is now saved.
export function toggleSavedGem(gem: SavedGem): boolean {
  const gems = readSavedGems();
  const index = gems.findIndex((g) => g.id === gem.id);

  if (index >= 0) {
    gems.splice(index, 1);
    writeSavedGems(gems);
    return false;
  }

  gems.push(gem);
  writeSavedGems(gems);
  return true;
}

// Live count of saved gems, kept in sync across cards via SAVED_GEMS_EVENT.
export function useSavedGemsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(getSavedGems().length);
    update();
    window.addEventListener(SAVED_GEMS_EVENT, update);
    return () => window.removeEventListener(SAVED_GEMS_EVENT, update);
  }, []);

  return count;
}
