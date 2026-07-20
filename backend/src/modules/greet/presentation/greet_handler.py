from connectrpc.request import RequestContext

from src.gen.greet.v1.greet_connect import GreetService
from src.gen.greet.v1.greet_pb import GreetRequest, GreetResponse
from src.modules.greet.application.greet_usecase import GreetUseCase


class GreetHandler(GreetService):
    """Presentation layer handler mapping ConnectRPC requests to Application Use Cases."""

    def __init__(self, use_case: GreetUseCase) -> None:
        self._use_case = use_case

    async def greet(
        self, request: GreetRequest, ctx: RequestContext[GreetRequest, GreetResponse]
    ) -> GreetResponse:
        print("Request headers: ", ctx.request_headers)

        # Invoke Use Case
        message = await self._use_case.execute(request.name)

        response = GreetResponse(greeting=message)
        ctx.response_headers["greet-version"] = "v1"
        return response
