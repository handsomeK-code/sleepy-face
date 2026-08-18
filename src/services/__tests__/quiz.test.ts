import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type QuizServiceModule = typeof import('../quiz');

let quizService: QuizServiceModule;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function sequenceRandom(values: number[]) {
  let index = 0;

  return () => {
    const value = values[index];
    index += 1;

    return value ?? 0;
  };
}

function expectQuizServiceError(
  error: unknown,
  code: InstanceType<QuizServiceModule['QuizServiceError']>['code'],
) {
  expect(error).toBeInstanceOf(quizService.QuizServiceError);
  expect(
    (error as InstanceType<QuizServiceModule['QuizServiceError']>).code,
  ).toBe(code);
}

describe('Quiz Question service', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    quizService = await import('../quiz');
  });

  it('returns null before a quiz starts', () => {
    expect(quizService.getQuizState()).toBeNull();
  });

  it('starts a quiz with a public first Quiz Question', () => {
    const state = quizService.startQuiz({ random: sequenceRandom([0, 0, 0]) });

    expect(state).toEqual({
      attemptNumber: 1,
      correctAnswerCount: 0,
      lastAnswerCorrect: null,
      question: {
        id: 'quiz-question-1',
        prompt: '10 + 10',
      },
      requiredCorrectAnswerCount: 3,
      status: 'active',
    });
    if (state.status !== 'active') {
      throw new Error('Expected active quiz state.');
    }

    expect('answer' in state.question).toBe(false);
    expect(quizService.getQuizState()).toEqual(state);
  });

  it('throws a typed error when submitting before a quiz starts', () => {
    expect(() => quizService.submitQuizAnswer('20')).toThrow(
      quizService.QuizServiceError,
    );

    try {
      quizService.submitQuizAnswer('20');
    } catch (error) {
      expectQuizServiceError(error, 'quiz_not_started');
    }
  });

  it('accepts trimmed integer text for a correct answer', () => {
    quizService.startQuiz({ random: sequenceRandom([0, 0, 0, 0.1, 0.2, 0]) });

    expect(quizService.submitQuizAnswer(' 20 ')).toEqual({
      attemptNumber: 2,
      correctAnswerCount: 1,
      lastAnswerCorrect: true,
      question: {
        id: 'quiz-question-2',
        prompt: '19 + 28',
      },
      requiredCorrectAnswerCount: 3,
      status: 'active',
    });
  });

  it.each(['', '20.0', '20abc', 'not awake'])(
    'treats invalid answer text %s as an incorrect answer',
    (answerText) => {
      quizService.startQuiz({
        random: sequenceRandom([0, 0, 0, 0.2, 0.3, 0]),
      });

      expect(quizService.submitQuizAnswer(answerText)).toEqual({
        attemptNumber: 2,
        correctAnswerCount: 0,
        lastAnswerCorrect: false,
        question: {
          id: 'quiz-question-2',
          prompt: '28 + 37',
        },
        requiredCorrectAnswerCount: 3,
        status: 'active',
      });
    },
  );

  it('advances Quiz Attempt Number but not Quiz Progress after a wrong answer', () => {
    quizService.startQuiz({ random: sequenceRandom([0, 0, 0, 0.4, 0.5, 0]) });

    expect(quizService.submitQuizAnswer('19')).toEqual({
      attemptNumber: 2,
      correctAnswerCount: 0,
      lastAnswerCorrect: false,
      question: {
        id: 'quiz-question-2',
        prompt: '46 + 55',
      },
      requiredCorrectAnswerCount: 3,
      status: 'active',
    });
  });

  it('completes after three correct answers', () => {
    quizService.startQuiz({
      random: sequenceRandom([0, 0, 0, 0.1, 0.2, 0, 0.3, 0.4, 0]),
    });

    quizService.submitQuizAnswer('20');
    quizService.submitQuizAnswer('47');

    expect(quizService.submitQuizAnswer('83')).toEqual({
      attemptNumber: 3,
      correctAnswerCount: 3,
      lastAnswerCorrect: true,
      question: null,
      requiredCorrectAnswerCount: 3,
      status: 'completed',
    });
  });

  it('replaces any previous quiz when starting again', () => {
    quizService.startQuiz({ random: sequenceRandom([0, 0, 0]) });
    quizService.submitQuizAnswer('20');

    expect(
      quizService.startQuiz({ random: sequenceRandom([0.5, 0.2, 0]) }),
    ).toEqual({
      attemptNumber: 1,
      correctAnswerCount: 0,
      lastAnswerCorrect: null,
      question: {
        id: 'quiz-question-1',
        prompt: '55 + 28',
      },
      requiredCorrectAnswerCount: 3,
      status: 'active',
    });
  });

  it('generates two-digit subtraction questions', () => {
    expect(
      quizService.startQuiz({ random: sequenceRandom([0, 0, 0.9]) }),
    ).toMatchObject({
      question: {
        prompt: '10 - 10',
      },
    });
  });
});
