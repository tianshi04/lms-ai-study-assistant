import logging

from src.modules.assessment.domain import (
    LabSubmittedDomainEvent,
    PeerAssignmentGradedDomainEvent,
    QuizSubmittedDomainEvent,
)
from src.modules.certificate.application import CertificateUseCase
from src.modules.learning.application.learning_usecase import LearningUseCase
from src.shared.infrastructure.event_bus import EventBus

logger = logging.getLogger(__name__)


async def handle_peer_assignment_graded(
    event: PeerAssignmentGradedDomainEvent,
) -> None:
    """Handles PeerAssignmentGradedDomainEvent: updates student learning progress

    and automatically triggers OpenBadges 2.0 certificate issuance if 100% complete.
    """
    if event.is_draft:
        logger.debug(
            "Ignored draft grade event for user %s on item %s",
            event.user_id,
            event.item_id,
        )
        return

    if not event.passed:
        logger.debug(
            "User %s did not pass peer assignment %s (Score: %s)",
            event.user_id,
            event.item_id,
            event.final_score,
        )
        return

    if not event.course_id or not event.item_id:
        logger.warning(
            "Cannot update learning progress: missing course_id or item_id in event for user %s",
            event.user_id,
        )
        return

    try:
        learning_uc = LearningUseCase()
        success, progress = await learning_uc.mark_item_complete(
            user_id=event.user_id,
            course_id=event.course_id,
            item_id=event.item_id,
        )
        if success:
            logger.info(
                "Updated learning progress for user %s in course %s: %.2f%%",
                event.user_id,
                event.course_id,
                progress.overall_progress_percent,
            )
            if progress.overall_progress_percent >= 100.0:
                logger.info(
                    "User %s reached 100%% in course %s. Triggering automatic certificate issuance...",
                    event.user_id,
                    event.course_id,
                )
                cert_uc = CertificateUseCase()
                cert, err = await cert_uc.get_verified_certificate(
                    user_id=event.user_id,
                    course_id=event.course_id,
                )
                if cert:
                    logger.info(
                        "Successfully issued certificate %s for user %s in course %s",
                        cert.certificate_id,
                        event.user_id,
                        event.course_id,
                    )
                elif err:
                    logger.warning(
                        "Certificate auto-issue pending for user %s in course %s: %s",
                        event.user_id,
                        event.course_id,
                        err,
                    )
    except Exception:
        logger.exception(
            "Error handling PeerAssignmentGradedDomainEvent for user %s",
            event.user_id,
        )


async def handle_quiz_submitted_progress(event: QuizSubmittedDomainEvent) -> None:
    """Updates learning progress when a student passes a quiz."""
    if not event.passed or not event.course_id or not event.item_id:
        return

    try:
        learning_uc = LearningUseCase()
        success, progress = await learning_uc.mark_item_complete(
            user_id=event.user_id,
            course_id=event.course_id,
            item_id=event.item_id,
        )
        if success and progress.overall_progress_percent >= 100.0:
            cert_uc = CertificateUseCase()
            await cert_uc.get_verified_certificate(
                user_id=event.user_id,
                course_id=event.course_id,
            )
    except Exception:
        logger.exception(
            "Error handling QuizSubmittedDomainEvent progress for user %s",
            event.user_id,
        )


async def handle_lab_submitted_progress(event: LabSubmittedDomainEvent) -> None:
    """Updates learning progress when a student passes an auto-graded lab."""
    if not event.passed or not event.course_id or not event.item_id:
        return

    try:
        learning_uc = LearningUseCase()
        success, progress = await learning_uc.mark_item_complete(
            user_id=event.user_id,
            course_id=event.course_id,
            item_id=event.item_id,
        )
        if success and progress.overall_progress_percent >= 100.0:
            cert_uc = CertificateUseCase()
            await cert_uc.get_verified_certificate(
                user_id=event.user_id,
                course_id=event.course_id,
            )
    except Exception:
        logger.exception(
            "Error handling LabSubmittedDomainEvent progress for user %s",
            event.user_id,
        )


def register_learning_event_handlers() -> None:
    """Registers EventBus subscribers for Learning progress & certificate automation."""
    EventBus.subscribe(PeerAssignmentGradedDomainEvent, handle_peer_assignment_graded)
    EventBus.subscribe(QuizSubmittedDomainEvent, handle_quiz_submitted_progress)
    EventBus.subscribe(LabSubmittedDomainEvent, handle_lab_submitted_progress)
    logger.info("Registered Learning EventBus event handlers successfully.")
