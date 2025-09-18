document.addEventListener('DOMContentLoaded', function() {
  const noAnalysisElement = document.getElementById('no-analysis');
  const loadingElement = document.getElementById('loading');
  const resultsElement = document.getElementById('results');
  const errorElement = document.getElementById('error-message');
  const copyButton = document.getElementById('copy-button');
  const viewFullButton = document.getElementById('view-full-button');
  
  // Check if we have analysis results in storage
  chrome.storage.local.get(['analysisResults', 'codeSnippet'], function(data) {
    if (data.analysisResults && data.codeSnippet) {
      displayResults(data.analysisResults, data.codeSnippet);
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
  
  // Open full analysis page
  viewFullButton.addEventListener('click', function() {
    chrome.tabs.create({url: 'fullpage.html'});
  });
  
  function displayResults(results, codeSnippet) {
    // Hide loading and no-analysis elements
    loadingElement.classList.add('hidden');
    noAnalysisElement.classList.add('hidden');
    errorElement.classList.add('hidden');
    
    // Display results
    document.getElementById('time-complexity').textContent = results.time_complexity;
    document.getElementById('space-complexity').textContent = results.space_complexity;
    
    // Set code snippet with syntax highlighting
    const codeElement = document.getElementById('code-snippet');
    codeElement.textContent = codeSnippet;
    
    // Detect language (simplified version)
    let language = 'javascript'; // Default
    if (codeSnippet.includes('def ') || codeSnippet.includes('import ') && codeSnippet.includes(':')) {
      language = 'python';
    } else if (codeSnippet.includes('public class ') || codeSnippet.includes('public static void')) {
      language = 'java';
    } else if (codeSnippet.includes('#include') || codeSnippet.includes('int main(')) {
      language = 'cpp';
    }
    
    codeElement.className = `language-${language}`;
    Prism.highlightElement(codeElement);
    
    // Display improvements
    const improvementsElement = document.getElementById('improvements');
    improvementsElement.innerHTML = '';
    results.improvements.forEach(function(improvement) {
      const li = document.createElement('li');
      li.textContent = improvement;
      improvementsElement.appendChild(li);
    });
    
    // Display explanation
    document.getElementById('explanation').textContent = results.explanation;
    
    // Show results container
    resultsElement.classList.remove('hidden');
  }
});