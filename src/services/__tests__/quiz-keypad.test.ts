import { describe, expect, it } from 'vitest';

import { applyQuizKeypadInput } from '../quiz-keypad';

describe('applyQuizKeypadInput', () => {
  it('appends a digit to empty text', () => {
    expect(applyQuizKeypadInput('', '5')).toBe('5');
  });

  it('appends a digit to non-empty text', () => {
    expect(applyQuizKeypadInput('12', '3')).toBe('123');
  });

  it('clears the text back to empty regardless of current value', () => {
    expect(applyQuizKeypadInput('123', 'clear')).toBe('');
    expect(applyQuizKeypadInput('', 'clear')).toBe('');
  });

  it('prepends a minus sign to empty text', () => {
    expect(applyQuizKeypadInput('', 'minus')).toBe('-');
  });

  it('prepends a minus sign to positive text', () => {
    expect(applyQuizKeypadInput('12', 'minus')).toBe('-12');
  });

  it('removes the minus sign when toggled again', () => {
    expect(applyQuizKeypadInput('-12', 'minus')).toBe('12');
  });

  it('removes the last character on backspace', () => {
    expect(applyQuizKeypadInput('123', 'backspace')).toBe('12');
    expect(applyQuizKeypadInput('1', 'backspace')).toBe('');
  });

  it('is a safe no-op for backspace on empty text', () => {
    expect(applyQuizKeypadInput('', 'backspace')).toBe('');
  });

  it('handles every digit key', () => {
    for (const digit of [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ] as const) {
      expect(applyQuizKeypadInput('', digit)).toBe(digit);
    }
  });
});
