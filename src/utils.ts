import { TFile, TFolder } from "obsidian";
import { wildcardMatch } from "wildcard-match";

export function checkPathFilter(pattern: string, file: TFile | TFolder): boolean {
  if (!pattern) return false;
  
  // Handle negation patterns
  const isNegation = pattern.startsWith("!");
  const actualPattern = isNegation ? pattern.slice(1) : pattern;
  
  // Check if the file/folder matches the pattern
  const matches = wildcardMatch(actualPattern)(file.path);
  
  // Return opposite for negation patterns
  return isNegation ? !matches : matches;
}

export function parseIgnoreFile(content: string): string[] {
  return content
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#")); // Remove empty lines and comments
}

export function shouldIgnoreFile(file: TFile | TFolder, ignorePatterns: string[]): boolean {
  return ignorePatterns.some(pattern => checkPathFilter(pattern, file));
} 