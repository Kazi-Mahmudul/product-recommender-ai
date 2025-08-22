from sqlalchemy import Column, Integer, String, Float, DateTime
from app.core.database import Base

class TopSearchedPhone(Base):
    __tablename__ = "top_searched"

    id = Column(Integer, primary_key=True, index=True)
    phone_id = Column(Integer, index=True)
    phone_name = Column(String(512), index=True)
    brand = Column(String(255), index=True)
    model = Column(String(255), index=True)
    search_index = Column(Float, index=True)
    rank = Column(Integer, index=True)
    last_updated = Column(DateTime)

    def __repr__(self):
        return f"<TopSearchedPhone {self.brand} {self.model} (Rank: {self.rank})>"