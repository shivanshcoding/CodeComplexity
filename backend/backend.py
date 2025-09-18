from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import json
import os
from dotenv import load_dotenv
import logging
from system_prompt import SYSTEM_PROMPT

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="CodeComplexity API")

# Add CORS middleware to allow requests from Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get API key from environment variable
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY not found in environment variables. API calls will fail.")

# Groq API endpoint
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Request model
class CodeRequest(BaseModel):
    code: str

# Response model for successful analysis
class AnalysisResponse(BaseModel):
    time_complexity: str
    space_complexity: str
    improvements: list[str]
    explanation: str

# Fallback response in case of AI parsing errors
FALLBACK_RESPONSE = {
    "time_complexity": "Unable to determine",
    "space_complexity": "Unable to determine",
    "improvements": ["Unable to analyze code"],
    "explanation": "The system encountered an error while analyzing your code. Please try again with a clearer code snippet."
}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_code(request: CodeRequest):
    """
    Analyze code snippet and return complexity information
    """
    if not request.code or len(request.code.strip()) == 0:
        raise HTTPException(status_code=400, detail="Code snippet cannot be empty")
    
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    try:
        # Prepare the request to Groq API
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Ensure payload exactly matches OpenAI Chat Completions API format
        payload = {
            "model": "mixtral-8x7b-32768",  # Using exact model name from Groq
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Analyze this code:\n\n```\n{request.code}\n```"}
            ],
            "temperature": 0.2,
            "max_tokens": 1000
        }
        
        # Make request to Groq API
        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info(f"Sending request to Groq API with payload structure: {list(payload.keys())}")
            try:
                response = await client.post(GROQ_API_URL, headers=headers, json=payload)
                response.raise_for_status()  # This will raise an exception for HTTP error responses
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error: {e}")
                logger.error(f"Response content: {e.response.text}")
                raise HTTPException(status_code=500, detail=f"Error from Groq API: {e.response.text}")
            
            # Parse the response
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]
            
            # Try to extract JSON from the response
            try:
                # Find JSON in the response (in case there's text before or after)
                json_start = ai_response.find("{")
                json_end = ai_response.rfind("}") + 1
                
                if json_start >= 0 and json_end > json_start:
                    json_str = ai_response[json_start:json_end]
                    analysis = json.loads(json_str)
                    
                    # Validate that all required fields are present
                    required_fields = ["time_complexity", "space_complexity", "improvements", "explanation"]
                    if all(field in analysis for field in required_fields):
                        return analysis
                
                # If we couldn't parse valid JSON or missing fields, use fallback
                logger.warning("Failed to parse valid JSON from AI response")
                return FALLBACK_RESPONSE
                
            except json.JSONDecodeError:
                logger.error("JSON decode error from AI response")
                return FALLBACK_RESPONSE
                
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error: {e}")
        raise HTTPException(status_code=500, detail=f"API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend:app", host="0.0.0.0", port=5000, reload=True)