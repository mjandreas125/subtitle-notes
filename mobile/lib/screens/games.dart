import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data.dart';
import '../design/components.dart';
import '../design/tokens.dart';
import '../i18n.dart';

/// Two short games, both built from words the player actually saved. Nothing
/// is timed and nothing is lost by stopping halfway: the point is a couple of
/// minutes of recall, not pressure.
class GamesTab extends StatelessWidget {
  const GamesTab({required this.cards, super.key});

  final List<StudyCard> cards;

  static const _minimumPairs = 4;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final playable = cards
        .where((card) =>
            card.learningLabel.trim().isNotEmpty &&
            card.primaryMeaning.trim().isNotEmpty)
        .toList();
    final withContext = playable
        .where((card) => (card.contextLine ?? '').split(' ').length > 3)
        .toList();

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(
            AppSpace.gutter,
            AppSpace.md,
            AppSpace.gutter,
            AppSpace.md,
          ),
          decoration: BoxDecoration(
            color: c.surface,
            border: Border(bottom: BorderSide(color: c.line, width: 1.5)),
          ),
          child: Row(
            children: [
              IconTile(
                icon: Icons.sports_esports_rounded,
                color: c.onAmber,
                background: c.amber,
                size: 36,
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Text(context.t('Practice'), style: AppText.heading(c.ink)),
              ),
            ],
          ),
        ),
        Expanded(
          child: playable.length < _minimumPairs
              ? EmptyState(
                  icon: Icons.sports_esports_rounded,
                  title: context.t('Save a few more words'),
                  message: context
                      .t('The games are built from your own library. With %d words there is enough to play.')
                      .replaceAll('%d', '$_minimumPairs'),
                  tone: c.amber,
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpace.gutter,
                    AppSpace.lg,
                    AppSpace.gutter,
                    AppSpace.h1,
                  ),
                  children: [
                    _GameCard(
                      title: context.t('Match the pairs'),
                      description:
                          context.t('Turn over two cards and keep them if the word matches its meaning.'),
                      icon: Icons.grid_view_rounded,
                      accent: c.green,
                      wash: c.greenWash,
                      onPlay: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => MatchGamePage(cards: playable),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpace.md),
                    _GameCard(
                      title: context.t('Fill the line'),
                      description: context.t(
                        withContext.length < _minimumPairs
                            ? 'Needs a few more words saved from a subtitle line.'
                            : 'A line from something you watched, with one word '
                                  'missing. Pick the one that belongs.',
                      ),
                      icon: Icons.subtitles_rounded,
                      accent: c.blue,
                      wash: c.blueWash,
                      onPlay: withContext.length < _minimumPairs
                          ? null
                          : () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ClozeGamePage(
                                  cards: withContext,
                                  distractors: playable,
                                ),
                              ),
                            ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }
}

class _GameCard extends StatelessWidget {
  const _GameCard({
    required this.title,
    required this.description,
    required this.icon,
    required this.accent,
    required this.wash,
    required this.onPlay,
  });

