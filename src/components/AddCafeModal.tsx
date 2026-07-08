"use client";

import { useState } from "react";
import { X, Search, Loader2, Check, MapPin, Coffee, Home } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FoundCafe } from "@/lib/googlePlaces";

interface AddCafeModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "real" | "personal";
type Step = "input" | "confirm" | "done";

export function AddCafeModal({ open, onClose }: AddCafeModalProps) {
  const [mode, setMode] = useState<Mode>("real");
  const [step, setStep] = useState<Step>("input");
  const [name, setName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [description, setDescription] = useState("");
  const [found, setFound] = useState<FoundCafe | null>(null);
  const [addedName, setAddedName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMode("real");
    setStep("input");
    setName("");
    setNeighborhood("");
    setDescription("");
    setFound(null);
    setAddedName("");
    setLoading(false);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  // Real mode — look the cafe up on Google Places for confirmation.
  const handleFind = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/places/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      if (data.alreadyExists) {
        setError(`"${data.alreadyExists}" is already on the list.`);
      } else if (!data.found) {
        setError("Couldn't find that one on the map. Add it as a personal spot instead?");
      } else {
        setFound(data.found);
        setStep("confirm");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Insert — either the confirmed Google result or a manual personal entry.
  const submitAdd = async (payload: object) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/places/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add the cafe");
      setAddedName(data.place?.name ?? name.trim());
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm animate-fade-in"
        onClick={close}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-cream shadow-xl animate-fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-rust" />
            <span className="text-sm font-bold uppercase tracking-wide text-stone-950">
              Add a cafe
            </span>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-400 hover:border-stone-900 hover:text-stone-900 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-5">
          {step === "done" ? (
            <div className="text-center py-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rust/10 text-rust">
                <Check className="h-6 w-6" />
              </div>
              <p className="font-serif text-xl font-bold text-stone-950">
                {addedName} is on the list!
              </p>
              <p className="mt-2 text-sm text-stone-500">
                It&rsquo;s enriched and searchable now. Try searching for its vibe.
              </p>
              <button
                onClick={close}
                className="mt-5 w-full rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-cream hover:bg-stone-800 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="mb-4 flex gap-2">
                {(
                  [
                    { id: "real", label: "Find a cafe", icon: Search },
                    { id: "personal", label: "Personal spot", icon: Home },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setMode(id);
                      setStep("input");
                      setError(null);
                      setFound(null);
                    }}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
                      mode === id
                        ? "border-stone-950 bg-stone-950 text-cream"
                        : "border-stone-300 bg-white text-stone-500 hover:border-stone-950 hover:text-stone-950"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Real: confirm step */}
              {mode === "real" && step === "confirm" && found ? (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">
                    Is this the right place?
                  </p>
                  <div className="rounded-xl border border-stone-200 bg-white p-4">
                    <p className="font-serif text-lg font-bold text-stone-950">{found.name}</p>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-stone-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {found.address || found.neighborhood}
                    </p>
                    <p className="mt-2 text-xs text-stone-400">
                      We&rsquo;ll auto-fill the vibe, drinks &amp; a &ldquo;known for&rdquo; line.
                    </p>
                  </div>
                  {error && <p className="mt-3 text-xs text-rust">{error}</p>}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        setStep("input");
                        setFound(null);
                      }}
                      className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-stone-600 hover:border-stone-950 hover:text-stone-950 transition-colors"
                    >
                      Not this
                    </button>
                    <button
                      onClick={() => submitAdd(found)}
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-cream hover:bg-stone-800 disabled:opacity-60 transition-colors"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Add it
                    </button>
                  </div>
                </div>
              ) : mode === "real" ? (
                /* Real: input step */
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-stone-400">
                    Cafe name
                  </label>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFind()}
                    placeholder="e.g. Corgi Cafe"
                    className="mt-1.5 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 transition-colors"
                  />
                  <p className="mt-1.5 text-xs text-stone-400">
                    We&rsquo;ll look it up and fill in the address &amp; details.
                  </p>
                  {error && (
                    <div className="mt-3 text-xs text-rust">
                      {error}{" "}
                      {error.includes("personal") && (
                        <button
                          onClick={() => {
                            setMode("personal");
                            setNeighborhood("");
                            setError(null);
                          }}
                          className="font-bold underline"
                        >
                          Add manually
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleFind}
                    disabled={!name.trim() || loading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-cream hover:bg-stone-800 disabled:opacity-60 transition-colors"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Find it
                  </button>
                </div>
              ) : (
                /* Personal mode */
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-stone-400">
                      Cafe name
                    </label>
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. My kitchen corner"
                      className="mt-1.5 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-stone-400">
                      Neighborhood
                    </label>
                    <input
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="e.g. Mission"
                      className="mt-1.5 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-stone-400">
                      What&rsquo;s it like? <span className="text-stone-300">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      placeholder="cozy home setup, great pour-over, plants everywhere…"
                      className="mt-1.5 w-full resize-none rounded-xl border-2 border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 transition-colors"
                    />
                  </div>
                  {error && <p className="text-xs text-rust">{error}</p>}
                  <button
                    onClick={() =>
                      submitAdd({
                        name: name.trim(),
                        neighborhood: neighborhood.trim() || "San Francisco",
                        editorial_summary: description.trim() || undefined,
                      })
                    }
                    disabled={!name.trim() || loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-cream hover:bg-stone-800 disabled:opacity-60 transition-colors"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coffee className="h-4 w-4" />}
                    Add cafe
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
