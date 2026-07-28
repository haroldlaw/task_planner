import datetime
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc

from . import models, schemas, auth
from .database import engine, get_db, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Task Planner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== AUTH ====================

@app.post("/auth/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(models.User)
        .filter(
            (models.User.username == user_in.username) | (models.User.email == user_in.email)
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=auth.hash_password(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ==================== TAGS ====================

@app.get("/tags", response_model=List[schemas.TagOut])
def list_tags(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return db.query(models.Tag).filter(models.Tag.user_id == current_user.id).all()


@app.post("/tags", response_model=schemas.TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag_in: schemas.TagCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    tag = models.Tag(name=tag_in.name, user_id=current_user.id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@app.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    tag = (
        db.query(models.Tag)
        .filter(models.Tag.id == tag_id, models.Tag.user_id == current_user.id)
        .first()
    )
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()


# ==================== TASKS ====================

def _get_owned_task(task_id: int, db: Session, current_user: models.User) -> models.Task:
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.get("/tasks", response_model=List[schemas.TaskOut])
def list_tasks(
    status_filter: Optional[models.TaskStatus] = Query(None, alias="status"),
    priority_filter: Optional[models.TaskPriority] = Query(None, alias="priority"),
    tag_id: Optional[int] = Query(None),
    sort_by: str = Query("created_at", pattern="^(created_at|due_date|priority|status|title)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = db.query(models.Task).filter(models.Task.user_id == current_user.id)

    if status_filter:
        query = query.filter(models.Task.status == status_filter)
    if priority_filter:
        query = query.filter(models.Task.priority == priority_filter)
    if tag_id:
        query = query.filter(models.Task.tags.any(models.Tag.id == tag_id))

    sort_column = getattr(models.Task, sort_by)
    query = query.order_by(asc(sort_column) if order == "asc" else desc(sort_column))

    return query.all()


@app.post("/tasks", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    task = models.Task(
        title=task_in.title,
        description=task_in.description,
        due_date=task_in.due_date,
        priority=task_in.priority,
        status=task_in.status,
        user_id=current_user.id,
    )
    if task_in.tag_ids:
        tags = (
            db.query(models.Tag)
            .filter(models.Tag.id.in_(task_in.tag_ids), models.Tag.user_id == current_user.id)
            .all()
        )
        task.tags = tags

    if task.status == models.TaskStatus.done:
        task.completed_at = datetime.datetime.utcnow()

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.put("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    task_in: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    task = _get_owned_task(task_id, db, current_user)

    update_data = task_in.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for field, value in update_data.items():
        setattr(task, field, value)

    if "status" in task_in.model_dump(exclude_unset=True):
        if task_in.status == models.TaskStatus.done and task.completed_at is None:
            task.completed_at = datetime.datetime.utcnow()
        elif task_in.status != models.TaskStatus.done:
            task.completed_at = None

    if task_in.tag_ids is not None:
        tags = (
            db.query(models.Tag)
            .filter(models.Tag.id.in_(task_in.tag_ids), models.Tag.user_id == current_user.id)
            .all()
        )
        task.tags = tags

    db.commit()
    db.refresh(task)
    return task


@app.patch("/tasks/{task_id}/complete", response_model=schemas.TaskOut)
def toggle_complete(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    task = _get_owned_task(task_id, db, current_user)

    if task.status == models.TaskStatus.done:
        task.status = models.TaskStatus.todo
        task.completed_at = None
    else:
        task.status = models.TaskStatus.done
        task.completed_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(task)
    return task


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    task = _get_owned_task(task_id, db, current_user)
    db.delete(task)
    db.commit()


# ==================== STATS ====================

@app.get("/stats", response_model=schemas.StatsOut)
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()

    total_tasks = len(tasks)
    now = datetime.datetime.utcnow()
    week_ago = now - datetime.timedelta(days=7)

    completed_this_week = sum(
        1 for t in tasks if t.completed_at and t.completed_at >= week_ago
    )
    overdue_count = sum(
        1
        for t in tasks
        if t.due_date and t.due_date < now and t.status != models.TaskStatus.done
    )
    done_count = sum(1 for t in tasks if t.status == models.TaskStatus.done)
    completion_rate = round((done_count / total_tasks) * 100, 1) if total_tasks else 0.0

    status_breakdown = {
        s.value: sum(1 for t in tasks if t.status == s) for s in models.TaskStatus
    }
    priority_breakdown = {
        p.value: sum(1 for t in tasks if t.priority == p) for p in models.TaskPriority
    }

    return schemas.StatsOut(
        total_tasks=total_tasks,
        completed_this_week=completed_this_week,
        overdue_count=overdue_count,
        completion_rate=completion_rate,
        status_breakdown=status_breakdown,
        priority_breakdown=priority_breakdown,
    )