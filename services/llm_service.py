from config import LLM_PROVIDER
from services.providers.gemini_provider import GeminiProvider

# later:
# from services.providers.openai_provider import OpenAIProvider


class LLMService:
    def __init__(self):
        if LLM_PROVIDER == "gemini":
            self.provider = GeminiProvider()
        else:
            raise ValueError("Unsupported LLM provider")

    def generate(self, messages):
        return self.provider.generate(messages)

    def generate_structured(self, messages, output_schema):
        return self.provider.generate_structured(messages, output_schema)