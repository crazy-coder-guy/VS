import fs from 'fs/promises';
import path from 'path';
import { tools } from './tools.js';

async function testReplaceContent() {
  const testFilePath = path.join(process.cwd(), 'test-file.txt');
  const initialContent = `// This is a comment
function hello() {
  console.log("Hello, world!"); // Another comment
}
/* Multi-line
   comment */
`;
  
  try {
    // 1. Create test file
    await fs.writeFile(testFilePath, initialContent, 'utf8');
    console.log('Created test file.');

    const replaceTool = tools.find(t => t.name === 'replace_content');
    
    // 2. Test single line replacement (removing a comment)
    console.log('\nTesting single line replacement...');
    const result1 = await replaceTool.execute({
      path: testFilePath,
      search: '// This is a comment\n',
      replace: ''
    }, process.cwd());
    console.log('Result:', result1);

    // 3. Test multi-line block replacement (removing multi-line comment)
    console.log('\nTesting multi-line replacement...');
    const result2 = await replaceTool.execute({
      path: testFilePath,
      search: '/* Multi-line\n   comment */\n',
      replace: ''
    }, process.cwd());
    console.log('Result:', result2);

    // 4. Verify final content
    const finalContent = await fs.readFile(testFilePath, 'utf8');
    console.log('\nFinal Content:');
    console.log(finalContent);

    // Clean up
    await fs.unlink(testFilePath);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testReplaceContent();
