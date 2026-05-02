import time
from services.knowledge_service import KnowledgeService
from orchestrator.state import GraphState
from agents.tutor_agent import TutorAgent
import os

# Ensure env vars are set if needed
# os.environ["GOOGLE_API_KEY"] = "..."

def test_timing():
    ks = KnowledgeService()
    
    print("Testing load_vector_store timing...")
    start = time.time()
    v1 = ks.load_vector_store()
    print(f"1st load: {time.time() - start:.2f}s")
    
    start = time.time()
    v2 = ks.load_vector_store()
    print(f"2nd load: {time.time() - start:.2f}s")
    
    print("\nTesting retrieve_context timing...")
    start = time.time()
    context, docs = ks.retrieve_context("Python basics")
    print(f"Retrieval: {time.time() - start:.2f}s")
    
    print("\nTesting evaluate_retrieval (LLM call) timing...")
    start = time.time()
    ks.evaluate_retrieval("Python basics", docs)
    print(f"LLM Grading: {time.time() - start:.2f}s")

if __name__ == "__main__":
    test_timing()
