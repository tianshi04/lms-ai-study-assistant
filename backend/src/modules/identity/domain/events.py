from dataclasses import dataclass

from src.shared.domain.events import DomainEvent


@dataclass
class InstructorApplicationReviewedDomainEvent(DomainEvent):
    application_id: str = ""
    user_id: str = ""
    is_approved: bool = False
    status: str = ""
    reviewer_notes: str = ""


@dataclass
class InvitationSentDomainEvent(DomainEvent):
    invitation_id: str = ""
    email: str = ""
    organization_id: str = ""
    role: str = ""
    invited_by: str = ""
    invitee_id: str = ""
    target_name: str = ""
    inviter_name: str = ""
    raw_token: str = ""
    actor_avatar_url: str = ""


@dataclass
class UserRegisteredDomainEvent(DomainEvent):
    user_id: str = ""
    email: str = ""
    full_name: str = ""


@dataclass
class EnterpriseSeatAssignedDomainEvent(DomainEvent):
    user_id: str = ""
    partner_name: str = ""
    seat_key: str = ""
