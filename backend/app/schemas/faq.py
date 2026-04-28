from pydantic import BaseModel


class FAQCreate(BaseModel):
    question: str
    answer: str
    category: str | None = None
    sort_order: int = 0
    is_active: bool = True


class FAQUpdate(FAQCreate):
    pass
