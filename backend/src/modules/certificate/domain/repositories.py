from abc import ABC, abstractmethod
from typing import Optional

from src.modules.certificate.domain.entities import (
    FinancialAidApplication,
    VerifiedCertificate,
)


class ICertificateRepository(ABC):
    """Abstract Domain Repository Interface for Certificate and Financial Aid contexts."""

    @abstractmethod
    async def get_financial_aid(
        self, user_id: str, course_id: str
    ) -> Optional[FinancialAidApplication]:
        pass

    @abstractmethod
    async def list_financial_aids_by_user(
        self, user_id: str, course_id: str = ""
    ) -> list[FinancialAidApplication]:
        pass

    @abstractmethod
    async def list_financial_aids(
        self, course_id: Optional[str] = None, status: Optional[str] = None
    ) -> list[FinancialAidApplication]:
        pass

    @abstractmethod
    async def get_financial_aid_by_id(
        self, application_id: str
    ) -> Optional[FinancialAidApplication]:
        pass

    @abstractmethod
    async def save_financial_aid(
        self, app: FinancialAidApplication
    ) -> FinancialAidApplication:
        pass

    @abstractmethod
    async def get_certificate(
        self, user_id: str, course_id: str
    ) -> Optional[VerifiedCertificate]:
        pass

    @abstractmethod
    async def get_certificate_by_id(
        self, certificate_id: str
    ) -> Optional[VerifiedCertificate]:
        pass

    @abstractmethod
    async def save_certificate(self, cert: VerifiedCertificate) -> VerifiedCertificate:
        pass

    @abstractmethod
    async def get_certificates_by_user(self, user_id: str) -> list[VerifiedCertificate]:
        pass

    @abstractmethod
    async def get_course_details_by_id_or_slug(
        self, course_id_or_slug: str
    ) -> tuple[str, str, str, str]:
        pass

    @abstractmethod
    async def get_user_kyc_info(self, user_id: str) -> tuple[str, str, bool]:
        pass

    @abstractmethod
    async def get_learning_progress_percent(
        self, user_id: str, course_id: str
    ) -> float:
        pass

    @abstractmethod
    async def check_graded_items_and_appeals_eligibility(
        self, user_id: str, course_id: str
    ) -> tuple[bool, str]:
        pass

    @abstractmethod
    async def get_specialization_details(
        self, specialization_id: str
    ) -> tuple[Optional[str], Optional[str], Optional[str], list[str]]:
        pass

    @abstractmethod
    async def get_course_signer_info(
        self, course_id_or_slug: str
    ) -> tuple[str, str, str]:
        pass

    @abstractmethod
    async def is_financial_aid_enabled(self, course_id_or_slug: str) -> bool:
        pass
