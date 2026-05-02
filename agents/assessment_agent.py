import json
import re
from agents.base_agent import BaseAgent
from orchestrator.state import GraphState
from services.llm_service import LLMService
from langchain_core.messages import HumanMessage, SystemMessage

class AssessmentAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.llm_service = LLMService()

    def run(self, state: GraphState) -> GraphState:
        """
        The node function for LangGraph. 
        Generates a comprehensive quiz for the current module.
        """
        stages = state.curriculum_plan.get("learning_stages", [])
        if not stages or state.current_module_index >= len(stages):
            return state

        current_stage = stages[state.current_module_index]
        stage_name = current_stage.get("stage_name", f"Phase {current_stage.get('stage')}")
        lecture_content = state.tutor_session.get("lecture", "") if state.tutor_session else ""
        
        quiz_data = self.generate_comprehensive_quiz(stage_name, lecture_content)
        
        # Store in current_quiz_batch for the interactive assessment flow
        state.current_quiz_batch = quiz_data.get("questions", [])
        state.current_quiz_index = 0
        state.quiz_results = []
        
        if state.current_quiz_batch:
            state.active_quiz = state.current_quiz_batch[0]
            
        return state

    def generate_comprehensive_quiz(self, stage_name: str, lesson_content: str):
        """
        Generates a balanced quiz covering the entire module content.
        Includes MCQ, Multi-select, and Fill-in-the-blanks.
        """
        system_prompt = f"""
        You are a Psychometric Assessment Expert.
        Module: {stage_name}
        
        TASK:
        Generate a 10-question comprehensive quiz based ONLY on the provided lesson content.
        
        DISTRIBUTION:
        - 4 Multiple Choice Questions (MCQ) - Single correct answer.
        - 3 Multi-select Questions - Multiple correct answers.
        - 3 Fill-in-the-blanks - Testing key terminology or syntax.
        
        OUTPUT FORMAT:
        You MUST return a JSON object with this exact structure:
        {{
          "questions": [
            {{
              "id": 1,
              "type": "mcq",
              "question": "...",
              "options": ["A", "B", "C", "D"],
              "answer": 0 // Index of correct option
            }},
            {{
              "id": 5,
              "type": "multi-select",
              "question": "...",
              "options": ["A", "B", "C", "D"],
              "answer": [0, 2] // Indices of all correct options
            }},
            {{
              "id": 8,
              "type": "fill-in-the-blank",
              "question": "...",
              "answer": "correct string"
            }}
          ]
        }}
        
        Strict JSON only. No other text. Avoid exclamation marks.
        """

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Lesson Content:\n{lesson_content}")
        ]

        response = self.llm_service.generate(messages)
        cleaned_content = self._strip_markdown_wrappers(response.content)
        return json.loads(cleaned_content)

    def generate_batch_quiz(self, topic: str, content: str):
        """
        Alias for generate_comprehensive_quiz used in some routes.
        Returns the data in a structure expected by the API.
        """
        quiz_dict = self.generate_comprehensive_quiz(topic, content)
        # Wrap in a namespace that matches the Pydantic schema if needed
        from types import SimpleNamespace
        return SimpleNamespace(questions=quiz_dict["questions"])

    def evaluate_answer(self, question: str, correct_answer: any, user_answer: any, q_type: str) -> dict:
        """
        Evaluates a single quiz answer based on its type.
        """
        is_correct = False
        feedback = ""
        
        if q_type == "mcq":
            is_correct = int(user_answer) == int(correct_answer)
            feedback = "Correct!" if is_correct else f"Incorrect. The correct answer was option {correct_answer}."
        elif q_type == "multi-select":
            is_correct = set(user_answer) == set(correct_answer)
            feedback = "Correct!" if is_correct else "Incorrect. You missed some correct options."
        elif q_type == "fill-in-the-blank":
            is_correct = self.evaluate_semantic_answer(question, str(correct_answer), str(user_answer))
            feedback = "Correct!" if is_correct else f"Incorrect. The expected answer was: {correct_answer}"
            
        return {"is_correct": is_correct, "feedback": feedback}

    def evaluate_semantic_answer(self, question: str, correct_answer: str, user_answer: str) -> bool:
        """
        Uses LLM to check if the user's fill-in-the-blank answer is semantically correct.
        """
        prompt = f"""
        Question: {question}
        Target Correct Answer: {correct_answer}
        User's Answer: {user_answer}
        
        Is the User's Answer semantically identical or technically correct compared to the target?
        Allow for minor typos or capitalization differences.
        Return ONLY 'True' or 'False'.
        """
        
        response = self.llm_service.generate([HumanMessage(content=prompt)])
        return "true" in response.content.strip().lower()

    def _strip_markdown_wrappers(self, text: str) -> str:
        text = re.sub(r'^```(?:json)?\s*', '', text.strip(), flags=re.MULTILINE)
        text = re.sub(r'\s*```$', '', text.strip(), flags=re.MULTILINE)
        return text.strip()
