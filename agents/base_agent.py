from abc import ABC, abstractmethod
from orchestrator.state import GraphState


class BaseAgent(ABC):

    @abstractmethod
    def run(self, state: GraphState) -> GraphState:
        pass