from .constants import MAX_PARTNER_NAME_LENGTH, MAX_PARTNER_SLUG_LENGTH
from .entities import Partner
from .repositories import IPartnerRepository

__all__ = [
    "MAX_PARTNER_NAME_LENGTH",
    "MAX_PARTNER_SLUG_LENGTH",
    "IPartnerRepository",
    "Partner",
]
