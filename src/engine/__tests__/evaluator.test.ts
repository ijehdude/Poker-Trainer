import { describe, it, expect } from 'vitest';
import { parseCards } from '../cards';
import { evaluateCards, compareHands } from '../evaluator';
import { HandCategory } from '../types';

const cat = (s: string) => evaluateCards(parseCards(s)).category;
const score = (s: string) => evaluateCards(parseCards(s)).score;

describe('evaluator — category detection (7 cards)', () => {
  it('detects a royal / straight flush', () => {
    expect(cat('As Ks Qs Js Ts 2c 3d')).toBe(HandCategory.StraightFlush);
  });
  it('detects four of a kind', () => {
    expect(cat('9c 9d 9h 9s Kc 2d 3h')).toBe(HandCategory.FourOfAKind);
  });
  it('detects a full house', () => {
    expect(cat('Kc Kd Kh 4s 4d 9c 2h')).toBe(HandCategory.FullHouse);
  });
  it('full house from two trips uses the higher as the trip', () => {
    const v = evaluateCards(parseCards('Kc Kd Kh 4s 4d 4c 2h'));
    expect(v.category).toBe(HandCategory.FullHouse);
    expect(v.tiebreak[0]).toBe(13); // trips of kings
    expect(v.tiebreak[1]).toBe(4); // pair of fours
  });
  it('detects a flush', () => {
    expect(cat('As 9s 7s 4s 2s Kd Qh')).toBe(HandCategory.Flush);
  });
  it('detects a straight', () => {
    expect(cat('5c 6d 7h 8s 9c Ad Kh')).toBe(HandCategory.Straight);
  });
  it('detects the wheel (A-2-3-4-5) with high card 5', () => {
    const v = evaluateCards(parseCards('Ac 2d 3h 4s 5c Kd Qh'));
    expect(v.category).toBe(HandCategory.Straight);
    expect(v.tiebreak[0]).toBe(5);
  });
  it('detects Broadway (T-J-Q-K-A) with high card A', () => {
    const v = evaluateCards(parseCards('Tc Jd Qh Ks Ac 2d 3h'));
    expect(v.category).toBe(HandCategory.Straight);
    expect(v.tiebreak[0]).toBe(14);
  });
  it('detects three of a kind', () => {
    expect(cat('7c 7d 7h Ks 9c 4d 2h')).toBe(HandCategory.ThreeOfAKind);
  });
  it('detects two pair', () => {
    expect(cat('Jc Jd 4h 4s Kc 9d 2h')).toBe(HandCategory.TwoPair);
  });
  it('detects one pair', () => {
    expect(cat('Tc Td Kh 7s 4c 9d 2h')).toBe(HandCategory.Pair);
  });
  it('detects high card', () => {
    expect(cat('Ac Jd 9h 7s 4c 3d 2h')).toBe(HandCategory.HighCard);
  });
});

describe('evaluator — strict category ordering', () => {
  const ladder = [
    'Ac Jd 9h 7s 4c', // high card
    'Tc Td Kh 7s 4c', // pair
    'Jc Jd 4h 4s Kc', // two pair
    '7c 7d 7h Ks 9c', // trips
    '5c 6d 7h 8s 9c', // straight
    'As 9s 7s 4s 2s', // flush
    'Kc Kd Kh 4s 4d', // full house
    '9c 9d 9h 9s Kc', // quads
    'As Ks Qs Js Ts', // straight flush
  ];
  it('each rung beats the one below it', () => {
    for (let i = 1; i < ladder.length; i++) {
      expect(score(ladder[i]!)).toBeGreaterThan(score(ladder[i - 1]!));
    }
  });
});

describe('evaluator — tiebreakers', () => {
  it('higher flush wins on the top card', () => {
    expect(
      compareHands(parseCards('As 9s 7s 4s 2s'), parseCards('Ks Qs 7s 4s 2s')),
    ).toBeGreaterThan(0);
  });
  it('kicker decides equal pairs', () => {
    expect(
      compareHands(parseCards('Ac Ad Kh 7s 4c'), parseCards('Ac Ad Qh 7s 4c')),
    ).toBeGreaterThan(0);
  });
  it('identical hands chop (equal score) regardless of suits', () => {
    expect(score('As Ks Qd Jc Th')).toBe(score('Ac Kc Qh Jd Ts'));
  });
  it('best 5 of 7 ignores irrelevant low cards', () => {
    // both make ace-high flush in spades; extra cards differ but must tie
    const a = parseCards('As Ks Qs Js 9s 2c 3d');
    const b = parseCards('As Ks Qs Js 9s 4h 5h');
    expect(compareHands(a, b)).toBe(0);
  });
  it('a higher straight beats a lower straight', () => {
    expect(
      compareHands(parseCards('6c 7d 8h 9s Tc'), parseCards('5c 6d 7h 8s 9c')),
    ).toBeGreaterThan(0);
  });
  it('the wheel loses to a six-high straight', () => {
    expect(compareHands(parseCards('Ac 2d 3h 4s 5c'), parseCards('2c 3d 4h 5s 6c'))).toBeLessThan(
      0,
    );
  });
});
