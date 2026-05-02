import json
import os
from difflib import get_close_matches
from typing import Dict


class RoleNotFoundError(Exception):
    pass


from utils.logger import logger

class OntologyService:
    def __init__(self, ontology_path: str = "data/skill_ontology.json"):
        if not os.path.exists(ontology_path):
            raise FileNotFoundError(f"Ontology file not found at {ontology_path}")

        with open(ontology_path, "r", encoding="utf-8") as f:
            self.ontology = json.load(f)

        # Precompute normalized role mapping
        self.normalized_roles = {
            role.strip().lower(): role for role in self.ontology.keys()
        }
        logger.info(f"Ontology loaded with {len(self.normalized_roles)} roles: {list(self.normalized_roles.values())}")

    def get_role_skills(self, role_name: str) -> Dict:
        role_input = role_name.strip().lower()

        # 1️⃣ Exact normalized match
        if role_input in self.normalized_roles:
            actual_role = self.normalized_roles[role_input]
            logger.info(f"Exact match found for role: {actual_role}")
            return self.ontology[actual_role]["skills"]

        # 2️⃣ Fuzzy matching
        possible_matches = get_close_matches(
            role_input,
            self.normalized_roles.keys(),
            n=1,
            cutoff=0.4  # Lower cutoff to be more flexible, but exact match takes precedence
        )

        if possible_matches:
            matched_normalized = possible_matches[0]
            actual_role = self.normalized_roles[matched_normalized]
            logger.info(f"Fuzzy match found: '{role_name}' -> '{actual_role}'")
            return self.ontology[actual_role]["skills"]

        # 3️⃣ No match found
        raise RoleNotFoundError(
            f"Role '{role_name}' not found in ontology."
        )