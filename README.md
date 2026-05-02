# Autonomous AI Tutor for Enterprise Upskilling

A multi-agent AI tutoring system that delivers personalized, role-based learning using LangGraph orchestration and Retrieval-Augmented Generation (RAG). The system analyzes learner profiles, identifies skill gaps, generates adaptive curricula, and continuously improves learning through feedback-driven assessment.

---

## Features

- Multi-Agent Architecture (LangGraph)
- Skill Gap Analysis & Prioritization
- Adaptive Curriculum Generation (Foundation → Core → Advanced)
- RAG-based Content Delivery (Vector Search + Context Retrieval)
- Dynamic Assessment (Quiz + Coding)
- Clickstream + Performance Analytics
- Feedback-driven Adaptive Learning Loop
- Enterprise Role Alignment (Industry Skill Mapping)

---

## System Architecture

The system follows a closed-loop learning pipeline:

User → Profiling → Skill Mapping → Skill Gap → Curriculum → Tutor → Assessment → Feedback → Adaptation

Core Components:
- Orchestrator (LangGraph Controller)
- User Profiling Agent
- Enterprise Skill Agent
- Skill Gap Agent
- Curriculum Planner Agent
- Tutor Agent
- Assessment Agent
- Analytics Agent

---

## Learning Loop

Assess → Plan → Teach → Evaluate → Adapt

- If score ≥ threshold → Move to next topic
- Else → Remediation + adaptive teaching

---

## Core Algorithms

### Skill Gap Analysis

For each skill s in RequiredSkills:
    If s not in LearnerSkills:
        mark as CRITICAL
    Else if mastery(s) < threshold:
        mark as SECONDARY

Priority = Importance × GapSeverity

---

### Learning Path Generation

- Group skills into:
  - Foundation
  - Core
  - Advanced
- Order based on:
  - Prerequisites
  - Priority

---

### Adaptive Learning Loop

While not completed:
    Teach(topic)
    score = Assess()

    If score ≥ threshold:
        move to next topic
    Else:
        re-teach with adaptation

---

## RAG Pipeline

- Query Embedding
- Vector Search (ChromaDB)
- Top-K Retrieval
- Context Injection into LLM
- Response Generation

Benefits:
- Reduced hallucination
- Improved content relevance
- Context-aware explanations

---

## Tech Stack

Backend:
- Python
- FastAPI
- LangGraph
- LangChain

AI / ML:
- OpenAI / Gemini
- Embeddings
- RAG

Data Layer:
- ChromaDB (Vector Database)
- SQL Database (Session, Analytics, Metadata)

Frontend:
- React (Vite)
- Tailwind CSS

---

## Evaluation Metrics

- Skill Mapping Accuracy
- Learning Performance Score
- Content Relevance Score
- Hallucination Reduction

---


## Setup Instructions

1. Clone the repo
git clone [https://github.com/your-username/autonomous-ai-tutor](https://github.com/Ajay2k4/Autonomous-AI-Tutor-for-Enterprise-Upskilling).git
cd autonomous-ai-tutor

2. Install dependencies
pip install -r requirements.txt

3. Set environment variables
OPENAI_API_KEY=your_key
GOOGLE_API_KEY=your_key

4. Run backend
uvicorn main:app --reload

5. Run frontend
cd frontend
npm install
npm run dev

---

## Use Cases

- Enterprise Upskilling Platforms
- Interview Preparation Systems
- Personalized Learning Platforms
- EdTech AI Assistants

---

## Future Improvements

- Reinforcement Learning for Difficulty Adaptation
- Multimodal Learning (Video + Audio)
- Real-time Job Market Integration
- Distributed Deployment

---
