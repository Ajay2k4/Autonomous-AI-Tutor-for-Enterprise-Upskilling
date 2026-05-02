ASSESSMENT_GENERATION_PROMPT = """
You are a Lead Enterprise Examiner. Based on the provided lesson content, generate a comprehensive batch of at least 10 assessment questions to verify the user's technical mastery.

Lesson Topic: {topic}
Lesson Content: {content}

Instructions for the Batch:
- Generate a minimum of 10 questions.
- Include a diverse mix of the following types:
    1. 'mcq': Standard multiple-choice question with one correct answer.
    2. 'multi_select': Multiple-choice question where the user must select all applicable correct options.
    3. 'predict_output': A code snippet or architectural scenario where the user must predict the outcome, formatted as a multiple-choice question.

For EACH question:
- Ensure it matches the technical depth required for an enterprise professional.
- Provide 4 options (A, B, C, D).
- Specify the 'question_type'.
- Provide the 'correct_option' (e.g., 'A' for mcq, 'A, C' for multi_select).
- Provide a brief, professional explanation of the correct choice.

Ensure the final output is a valid BatchQuiz structure. Do not use exclamation marks.
"""

ASSESSMENT_EVALUATION_PROMPT = """
You are a Senior Technical Mentor evaluating a student's assessment response.

Question: {question}
Correct Answer: {correct_answer}
Student's Answer: {user_answer}

Provide professional, encouraging feedback on the student's performance. 
If the answer is incorrect, clarify the underlying concept or architectural principle without using exclamation marks.
"""
