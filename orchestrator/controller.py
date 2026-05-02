from orchestrator.graph import create_graph
from orchestrator.state import GraphState, UserInput


graph = create_graph()


def run_graph(user_input: UserInput, user_id: str):
    initial_state = GraphState(user_input=user_input, user_id=user_id)
    # Using thread_id for LangGraph checkpointer / state persistence
    config = {"configurable": {"thread_id": user_id}}
    result = graph.invoke(initial_state, config=config)
    return result
