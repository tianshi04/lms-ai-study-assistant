from src.modules.greet.domain.greeting import Greeting

class GreetUseCase:
    """Application Service coordinating the greeting flow."""
    
    async def execute(self, name: str) -> str:
        # Create the domain entity
        greeting_entity = Greeting(name)
        
        # Invoke business rule
        message = greeting_entity.format_greeting()
        
        return message
