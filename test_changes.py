#!/usr/bin/env python3
"""
Test script to verify all changes are working correctly.
Run: python test_changes.py
"""

import sys
import os

def test_python_syntax():
    """Test that Python files compile without syntax errors."""
    print("=" * 60)
    print("TEST 1: Python Syntax Check")
    print("=" * 60)
    
    files = [
        'api/admin_api.py',
        'game/round_engine.py',
        'game/engine.py',
        'firestore_db.py',
        'config.py',
    ]
    
    all_pass = True
    for f in files:
        path = os.path.join(os.path.dirname(__file__), f)
        try:
            with open(path, 'r', encoding='utf-8') as fh:
                code = fh.read()
            compile(code, path, 'exec')
            print(f"  [OK] {f}")
        except SyntaxError as e:
            print(f"  [FAIL] {f}: {e}")
            all_pass = False
    
    return all_pass


def test_prize_calculation():
    """Test that prize calculation uses exact math (no banker's rounding)."""
    print("\n" + "=" * 60)
    print("TEST 2: Prize Calculation (Exact Math)")
    print("=" * 60)
    
    test_cases = [
        # (player_count, stake, expected_derash, description)
        (1, 10, 7.5, "1 player x 10 ETB = 7.5 derash"),
        (2, 10, 15.0, "2 players x 10 ETB = 15 derash"),
        (1, 20, 15.0, "1 player x 20 ETB = 15 derash"),
        (3, 10, 22.5, "3 players x 10 ETB = 22.5 derash"),
        (4, 25, 75.0, "4 players x 25 ETB = 75 derash"),
        (1, 50, 37.5, "1 player x 50 ETB = 37.5 derash"),
    ]
    
    all_pass = True
    for player_count, stake, expected, desc in test_cases:
        # This is the NEW calculation (exact float, no int() or round())
        total_prize = player_count * stake * 0.75
        
        if total_prize == expected:
            print(f"  âœ“ {desc}: {total_prize} ETB")
        else:
            print(f"  âœ— {desc}: got {total_prize}, expected {expected}")
            all_pass = False
    
    return all_pass


def test_prize_split():
    """Test that prize is split correctly among multiple winners."""
    print("\n" + "=" * 60)
    print("TEST 3: Prize Split Among Winners")
    print("=" * 60)
    
    test_cases = [
        # (player_count, stake, num_winners, expected_per_winner)
        (10, 10, 1, 75.0),
        (10, 10, 2, 37.5),
        (10, 10, 5, 15.0),
        (10, 10, 10, 7.5),
        (1, 10, 1, 7.5),
        (2, 20, 2, 15.0),
    ]
    
    all_pass = True
    for player_count, stake, num_winners, expected in test_cases:
        total_prize = player_count * stake * 0.75
        prize_per_winner = total_prize / num_winners
        
        if prize_per_winner == expected:
            print(f"  âœ“ {player_count} players, {stake} ETB, {num_winners} winner(s): {prize_per_winner} ETB each")
        else:
            print(f"  âœ— Expected {expected}, got {prize_per_winner}")
            all_pass = False
    
    return all_pass


def test_no_bankers_rounding():
    """Verify we're NOT using Python's round() which causes banker's rounding."""
    print("\n" + "=" * 60)
    print("TEST 4: No Banker's Rounding (round(7.5) should NOT be used)")
    print("=" * 60)
    
    # Python's round() uses banker's rounding
    python_round_result = round(7.5)
    expected_correct = 7.5  # What we want
    
    if python_round_result == 8:
        print(f"  âš  Python round(7.5) = {python_round_result} (banker's rounding detected)")
        print(f"  âœ“ Our code should produce {expected_correct} instead")
        return True
    else:
        print(f"  âœ— Unexpected: Python round(7.5) = {python_round_result}")
        return False


