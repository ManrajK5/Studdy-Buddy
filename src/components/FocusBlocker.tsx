"use client";

import { useEffect, useMemo, useState } from "react";

type BlockItem = {
  id: string;
  url: string;
};

type BlockState = {
  endAt: number | null;
  items: BlockItem[];
};

const STORAGE_KEY = "study-buddy-focus-blocker";

function normalizeUrl(input: string) {
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    return url.origin;
  } catch {
    return null;
  }
}

export function FocusBlocker() {
  const [items, setItems] = useState<BlockItem[]>([]);
  const [input, setInput] = useState("");
  const [minutes, setMinutes] = useState(50);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as BlockState;
      setItems(parsed.items ?? []);
      setEndAt(parsed.endAt ?? null);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const payload: BlockState = { items, endAt };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [items, endAt]);

  const active = useMemo(() => {
    if (!endAt) return false;
    return Date.now() < endAt;
  }, [endAt]);

  const timeLeft = useMemo(() => {
    if (!endAt) return 0;
    return Math.max(0, Math.round((endAt - Date.now()) / 60000));
  }, [endAt]);

  function addItem() {
    setStatus(null);
    const normalized = normalizeUrl(input.trim());
    if (!normalized) {
      setStatus("Enter a valid website (e.g., youtube.com)");
      return;
    }
    if (items.some((i) => i.url === normalized)) {
      setStatus("That site is already on the block list.");
      return;
    }
    setItems((prev) => [{ id: crypto.randomUUID(), url: normalized }, ...prev]);
    setInput("");
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function startBlock() {
    if (!items.length) {
      setStatus("Add at least one website to block.");
      return;
    }
    const end = Date.now() + minutes * 60 * 1000;
    setEndAt(end);
    setStatus(null);
  }

  function stopBlock() {
    setEndAt(null);
  }

  function onOpen(url: string, e: React.MouseEvent<HTMLAnchorElement>) {
    if (!active) return;
    e.preventDefault();
    setBlockedUrl(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-700">Block website</label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="youtube.com"
            className="mt-2 w-full rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <button
          type="button"
          onClick={addItem}
          className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
        >
          Add
        </button>
        <div className="w-28">
          <label className="text-xs font-medium text-slate-700">Minutes</label>
          <input
            type="number"
            min={5}
            max={180}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <button
          type="button"
          onClick={startBlock}
          className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        >
          Start
        </button>
        {endAt ? (
          <button
            type="button"
            onClick={stopBlock}
            className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Stop
          </button>
        ) : null}
      </div>

      {status ? <div className="text-xs text-slate-500">{status}</div> : null}

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Blocked websites</span>
          {active ? (
            <span className="text-slate-900">Active • {timeLeft} min left</span>
          ) : (
            <span>Inactive</span>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {items.length === 0 ? (
            <div className="text-xs text-slate-400">No websites added yet.</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2"
              >
                <a
                  href={item.url}
                  onClick={(e) => onOpen(item.url, e)}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900"
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.url}
                </a>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {blockedUrl ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-xl">
            <img
              src="/studdy-buddy.png"
              alt="Studdy Buddy"
              className="mx-auto h-28 w-28"
            />
            <div className="mt-3 text-lg font-semibold text-slate-900">
              Stay focused
            </div>
            <div className="mt-2 text-sm text-slate-500">
              {blockedUrl} is blocked during your focus session.
            </div>
            <button
              type="button"
              onClick={() => setBlockedUrl(null)}
              className="mt-5 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
