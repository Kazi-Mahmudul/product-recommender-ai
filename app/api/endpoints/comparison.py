from fastapi import APIRouter, Depends, Response, Cookie
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import comparison as crud_comparison
from app.schemas.comparison import ComparisonSession, ComparisonItem
import uuid
from typing import List

router = APIRouter()

@router.post("/session", response_model=ComparisonSession)
def create_session(response: Response, db: Session = Depends(deps.get_db)):
    session_id = uuid.uuid4()
    session = crud_comparison.create_comparison_session(db, session_id=session_id)
    response.set_cookie(
        key="comparison_session_id",
        value=str(session.session_id),
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=86400  # 1 day
    )
    return session

@router.get("/session", response_model=ComparisonSession)
def get_session(
    response: Response,
    comparison_session_id: uuid.UUID | None = Cookie(None),
    db: Session = Depends(deps.get_db)
):
    if comparison_session_id is None:
        session_id = uuid.uuid4()
        session = crud_comparison.create_comparison_session(db, session_id=session_id)
        response.set_cookie(
            key="comparison_session_id",
            value=str(session.session_id),
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=86400  # 1 day
        )
        return session
    session = crud_comparison.get_comparison_session(db, session_id=comparison_session_id)
    if not session:
        session_id = uuid.uuid4()
        session = crud_comparison.create_comparison_session(db, session_id=session_id)
        response.set_cookie(
            key="comparison_session_id",
            value=str(session.session_id),
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=86400  # 1 day
        )
    return session

@router.post("/items/{slug}", response_model=ComparisonItem)
def add_item(
    slug: str,
    comparison_session_id: uuid.UUID = Cookie(...),
    db: Session = Depends(deps.get_db)
):
    return crud_comparison.add_comparison_item(db, slug=slug, session_id=comparison_session_id)

@router.delete("/items/{slug}")
def remove_item(
    slug: str,
    comparison_session_id: uuid.UUID = Cookie(...),
    db: Session = Depends(deps.get_db)
):
    crud_comparison.remove_comparison_item(db, slug=slug, session_id=comparison_session_id)
    return {"message": "Item removed"}

@router.get("/items", response_model=List[ComparisonItem])
def get_items(
    comparison_session_id: uuid.UUID = Cookie(...),
    db: Session = Depends(deps.get_db)
):
    return crud_comparison.get_comparison_items(db, session_id=comparison_session_id)