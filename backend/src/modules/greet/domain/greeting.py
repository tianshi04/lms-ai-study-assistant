from src.shared.domain.base import Entity


class Greeting(Entity):
    def __init__(self, name: str) -> None:
        super().__init__(id=name)
        self.name = name

    def format_greeting(self) -> str:
        """Business rule for greeting formatting."""
        if not self.name:
            return "Hello, World!"
        return f"Hello, {self.name}!"
