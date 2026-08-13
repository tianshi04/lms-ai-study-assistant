from abc import ABC, abstractmethod

from src.modules.partner.domain.entities import Partner


class IPartnerRepository(ABC):
    @abstractmethod
    async def create(self, partner: Partner) -> Partner:
        pass

    @abstractmethod
    async def update(self, partner: Partner) -> Partner:
        pass

    @abstractmethod
    async def get_by_id(self, partner_id: str) -> Partner | None:
        pass

    @abstractmethod
    async def get_by_slug(self, slug: str) -> Partner | None:
        pass

    @abstractmethod
    async def list_all(self) -> list[Partner]:
        pass

    @abstractmethod
    async def delete(self, partner_id: str) -> bool:
        pass
