"""Modular database seeders organized by bounded context."""

from src.scripts.seeds.catalog import (
    build_categories,
    build_sample_catalog,
    seed_catalog_and_reviews,
)
from src.scripts.seeds.commerce_and_community import seed_commerce_and_community
from src.scripts.seeds.identity_and_partners import seed_identity_and_partners
from src.scripts.seeds.learning_and_assessments import seed_learning_and_assessments

__all__ = [
    "build_categories",
    "build_sample_catalog",
    "seed_catalog_and_reviews",
    "seed_commerce_and_community",
    "seed_identity_and_partners",
    "seed_learning_and_assessments",
]
