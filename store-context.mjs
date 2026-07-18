import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Loading app context from README.md...');
  const readmePath = path.join(process.cwd(), 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  
  // Extract the top section of the README to capture the essence of MNEME
  const lines = readmeContent.split('\n');
  const contextLines = lines.slice(0, 130).join('\n');

  console.log('Context extracted. Sending to MNEME API via fetch...');

  // Using fetch directly to the Next.js app or the Mock server
  // Since we don't have the real DB running, we'll hit our mock server on port 4000
  const response = await fetch('http://localhost:4000/v1/vaults/vlt_123/memories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mnk_live_abc',
      'X-Operator-Public-Key': '0x123'
    },
    body: JSON.stringify({
      content: contextLines,
      type: 'semantic',
      tags: ['mneme', 'architecture', 'documentation'],
      importance: 0.99
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to store memory: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('\n✅ Successfully stored MNEME application context into the Vault!');
  console.log(data);
}

main().catch(console.error);
