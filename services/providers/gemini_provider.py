from langchain_google_genai import ChatGoogleGenerativeAI
from config import GEMINI_MODEL, GOOGLE_API_KEY, TEMPERATURE


class GeminiProvider:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            temperature=TEMPERATURE,
            google_api_key=GOOGLE_API_KEY,
            timeout=60, # 60 seconds timeout
        )

    def generate(self, messages):
        return self.llm.invoke(messages)

    def generate_structured(self, messages, output_schema):
        structured_llm = self.llm.with_structured_output(output_schema)
        return structured_llm.invoke(messages)