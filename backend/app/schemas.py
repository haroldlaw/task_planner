import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict

from .models import TaskStatus, TaskPriority


# ---------- Auth / User ----------

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: EmailStr
    created_at: datetime.datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ---------- Tag ----------

class TagCreate(BaseModel):
    name: str


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


# ---------- Task ----------

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime.datetime] = None
    priority: TaskPriority = TaskPriority.medium
    status: TaskStatus = TaskStatus.todo
    tag_ids: List[int] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime.datetime] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    tag_ids: Optional[List[int]] = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str]
    due_date: Optional[datetime.datetime]
    priority: TaskPriority
    status: TaskStatus
    created_at: datetime.datetime
    completed_at: Optional[datetime.datetime]
    tags: List[TagOut] = []


# ---------- Stats ----------

class StatsOut(BaseModel):
    total_tasks: int
    completed_this_week: int
    overdue_count: int
    completion_rate: float
    status_breakdown: dict
    priority_breakdown: dict