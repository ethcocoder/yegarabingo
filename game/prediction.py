import random
from typing import List, Dict, Optional
from firebase_admin import firestore


class PredictionAlgorithm:
    def __init__(self, db):
        self.db = db
        self.games_ref = db.collection('games')
        self.cartelas_ref = db.collection('cartelas')

    async def generate_smart_number(self, game_id: int, admin_target: Optional[int] = None) -> int:
        """Generate the next number to call"""
        game_doc = self.games_ref.document(str(game_id)).get()
        game = game_doc.to_dict()

        called_numbers = set(game.get('called_numbers', []))
        available_numbers = [n for n in range(1, 101) if n not in called_numbers]

        if not available_numbers:
            return None

        # Get all active cartelas for this game
        cartelas = await self._get_active_cartelas(game_id)

        if admin_target:
            return await self._generate_for_target(cartelas, available_numbers, called_numbers, admin_target)
        else:
            return await self._generate_avoiding_win(cartelas, available_numbers, called_numbers)

    async def _get_active_cartelas(self, game_id: int) -> List[Dict]:
        """Get all active cartelas for a game"""
        docs = self.cartelas_ref.where('game_id', '==', game_id).get()
        return [doc.to_dict() for doc in docs]

    async def _generate_for_target(self, cartelas, available, called, target_user_id) -> int:
        """Generate number that helps target player win"""
        target_cartela = None
        for cartela in cartelas:
            if cartela.get('user_id') == target_user_id:
                target_cartela = cartela.get('cartela', [])
                break

        if not target_cartela:
            return random.choice(available)

        marked = set()
        for cartela in cartelas:
            if cartela.get('user_id') == target_user_id:
                marked = set(cartela.get('marked', []))
                break

        # Find numbers that would help target
        helpful_numbers = []
        for row in target_cartela:
            for num in row:
                if num != '⭐' and num in available and num not in marked:
                    helpful_numbers.append(num)

        if helpful_numbers:
            return random.choice(helpful_numbers)

        return random.choice(available)

    async def _generate_avoiding_win(self, cartelas, available, called) -> int:
        """Generate number that avoids completing any player's pattern"""
        # Analyze which numbers would cause a win
        dangerous_numbers = set()

        for cartela_data in cartelas:
            cartela = cartela_data.get('cartela', [])
            marked = set(cartela_data.get('marked', []))

            # Check what's close to winning
            for row in cartela:
                unmarked = [n for n in row if n != '⭐' and n not in marked and n in available]
                if len(unmarked) == 1:
                    dangerous_numbers.add(unmarked[0])

            for col in range(5):
                unmarked = [row[col] for row in cartela if row[col] != '⭐' and row[col] not in marked and row[col] in available]
                if len(unmarked) == 1:
                    dangerous_numbers.add(unmarked[0])

        # Prefer non-dangerous numbers
        safe_numbers = [n for n in available if n not in dangerous_numbers]

        if safe_numbers:
            return random.choice(safe_numbers)

        # If all numbers are dangerous, pick least dangerous
        return random.choice(available)

    async def calculate_win_probability(self, cartela: List[List], marked: set) -> float:
        """Calculate probability of winning with current state"""
        possible_lines = 0
        total_lines = 12  # 5 rows + 5 cols + 2 diagonals

        # Check rows
        for row in cartela:
            if all(n in marked or n == '⭐' for n in row):
                return 1.0
            unmarked = [n for n in row if n not in marked and n != '⭐']
            if len(unmarked) <= 2:
                possible_lines += 1

        # Check columns
        for col in range(5):
            col_nums = [row[col] for row in cartela]
            if all(n in marked or n == '⭐' for n in col_nums):
                return 1.0
            unmarked = [n for n in col_nums if n not in marked and n != '⭐']
            if len(unmarked) <= 2:
                possible_lines += 1

        return possible_lines / total_lines
