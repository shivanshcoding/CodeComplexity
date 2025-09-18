document.addEventListener('DOMContentLoaded', function() {
  const noAnalysisElement = document.getElementById('no-analysis');
  const loadingElement = document.getElementById('loading');
  const resultsElement = document.getElementById('results');
  const errorElement = document.getElementById('error-message');
  const copyButton = document.getElementById('copy-button');
  const backButton = document.getElementById('back-button');
  
  // Check if we have analysis results in storage
  chrome.storage.local.get(['analysisResults', 'codeSnippet'], function(data) {
    if (data.analysisResults && data.codeSnippet) {
      displayDetailedResults(data.analysisResults, data.codeSnippet);
    } else {
      noAnalysisElement.classList.remove('hidden');
    }
  });
  
  // Copy analysis to clipboard
  copyButton.addEventListener('click', function() {
    chrome.storage.local.get(['analysisResults', 'codeSnippet'], function(data) {
      if (data.analysisResults) {
        const analysisText = `
Code Analysis:
--------------
Time Complexity: ${data.analysisResults.time_complexity}
Space Complexity: ${data.analysisResults.space_complexity}

Improvements:
${data.analysisResults.improvements.map(imp => `- ${imp}`).join('\n')}

Explanation:
${data.analysisResults.explanation}

Code Snippet:
${data.codeSnippet}
        `;
        
        navigator.clipboard.writeText(analysisText).then(function() {
          copyButton.textContent = 'Copied!';
          setTimeout(function() {
            copyButton.textContent = 'Copy Analysis';
          }, 2000);
        });
      }
    });
  });
  
  // Back button functionality
  backButton.addEventListener('click', function() {
    window.close();
  });
  
  function displayDetailedResults(results, codeSnippet) {
    // Hide loading and no-analysis elements
    loadingElement.classList.add('hidden');
    noAnalysisElement.classList.add('hidden');
    errorElement.classList.add('hidden');
    
    // Display complexity information
    document.getElementById('time-complexity').textContent = results.time_complexity;
    document.getElementById('space-complexity').textContent = results.space_complexity;
    
    // Set complexity badges
    setComplexityBadge('time-complexity-badge', results.time_complexity);
    setComplexityBadge('space-complexity-badge', results.space_complexity);
    
    // Display code with line numbers
    displayCodeWithLineNumbers(codeSnippet);
    
    // Display improvements
    const improvementsElement = document.getElementById('improvements');
    improvementsElement.innerHTML = '';
    results.improvements.forEach(function(improvement) {
      const li = document.createElement('li');
      li.textContent = improvement;
      improvementsElement.appendChild(li);
    });
    
    // Display detailed explanation
    const explanationElement = document.getElementById('explanation');
    explanationElement.textContent = results.explanation;
    
    // Format explanation paragraphs
    const formattedExplanation = results.explanation.split('\n').map(para => {
      if (para.trim() === '') return '<br>';
      return `<p>${para}</p>`;
    }).join('');
    
    explanationElement.innerHTML = formattedExplanation;
    
    // Show results container
    resultsElement.classList.remove('hidden');
  }
  
  function displayCodeWithLineNumbers(codeSnippet) {
    const codeContainer = document.getElementById('code-with-line-numbers');
    codeContainer.innerHTML = '';
    
    // Detect language (simplified version)
    let language = 'javascript'; // Default
    if (codeSnippet.includes('def ') || codeSnippet.includes('import ') && codeSnippet.includes(':')) {
      language = 'python';
    } else if (codeSnippet.includes('public class ') || codeSnippet.includes('public static void')) {
      language = 'java';
    } else if (codeSnippet.includes('#include') || codeSnippet.includes('int main(')) {
      language = 'cpp';
    }
    
    // Create pre and code elements for Prism.js
    const preElement = document.createElement('pre');
    const codeElement = document.createElement('code');
    codeElement.className = `language-${language}`;
    
    // Split code into lines
    const lines = codeSnippet.split('\n');
    
    // Create line number and content for each line
    lines.forEach((line, index) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'code-line';
      
      const lineNumber = document.createElement('span');
      lineNumber.className = 'line-number';
      lineNumber.textContent = (index + 1).toString();
      
      const lineContent = document.createElement('span');
      lineContent.className = 'line-content';
      lineContent.textContent = line;
      
      lineDiv.appendChild(lineNumber);
      lineDiv.appendChild(lineContent);
      
      // Highlight lines with potential issues or important parts
      // This is a simplified example - in a real implementation, you would
      // analyze the code or use information from the AI response
      if (line.includes('for') || line.includes('while')) {
        lineDiv.classList.add('highlighted');
      }
      
      codeElement.appendChild(lineDiv);
    });
    
    preElement.appendChild(codeElement);
    codeContainer.appendChild(preElement);
    
    // Apply Prism.js highlighting
    Prism.highlightElement(codeElement);
  }
  
  function setComplexityBadge(elementId, complexity) {
    const badge = document.getElementById(elementId);
    
    // Clear any existing classes
    badge.className = 'complexity-badge';
    
    // Determine badge class based on complexity
    if (complexity.includes('O(1)') || complexity.includes('O(log n)')) {
      badge.classList.add('good');
      badge.textContent = 'Good';
    } else if (complexity.includes('O(n)') || complexity.includes('O(n log n)')) {
      badge.classList.add('moderate');
      badge.textContent = 'Moderate';
    } else {
      badge.classList.add('poor');
      badge.textContent = 'Could be improved';
    }
  }
});