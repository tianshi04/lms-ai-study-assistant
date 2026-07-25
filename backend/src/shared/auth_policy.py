"""Centralized Auth Policy Registry powered by Protobuf Custom Method Options (auth.v1.policy)."""

import importlib
import pkgutil
from typing import Optional

from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.gen.auth.v1 import options_pb
from src.shared.auth import CurrentUser


class AuthPolicyRegistry:
    """Discovers and caches AuthPolicy for all ConnectRPC method paths dynamically from Protobuf stubs."""

    _policy_map: dict[str, options_pb.AuthPolicy] = {}
    _initialized: bool = False

    @classmethod
    def _initialize(cls) -> None:
        if cls._initialized:
            return

        import src.gen as gen_pkg

        gen_modules = []
        for _, module_name, _ in pkgutil.walk_packages(
            gen_pkg.__path__, prefix="src.gen."
        ):
            if module_name.endswith("_pb"):
                try:
                    mod = importlib.import_module(module_name)
                    gen_modules.append(mod)
                except Exception:
                    pass

        for mod in gen_modules:
            if not hasattr(mod, "desc"):
                continue

            desc_file = mod.desc()
            proto_file = desc_file.proto
            package = getattr(proto_file, "package", "")

            for service in getattr(desc_file, "services", []):
                service_name = service.name
                for method in getattr(service, "methods", []):
                    method_name = method.name
                    path = (
                        f"/{package}.{service_name}/{method_name}"
                        if package
                        else f"/{service_name}/{method_name}"
                    )

                    policy_val = options_pb.AuthPolicy.UNSPECIFIED
                    options = (
                        method.proto.options
                        if hasattr(method, "proto") and method.proto.options
                        else None
                    )
                    if options is not None:
                        try:
                            val = options[options_pb.ext_policy]
                            if val is not None:
                                policy_val = val
                        except (KeyError, Exception):
                            policy_val = options_pb.AuthPolicy.UNSPECIFIED

                    cls._policy_map[path] = policy_val

        cls._initialized = True

    @classmethod
    def get_policy(cls, method_path: str) -> options_pb.AuthPolicy:
        cls._initialize()
        return cls._policy_map.get(method_path, options_pb.AuthPolicy.UNSPECIFIED)

    @classmethod
    def is_public(cls, method_path: str) -> bool:
        policy = cls.get_policy(method_path)
        return policy == options_pb.AuthPolicy.PUBLIC

    @classmethod
    def authorize(cls, method_path: str, user: Optional[CurrentUser]) -> None:
        policy = cls.get_policy(method_path)

        if policy == options_pb.AuthPolicy.PUBLIC:
            return

        if not user or not user.id:
            raise ConnectError(
                Code.UNAUTHENTICATED, "Vui lòng đăng nhập để thực hiện thao tác này"
            )

        if policy == options_pb.AuthPolicy.ADMIN:
            if not user.is_staff():
                raise ConnectError(
                    Code.PERMISSION_DENIED,
                    "Bạn không có quyền thực hiện thao tác quản trị này",
                )
