from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True)
class ValueObject:
    """Base class for Value Objects in DDD."""
    
    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, self.__class__):
            return False
        return self.__dict__ == other.__dict__


class Entity:
    """Base class for Entities in DDD."""
    
    def __init__(self, id: Any) -> None:
        self.id = id

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, self.__class__):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)
