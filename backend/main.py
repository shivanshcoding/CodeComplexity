import os
import asyncio
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger = logging.getLogger("codecomplexity")

app = FastAPI(title="CodeComplexity Backend", version="0.2.0")

# CORS for development: allow all origins so the extension can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """
You are a precise code complexity analyst. Produce ONLY the following Markdown sections with no extra text, chit-chat, or pre/post disclaimers. Do not include code fences around headings. Follow this exact structure and headings exactly:

# Code Complexity Analysis

## 💡 Intuition & Approach
Provide a concise, high-level explanation of the algorithm and any data structures used. 2-5 sentences.

## ⏱️ Time Complexity
State Big-O in terms of N (size of input). Include a brief justification tied to loops/recursion/operations.

## 💾 Space Complexity
State Big-O auxiliary space in terms of N. Include a brief justification about additional data structures/recursion depth.

## 🛠️ Optimizations/Notes
Suggest at least one non-trivial improvement, alternative approach, or highlight meaningful edge cases/trade-offs.
"""

RETRY_PROMPT = (
    "Your previous answer did not strictly follow the required structure. "
    "Output ONLY the 5 sections with EXACT headings and no extra text: \n"
    "# Code Complexity Analysis\n\n"
    "## 💡 Intuition & Approach\n\n"
    "## ⏱️ Time Complexity\n\n"
    "## 💾 Space Complexity\n\n"
    "## 🛠️ Optimizations/Notes"
)

REQUIRED_HEADINGS = [
    "# Code Complexity Analysis",
    "## 💡 Intuition & Approach",
    "## ⏱️ Time Complexity",
    "## 💾 Space Complexity",
    "## 🛠️ Optimizations/Notes",
]


class CodeRequest(BaseModel):
    code: str = Field(..., min_length=1)


class CodeResponse(BaseModel):
    analysis: str


@app.get("/health")
async def health():
    return {"status": "ok"}


async def _groq_complete(client: Groq, system_prompt: str, user_content: str, timeout_s: float = 25.0):
    loop = asyncio.get_running_loop()

    def _call():
        return client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.0,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
        )

    try:
        completion = await asyncio.wait_for(loop.run_in_executor(None, _call), timeout=timeout_s)
        return completion
    except asyncio.TimeoutError as te:
        raise HTTPException(status_code=504, detail="Groq API timeout") from te


def _has_required_sections(text: str) -> bool:
    try:
        return all(h in text for h in REQUIRED_HEADINGS)
    except Exception:
        return False


@app.post("/analyze-code", response_model=CodeResponse)
async def analyze_code(payload: CodeRequest):
    code = (payload.code or "").strip()

    if len(code) < 50:
        raise HTTPException(status_code=400, detail="Provide a code snippet of at least 50 characters")

    # Prevent excessively large payloads
    MAX_LEN = 20000
    if len(code) > MAX_LEN:
        raise HTTPException(status_code=413, detail=f"Code snippet too large (>{MAX_LEN} chars)")

    api_key: Optional[str] = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")

    client = Groq(api_key=api_key)

    # First attempt
    try:
        completion = await _groq_complete(client, SYSTEM_PROMPT, code)
        analysis = completion.choices[0].message.content
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Groq API error on first attempt")
        raise HTTPException(status_code=502, detail=f"Groq API error: {e}")

    # If structure missing, retry once with a stricter instruction
    if not _has_required_sections(analysis or ""):
        try:
            logger.info("Retrying completion with stricter prompt due to missing sections")
            completion2 = await _groq_complete(client, RETRY_PROMPT, code)
            analysis2 = completion2.choices[0].message.content
            if _has_required_sections(analysis2 or ""):
                analysis = analysis2
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Groq API error on retry")
            # Keep original analysis if retry fails

    if not analysis:
        raise HTTPException(status_code=502, detail="Empty response from Groq API")

    return CodeResponse(analysis=analysis)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=5000,
        reload=True,
    )
