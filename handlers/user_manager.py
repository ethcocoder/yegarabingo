from firebase_admin import firestore
from datetime import datetime
from typing import Dict, Optional

class UserManager:
    def __init__(self, db):
        self.db = db
        self.users_ref = db.collection('users')
    
    async def get_or_create_user(self, user_id: int, first_name: str, username: str) -> Dict:
        """Get existing user or create new one"""
        user_doc = self.users_ref.document(str(user_id)).get()
        
        if user_doc.exists:
            return user_doc.to_dict()
        
        user_data = {
            'user_id': user_id,
            'first_name': first_name,
            'username': username,
            'balance': 0,
            'play_wallet': 0,
            'total_games': 0,
            'wins': 0,
            'losses': 0,
            'is_playing': False,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        self.users_ref.document(str(user_id)).set(user_data)
        return user_data
    
    async def get_user(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        user_doc = self.users_ref.document(str(user_id)).get()
        return user_doc.to_dict() if user_doc.exists else None
    
    async def update_balance(self, user_id: int, amount: float) -> bool:
        """Update user balance"""
        user = await self.get_user(user_id)
        if not user:
            return False
        
        new_balance = user.get('balance', 0) + amount
        self.users_ref.document(str(user_id)).update({
            'balance': new_balance,
            'updated_at': datetime.utcnow()
        })
        return True
    
    async def deduct_balance(self, user_id: int, amount: float) -> bool:
        """Deduct from user balance"""
        user = await self.get_user(user_id)
        if not user or user.get('balance', 0) < amount:
            return False
        
        new_balance = user['balance'] - amount
        self.users_ref.document(str(user_id)).update({
            'balance': new_balance,
            'updated_at': datetime.utcnow()
        })
        return True
    
    async def transfer_to_play_wallet(self, user_id: int, amount: float) -> bool:
        """Transfer from main balance to play wallet"""
        user = await self.get_user(user_id)
        if not user or user.get('balance', 0) < amount:
            return False
        
        self.users_ref.document(str(user_id)).update({
            'balance': user['balance'] - amount,
            'play_wallet': user.get('play_wallet', 0) + amount,
            'updated_at': datetime.utcnow()
        })
        return True
    
    async def add_winnings(self, user_id: int, amount: float) -> bool:
        """Add winnings to user play wallet only"""
        user = await self.get_user(user_id)
        if not user:
            return False
        
        self.users_ref.document(str(user_id)).update({
            'play_wallet': user.get('play_wallet', 0) + amount,
            'wins': user.get('wins', 0) + 1,
            'updated_at': datetime.utcnow()
        })
        return True
    
    async def update_game_stats(self, user_id: int, won: bool) -> bool:
        """Update user game statistics"""
        user = await self.get_user(user_id)
        if not user:
            return False
        
        update_data = {
            'total_games': user.get('total_games', 0) + 1,
            'updated_at': datetime.utcnow()
        }
        
        if won:
            update_data['wins'] = user.get('wins', 0) + 1
        else:
            update_data['losses'] = user.get('losses', 0) + 1
        
        self.users_ref.document(str(user_id)).update(update_data)
        return True
    
    async def set_playing_status(self, user_id: int, is_playing: bool) -> bool:
        """Set user playing status"""
        self.users_ref.document(str(user_id)).update({
            'is_playing': is_playing,
            'updated_at': datetime.utcnow()
        })
        return True
    
    async def get_user_history(self, user_id: int, limit: int = 10) -> list:
        """Get user game history"""
        games = self.db.collection('games').where('user_id', '==', user_id).order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit).get()
        return [game.to_dict() for game in games]
    
    async def get_all_users(self, limit: int = 100) -> list:
        """Get all users (admin)"""
        users = self.users_ref.limit(limit).get()
        return [user.to_dict() for user in users]
    
    async def get_leaderboard(self, limit: int = 10) -> list:
        """Get top winners"""
        users = self.users_ref.order_by('wins', direction=firestore.Query.DESCENDING).limit(limit).get()
        return [user.to_dict() for user in users]
