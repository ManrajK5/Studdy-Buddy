"use client";

import { useState } from "react";
import { StickyNote } from "@/components/StickyNote";

export function StickyNoteWidget() {
  const [value, setValue] = useState("");

  return <StickyNote value={value} onChange={setValue} className="h-full" />;
}
