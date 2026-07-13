from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from config import db
from game.engine import GameEngine
from game.prediction import PredictionAlgorithm
from handlers.user_manager import UserManager
from datetime import datetime
import secrets

app = FastAPI(title="Yegara Bingo Admin API", version="1.0.0")

# Simple API key authentication
API_KEY = secrets.token_urlsafe(32)

game_engine = GameEngine(db)
prediction = PredictionAlgorithm(db)
user_manager = UserManager(db)

class AdminAuth:
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    def verify(self, key: str = Header(...)):
        if key != self.api_key:
            raise HTTPException(status_code=401, detail="Invalid API key")
        return True

admin_auth = AdminAuth(API_KEY)

# Models
class GameCreate(BaseModel):
    stake: int
    max_players: int = 500

class PlayerSelect(BaseModel):
    user_id: int
    force_win: bool = True

class GameControl(BaseModel):
    game_id: str
    action: str

# Endpoints
@app.get("/api/dashboard")
async def get_dashboard():
    """Get dashboard overview"""
    stats = await game_engine.get_stats()
    users = await user_manager.get_all_users()
    
    total_balance = sum(user.get('balance', 0) for user in users)
    total_wins = sum(user.get('wins', 0) for user in users)
    
    return {
        "stats": stats,
        "total_users": len(users),
        "total_balance": total_balance,
        "total_wins": total_wins,
        "api_key": API_KEY
    }

@app.get("/api/users")
async def get_users(limit: int = 100):
    """Get all users"""
    users = await user_manager.get_all_users(limit)
    return {"users": users}

@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    """Get specific user"""
    user = await user_manager.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": user}

@app.get("/api/games")
async def get_games(limit: int = 50):
    """Get recent games"""
    games = await db.collection('games').order_by('created_at', direction='DESCENDING').limit(limit).get()
    return {"games": [game.to_dict() for game in games]}

@app.post("/api/games/create")
async def create_game(game: GameCreate):
    """Create a new game"""
    game_data = await game_engine.create_game(0, game.stake)
    return {"game": game_data}

@app.post("/api/games/control")
async def control_game(control: GameControl):
    """Control game (start/pause/end)"""
    if control.action == "end":
        await game_engine.end_game(control.game_id)
        return {"message": "Game ended"}
    return {"message": f"Action {control.action} performed"}

@app.post("/api/prediction/enable")
async def enable_prediction():
    """Enable prediction algorithm"""
    return {"message": "Prediction algorithm enabled", "mode": "automatic"}

@app.post("/api/prediction/select_winner")
async def select_winner(player: PlayerSelect):
    """Select player for guaranteed win"""
    # Update game with target player
    games = await db.collection('games').where('status', '==', 'waiting').get()
    
    for game in games:
        game_ref = db.collection('games').document(game.id)
        game_ref.update({
            'admin_target': player.user_id,
            'updated_at': datetime.utcnow()
        })
    
    return {"message": f"Player {player.user_id} selected for guaranteed win"}

@app.get("/api/reports/summary")
async def get_reports():
    """Get reports summary"""
    games = await db.collection('games').get()
    users = await user_manager.get_all_users()
    
    total_games = len(games)
    completed_games = sum(1 for g in games if g.to_dict().get('status') == 'completed')
    total_prizes = sum(g.to_dict().get('prize', 0) for g in games)
    
    return {
        "total_games": total_games,
        "completed_games": completed_games,
        "active_games": total_games - completed_games,
        "total_prizes_distributed": total_prizes,
        "average_prize": total_prizes / completed_games if completed_games > 0 else 0
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)