from src.gen.greet.v1.greet_connect import GreetServiceASGIApplication
from src.modules.greet.application.greet_usecase import GreetUseCase
from src.modules.greet.presentation.greet_handler import GreetHandler

# 1. Dependency Injection (Bootstrapping)
# Create use case and inject it into the handler
greet_usecase = GreetUseCase()
greet_handler = GreetHandler(use_case=greet_usecase)

# 2. Expose the ASGI Application
# In a modular monolith, you can mount this application under `/greet.v1.GreetService`
# using an ASGI router or dispatcher if you add more modules/services later.
app = GreetServiceASGIApplication(greet_handler)
