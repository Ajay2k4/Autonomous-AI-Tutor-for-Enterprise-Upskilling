from agents.user_profiling_agent import UserProfilingAgent
from agents.enterprise_skill_agent import EnterpriseSkillAgent
from agents.curriculum_planner_agent import CurriculumPlannerAgent
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from orchestrator.state import GraphState
from agents.skill_gap_agent import SkillGapAgent
from agents.tutor_agent import TutorAgent

def create_graph():
    builder = StateGraph(GraphState)

    profiling_agent = UserProfilingAgent()
    enterprise_agent = EnterpriseSkillAgent()
    skill_gap_agent = SkillGapAgent()
    curriculum_agent = CurriculumPlannerAgent()
    tutor_agent = TutorAgent()

    def profiling_node(state: GraphState):
        return profiling_agent.run(state)

    def enterprise_node(state: GraphState):
        return enterprise_agent.run(state)

    def skill_gap_node(state: GraphState):
        return skill_gap_agent.run(state)

    def curriculum_planner_node(state: GraphState):
        return curriculum_agent.run(state)

    def tutor_node(state: GraphState):
        return tutor_agent.run(state)

    builder.add_node("user_profiling", profiling_node)
    builder.add_node("enterprise_skill_mapping", enterprise_node)
    builder.add_node("skill_gap_analysis", skill_gap_node)
    builder.add_node("curriculum_planning", curriculum_planner_node)
    builder.add_node("tutoring", tutor_node)

    builder.set_entry_point("user_profiling")

    builder.add_edge("user_profiling", "enterprise_skill_mapping")
    builder.add_edge("enterprise_skill_mapping", "skill_gap_analysis")
    builder.add_edge("skill_gap_analysis", "curriculum_planning")
    builder.add_edge("curriculum_planning", "tutoring")
    builder.add_edge("tutoring", END)

    # Add checkpointer for state persistence via thread_id
    checkpointer = MemorySaver()
    return builder.compile(checkpointer=checkpointer)
