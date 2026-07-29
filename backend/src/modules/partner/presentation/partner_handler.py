from connectrpc.request import RequestContext

from src.gen.partner.v1 import partner_pb as pb
from src.gen.partner.v1.partner_connect import PartnerService
from src.modules.partner.application.partner_usecase import PartnerUseCase
from src.modules.partner.domain.entities import Partner
from src.shared.auth import get_current_user


def _to_pb_partner(partner: Partner) -> pb.Partner:
    return pb.Partner(
        id=partner.id,
        name=partner.name,
        slug=partner.slug,
        description=partner.description,
        logo_url=partner.logo_url,
        banner_url=partner.banner_url,
        website_url=partner.website_url,
        allowed_domains=partner.allowed_domains,
        signature_image_url=partner.signature_image_url,
        signer_name=partner.signer_name,
        signer_title=partner.signer_title,
        public_key_pem=partner.public_key_pem,
        created_at=partner.created_at,
        updated_at=partner.updated_at,
        historical_public_keys=partner.historical_public_keys,
    )


class PartnerHandler(PartnerService):
    def __init__(self, use_case: PartnerUseCase) -> None:
        self._use_case = use_case

    async def create_partner(
        self,
        request: pb.CreatePartnerRequest,
        ctx: RequestContext[pb.CreatePartnerRequest, pb.CreatePartnerResponse],
    ) -> pb.CreatePartnerResponse:
        current_user = get_current_user()
        partner = await self._use_case.create_partner(
            name=request.name,
            slug=request.slug,
            description=request.description,
            logo_url=request.logo_url,
            banner_url=request.banner_url,
            website_url=request.website_url,
            allowed_domains=list(request.allowed_domains),
            signature_image_url=request.signature_image_url,
            signer_name=request.signer_name,
            signer_title=request.signer_title,
            public_key_pem=request.public_key_pem,
            current_user=current_user,
        )
        return pb.CreatePartnerResponse(partner=_to_pb_partner(partner))

    async def update_partner(
        self,
        request: pb.UpdatePartnerRequest,
        ctx: RequestContext[pb.UpdatePartnerRequest, pb.UpdatePartnerResponse],
    ) -> pb.UpdatePartnerResponse:
        current_user = get_current_user()
        partner = await self._use_case.update_partner(
            partner_id=request.id,
            name=request.name if request.name else None,
            slug=request.slug if request.slug else None,
            description=request.description if request.description else None,
            logo_url=request.logo_url if request.logo_url else None,
            banner_url=request.banner_url if request.banner_url else None,
            website_url=request.website_url if request.website_url else None,
            allowed_domains=list(request.allowed_domains)
            if request.allowed_domains
            else None,
            signature_image_url=request.signature_image_url
            if request.signature_image_url
            else None,
            signer_name=request.signer_name if request.signer_name else None,
            signer_title=request.signer_title if request.signer_title else None,
            public_key_pem=request.public_key_pem if request.public_key_pem else None,
            current_user=current_user,
        )
        return pb.UpdatePartnerResponse(partner=_to_pb_partner(partner))

    async def get_partner(
        self,
        request: pb.GetPartnerRequest,
        ctx: RequestContext[pb.GetPartnerRequest, pb.GetPartnerResponse],
    ) -> pb.GetPartnerResponse:
        partner = await self._use_case.get_partner(partner_id=request.id)
        return pb.GetPartnerResponse(partner=_to_pb_partner(partner))

    async def list_partners(
        self,
        request: pb.ListPartnersRequest,
        ctx: RequestContext[pb.ListPartnersRequest, pb.ListPartnersResponse],
    ) -> pb.ListPartnersResponse:
        partners = await self._use_case.list_partners()
        return pb.ListPartnersResponse(partners=[_to_pb_partner(p) for p in partners])

    async def delete_partner(
        self,
        request: pb.DeletePartnerRequest,
        ctx: RequestContext[pb.DeletePartnerRequest, pb.DeletePartnerResponse],
    ) -> pb.DeletePartnerResponse:
        current_user = get_current_user()
        success = await self._use_case.delete_partner(
            partner_id=request.id, current_user=current_user
        )
        return pb.DeletePartnerResponse(success=success)

    async def rotate_partner_key_pair(
        self,
        request: pb.RotatePartnerKeyPairRequest,
        ctx: RequestContext[
            pb.RotatePartnerKeyPairRequest, pb.RotatePartnerKeyPairResponse
        ],
    ) -> pb.RotatePartnerKeyPairResponse:
        current_user = get_current_user()
        new_pem = await self._use_case.rotate_key_pair(
            partner_id=request.partner_id, current_user=current_user
        )
        return pb.RotatePartnerKeyPairResponse(public_key_pem=new_pem)
