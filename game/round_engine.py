"""
Yegara Bingo — Round-Based Multiplayer Engine
=============================================
Manages 500 fixed cartelas, round lifecycle, number calling, bingo checking,
and prize distribution.
"""

import random
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from firebase_admin import firestore


# ─── Constants ───
TOTAL_CARTELAS = 500
STAKE = 10
PRIZE_MULTIPLIER = 7.5          # winner gets stake × 7.5 per player
ADMIN_CUT_RATIO = 0.25          # 25% of pool goes to admin
SELECTION_SECONDS = 35
NUMBER_CALL_INTERVAL = 4        # seconds between each called number
MAX_CARTELAS_PER_PLAYER = 2
BINGO_NUMBERS = range(1, 76)    # 1-75


class RoundEngine:
    def __init__(self, db):
        self.db = db
        self.master_ref = db.collection('cartelas_master')
        self.rounds_ref = db.collection('rounds')

    # ═══════════════════════════════════════════════════════════════
    # Cartela Generation (one-time, admin-triggered)
    # ═══════════════════════════════════════════════════════════════
    def _generate_single_cartela(self, seed: int) -> List[int]:
        """Generate a deterministic 5×5 bingo card as flat 25-int list.
        Uses seed so the same cartela number always produces the same card."""
        rng = random.Random(seed)
        cols = {
            'B': rng.sample(range(1, 16), 5),
            'I': rng.sample(range(16, 31), 5),
            'N': rng.sample(range(31, 46), 5),
            'G': rng.sample(range(46, 61), 5),
            'O': rng.sample(range(61, 76), 5),
        }
        flat = []
        for row_idx in range(5):
            flat.append(cols['B'][row_idx])
            flat.append(cols['I'][row_idx])
            # Free center space
            flat.append(0 if row_idx == 2 else cols['N'][row_idx])
            flat.append(cols['G'][row_idx])
            flat.append(cols['O'][row_idx])
        return flat

    async def generate_all_cartelas(self) -> dict:
        """Generate 500 fixed cartelas in cartelas_master. Idempotent."""
        existing = list(self.master_ref.limit(1).get())
        if existing:
            count = len(list(self.master_ref.get()))
            return {'status': 'already_exists', 'count': count}

        batch_size = 100
        generated = 0
        for start in range(1, TOTAL_CARTELAS + 1, batch_size):
            batch = self.db.batch()
            end = min(start + batch_size, TOTAL_CARTELAS + 1)
            for num in range(start, end):
                # Use fixed seed = num × 1337 for deterministic generation
                cartela = self._generate_single_cartela(num * 1337)
                doc_ref = self.master_ref.document(str(num))
                batch.set(doc_ref, {
                    'number': num,
                    'cartela': cartela,
                    'generated_at': datetime.utcnow(),
                })
                generated += 1
            batch.commit()

        return {'status': 'generated', 'count': generated}

    async def get_all_cartelas(self) -> List[dict]:
        """Return all 500 master cartelas."""
        docs = self.master_ref.order_by('number').get()
        return [{'id': doc.id, **doc.to_dict()} for doc in docs]

    async def get_cartela(self, number: int) -> Optional[dict]:
        """Get a single cartela by number."""
        doc = self.master_ref.document(str(number)).get()
        if doc.exists:
            return {'id': doc.id, **doc.to_dict()}
        return None

    # ═══════════════════════════════════════════════════════════════
    # Round Lifecycle
    # ═══════════════════════════════════════════════════════════════
    async def get_active_round(self) -> Optional[dict]:
        """Find the current active round (selecting or playing)."""
        for status in ['selecting', 'playing']:
            docs = list(self.rounds_ref
                       .where('status', '==', status)
                       .order_by('created_at', direction=firestore.Query.DESCENDING)
                       .limit(1)
                       .get())
            if docs:
                doc = docs[0]
                return {'id': doc.id, **doc.to_dict()}
        return None

    async def create_round(self) -> dict:
        """Create a new round in 'selecting' state."""
        # Check for existing active round
        active = await self.get_active_round()
        if active:
            return active

        now = datetime.utcnow()
        round_data = {
            'status': 'selecting',
            'stake': STAKE,
            'players': {},          # { uid_str: { cartelas: [int], name: str } }
            'player_count': 0,
            'taken_cartelas': [],    # flat list of all chosen cartela numbers
            'called_numbers': [],
            'winners': [],
            'prize_per_winner': 0,
            'admin_profit': 0,
            'selection_deadline': now + timedelta(seconds=SELECTION_SECONDS),
            'created_at': now,
            'completed_at': None,
        }
        doc_ref = self.rounds_ref.document()
        doc_ref.set(round_data)
        return {'id': doc_ref.id, **round_data}

    async def join_round(self, round_id: str, user_id: int, 
                         cartela_numbers: List[int], user_name: str) -> dict:
        """Player joins a round with chosen cartelas (max 2)."""
        if len(cartela_numbers) > MAX_CARTELAS_PER_PLAYER:
            return {'error': f'Maximum {MAX_CARTELAS_PER_PLAYER} cartelas allowed'}
        if len(cartela_numbers) == 0:
            return {'error': 'Must select at least 1 cartela'}

        # Validate cartela numbers
        for num in cartela_numbers:
            if num < 1 or num > TOTAL_CARTELAS:
                return {'error': f'Invalid cartela number: {num}'}

        round_doc = self.rounds_ref.document(round_id).get()
        if not round_doc.exists:
            return {'error': 'Round not found'}

        round_data = round_doc.to_dict()
        if round_data['status'] != 'selecting':
            return {'error': 'Round is no longer accepting players'}

        # Check if cartelas are already taken
        taken = round_data.get('taken_cartelas', [])
        for num in cartela_numbers:
            if num in taken:
                return {'error': f'Cartela #{num} is already taken'}

        # Check if user already joined
        uid_str = str(user_id)
        if uid_str in round_data.get('players', {}):
            return {'error': 'You already joined this round'}

        # Deduct play wallet
        total_cost = STAKE * len(cartela_numbers)
        user_ref = self.db.collection('users').document(uid_str)
        user_doc = user_ref.get()
        if not user_doc.exists:
            return {'error': 'User not found'}

        user_data = user_doc.to_dict()
        pw = user_data.get('play_wallet', 0)
        if pw < total_cost:
            return {'error': f'Not enough balance. Need {total_cost} ETB, have {pw} ETB'}

        # Deduct and update
        user_ref.update({
            'play_wallet': pw - total_cost,
            'is_playing': True,
            'updated_at': datetime.utcnow(),
        })

        # Add to round
        players = round_data.get('players', {})
        players[uid_str] = {
            'cartelas': cartela_numbers,
            'name': user_name,
            'joined_at': datetime.utcnow().isoformat(),
        }
        new_taken = taken + cartela_numbers

        self.rounds_ref.document(round_id).update({
            'players': players,
            'player_count': len(players),
            'taken_cartelas': new_taken,
        })

        return {
            'status': 'joined',
            'cost': total_cost,
            'cartelas': cartela_numbers,
            'player_count': len(players),
        }

    async def start_round(self, round_id: str) -> dict:
        """Transition round from 'selecting' to 'playing'."""
        round_doc = self.rounds_ref.document(round_id).get()
        if not round_doc.exists:
            return {'error': 'Round not found'}

        data = round_doc.to_dict()
        if data['status'] != 'selecting':
            return {'error': 'Round already started or completed'}

        player_count = data.get('player_count', 0)
        if player_count < 1:
            return {'error': 'Need at least 1 player'}

        pool = player_count * STAKE
        derash = pool * (1 - ADMIN_CUT_RATIO)  # 75% to winner(s)

        self.rounds_ref.document(round_id).update({
            'status': 'playing',
            'pool': pool,
            'derash': derash,
        })

        return {'status': 'playing', 'player_count': player_count, 'pool': pool, 'derash': derash}

    async def call_number(self, round_id: str) -> Optional[int]:
        """Call the next random number for the round."""
        round_doc = self.rounds_ref.document(round_id).get()
        if not round_doc.exists:
            return None

        data = round_doc.to_dict()
        if data['status'] != 'playing':
            return None

        called = data.get('called_numbers', [])
        available = [n for n in BINGO_NUMBERS if n not in called]
        if not available:
            return None

        number = random.choice(available)
        called.append(number)

        self.rounds_ref.document(round_id).update({
            'called_numbers': called,
        })

        return number

    def check_bingo_for_cartela(self, flat_cartela: List[int], 
                                 called_numbers: List[int]) -> bool:
        """Check if a flat 25-int cartela has bingo given called numbers."""
        called_set = set(called_numbers)
        # Reconstruct 5×5 grid
        grid = []
        for row in range(5):
            grid.append(flat_cartela[row * 5:(row + 1) * 5])

        def is_marked(num):
            return num == 0 or num in called_set

        # Check rows
        for row in grid:
            if all(is_marked(n) for n in row):
                return True

        # Check columns
        for col in range(5):
            if all(is_marked(grid[row][col]) for row in range(5)):
                return True

        # Check diagonals
        if all(is_marked(grid[i][i]) for i in range(5)):
            return True
        if all(is_marked(grid[i][4 - i]) for i in range(5)):
            return True

        return False

    async def check_bingo(self, round_id: str, user_id: int) -> dict:
        """Check if a player has bingo in the current round."""
        round_doc = self.rounds_ref.document(round_id).get()
        if not round_doc.exists:
            return {'bingo': False, 'error': 'Round not found'}

        data = round_doc.to_dict()
        uid_str = str(user_id)
        player_info = data.get('players', {}).get(uid_str)
        if not player_info:
            return {'bingo': False, 'error': 'Player not in round'}

        called = data.get('called_numbers', [])
        winning_cartelas = []

        for cartela_num in player_info.get('cartelas', []):
            cartela_doc = self.master_ref.document(str(cartela_num)).get()
            if not cartela_doc.exists:
                continue
            flat = cartela_doc.to_dict().get('cartela', [])
            if self.check_bingo_for_cartela(flat, called):
                winning_cartelas.append(cartela_num)

        return {'bingo': len(winning_cartelas) > 0, 'winning_cartelas': winning_cartelas}

    async def end_round(self, round_id: str, winner_ids: List[int]) -> dict:
        """End the round, distribute prizes."""
        round_doc = self.rounds_ref.document(round_id).get()
        if not round_doc.exists:
            return {'error': 'Round not found'}

        data = round_doc.to_dict()
        if data['status'] != 'playing':
            return {'error': 'Round not in playing state'}

        player_count = data.get('player_count', 0)
        pool = player_count * STAKE
        admin_profit = pool * ADMIN_CUT_RATIO
        winner_pool = pool - admin_profit

        prize_per_winner = 0
        if winner_ids:
            prize_per_winner = winner_pool / len(winner_ids)
            # Credit each winner
            for wid in winner_ids:
                user_ref = self.db.collection('users').document(str(wid))
                user_doc = user_ref.get()
                if user_doc.exists:
                    ud = user_doc.to_dict()
                    user_ref.update({
                        'play_wallet': ud.get('play_wallet', 0) + prize_per_winner,
                        'wins': ud.get('wins', 0) + 1,
                        'is_playing': False,
                        'updated_at': datetime.utcnow(),
                    })

        # Mark all players as not playing
        for uid_str in data.get('players', {}):
            if int(uid_str) not in winner_ids:
                user_ref = self.db.collection('users').document(uid_str)
                user_doc = user_ref.get()
                if user_doc.exists:
                    ud = user_doc.to_dict()
                    user_ref.update({
                        'losses': ud.get('losses', 0) + 1,
                        'is_playing': False,
                        'updated_at': datetime.utcnow(),
                    })

        # Update round
        self.rounds_ref.document(round_id).update({
            'status': 'completed',
            'winners': [str(w) for w in winner_ids],
            'prize_per_winner': prize_per_winner,
            'admin_profit': admin_profit,
            'completed_at': datetime.utcnow(),
        })

        return {
            'status': 'completed',
            'winners': winner_ids,
            'prize_per_winner': prize_per_winner,
            'admin_profit': admin_profit,
            'pool': pool,
        }

    async def get_round(self, round_id: str) -> Optional[dict]:
        """Get round data by ID."""
        doc = self.rounds_ref.document(round_id).get()
        if doc.exists:
            return {'id': doc.id, **doc.to_dict()}
        return None

    async def get_recent_rounds(self, limit: int = 20) -> List[dict]:
        """Get recent rounds."""
        docs = (self.rounds_ref
                .order_by('created_at', direction=firestore.Query.DESCENDING)
                .limit(limit)
                .get())
        return [{'id': doc.id, **doc.to_dict()} for doc in docs]