  final String title, description;
  final IconData icon;
  final Color accent, wash;
  final VoidCallback? onPlay;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Opacity(
      opacity: onPlay == null ? .6 : 1,
      child: AppCard(
        raised: true,
        padding: const EdgeInsets.all(AppSpace.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconTile(icon: icon, color: accent, background: wash, size: 48),
                const SizedBox(width: AppSpace.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: AppText.word(c.ink)),
                      const SizedBox(height: 3),
                      Text(
                        description,
                        style: font(
                          size: 13,
                          weight: 600,
                          color: c.ink3,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.lg),
            PushButton(
              label: context.t('Play'),
              icon: Icons.play_arrow_rounded,
              onPressed: onPlay,
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Game one: match the pairs
// ---------------------------------------------------------------------------

class _Tile {
  _Tile({required this.pairId, required this.text, required this.isMeaning});

  final int pairId;
  final String text;
  final bool isMeaning;
  bool matched = false;
}

class MatchGamePage extends StatefulWidget {
  const MatchGamePage({required this.cards, super.key});
  final List<StudyCard> cards;

  @override
  State<MatchGamePage> createState() => _MatchGamePageState();
}

class _MatchGamePageState extends State<MatchGamePage> {
  static const _pairsPerRound = 6;

  late List<_Tile> _tiles;
  int? _first;
  int? _second;
  bool _locked = false;
  int _moves = 0;
  int _found = 0;
  int _round = 0;

  @override
  void initState() {
    super.initState();
    _deal();
  }

  void _deal() {
    final random = Random();
    final pool = [...widget.cards]..shuffle(random);
    final chosen = pool.take(min(_pairsPerRound, pool.length)).toList();
    _tiles = [
      for (var index = 0; index < chosen.length; index++) ...[
        _Tile(
          pairId: index,
          text: chosen[index].learningLabel,
          isMeaning: false,
        ),
        _Tile(
          pairId: index,
          text: chosen[index].primaryMeaning,
          isMeaning: true,
        ),
      ],
    ]..shuffle(random);
    _first = null;
    _second = null;
    _locked = false;
    _moves = 0;
    _found = 0;
    _round++;
  }

  void _flip(int index) {
    if (_locked || _tiles[index].matched || index == _first) return;
    HapticFeedback.selectionClick();

    if (_first == null) {
      setState(() => _first = index);
      return;
    }

    setState(() {
      _second = index;
      _moves++;
      _locked = true;
    });

    final a = _tiles[_first!];
    final b = _tiles[index];
    // A pair is one word and one meaning belonging to the same card, so two
    // meanings that happen to read alike can never count.
    final matched = a.pairId == b.pairId && a.isMeaning != b.isMeaning;

    Future.delayed(Duration(milliseconds: matched ? 320 : 800), () {
      if (!mounted) return;
      setState(() {
        if (matched) {
          a.matched = true;
          b.matched = true;
          _found++;
          HapticFeedback.mediumImpact();
        }
        _first = null;
        _second = null;
        _locked = false;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final pairs = _tiles.length ~/ 2;
    final done = _found == pairs;

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: [
            _GameBar(
              title: context.t('Match the pairs'),
              trailing: '$_found / $pairs',
              accent: c.green,
            ),
            Expanded(
              child: done
                  ? _Finished(
                      title: context.t('Round complete'),
                      message: _moves == pairs
                          ? context.t('Not a single wrong turn.')
                          : '$_moves ${context.t('turns')}',
                      accent: c.green,
                      onAgain: () => setState(_deal),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.all(AppSpace.gutter),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: AppSpace.md,
                            mainAxisSpacing: AppSpace.md,
                            childAspectRatio: 1.35,
                          ),
                      itemCount: _tiles.length,
                      itemBuilder: (context, index) => _MatchTile(
                        // Tied to the card, so a fresh deal starts face down
                        // instead of animating out of the old tile's state.
                        key: ValueKey('${_tiles[index].pairId}-'
                            '${_tiles[index].isMeaning}-$_round'),
                        tile: _tiles[index],
                        revealed: index == _first || index == _second,
                        onTap: () => _flip(index),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MatchTile extends StatelessWidget {
  const _MatchTile({
    required this.tile,
    required this.revealed,
    required this.onTap,
    super.key,
  });

  final _Tile tile;
  final bool revealed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final open = revealed || tile.matched;
    final accent = tile.isMeaning ? c.blue : c.green;

    return Squish(
      onTap: tile.matched ? null : onTap,
      scale: .95,
      semanticLabel: open ? tile.text : context.t('Hidden card'),
      child: AnimatedOpacity(
        opacity: tile.matched ? .45 : 1,
        duration: AppMotion.quick,
        // A half-turn reads as a flip without needing a 3D transform: the face
        // swaps at the point where the card is edge-on.
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: open ? 1 : 0),
          duration: AppMotion.normal,
          curve: Curves.easeInOut,
          builder: (context, value, _) {
            final showFace = value > .5;
            return Transform(
              alignment: Alignment.center,
              transform: Matrix4.identity()
                ..setEntry(3, 2, 0.0012)
                ..rotateY((value < .5 ? value : value - 1) * 3.14159),
              child: Container(
                decoration: BoxDecoration(
                  color: showFace
                      ? (tile.matched ? c.greenWash : c.surface)
                      : c.surfaceAlt,
                  borderRadius: BorderRadius.circular(AppRadius.card),
                  border: Border.all(
                    color: showFace
                        ? (tile.matched ? c.green : accent.withValues(alpha: .5))
                        : c.line,
                    width: showFace ? 2 : 1.5,
                  ),
                ),
                alignment: Alignment.center,
                padding: const EdgeInsets.all(AppSpace.md),
                child: showFace
                    ? Text(
                        tile.text,
                        textAlign: TextAlign.center,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: font(
                          size: tile.text.length > 22 ? 14 : 17,
                          weight: tile.isMeaning ? 600 : 800,
                          color: c.ink,
                          height: 1.25,
                        ),
                      )
                    : Icon(
                        Icons.question_mark_rounded,
                        color: c.ink3,
                        size: 26,
                      ),
              ),
            );
          },
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Game two: fill the line
// ---------------------------------------------------------------------------

/// Wrong answers have to be the same shape as the right one, or the puzzle
/// solves itself: "He keeps ___ about his new car" with "trifle" on the list is
/// not a question. These are ordinary English words grouped by ending, so a
/// gap that removed "bragging" is offered other -ing words.
class _WordBank {
  const _WordBank._();

  static const ing = [
    'talking', 'running', 'waiting', 'joking', 'lying', 'hiding', 'arguing',
    'shouting', 'worrying', 'pretending', 'complaining', 'staring', 'guessing',
    'holding', 'pushing', 'chasing', 'wondering', 'insisting', 'laughing',
  ];
  static const ed = [
    'agreed', 'refused', 'noticed', 'admitted', 'promised', 'decided',
    'managed', 'avoided', 'ignored', 'expected', 'regretted', 'insisted',
    'warned', 'blamed', 'reminded', 'accepted',
  ];
  static const plural = [
    'reasons', 'excuses', 'answers', 'chances', 'details', 'habits',
    'promises', 'mistakes', 'doubts', 'rumours', 'feelings', 'choices',
  ];
  static const plain = [
    'matter', 'reason', 'effort', 'excuse', 'attempt', 'doubt', 'habit',
    'favour', 'promise', 'concern', 'mistake', 'chance', 'point', 'issue',
    'result', 'notice', 'blame', 'praise', 'regret', 'trust',
  ];
  static const adjective = [
    'careful', 'certain', 'nervous', 'obvious', 'patient', 'curious',
    'serious', 'honest', 'useless', 'grateful', 'furious', 'anxious',
    'confident', 'reluctant', 'stubborn', 'generous',
  ];

  /// Expressions ending in the same particle, so "reluctant to" is answered
  /// against "willing to" rather than against a stray noun.
  static const byParticle = {
    'to': ['willing to', 'ready to', 'afraid to', 'quick to', 'eager to', 'free to', 'sure to', 'about to'],
    'about': ['talking about', 'thinking about', 'worried about', 'joking about', 'certain about', 'asking about'],
    'for': ['looking for', 'waiting for', 'asking for', 'hoping for', 'sorry for', 'ready for'],
    'with': ['dealing with', 'fine with', 'busy with', 'done with', 'happy with', 'stuck with'],
    'up': ['giving up', 'showing up', 'ending up', 'making up', 'catching up', 'holding up'],
    'out': ['finding out', 'working out', 'running out', 'pointing out', 'figuring out', 'sorting out'],
    'on': ['counting on', 'going on', 'holding on', 'moving on', 'insisting on'],
    'off': ['calling off', 'putting off', 'showing off', 'taking off', 'backing off'],
    'in': ['giving in', 'taking in', 'joining in', 'stepping in'],
    'from': ['hiding from', 'running from', 'keeping from', 'suffering from'],
  };

  static const adjectiveEndings = [
    'ant', 'ent', 'ive', 'ous', 'ful', 'less', 'able', 'ible', 'ic', 'al',
  ];

  /// Words shaped like [answer]: same ending, or the same kind of expression.
  static List<String> matching(String answer) {
    final value = answer.toLowerCase().trim();
    final words = value.split(RegExp(r'\s+'));
    final last = words.last;

    // An expression keeps its particle; the alternatives must read as English
    // in the same slot. A compound like "employment record" has no particle,
    // so it is matched on its head word instead.
    if (words.length > 1) {
      final sameParticle = byParticle[last];
      if (sameParticle != null) return sameParticle;
      return matching(last);
    }
    if (last.endsWith('ing')) return ing;
    if (last.endsWith('ed')) return ed;
    if (adjectiveEndings.any(last.endsWith)) return adjective;
    if (last.endsWith('s') && !last.endsWith('ss')) return plural;
    return plain;
  }
}

class ClozeGamePage extends StatefulWidget {
  const ClozeGamePage({
    required this.cards,
    required this.distractors,
    super.key,
  });

  /// Cards that carry the subtitle line the word came from.
  final List<StudyCard> cards;

  /// Anything saved, used for the wrong answers.
  final List<StudyCard> distractors;

  @override
  State<ClozeGamePage> createState() => _ClozeGamePageState();
}

class _ClozeGamePageState extends State<ClozeGamePage> {
  static const _rounds = 6;

  final _random = Random();
  late List<StudyCard> _queue;
  late List<String> _options;
  late String _answer;
  int _index = 0;
  int _correct = 0;
  String? _picked;

  @override
  void initState() {
    super.initState();
    _queue = [...widget.cards]..shuffle(_random);
    _queue = _queue.take(min(_rounds, _queue.length)).toList();
    _buildOptions();
  }

  StudyCard get _card => _queue[_index];

  /// The exact text taken out of the line, and the line with the gap in it.
  ///
  /// The gap has to swallow whole words: the saved label is a dictionary form
  /// ("brag about") while the line carries an inflected one ("bragging
  /// about"), so a plain substring replace left "_____ging about" on screen.
  /// The answer offered is the removed text itself, because that is the form
  /// that actually fits the sentence.
  (String prompt, String answer) _blank() {
    final line = _card.contextLine ?? _card.selectedText;
    for (final candidate in [_card.learningLabel, _card.focusWord ?? '']) {
      final words = RegExp(r"[A-Za-z']+")
          .allMatches(candidate)
          .map((match) => match.group(0)!)
          .toList();
      if (words.isEmpty) continue;
      final pattern = RegExp(
        r'\b' + words.map((word) => '${RegExp.escape(word)}\\w*').join(r'\s+') + r'\b',
        caseSensitive: false,
      );
      final match = pattern.firstMatch(line);
      if (match != null) {
        return (line.replaceRange(match.start, match.end, '_____'), match.group(0)!);
      }
    }
    return ('$line  _____', _card.learningLabel);
  }

  void _buildOptions() {
    final (_, answer) = _blank();
    _answer = answer;
    final bank = [..._WordBank.matching(answer)]..shuffle(_random);
    final wrong = bank
        .where((word) => StudyCard.bare(word) != StudyCard.bare(answer))
        .take(3)
        .toList();
    _options = [answer, ...wrong]..shuffle(_random);
    _picked = null;
  }

  String get _prompt => _blank().$1;

  void _choose(String option) {
    if (_picked != null) return;
    final right = StudyCard.bare(option) == StudyCard.bare(_answer);
    setState(() {
      _picked = option;
      if (right) _correct++;
    });
    HapticFeedback.mediumImpact();
    Future.delayed(const Duration(milliseconds: 1100), () {
      if (!mounted) return;
      if (_index + 1 >= _queue.length) {
        setState(() => _index = _queue.length);
      } else {
        setState(() {
          _index++;
          _buildOptions();
        });
      }
    });
  }

  void _restart() {
    setState(() {
      _queue = [...widget.cards]..shuffle(_random);
      _queue = _queue.take(min(_rounds, _queue.length)).toList();
      _index = 0;
      _correct = 0;
      _buildOptions();
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final finished = _index >= _queue.length;

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: [
            _GameBar(
              title: context.t('Fill the line'),
              trailing: finished
                  ? '$_correct / ${_queue.length}'
                  : '${_index + 1} / ${_queue.length}',
              accent: c.blue,
            ),
            Expanded(
              child: finished
                  ? _Finished(
                      title: _correct == _queue.length
                          ? context.t('All of them')
                          : '$_correct / ${_queue.length}',
                      message: context.t(
                        _correct == _queue.length
                            ? 'Every line filled correctly.'
                            : 'The ones you missed are still in your library.',
                      ),
                      accent: c.blue,
                      onAgain: _restart,
                    )
                  : ListView(
                      padding: const EdgeInsets.all(AppSpace.gutter),
                      children: [
                        ProgressTrack(
                          value: _index / _queue.length,
                          color: c.blue,
                        ),
                        const SizedBox(height: AppSpace.xl),
                        AppCard(
                          raised: true,
                          padding: const EdgeInsets.all(AppSpace.xl),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.movie_rounded,
                                    size: 15,
                                    color: c.ink3,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      _card.mediaTitle,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppText.caption(c.ink3),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AppSpace.md),
                              Text(
                                _prompt,
                                style: font(
                                  size: 20,
                                  weight: 700,
                                  color: c.ink,
                                  height: 1.45,
                                ),
                              ),
                              const SizedBox(height: AppSpace.md),
                              Text(
                                _card.primaryMeaning,
                                style: font(
                                  size: 14,
                                  weight: 600,
                                  color: c.ink3,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpace.xl),
                        for (final option in _options) ...[
                          _Option(
                            // Keyed per question: without this the reused row
                            // animates out of the previous answer's colour and
                            // briefly hints at the wrong option.
                            key: ValueKey('$_index-$option'),
                            label: option,
                            state: _picked == null
                                ? _OptionState.idle
                                : StudyCard.bare(option) == StudyCard.bare(_answer)
                                ? _OptionState.right
                                : option == _picked
                                ? _OptionState.wrong
                                : _OptionState.idle,
                            onTap: () => _choose(option),
                          ),
                          const SizedBox(height: AppSpace.md),
                        ],
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _OptionState { idle, right, wrong }

class _Option extends StatelessWidget {
  const _Option({
    required this.label,
    required this.state,
    required this.onTap,
    super.key,
  });

  final String label;
  final _OptionState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final (background, border, ink) = switch (state) {
      _OptionState.right => (c.greenWash, c.green, c.ink),
      _OptionState.wrong => (c.redWash, c.red, c.ink),
      _OptionState.idle => (c.surface, c.line, c.ink),
    };

    return Squish(
      onTap: onTap,
      scale: .97,
      semanticLabel: label,
      child: AnimatedContainer(
        duration: AppMotion.quick,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpace.lg,
          vertical: AppSpace.lg,
        ),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(AppRadius.button),
          border: Border.all(color: border, width: 2),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: font(size: 17, weight: 700, color: ink, height: 1.3),
              ),
            ),
            if (state == _OptionState.right)
              Icon(Icons.check_circle_rounded, color: c.green, size: 22)
            else if (state == _OptionState.wrong)
              Icon(Icons.cancel_rounded, color: c.red, size: 22),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------

class _GameBar extends StatelessWidget {
  const _GameBar({
    required this.title,
    required this.trailing,
    required this.accent,
  });

  final String title, trailing;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.sm,
        AppSpace.sm,
        AppSpace.gutter,
        AppSpace.sm,
      ),
      decoration: BoxDecoration(
        color: c.surface,
        border: Border(bottom: BorderSide(color: c.line, width: 1.5)),
      ),
      child: Row(
        children: [
          Squish(
            onTap: () => Navigator.maybePop(context),
            semanticLabel: context.t('Back'),
            child: SizedBox(
              height: 48,
              width: 48,
              child: Icon(Icons.arrow_back_rounded, color: c.ink, size: 24),
            ),
          ),
          Expanded(
            child: Text(
              title,
              style: font(size: 17, weight: 800, color: c.ink, height: 1.2),
            ),
          ),
          Pill(
            label: trailing,
            color: accent,
            background: accent.withValues(alpha: .14),
          ),
        ],
      ),
    );
  }
}

class _Finished extends StatelessWidget {
  const _Finished({
    required this.title,
    required this.message,
    required this.accent,
    required this.onAgain,
  });

  final String title, message;
  final Color accent;
  final VoidCallback onAgain;

  @override
  Widget build(BuildContext context) => EmptyState(
    icon: Icons.emoji_events_rounded,
    title: title,
    message: message,
    tone: accent,
    action: Column(
      children: [
        PushButton(
          label: context.t('Play again'),
          icon: Icons.refresh_rounded,
          expand: false,
          onPressed: onAgain,
        ),
        const SizedBox(height: AppSpace.sm),
        PushButton(
          label: context.t('Back to practice'),
          tone: PushTone.ghost,
          expand: false,
          onPressed: () => Navigator.maybePop(context),
        ),
      ],
    ),
  );
}
