export type QuizKeypadDigit =
  '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type QuizKeypadKey = QuizKeypadDigit | 'backspace' | 'clear' | 'minus';

export function applyQuizKeypadInput(
  currentAnswerText: string,
  key: QuizKeypadKey,
): string {
  if (key === 'clear') {
    return '';
  }

  if (key === 'backspace') {
    return currentAnswerText.slice(0, -1);
  }

  if (key === 'minus') {
    return currentAnswerText.startsWith('-')
      ? currentAnswerText.slice(1)
      : `-${currentAnswerText}`;
  }

  return currentAnswerText + key;
}
