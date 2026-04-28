from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db
from app.errors import AppException
from app.models.board import Board
from app.response import success_response

router = APIRouter()


@router.get("")
def get_boards(db: Session = Depends(get_db)):
    boards = db.scalars(
        select(Board).where(Board.is_active.is_(True)).order_by(Board.sort_order.asc(), Board.id.asc())
    ).all()

    grouped: dict[str, list[dict]] = defaultdict(list)
    for board in boards:
        grouped[board.category].append(
            {
                "id": board.id,
                "name": board.name,
                "slug": board.slug,
                "category": board.category,
                "board_type": board.board_type,
                "description": board.description,
                "sort_order": board.sort_order,
                "allow_anonymous": board.allow_anonymous,
                "read_permission": board.read_permission,
                "write_permission": board.write_permission,
            }
        )

    data = [{"category": category, "boards": items} for category, items in grouped.items()]
    return success_response(data)


@router.get("/{board_id}")
def get_board_detail(board_id: int, db: Session = Depends(get_db)):
    board = db.get(Board, board_id)
    if board is None or not board.is_active:
        raise AppException(status_code=404, message="Board not found.", code="NOT_FOUND")

    return success_response(
        {
            "id": board.id,
            "name": board.name,
            "slug": board.slug,
            "category": board.category,
            "board_type": board.board_type,
            "description": board.description,
            "sort_order": board.sort_order,
            "allow_anonymous": board.allow_anonymous,
            "read_permission": board.read_permission,
            "write_permission": board.write_permission,
            "metadata": board.metadata_json,
            "is_active": board.is_active,
            "created_at": board.created_at,
        }
    )

