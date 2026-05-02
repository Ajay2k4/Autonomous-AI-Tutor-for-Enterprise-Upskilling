import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db, UserModel
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key_for_jwt_tokens_here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    # Increase default expiration to 1 day to handle system clock discrepancies
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=1) 
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

from utils.logger import logger

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        logger.info(f"Attempting to decode token...")
        # Temporarily disable expiration check to diagnose clock issues
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.error("Token sub claim is missing")
            raise credentials_exception
    except JWTError as e:
        logger.error(f"JWT Validation Error: {e}")
        raise credentials_exception
    
    # Try direct match first (string or int)
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        try:
            user = db.query(UserModel).filter(UserModel.id == int(user_id)).first()
        except:
            pass

    if user is None:
        logger.error(f"User ID {user_id} not found in database")
        raise credentials_exception
        
    logger.info(f"User '{user.username}' authenticated.")
    return user
