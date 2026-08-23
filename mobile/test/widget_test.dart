import 'package:flutter_test/flutter_test.dart';
import 'package:translated_vlc_mobile/data.dart';

StudyCard card({
  String source = 'Film',
  String? season,
  String? episode,
  String text = 'word',
  String? phrase,
  String? context,
}) => StudyCard(
  id: '$source-$season-$episode-$text-$phrase',
  mediaTitle: source,
  season: season,
  episode: episode,
  timecodeMs: null,
  selectedText: text,
  translation: 'слово',
  focusWord: null,
  focusPhrase: phrase,
  focusTranslation: null,
  synonyms: const [],
  senseNote: null,
  archived: false,
  createdAt: DateTime.now(),
  context: context,
);

/// Mirrors ClozeGamePage._prompt so the blanking rule is covered by a test.
String cloze(String line, String label, String focusWord) {
  for (final candidate in [label, focusWord]) {
    final words = RegExp(r"[A-Za-z']+")
        .allMatches(candidate)
        .map((match) => match.group(0)!)
        .toList();
    if (words.isEmpty) continue;
    final pattern = RegExp(
      r'\b' + words.map((w) => RegExp.escape(w) + r'\w*').join(r'\s+') + r'\b',
      caseSensitive: false,
    );
    if (pattern.hasMatch(line)) return line.replaceFirst(pattern, '_____');
  }
  return '$line  _____';
}

