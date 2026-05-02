import json
import re
from services.llm_service import LLMService

class TutorGenerationService:
    def __init__(self):
        self.llm_service = LLMService()

    def generate_lesson_and_quiz(self, target_role: str, skill: str, topic: str):
        """
        Generates a structured lesson and a 5-question MCQ quiz for a specific topic.
        """
        system_prompt = f"""You are an expert tutor specializing in {skill}. 
Your target audience is an aspiring {target_role}.
Your task is to teach the specific topic: "{topic}".

INSTRUCTIONS:
1. Provide a comprehensive, engaging lesson in Markdown format. Use headings, bullet points, and bold text for clarity.
2. Create a 5-question multiple-choice quiz based strictly on the lesson content provided.
3. Each quiz question must have exactly 4 options.
4. You MUST return the output in strict JSON format matching the schema below. 
5. Do not include any text outside of the JSON object.

REQUIRED JSON SCHEMA:
{{
  "lessonText": "The full markdown formatted lesson content...",
  "quiz": [
    {{
      "question": "The question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact string matching the correct option from the options list"
    }}
  ]
}}

Ensure the quiz array contains exactly 5 unique questions."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate a lesson and quiz for the topic '{topic}' within the skill '{skill}' for a {target_role} path."}
        ]

        try:
            # Call the LLM
            raw_response = self.llm_service.generate(messages)
            content = raw_response.content if hasattr(raw_response, 'content') else str(raw_response)

            # Logic to strip markdown code block wrappers (e.g., ```json ... ```)
            cleaned_content = self._strip_markdown_wrappers(content)

            # Parse string into Python dictionary
            data = json.loads(cleaned_content)
            return data

        except Exception as e:
            print(f"Error in TutorGenerationService: {e}")
            # Fallback error structure
            return {
                "lessonText": f"Error generating lesson for {topic}. Please try again later.",
                "quiz": []
            }

    def _strip_markdown_wrappers(self, text: str) -> str:
        """
        Removes ```json and ``` wrappers if present.
        """
        # Remove starting ```json or ```
        text = re.sub(r'^```(?:json)?\s*', '', text.strip(), flags=re.MULTILINE)
        # Remove ending ```
        text = re.sub(r'\s*```$', '', text.strip(), flags=re.MULTILINE)
        return text.strip()

# Create a singleton instance
tutor_gen_service = TutorGenerationService()
