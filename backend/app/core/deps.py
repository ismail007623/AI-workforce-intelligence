from fastapi import Header, HTTPException, status


def require_hr_role(x_awi_role: str = Header(default="", alias="X-AWI-Role")) -> None:
    if x_awi_role != "hr":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR access required.",
        )
