from dataclasses import dataclass
from enum import Enum
from typing import Optional


class UserRole(str, Enum):
    UNSPECIFIED = "USER_ROLE_UNSPECIFIED"
    LEARNER = "USER_ROLE_LEARNER"
    INSTRUCTOR = "USER_ROLE_INSTRUCTOR"
    TA = "USER_ROLE_TA"
    SUPER_ADMIN = "USER_ROLE_SUPER_ADMIN"
    PARTNER_ADMIN = "USER_ROLE_PARTNER_ADMIN"


@dataclass
class User:
    id: str
    email: str
    full_name: str
    role: UserRole
    avatar_url: str = ""
    enterprise_seat_key: Optional[str] = None
    seat_assigned_at: Optional[str] = None
    password_hash: str = ""
    is_identity_verified: bool = False