void main() {
  group('fill-the-line distractors', () {
    // Mirrors _WordBank.matching: wrong answers must be the same shape as the
    // right one, or the question answers itself.
    const particles = {'to', 'about', 'for', 'with', 'up', 'out', 'on', 'off', 'in', 'from'};
    String kindOf(String answer) {
      final words = answer.toLowerCase().trim().split(RegExp(r'\s+'));
      final last = words.last;
      if (words.length > 1 && particles.contains(last)) return 'particle:$last';
      final head = words.length > 1 ? last : words.first;
      if (head.endsWith('ing')) return 'ing';
      if (head.endsWith('ed')) return 'ed';
      for (final ending in ['ant', 'ent', 'ive', 'ous', 'ful', 'less']) {
        if (head.endsWith(ending)) return 'adjective';
      }
      if (head.endsWith('s') && !head.endsWith('ss')) return 'plural';
      return 'plain';
    }

    test('an expression is answered by expressions with the same particle', () {
      expect(kindOf('reluctant to'), 'particle:to');
      expect(kindOf('brag about'), 'particle:about');
      expect(kindOf('looking for'), 'particle:for');
    });

    test('a compound noun is matched on its head word', () {
      // "employment record" must be answered against nouns, not against
      // "willing to".
      expect(kindOf('employment record'), 'plain');
      expect(kindOf('seize the day'), 'plain');
    });

    test('single words follow their ending', () {
      expect(kindOf('bragging'), 'ing');
      expect(kindOf('dismissed'), 'ed');
      expect(kindOf('reluctant'), 'adjective');
      expect(kindOf('excuses'), 'plural');
      expect(kindOf('trifle'), 'plain');
    });
  });

  group('fill-the-line blanking', () {
    test('swallows the whole inflected phrase', () {
      expect(
        cloze('He keeps bragging about his new car', 'brag about', 'brag'),
        'He keeps _____ his new car',
      );
    });

    test('handles an exact single word', () {
      expect(
        cloze('Or will it bias the jury against us?', 'bias', 'bias'),
        'Or will it _____ the jury against us?',
      );
    });

    test('never leaves a word fragment behind', () {
      final result = cloze('She was reluctantly quiet', 'reluctant', 'reluctant');
      expect(result.contains('ly'), isFalse);
      expect(result, 'She was _____ quiet');
    });

    test('falls back to a trailing gap when the word is absent', () {
      expect(cloze('Totally different line', 'bias', 'bias').endsWith('_____'), isTrue);
    });
  });

  group('practice context', () {
    test('uses the saved subtitle line instead of an isolated word', () {
      final made = card(
        text: 'made',
        context: 'They made her out to be a hero.',
      );
      expect(made.contextLine, 'They made her out to be a hero.');
    });
  });

  test('formats subtitle timestamps', () {
    // The hour segment is dropped below one hour so the source chip on a card
    // stays short; it comes back as soon as it carries information.
    expect(timecode(65 * 1000), '01:05');
    expect(timecode(3725 * 1000), '01:02:05');
  });

  group('example parsing', () {
    test('reads the structured shape', () {
      final example = StudyExample.fromJson({
        'text': 'He kept bragging about it.',
        'translation': 'Он всё хвастался этим.',
      });
      expect(example.text, 'He kept bragging about it.');
      expect(example.translation, 'Он всё хвастался этим.');
    });

    test('splits a legacy "sentence — translation" string', () {
      final example = StudyExample.fromJson('Nice car — Хорошая машина');
      expect(example.text, 'Nice car');
      expect(example.translation, 'Хорошая машина');
    });

    test('keeps a bare sentence without inventing a translation', () {
      final example = StudyExample.fromJson('Nice car');
      expect(example.text, 'Nice car');
      expect(example.translation, isNull);
    });
  });

  group('achievements', () {
    test('counts distinct series separately from all sources', () {
      final stats = StudyStats.from([
        card(source: 'Dark', season: '1', episode: '1'),
        card(source: 'Dark', season: '1', episode: '2'),
        card(source: 'The Bear', season: '2', episode: '3'),
        card(source: 'Dune'),
      ]);
      expect(stats.series, 2);
      expect(stats.sources, 3);
      expect(stats.total, 4);
    });

    test('deep dive tracks the busiest single series', () {
      final stats = StudyStats.from([
        card(source: 'Dark', season: '1', episode: '1'),
        card(source: 'Dark', season: '1', episode: '2'),
        card(source: 'Dark', season: '1', episode: '3'),
        card(source: 'The Bear', season: '2', episode: '3'),
      ]);
      expect(stats.longestRun, 3);
    });

    test('archived cards count towards totals and the Retired badge', () {
      final stats = StudyStats.from(
        [card(text: 'one')],
        [card(text: 'two'), card(text: 'three')],
      );
      expect(stats.total, 3);
      expect(stats.active, 1);
      expect(stats.learned, 2);
      final retired = stats.achievements.firstWhere((a) => a.id == 'learned');
      expect(retired.level, 1);
    });

    test('levels and progress restart at each tier', () {
      final cards = List.generate(12, (index) => card(text: 'word$index'));
      final collector = StudyStats.from(
        cards,
      ).achievements.firstWhere((a) => a.id == 'collector');
      // Tiers are 1, 10, 25 …: twelve words clears two of them.
      expect(collector.level, 2);
      expect(collector.target, 25);
      expect(collector.progress, closeTo((12 - 10) / (25 - 10), 0.001));
      expect(collector.complete, isFalse);
    });

    test('a phrase counts for the phrasebook, a single word does not', () {
      final stats = StudyStats.from([
        card(text: 'brag about it', phrase: 'brag about'),
        card(text: 'knees'),
      ]);
      expect(stats.phrases, 1);
    });

    test('nextUp picks the achievement closest to its next level', () {
      final stats = StudyStats.from([
        card(source: 'Dark', season: '1', episode: '1'),
        card(source: 'The Bear', season: '2', episode: '3'),
      ]);
      expect(stats.nextUp, isNotNull);
      expect(stats.nextUp!.complete, isFalse);
    });

    test('an empty library reports no unlocked levels', () {
      final stats = StudyStats.from(const []);
      expect(stats.unlocked, 0);
      expect(stats.achievements.every((a) => a.level == 0), isTrue);
    });
  });
}