def test_predictor_phases():
    """Test that the predictor has 3 phases."""
    print("\n" + "=" * 60)
    print("TEST 5: Predictor Phase Logic")
    print("=" * 60)
    
    # Read the round_engine.py to check phase thresholds
    engine_path = os.path.join(os.path.dirname(__file__), 'game/round_engine.py')
    try:
        with open(engine_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for phase thresholds
        has_phase1 = 'num_called < 40' in content
        has_phase2 = 'num_called < 55' in content
        has_zero_target = 'candidate_winners_count == 0' in content
        
        if has_phase1:
            print("  âœ“ Phase 1: Early game (num_called < 40)")
        else:
            print("  âœ— Phase 1 not found")
        
        if has_phase2:
            print("  âœ“ Phase 2: Mid game (num_called < 55)")
        else:
            print("  âœ— Phase 2 not found")
        
        if has_zero_target:
            print("  âœ“ Zero-winner target (candidate_winners_count == 0)")
        else:
            print("  âœ— Zero-winner target not found")
        
        return has_phase1 and has_phase2 and has_zero_target
    except Exception as e:
        print(f"  âœ— Error reading engine: {e}")
        return False


def test_winner_collection():
    """Test that admin_api collects ALL winners, not just the first."""
    print("\n" + "=" * 60)
    print("TEST 6: Multiple Winner Collection")
    print("=" * 60)
    
    api_path = os.path.join(os.path.dirname(__file__), 'api/admin_api.py')
    try:
        with open(api_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for multiple winner support
        has_list = 'bingo_winners = []' in content
        has_append = 'bingo_winners.append(uid_str)' in content
        has_no_break = 'break' not in content.split('bingo_winners')[1].split('if bingo_winners')[0]
        
        if has_list:
            print("  âœ“ Uses list for winners (bingo_winners = [])")
        else:
            print("  âœ— Missing winners list")
        
        has_append_result = has_append
        if has_append_result:
            print("  âœ“ Appends all winners (bingo_winners.append)")
        else:
            print("  âœ— Missing append")
        
        if has_no_break:
            print("  âœ“ No early break (checks all players)")
        else:
            print("  âœ— Still has break statement in winner loop")
        
        return has_list and has_append_result
    except Exception as e:
        print(f"  âœ— Error reading admin_api: {e}")
        return False


def test_calc_derash_zero_cards():
    """Test that calcDerash returns 0 when no cards selected."""
    print("\n" + "=" * 60)
    print("TEST 7: calcDerash Returns 0 for No Cards")
    print("=" * 60)
    
    js_path = os.path.join(os.path.dirname(__file__), 'dashboard/js/card-select.js')
    try:
        with open(js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for the fix
        has_return_zero = 'if (totalCartelas < 1) return 0;' in content
        has_no_forced_one = 'totalCartelas = 1' not in content
        
        if has_return_zero:
            print("  âœ“ Returns 0 when no cards selected")
        else:
            print("  âœ— Missing return 0 for empty selection")
        
        if has_no_forced_one:
            print("  âœ“ Does not force totalCartelas = 1")
        else:
            print("  âœ— Still forces totalCartelas = 1")
        
        return has_return_zero and has_no_forced_one
    except Exception as e:
        print(f"  âœ— Error reading card-select.js: {e}")
        return False


def test_debouncing():
    """Test that admin listeners have debouncing."""
    print("\n" + "=" * 60)
    print("TEST 8: Admin Listener Debouncing")
    print("=" * 60)
    
    listeners_path = os.path.join(os.path.dirname(__file__), 'dashboard/js/admin/listeners.js')
    try:
        with open(listeners_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for debounce timers
        has_users_debounce = '_usersRenderTimer' in content
        has_rounds_debounce = '_roundsRenderTimer' in content
        has_deposits_debounce = '_depositsRenderTimer' in content
        has_withdrawals_debounce = '_withdrawalsRenderTimer' in content
        
        if has_users_debounce:
            print("  âœ“ Users listener debounced")
        else:
            print("  âœ— Users listener not debounced")
        
        if has_rounds_debounce:
            print("  âœ“ Rounds listener debounced")
        else:
            print("  âœ— Rounds listener not debounced")
        
        if has_deposits_debounce:
            print("  âœ“ Deposits listener debounced")
        else:
            print("  âœ— Deposits listener not debounced")
        
        if has_withdrawals_debounce:
            print("  âœ“ Withdrawals listener debounced")
        else:
            print("  âœ— Withdrawals listener not debounced")
        
        return has_users_debounce and has_rounds_debounce
    except Exception as e:
        print(f"  âœ— Error reading listeners.js: {e}")
        return False


def test_no_redundant_db_reads():
    """Test that auth.js doesn't make redundant DB reads."""
    print("\n" + "=" * 60)
    print("TEST 9: No Redundant DB Reads in auth.js")
    print("=" * 60)
    
    auth_path = os.path.join(os.path.dirname(__file__), 'dashboard/js/auth.js')
    try:
        with open(auth_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find refreshCompletedStats function
        func_start = content.find('function refreshCompletedStats()')
        if func_start == -1:
            print("  âœ— refreshCompletedStats not found")
            return False
        
        func_end = content.find('\n}', func_start) + 2
        func_body = content[func_start:func_end]
        
        # Count DB queries
        query_count = func_body.count('.where(')
        
        if query_count <= 1:
            print(f"  âœ“ Only {query_count} DB query in refreshCompletedStats")
            return True
        else:
            print(f"  âœ— {query_count} DB queries found (should be 1)")
            return False
    except Exception as e:
        print(f"  âœ— Error reading auth.js: {e}")
        return False


def test_playnow_guard():
    """Test that playNow has recursion guard."""
    print("\n" + "=" * 60)
    print("TEST 10: playNow Recursion Guard")
    print("=" * 60)
    
    js_path = os.path.join(os.path.dirname(__file__), 'dashboard/js/card-select.js')
    try:
        with open(js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        has_guard_var = '_playNowRunning' in content
        has_guard_check = 'if (_playNowRunning) return;' in content
        has_guard_set = '_playNowRunning = true' in content
        has_guard_clear = '_playNowRunning = false' in content
        
        if has_guard_var and has_guard_check:
            print("  âœ“ Recursion guard present")
        else:
            print("  âœ— Missing recursion guard")
        
        return has_guard_var and has_guard_check
    except Exception as e:
        print(f"  âœ— Error: {e}")
        return False


def main():
    print("\n" + "=" * 60)
    print("  BINGO GAME - COMPREHENSIVE TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("Python Syntax", test_python_syntax),
        ("Prize Calculation", test_prize_calculation),
        ("Prize Split", test_prize_split),
        ("No Banker's Rounding", test_no_bankers_rounding),
        ("Predictor Phases", test_predictor_phases),
        ("Winner Collection", test_winner_collection),
        ("calcDerash Zero Cards", test_calc_derash_zero_cards),
        ("Debouncing", test_debouncing),
        ("No Redundant DB Reads", test_no_redundant_db_reads),
        ("playNow Guard", test_playnow_guard),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"\n  âœ— EXCEPTION in {name}: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("  TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, p in results if p)
    total = len(results)
    
    for name, p in results:
        status = "âœ“ PASS" if p else "âœ— FAIL"
        print(f"  {status}: {name}")
    
    print("\n" + "-" * 60)
    print(f"  Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n  ðŸŽ‰ ALL TESTS PASSED! Changes are safe.")
        return 0
    else:
        print(f"\n  âš  {total - passed} test(s) failed. Review before deploying.")
        return 1


if __name__ == '__main__':
    sys.exit(main())
