import random
import time
import json
from datetime import datetime, timedelta
from firebase_admin import firestore


class GameEngine:
    def __init__(self, db):
        self.db = db
        self.games_ref = db.collection('games')
        self.cartelas_ref = db.collection('cartelas')

    async def get_stats(self):
        """Get game statistics"""
        try:
            active_players = len(await self.db.collection('users').where('is_playing', '==', True).get())
            games = await self.db.collection('games').get()
            games_played = len(games)

            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            winners_today = len(await self.db.collection('games').where('winner', '!=', None).where('created_at', '>=', today).get())

            return {
                'active_players': active_players,
                'games_played': games_played,
                'winners_today': winners_today
            }
        except Exception as e:
            return {'active_players': 0, 'games_played': 0, 'winners_today': 0}

    async def create_game(self, user_id, stake):
        """Create a new game session"""
        game_data = {
            'user_id': user_id,
            'stake': stake,
            'status': 'waiting',
            'called_numbers': [],
            'marked_numbers': [],
            'winner': None,
            'prize': 0,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        doc_ref = self.games_ref.document()
        doc_ref.set(game_data)
        return {'id': doc_ref.id, **game_data}

    async def generate_cartela(self):
        """Generate a random Bingo cartela (5x5 card)"""
        columns = {
            'B': random.sample(range(1, 21), 5),
            'I': random.sample(range(21, 41), 5),
            'N': random.sample(range(41, 61), 5),
            'G': random.sample(range(61, 81), 5),
            'O': random.sample(range(81, 101), 5)
        }

        cartela = []
        for i in range(5):
            row = [
                columns['B'][i],
                columns['I'][i],
                columns['N'][i] if i != 2 else '⭐',
                columns['G'][i],
                columns['O'][i]
            ]
            cartela.append(row)

        return cartela

    async def save_cartela(self, game_id, user_id, cartela):
        """Save cartela to database"""
        cartela_data = {
            'game_id': game_id,
            'user_id': user_id,
            'cartela': cartela,
            'marked': [],
            'created_at': datetime.utcnow()
        }

        doc_ref = self.cartelas_ref.document()
        doc_ref.set(cartela_data)
        return {'id': doc_ref.id, **cartela_data}

    async def call_number(self, game_id):
        """Call a random number for the game"""
        game_doc = self.games_ref.document(game_id).get()
        game = game_doc.to_dict()

        called = game.get('called_numbers', [])
        available = [n for n in range(1, 101) if n not in called]

        if not available:
            return None

        number = random.choice(available)
        called.append(number)

        self.games_ref.document(game_id).update({
            'called_numbers': called,
            'updated_at': datetime.utcnow()
        })

        return number

    async def mark_number(self, game_id, user_id, number):
        """Mark a number on player's cartela"""
        cartelas = self.cartelas_ref.where('game_id', '==', game_id).where('user_id', '==', user_id).get()

        for cartela_doc in cartelas:
            marked = cartela_doc.to_dict().get('marked', [])
            if number not in marked:
                marked.append(number)
                self.cartelas_ref.document(cartela_doc.id).update({'marked': marked})

        return True

    async def check_bingo(self, game_id, user_id):
        """Check if player has Bingo"""
        cartelas = self.cartelas_ref.where('game_id', '==', game_id).where('user_id', '==', user_id).get()

        for cartela_doc in cartelas:
            cartela = cartela_doc.to_dict().get('cartela', [])
            marked = cartela_doc.to_dict().get('marked', [])

            # Check rows
            for row in cartela:
                if all(num in marked for num in row if num != '⭐'):
                    return True

            # Check columns
            for col in range(5):
                if all(row[col] in marked for row in cartela if row[col] != '⭐'):
                    return True

            # Check diagonals
            if all(cartela[i][i] in marked for i in range(5) if cartela[i][i] != '⭐'):
                return True
            if all(cartela[i][4-i] in marked for i in range(5) if cartela[i][4-i] != '⭐'):
                return True

        return False

    async def end_game(self, game_id, winner_id=None):
        """End game and distribute prize"""
        game_doc = self.games_ref.document(game_id).get()
        game = game_doc.to_dict()

        prize = game['stake'] * 15.2 if winner_id else 0

        self.games_ref.document(game_id).update({
            'status': 'completed',
            'winner': winner_id,
            'prize': prize,
            'updated_at': datetime.utcnow()
        })

        return prize

    def format_game_board(self, cartela, called_numbers, stake, play_wallet):
        """Format the game board for display"""
        header = f"🎯 *Yegara Bingo*\n"
        header += f"💰 Stake: {stake} ETB | Play Wallet: {play_wallet} ETB\n"
        header += f"⏰ Timer: 60s\n\n"

        # Column headers
        board = "```"
        board += "  B    I    N    G    O\n"
        board += "┌────┬────┬────┬────┬────┐\n"

        for row in cartela:
            board += "│"
            for num in row:
                if num == '⭐':
                    board += "  ⭐ │"
                elif num in called_numbers:
                    board += f" [{num:2d}]│"
                else:
                    board += f"  {num:2d} │"
            board += "\n"
            board += "├────┼────┼────┼────┼────┤\n"

        board = board[:-23] + "└────┴────┴────┴────┴────┘"
        board += "```"

        return header + board
