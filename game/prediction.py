import random
from typing import List, Dict, Optional
from firebase_admin import firestore


class PredictionAlgorithm:
    def __init__(self, db):
        self.db = db
        self.games_ref = db.collection('games')
        self.cartelas_ref = db.collection('cartelas')

    def generate_smart_number(self, game_id, admin_target=None):
        """Generate the next number to call (synchronous)"""
        game_doc = self.games_ref.document(str(game_id)).get()
        game = game_doc.to_dict()

        called_numbers = set(game.get('called_numbers', []))
        available_numbers = [n for n in range(1, 76) if n not in called_numbers]

        if not available_numbers:
            return None

        cartelas = self._get_active_cartelas(game_id)

        if admin_target:
            return self._generate_for_target(cartelas, available_numbers, called_numbers, admin_target)
        else:
            return self._generate_avoiding_win(cartelas, available_numbers, called_numbers)

    def _get_active_cartelas(self, game_id):
        """Get all active cartelas for a game"""
        docs = self.cartelas_ref.where('game_id', '==', game_id).get()
        return [doc.to_dict() for doc in docs]

    def _generate_for_target(self, cartelas, available, called, target_user_id):
        """Generate number that helps target player win"""
        target_cartela = None
        for cartela in cartelas:
            if cartela.get('user_id') == target_user_id:
                flat = cartela.get('cartela', [])
                target_cartela = []
                for row in range(5):
                    target_cartela.append(flat[row*5:(row+1)*5])
                break

        if not target_cartela:
            return random.choice(available)

        marked = set()
        for cartela in cartelas:
            if cartela.get('user_id') == target_user_id:
                marked = set(cartela.get('marked', []))
                break

        helpful_numbers = []
        for row in target_cartela:
            for num in row:
                if num != 0 and num in available and num not in marked:
                    helpful_numbers.append(num)

        if helpful_numbers:
            return random.choice(helpful_numbers)

        return random.choice(available)

    def _generate_avoiding_win(self, cartelas, available, called):
        """Generate number that avoids completing any player's pattern"""
        dangerous_numbers = set()

        for cartela_data in cartelas:
            flat = cartela_data.get('cartela', [])
            marked = set(cartela_data.get('marked', []))

            cartela = []
            for row in range(5):
                cartela.append(flat[row*5:(row+1)*5])

            for row in cartela:
                unmarked = [n for n in row if n != 0 and n not in marked and n in available]
                if len(unmarked) == 1:
                    dangerous_numbers.add(unmarked[0])

            for col in range(5):
                unmarked = [row[col] for row in cartela if row[col] != 0 and row[col] not in marked and row[col] in available]
                if len(unmarked) == 1:
                    dangerous_numbers.add(unmarked[0])

            diag1 = [cartela[i][i] for i in range(5)]
            unmarked_diag1 = [n for n in diag1 if n != 0 and n not in marked and n in available]
            if len(unmarked_diag1) == 1:
                dangerous_numbers.add(unmarked_diag1[0])

            diag2 = [cartela[i][4-i] for i in range(5)]
            unmarked_diag2 = [n for n in diag2 if n != 0 and n not in marked and n in available]
            if len(unmarked_diag2) == 1:
                dangerous_numbers.add(unmarked_diag2[0])

        safe_numbers = [n for n in available if n not in dangerous_numbers]

        if safe_numbers:
            return random.choice(safe_numbers)

        return random.choice(available)

    def calculate_win_probability(self, cartela: List[List], marked: set) -> float:
        """Calculate probability of winning with current state"""
        possible_lines = 0
        total_lines = 12

        for row in cartela:
            if all(n in marked or n == 0 for n in row):
                return 1.0
            unmarked = [n for n in row if n not in marked and n != 0]
            if len(unmarked) <= 2:
                possible_lines += 1

        for col in range(5):
            col_nums = [row[col] for row in cartela]
            if all(n in marked or n == 0 for n in col_nums):
                return 1.0
            unmarked = [n for n in col_nums if n not in marked and n != 0]
            if len(unmarked) <= 2:
                possible_lines += 1

        diag1 = [cartela[i][i] for i in range(5)]
        if all(n in marked or n == 0 for n in diag1):
            return 1.0

        diag2 = [cartela[i][4-i] for i in range(5)]
        if all(n in marked or n == 0 for n in diag2):
            return 1.0

        return possible_lines / total_lines
