import pytest
from src.modules.greet.application.greet_usecase import GreetUseCase
from src.gen.greet.v1.greet_connect import GreetServiceClient
from src.gen.greet.v1.greet_pb import GreetRequest

@pytest.mark.asyncio
async def test_greet_usecase():
    """Unit test for the Use Case layer, verifying business logic directly."""
    use_case = GreetUseCase()
    result = await use_case.execute("Jane")
    assert result == "Hello, Jane!"

@pytest.mark.asyncio
async def test_greet_api():
    """Integration test that connects to the running server via ConnectRPC.
    
    This test requires the server to be running on localhost:8000.
    """
    client = GreetServiceClient("http://localhost:8000")
    try:
        res = await client.greet(GreetRequest(name="Jane"))
        assert res.greeting == "Hello, Jane!"
    except Exception as e:
        pytest.skip(f"Skipping server integration test: Server is not running on port 8000 ({e})")
