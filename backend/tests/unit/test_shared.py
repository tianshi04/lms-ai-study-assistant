from src.shared.domain.base import Entity, ValueObject


class DummyValueObject(ValueObject):
    def __init__(self, value: str, number: int) -> None:
        object.__setattr__(self, "value", value)
        object.__setattr__(self, "number", number)


class DummyEntity(Entity):
    def __init__(self, id: str, value: str) -> None:
        super().__init__(id)
        self.value = value


def test_value_object_equality():
    vo1 = DummyValueObject("test", 123)
    vo2 = DummyValueObject("test", 123)
    vo3 = DummyValueObject("different", 123)
    vo4 = DummyValueObject("test", 456)

    assert vo1 == vo2
    assert vo1 != vo3
    assert vo1 != vo4


def test_entity_equality():
    entity1 = DummyEntity("id-1", "value-A")
    entity2 = DummyEntity("id-1", "value-B")  # Same ID, different value
    entity3 = DummyEntity("id-2", "value-A")  # Different ID, same value

    assert entity1 == entity2
    assert entity1 != entity3
    assert hash(entity1) == hash(entity2)
    assert hash(entity1) != hash(entity3)


def test_role_helpers_exact_match():
    from src.shared.auth import CurrentUserContext

    admin_user = CurrentUserContext(id="admin", role="USER_ROLE_ADMIN")
    instructor_user = CurrentUserContext(id="inst", role="USER_ROLE_INSTRUCTOR")
    learner_user = CurrentUserContext(id="user", role="USER_ROLE_LEARNER")

    assert admin_user.role == "USER_ROLE_ADMIN"
    assert instructor_user.role == "USER_ROLE_INSTRUCTOR"
    assert learner_user.role == "USER_ROLE_LEARNER"


def test_health_endpoint():
    from starlette.testclient import TestClient

    from src.main import app

    client = TestClient(app)
    for path in ("/health", "/healthz"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
