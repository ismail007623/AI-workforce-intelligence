"""Authentication endpoints: signup, login, refresh, logout and me.

All responses use the project envelope
``{"data": ..., "message": ..., "status": "success" | "error"}``.
Auth failures use generic messages so login responses never reveal
whether an email exists or which credential was wrong.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.auth_deps import JWTBearer, get_current_user, require_hr_or_admin
from backend.app.core.database import get_db
from backend.app.core.logger import get_logger
from backend.app.models.user import User
from backend.app.schemas.auth import (
    AuthData,
    AuthUserResponse,
    CompanySignupRequest,
    InvitationAcceptRequest,
    InvitationCreatedResponse,
    InvitationCreateRequest,
    InvitationResponse,
    LoginRequest,
    RefreshRequest,
    SignupRequest,
)
from backend.app.services import auth_service

logger = get_logger(__name__)

auth_router = APIRouter(prefix="/auth", tags=["auth"])
router = auth_router


def _error_response(message: str, status_code: int) -> JSONResponse:
    """Build an error-envelope JSON response.

    Args:
        message: The generic, user-facing error message.
        status_code: The HTTP status code.

    Returns:
        A JSONResponse with the project error envelope.
    """
    return JSONResponse(
        content={"message": message, "data": None, "status": "error"},
        status_code=status_code,
    )


@auth_router.post("/company-signup")
async def company_signup(
    request: Request,
    payload: CompanySignupRequest,
    session: AsyncSession = Depends(get_db),
):
    try:
        result: AuthData = await auth_service.company_signup(session, payload)
        await session.commit()
        return JSONResponse(
            content={
                "data": result.model_dump(mode="json"),
                "message": "Company created successfully!",
                "status": "success",
            },
            status_code=status.HTTP_201_CREATED,
        )
    except HTTPException as exc:
        logger.error(f"Error while signing up company: {exc.detail}")
        return _error_response(str(exc.detail), exc.status_code)
    except Exception as e:
        logger.error(f"Error while signing up company: {e}")
        return _error_response(
            "Failed to create company. Please try again.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@auth_router.post("/signup")
async def signup(
    request: Request,
    payload: SignupRequest,
    session: AsyncSession = Depends(get_db),
):
    try:
        result: AuthData = await auth_service.signup_user(session, payload)
        await session.commit()
        return JSONResponse(
            content={
                "data": result.model_dump(mode="json"),
                "message": "Account created successfully!",
                "status": "success",
            },
            status_code=status.HTTP_201_CREATED,
        )
    except HTTPException as exc:
        logger.error(f"Error while signing up: {exc.detail}")
        return _error_response(str(exc.detail), exc.status_code)
    except Exception as e:
        logger.error(f"Error while signing up: {e}")
        return _error_response(
            "Failed to create account. Please try again.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@auth_router.post("/invitations")
async def create_invitation(
    request: Request,
    payload: InvitationCreateRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    try:
        result: InvitationCreatedResponse = await auth_service.create_invitation(
            session, current_user, payload
        )
        await session.commit()
        return JSONResponse(
            content={
                "data": result.model_dump(mode="json"),
                "message": "Invitation created successfully! Share the token once; it will not be shown again.",
                "status": "success",
            },
            status_code=status.HTTP_201_CREATED,
        )
    except HTTPException as exc:
        logger.error(f"Error while creating invitation: {exc.detail}")
        return _error_response(str(exc.detail), exc.status_code)
    except Exception as e:
        logger.error(f"Error while creating invitation: {e}")
        return _error_response(
            "Failed to create invitation. Please try again.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@auth_router.get("/invitations")
async def list_invitations(
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    try:
        result: list[InvitationResponse] = await auth_service.list_invitations(
            session, current_user
        )
        return JSONResponse(
            content={
                "data": [item.model_dump(mode="json") for item in result],
                "message": "Response Generated Successfully!",
                "status": "success",
            },
            status_code=status.HTTP_200_OK,
        )
    except HTTPException as exc:
        logger.error(f"Error while listing invitations: {exc.detail}")
        return _error_response(str(exc.detail), exc.status_code)
    except Exception as e:
        logger.error(f"Error while listing invitations: {e}")
        return _error_response(
            "Failed to list invitations. Please try again.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@auth_router.post("/invitations/accept")
async def accept_invitation(
    request: Request,
    payload: InvitationAcceptRequest,
    session: AsyncSession = Depends(get_db),
):
    try:
        result: AuthData = await auth_service.accept_invitation(session, payload)
        await session.commit()
        return JSONResponse(
            content={
                "data": result.model_dump(mode="json"),
                "message": "Invitation accepted successfully!",
                "status": "success",
            },
            status_code=status.HTTP_201_CREATED,
        )
    except HTTPException as exc:
        logger.error(f"Error while accepting invitation: {exc.detail}")
        return _error_response(str(exc.detail), exc.status_code)
    except Exception as e:
        logger.error(f"Error while accepting invitation: {e}")
        return _error_response(
            "Failed to accept invitation. Please try again.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@auth_router.post("/login")
async def login(
    request: Request,
    payload: LoginRequest,
    session: AsyncSession = Depends(get_db),
):
    try:
        result: AuthData = await auth_service.authenticate_user(session, payload)
        await session.commit()
        return JSONResponse(
            content={
                "data": result.model_dump(mode="json"),
                "message": "Signed in successfully!",
                "status": "success",
            },
            status_code=status.HTTP_200_OK,
        )
    except HTTPException as exc:
        logger.error(f"Error while signing in: {exc.detail}")
        return _error_response(str(exc.detail), exc.status_code)
    except Exception as e:
        logger.error(f"Error while signing in: {e}")
        return _error_response(
            "Failed to sign in. Please try again.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@auth_router.post("/refresh")
async def refresh(
    request: Request,
    payload: RefreshRequest,
    session: AsyncSession = Depends(get_db),
):
    try:
        result: AuthData = await auth_service.refresh_tokens(
            session, payload.refresh_token
        )
        await session.commit()
        return JSONResponse(
            content={
                "data": result.model_dump(mode="json"),
                "message": "Response Generated Successfully!",
                "status": "success",
            },
            status_code=status.HTTP_200_OK,
        )
    except HTTPException as exc:
        logger.error(f"Error while refreshing tokens: {exc.detail}")
        return _error_response(str(exc.detail), exc.status_code)
    except Exception as e:
        logger.error(f"Error while refreshing tokens: {e}")
        return _error_response(
            "Failed to refresh session. Please sign in again.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@auth_router.post("/logout", dependencies=[Depends(JWTBearer())])
async def logout(
    request: Request,
    payload: RefreshRequest | None = None,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        if payload is not None and payload.refresh_token:
            await auth_service.revoke_refresh_token(session, payload.refresh_token)
            await session.commit()
        logger.info("User logged out successfully for user_id=%s.", current_user.id)
        return JSONResponse(
            content={
                "data": {"user_id": current_user.id},
                "message": "Signed out successfully!",
                "status": "success",
            },
            status_code=status.HTTP_200_OK,
        )
    except HTTPException as exc:
        logger.error(f"Error while signing out: {exc.detail}")
        return _error_response(str(exc.detail), exc.status_code)
    except Exception as e:
        logger.error(f"Error while signing out: {e}")
        return _error_response(
            "Failed to sign out. Please try again.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@auth_router.get("/me", dependencies=[Depends(JWTBearer())])
async def me(
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        profile: AuthUserResponse = await auth_service.get_user_profile(
            session, current_user.id
        )
        return JSONResponse(
            content={
                "data": profile.model_dump(mode="json"),
                "message": "Response Generated Successfully!",
                "status": "success",
            },
            status_code=status.HTTP_200_OK,
        )
    except HTTPException as exc:
        logger.error(f"Error while loading profile: {exc.detail}")
        return _error_response(str(exc.detail), exc.status_code)
    except Exception as e:
        logger.error(f"Error while loading profile: {e}")
        return _error_response(
            "Failed to load profile. Please try again.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
