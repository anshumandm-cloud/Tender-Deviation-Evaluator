/**
 * Precision word-level diff utility for comparing Original SBD/NIT text
 * with Proposed Reviewed / Harmonized Clauses.
 */

export interface DiffToken {
  value: string;
  type: "added" | "removed" | "unchanged";
}

export interface DiffResult {
  tokens: DiffToken[];
  originalTokens: DiffToken[];
  amendedTokens: DiffToken[];
  stats: {
    addedCount: number;
    removedCount: number;
    unchangedCount: number;
    percentRetained: number;
  };
}

function consolidateTokens(tokens: DiffToken[]): DiffToken[] {
  if (tokens.length === 0) return [];
  const result: DiffToken[] = [];
  let current = { ...tokens[0] };

  for (let k = 1; k < tokens.length; k++) {
    if (tokens[k].type === current.type) {
      current.value += tokens[k].value;
    } else {
      result.push(current);
      current = { ...tokens[k] };
    }
  }
  result.push(current);
  return result;
}

/**
 * Computes a word-level Longest Common Subsequence (LCS) diff
 * between the original tender stipulation and the proposed amended clause text.
 */
export function computeWordDiff(originalText: string, amendedText: string): DiffResult {
  const normOriginal = (originalText || "").trim();
  const normAmended = (amendedText || "").trim();

  if (!normOriginal && !normAmended) {
    return {
      tokens: [],
      originalTokens: [],
      amendedTokens: [],
      stats: { addedCount: 0, removedCount: 0, unchangedCount: 0, percentRetained: 100 },
    };
  }

  // Tokenize preserving spaces and word boundaries
  const tokensA = normOriginal.match(/(\s+|\S+)/g) || [];
  const tokensB = normAmended.match(/(\s+|\S+)/g) || [];

  const n = tokensA.length;
  const m = tokensB.length;

  // DP table for LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const wordA = tokensA[i - 1].toLowerCase();
    for (let j = 1; j <= m; j++) {
      const wordB = tokensB[j - 1].toLowerCase();
      if (wordA === wordB) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to construct tokens
  let i = n;
  let j = m;
  const rawDiff: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensA[i - 1].toLowerCase() === tokensB[j - 1].toLowerCase()) {
      rawDiff.push({ value: tokensB[j - 1], type: "unchanged" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({ value: tokensB[j - 1], type: "added" });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({ value: tokensA[i - 1], type: "removed" });
      i--;
    }
  }

  rawDiff.reverse();

  // Unified consolidated diff
  const unifiedTokens = consolidateTokens(rawDiff);

  // Side-by-side tokens
  const originalTokensRaw: DiffToken[] = [];
  const amendedTokensRaw: DiffToken[] = [];

  rawDiff.forEach((tok) => {
    if (tok.type === "removed") {
      originalTokensRaw.push(tok);
    } else if (tok.type === "added") {
      amendedTokensRaw.push(tok);
    } else {
      originalTokensRaw.push(tok);
      amendedTokensRaw.push(tok);
    }
  });

  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  rawDiff.forEach((t) => {
    if (t.value.trim().length > 0) {
      if (t.type === "added") addedCount++;
      else if (t.type === "removed") removedCount++;
      else unchangedCount++;
    }
  });

  const totalWords = unchangedCount + removedCount;
  const percentRetained = totalWords > 0 ? Math.round((unchangedCount / totalWords) * 100) : 0;

  return {
    tokens: unifiedTokens,
    originalTokens: consolidateTokens(originalTokensRaw),
    amendedTokens: consolidateTokens(amendedTokensRaw),
    stats: {
      addedCount,
      removedCount,
      unchangedCount,
      percentRetained,
    },
  };
}
