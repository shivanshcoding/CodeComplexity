# CodeComplexity

A Chrome extension with a FastAPI backend that analyzes code snippets for time and space complexity using the Groq API.

## Project Structure

```
CodeComplexity/
├── extension/                 # Chrome extension files
│   ├── manifest.json          # Extension manifest
│   ├── popup.html             # Popup UI
│   ├── popup.js               # Popup functionality
│   ├── content.js             # Content script for capturing selected code
│   ├── background.js          # Background script for API communication
│   ├── fullpage.html          # Full page analysis view
│   ├── fullpage.js            # Full page functionality
│   ├── styles.css             # Styling for the extension
│   └── images/                # Extension icons
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── backend/                   # FastAPI backend
│   ├── backend.py             # Main FastAPI server
│   ├── system_prompt.py       # AI system prompt
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables (create this file)
└── README.md                  # This file
```

## Installation

### Prerequisites

- Python 3.8 or higher
- Node.js and npm (for extension development)
- Chrome browser
- Groq API key (sign up at https://console.groq.com/)

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```
     source venv/bin/activate
     ```

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Create a `.env` file in the backend directory with your Groq API key:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

### Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked" and select the `extension` directory from this project
4. The CodeComplexity extension should now be installed and visible in your extensions list

## Usage

1. Start the backend server:
   ```
   cd backend
   python backend.py
   ```
   The server will run at http://localhost:5000

2. Browse to a website with code snippets (like LeetCode, GeeksforGeeks, HackerRank)
3. Select a code snippet on the page
4. Right-click and select "Analyze Selected Code" from the context menu
5. Click on the CodeComplexity extension icon to view the analysis results
6. For a more detailed view, click "View Full Analysis" in the popup

## Deployment Options

### Backend Deployment

#### Local Development
- Run the backend locally as described in the setup instructions
- Ensure port 5000 is accessible

#### Cloud Deployment

**Render**
1. Sign up for a Render account at https://render.com
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure the service:
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && uvicorn backend:app --host 0.0.0.0 --port $PORT`
5. Add the environment variable `GROQ_API_KEY`

**Heroku**
1. Sign up for a Heroku account at https://heroku.com
2. Install the Heroku CLI and log in
3. Create a new Heroku app:
   ```
   heroku create codecomplexity-backend
   ```
4. Set the Groq API key:
   ```
   heroku config:set GROQ_API_KEY=your_groq_api_key_here
   ```
5. Deploy the app:
   ```
   git push heroku main
   ```

### Extension Deployment

For personal use, the "Load unpacked" method described in the setup is sufficient.

For distribution:
1. Create a `.zip` file of the extension directory
2. Upload to the Chrome Web Store Developer Dashboard
3. Follow the Chrome Web Store publishing process

## Testing Strategy

### Backend Testing
- Unit tests for the FastAPI endpoints using `pytest`
- Integration tests for the Groq API communication
- Error handling tests for various edge cases

### Extension Testing
- Manual testing on different websites with code snippets
- Test with various programming languages (JavaScript, Python, Java, C++)
- Test error handling when backend is unavailable
- Test with large code snippets to ensure proper handling

## Troubleshooting

- **CORS Issues**: If you encounter CORS errors, ensure the backend CORS middleware is properly configured
- **API Key Issues**: Verify your Groq API key is correctly set in the `.env` file
- **Extension Not Working**: Check the browser console for errors and ensure the backend server is running

## Future Enhancements

- Support for more programming languages
- Line-by-line analysis of code
- Performance optimization suggestions with code examples
- Integration with more coding platforms
- User accounts to save analysis history
