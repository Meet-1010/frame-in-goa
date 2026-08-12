const TITLES = [
  "Ships at 2:47 PM",
  "Susegad Shipper",
  "Terminal Gremlin",
  "Latency Whisperer",
  "Prompt Alchemist",
  "Merge Conflict Survivor",
  "Beach Shack Architect",
  "Zero to One Menace",
  "Midnight Deployer",
  "Signal Over Noise",
  "Chain Whisperer",
  "Demo Day Villain",
  "Rollback Enjoyer",
  "Low Tide Optimist",
  "Agent Wrangler",
  "Sunrise Committer",
  "Regex Sorcerer",
  "Cold Start Fixer",
  "Tokenomics Tinkerer",
  "Serial Hackathon Repeat Offender",
  "Edge Case Hunter",
  "Rate Limit Negotiator",
  "Prod Whisperer",
  "Context Window Hoarder",
  "Coconut Driven Developer",
  "Undefined Is Not A Function",
  "Ctrl+Z Historian",
  "Ships Broken, Fixes Live",
  "Reads The Docs",
  "Last Commit 04:11 AM",
  "Refactors Under Pressure",
  "Runs It Locally First",
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Same name always gets the same title, so re-renders do not shuffle under you. */
export function builderTitle(seed: string, nudge = 0) {
  const key = seed.trim().toLowerCase() || "builder";
  return TITLES[(hash(key) + nudge) % TITLES.length];
}

export function passNumber(seed: string) {
  const n = hash(seed.trim().toLowerCase() || "builder") % 10000;
  return `HHG-26-${String(n).padStart(4, "0")}`;
}
