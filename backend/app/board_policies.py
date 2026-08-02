from app.models.board import Board


ANONYMOUS_NO_COMMENT_BOARD_SLUGS = frozenset({"lecture-reviews"})


def hides_author_identity(board: Board) -> bool:
    return board.slug in ANONYMOUS_NO_COMMENT_BOARD_SLUGS


def comments_are_disabled(board: Board) -> bool:
    return board.slug in ANONYMOUS_NO_COMMENT_BOARD_SLUGS
