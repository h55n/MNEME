/**
 * Splits a migration file into single statements for the runner.
 * Comment lines are removed before splitting, so a semicolon inside a comment cannot cut
 * a statement in half. Semicolons inside $$ ... $$ bodies are kept.
 */
export function splitStatements(sqlContent: string): string[] {
  const withoutComments = sqlContent
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements: string[] = [];
  let current = '';
  let inDollar = false;
  for (let i = 0; i < withoutComments.length; i++) {
    if (withoutComments.startsWith('$$', i)) {
      inDollar = !inDollar;
      current += '$$';
      i++;
      continue;
    }
    const ch = withoutComments[i];
    if (ch === ';' && !inDollar) {
      if (current.trim()) statements.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}
