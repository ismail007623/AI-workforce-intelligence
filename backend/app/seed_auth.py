"""Seed one HR account from environment variables only.

Run from the repository root after the database tables exist::

    python -m backend.app.seed_auth

Required environment variables (never commit them)::

    AWI_SEED_HR_EMAIL, AWI_SEED_HR_PASSWORD, AWI_SEED_HR_NAME

The password is never logged. When the variables are missing, or the
account already exists, the script prints a message and exits without
changing anything.

The seeded HR user is assigned to the first organization, or to a
newly created "Default Organization" when none exists. This is only
a bootstrap for existing single-company databases; the normal way to
create an admin account is company signup (POST /auth/company-signup).
"""

import asyncio
import os

from sqlalchemy import select

from backend.app.core.database import async_session_factory
from backend.app.core.logger import get_logger
from backend.app.core.security import hash_password
from backend.app.models.organization import Organization, generate_pinecone_namespace
from backend.app.models.user import User, UserRole

logger = get_logger(__name__)


async def get_or_create_default_organization(session) -> Organization:
    """Return the first organization, creating a default one if needed.

    Args:
        session: The database session.

    Returns:
        The first organization ordered by id, or a newly created
        "Default Organization" (Asia/Karachi, 10:00-19:00, 15 min
        grace) when no organization exists yet.
    """
    result = await session.execute(
        select(Organization).order_by(Organization.id).limit(1)
    )
    organization = result.scalar_one_or_none()
    if organization is not None:
        return organization
    organization = Organization(
        name="Default Organization",
        timezone="Asia/Karachi",
        work_start="10:00",
        work_end="19:00",
        grace_minutes=15,
        pinecone_namespace=generate_pinecone_namespace(),
    )
    session.add(organization)
    await session.flush()
    logger.info(
        "Default organization created successfully for org_id=%s.",
        organization.id,
    )
    return organization


async def seed_hr_user() -> int:
    """Create the seed HR user when env vars are set and it is absent.

    Returns:
        0 when the account exists or was created, 1 when the
        required environment variables are missing.
    """
    email = os.environ.get("AWI_SEED_HR_EMAIL", "").strip().lower()
    password = os.environ.get("AWI_SEED_HR_PASSWORD", "")
    name = os.environ.get("AWI_SEED_HR_NAME", "").strip()
    if not email or not password or not name:
        print(
            "AWI_SEED_HR_EMAIL, AWI_SEED_HR_PASSWORD and AWI_SEED_HR_NAME "
            "must all be set in the environment. Nothing was created."
        )
        return 1
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none() is not None:
            print(f"Seed HR account already exists for email: {email}")
            return 0
        organization = await get_or_create_default_organization(session)
        session.add(
            User(
                name=name,
                email=email,
                hashed_password=hash_password(password),
                role=UserRole.hr,
                employee_id=None,
                org_id=organization.id,
                is_active=True,
            )
        )
        await session.commit()
        logger.info("Seed HR account created successfully for email: %s.", email)
        print(f"Seed HR account created for email: {email}")
        return 0


def main() -> int:
    """Run the seed and return its exit code.

    Returns:
        The exit code from :func:`seed_hr_user`.
    """
    return asyncio.run(seed_hr_user())


if __name__ == "__main__":
    raise SystemExit(main())
