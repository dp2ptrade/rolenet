// diagnostic_tool.js
const fs = require('fs');
const path = require('path');

// Function to recursively search for JSX files in a directory
function findJSXFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(findJSXFiles(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

// Function to check for potential text nodes in JSX files
function checkForTextNodes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let inJSX = false;
  let potentialIssues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('<') && !line.includes('/>') && !line.includes('</')) {
      inJSX = true;
    } else if (line.includes('</') || line.includes('/>')) {
      inJSX = false;
    } else if (inJSX && line.length > 0 && !line.startsWith('<') && !line.startsWith('{') && !line.startsWith('}') && !line.startsWith('//')) {
      potentialIssues.push({
        file: filePath,
        line: i + 1,
        content: line
      });
    }
  }

  return potentialIssues;
}

// Main function to run the diagnostic
function runDiagnostic() {
  console.log('Starting diagnostic for React Native JSX text node issues in discover.tsx...');
  const filePath = path.join(__dirname, '../app/(tabs)/discover.tsx');
  let totalIssues = 0;

  if (fs.existsSync(filePath)) {
    const issues = checkForTextNodes(filePath);
    if (issues.length > 0) {
      console.log(`\nPotential issues in ${filePath}:`);
      issues.forEach(issue => {
        console.log(`  Line ${issue.line}: ${issue.content}`);
        totalIssues++;
      });
    }
  } else {
    console.log(`File not found: ${filePath}`);
  }

  if (totalIssues === 0) {
    console.log('No potential text node issues found in JSX files.');
  } else {
    console.log(`\nTotal potential issues found: ${totalIssues}`);
    console.log('Note: Not all reported lines may be actual issues. Review each one to confirm if it\'s a text node causing an error.');
  }
}

// Execute the diagnostic
runDiagnostic();
