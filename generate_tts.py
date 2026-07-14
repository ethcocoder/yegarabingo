"""
Pre-generate all Amharic bingo number TTS audio files.
Run this once to generate audio files in dashboard/public/audio/
Requires: pip install gTTS
"""
import os
from gtts import gTTS

AMHARIC_NUMBERS = {
    0: 'ዜሮ', 1: 'አንድ', 2: 'ሁለት', 3: 'ሦስት', 4: 'አራት', 5: 'አምስት',
    6: 'ስድስት', 7: 'ሰባት', 8: 'ስምንት', 9: 'ዘጠኝ', 10: 'አሥር',
    11: 'አስራ አንድ', 12: 'አስራ ሁለት', 13: 'አስራ ሦስት', 14: 'አስራ አራት', 15: 'አስራ አምስት',
    16: 'አስራ ስድስት', 17: 'አስራ ሰባት', 18: 'አስራ ስምንት', 19: 'አስራ ዘጠኝ', 20: 'ሀያ',
    21: 'ሀያ አንድ', 22: 'ሀያ ሁለት', 23: 'ሀያ ሦስት', 24: 'ሀያ አራት', 25: 'ሀያ አምስት',
    26: 'ሀያ ስድስት', 27: 'ሀያ ሰባት', 28: 'ሀያ ስምንት', 29: 'ሀያ ዘጠኝ', 30: 'ሠላሳ',
    31: 'ሠላሳ አንድ', 32: 'ሠላሳ ሁለት', 33: 'ሠላሳ ሦስት', 34: 'ሠላሳ አራት', 35: 'ሠላሳ አምስት',
    36: 'ሠላሳ ስድስት', 37: 'ሠላሳ ሰባት', 38: 'ሠላሳ ስምንት', 39: 'ሠላሳ ዘጠኝ', 40: 'አርባ',
    41: 'አርባ አንድ', 42: 'አርባ ሁለት', 43: 'አርባ ሦስት', 44: 'አርባ አራት', 45: 'አርባ አምስት',
    46: 'አርባ ስድስት', 47: 'አርባ ሰባት', 48: 'አርባ ስምንት', 49: 'አርባ ዘጠኝ', 50: 'ሃምሳ',
    51: 'ሃምሳ አንድ', 52: 'ሃምሳ ሁለት', 53: 'ሃምሳ ሦስት', 54: 'ሃምሳ አራት', 55: 'ሃምሳ አምስት',
    56: 'ሃምሳ ስድስት', 57: 'ሃምሳ ሰባት', 58: 'ሃምሳ ስምንት', 59: 'ሃምሳ ዘጠኝ', 60: 'ስልሳ',
    61: 'ስልሳ አንድ', 62: 'ስልሳ ሁለት', 63: 'ስልሳ ሶስት', 64: 'ስልሳ አራት', 65: 'ስልሳ አምስት',
    66: 'ስልሳ ስድስት', 67: 'ስልሳ ሰባት', 68: 'ስልሳ ስምንት', 69: 'ስልሳ ዘጠኝ', 70: 'ሰባ',
    71: 'ሰባ አንድ', 72: 'ሰባ ሁለት', 73: 'ሰባ ሦስት', 74: 'ሰባ አራት', 75: 'ሰባ አምስት'
}

BINGO_LETTERS_AMHARIC = {
    'B': 'ቢ', 'I': 'አይ', 'N': 'ኤን', 'G': 'ጂ', 'O': 'ኦ'
}

BINGO_RANGES = [
    {'letter': 'B', 'min': 1, 'max': 15},
    {'letter': 'I', 'min': 16, 'max': 30},
    {'letter': 'N', 'min': 31, 'max': 45},
    {'letter': 'G', 'min': 46, 'max': 60},
    {'letter': 'O', 'min': 61, 'max': 75}
]

def get_letter(num):
    for r in BINGO_RANGES:
        if r['min'] <= num <= r['max']:
            return r['letter']
    return 'X'

def main():
    output_dir = os.path.join('dashboard', 'public', 'audio')
    os.makedirs(output_dir, exist_ok=True)

    total = 0
    for num in range(1, 76):
        letter = get_letter(num)
        amharic_num = AMHARIC_NUMBERS[num]
        amharic_letter = BINGO_LETTERS_AMHARIC[letter]
        text = amharic_letter + ' ' + amharic_num
        filename = f'{letter}{num}.mp3'
        filepath = os.path.join(output_dir, filename)

        if os.path.exists(filepath):
            print(f'  SKIP {filename} (exists)')
            continue

        try:
            tts = gTTS(text=text, lang='am')
            tts.save(filepath)
            total += 1
            print(f'  OK   {filename} -> "{text}"')
        except Exception as e:
            print(f'  ERR  {filename}: {e}')

    print(f'\nDone! Generated {total} files in {output_dir}')

if __name__ == '__main__':
    main()
