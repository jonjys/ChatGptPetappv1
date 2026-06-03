"use client";

import { useState } from "react";
import { BOUNTIES } from "@/lib/mock-data";
import type { Bounty } from "@/types/bounty";

export function useBounties() {
  const [bounties, setBounties] = useState<Bounty[]>(BOUNTIES);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());

  function claimBounty(id: string) {
    setClaimed((prev) => new Set(prev).add(id));
    setBounties((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, claimedBy: "karmasonic", completions: b.completions + 1 } : b
      )
    );
  }

  return { bounties, claimed, claimBounty };
}
