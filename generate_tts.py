"""
Pre-generate ALL Amharic bingo TTS audio files (5 letters x 75 numbers = 375 files).
Run: python generate_tts.py
Requires: pip install gTTS

This script reads the Amharic strings DIRECTLY from game.html to ensure 100% correctness.
"""
import os, sys, re, time
from gtts import gTTS

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

def extract_from_game_html():
    """Read game.html and extract the Amharic dictionaries."""
    with open(os.path.join('dashboard', 'game.html'), 'r', encoding='utf-8') as f:
        content = f.read()

    numbers = {}
    m = re.search(r'const AMHARIC_NUMBERS\s*=\s*\{(.*?)\};', content, re.DOTALL)
    if m:
        for match in re.finditer(r"(\d+)\s*:\s*'([^']+)'", m.group(1)):
            numbers[int(match.group(1))] = match.group(2)

    letters = {}
    m2 = re.search(r'BINGO_LETTERS_AMHARIC\s*=\s*\{(.*?)\}', content, re.DOTALL)
    if m2:
        for match in re.finditer(r"'([A-Z])'\s*:\s*'([^']+)'", m2.group(1)):
            letters[match.group(1)] = match.group(2)

    return numbers, letters

LETTERS = ['B', 'I', 'N', 'G', 'O']

def main():
    output_dir = os.path.join('dashboard', 'public', 'audio')
    os.makedirs(output_dir, exist_ok=True)

    amharic_numbers, bingo_letters = extract_from_game_html()

    if not amharic_numbers or not bingo_letters:
        print('ERROR: Could not extract Amharic data from game.html')
        sys.exit(1)

    print(f'Loaded {len(amharic_numbers)} numbers and {len(bingo_letters)} letters from game.html')

    generated = 0
    skipped = 0
    errors = 0

    for letter in LETTERS:
        am_letter = bingo_letters[letter]
        for num in range(1, 76):
            am_num = amharic_numbers[num]
            text = am_letter + ' ' + am_num
            filename = f'{letter}{num}.mp3'
            filepath = os.path.join(output_dir, filename)

            if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
                skipped += 1
                continue

            try:
                tts = gTTS(text=text, lang='am')
                tts.save(filepath)
                generated += 1
                print(f'  OK   {filename}')
                time.sleep(0.15)
            except Exception as e:
                errors += 1
                print(f'  ERR  {filename}: {e}')

    print(f'\nDone! Generated: {generated}, Skipped: {skipped}, Errors: {errors}, Total: 375')

if __name__ == '__main__':
    main()
