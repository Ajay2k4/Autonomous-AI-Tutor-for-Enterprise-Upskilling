import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

LLM_PROVIDER = "gemini"
GEMINI_MODEL = "gemini-2.5-flash-lite"
TEMPERATURE = 0.2