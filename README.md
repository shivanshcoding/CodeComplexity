# CodeComplexity 🔍

**CodeComplexity** is a Chrome extension + backend service that lets you analyze code snippets directly from websites like **LeetCode, Codeforces, etc.**  
With a simple right-click → *Analyze Selected Code*, the extension sends the code to the backend, which uses **Groq’s LLM API** to provide detailed analysis and complexity insights.

---

## ✨ Features

- 📌 Right-click any selected code → *Analyze Selected Code*  
- 🔗 Works on coding platforms like **LeetCode**  
- 🤖 Powered by **Groq API** (`mixtral-8x7b-32768`)  
- 📊 Provides complexity analysis and explanations in a popup  
- ⚡ Fast, lightweight, and easy to use  

---

## 🛠️ Tech Stack

- **Frontend (Extension)**  
  - Chrome Extension (Manifest V3)  
  - Context Menu API  
  - Prism.js for syntax highlighting  

- **Backend**  
  - Python 3.9+  
  - FastAPI + Uvicorn  
  - Groq LLM API  

---

## 📂 Project Structure
```tex
CodeComplexity/
│── extension/              # Chrome Extension files
│   ├── manifest.json       # Extension manifest configuration
│   ├── background.js       # Handles context menu & API calls
│   ├── popup.html          # UI for analysis results
│   ├── popup.js            # Frontend logic for popup
│   └── libs/prism/         # Syntax highlighting library
│
│── backend/                # Backend service (FastAPI)
│   ├── backend.py          # FastAPI server handling analysis
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Example environment variables
│   └── ...
│
└── README.md               # Project documentation
```

---

## ⚙️ Installation

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/CodeComplexity.git
cd CodeComplexity
```

--- 

### 2. Backend Setup
#### 1. Go to backend directory:


```bash
cd backend
```

#### 2. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate   # Mac/Linux
venv\Scripts\activate      # Windows
```
#### 3. Install dependencies:

```bash
Copy code
pip install -r requirements.txt
```
#### 4. Copy .env.example → .env and add your Groq API Key:

```ini
Copy code
GROQ_API_KEY=your_api_key_here
```

#### 5. Start the server:

```bash
uvicorn backend:app --reload --port 5000
```
---

## 3. Chrome Extension Setup

1. Open Chrome → `chrome://extensions/`  
2. Enable **Developer Mode** (top-right).  
3. Click **Load unpacked** and select the `extension/` folder.  
4. You should now see the extension installed.  

---

## 🚀 Usage

1. Open **LeetCode** or any coding platform.  
2. Select the code you want to analyze.  
3. Right-click → *Analyze Selected Code*.  
4. A popup will show the complexity analysis.  

---

## 🔑 Environment Variables

The backend requires the following environment variable in `.env`:
```ini
GROQ_API_KEY=your_api_key_here
```
You can get your API key from [Groq Console](https://console.groq.com/).  
---

## 🐛 Troubleshooting

- **Context menu not showing**  
  Make sure the extension is reloaded in `chrome://extensions` after changes.  

- **500 Internal Server Error**  
  Check backend logs. Common issues:  
  - Missing or invalid `GROQ_API_KEY`  
  - Wrong model name (use `mixtral-8x7b-32768` or another supported model)  

- **CORS issues**  
  Ensure your backend allows requests from the extension.  

---

## 📜 License

MIT License © 2025 Shivansh Rana