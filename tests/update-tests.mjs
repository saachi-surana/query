// update-tests.mjs
// Reads test-tracker.json, runs git log to find new commits,
// outputs a summary of what changed so the agent knows what to update

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const trackerPath = join(__dirname, 'test-tracker.json');

function main() {
  // Read tracker
  let tracker;
  try {
    tracker = JSON.parse(readFileSync(trackerPath, 'utf-8'));
  } catch (err) {
    console.error('Failed to read test-tracker.json:', err.message);
    process.exit(1);
  }

  const lastCommit = tracker.last_tested_commit;

  if (!lastCommit) {
    console.log('No previous test commit recorded. All commits are new.\n');
    try {
      const allLogs = execSync('git log --oneline -20', { encoding: 'utf-8' });
      console.log('Recent commits:');
      console.log(allLogs);
    } catch (err) {
      console.error('Failed to run git log:', err.message);
    }
    return;
  }

  console.log(`Last tested commit: ${lastCommit}\n`);

  // Get current HEAD
  let head;
  try {
    head = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch (err) {
    console.error('Failed to get HEAD:', err.message);
    process.exit(1);
  }

  if (head === lastCommit) {
    console.log('No new commits since last test run.');
    return;
  }

  console.log(`Current HEAD: ${head}\n`);
  console.log('=== New commits since last test ===\n');

  try {
    const logs = execSync(`git log ${lastCommit}..HEAD --oneline --stat`, { encoding: 'utf-8' });
    console.log(logs);
  } catch (err) {
    console.error('Failed to run git log:', err.message);
    console.log('\nFalling back to recent commits:');
    const fallback = execSync('git log --oneline -10', { encoding: 'utf-8' });
    console.log(fallback);
  }

  console.log('\n=== Files changed ===\n');

  try {
    const files = execSync(`git diff ${lastCommit}..HEAD --name-only`, { encoding: 'utf-8' });
    console.log(files);
  } catch (err) {
    console.error('Failed to get changed files:', err.message);
  }

  console.log('\n=== Summary ===');
  console.log(`Commits since last test: check output above`);
  console.log(`Last tested: ${tracker.last_updated || 'never'}`);
  console.log(`Test version: ${tracker.test_version}`);
}

main();
