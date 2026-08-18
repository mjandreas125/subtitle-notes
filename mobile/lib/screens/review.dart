import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data.dart';
import '../i18n.dart';
import '../design/components.dart';
import '../design/tokens.dart';

/// Meeting the words again.
///
/// Saving a word is the easy half. A list that is only ever added to is a
/// museum, so the ones that are due come back here: the word first, the meaning
/// only after you have tried to remember it, and then one honest answer about
/// how it went. A word you knew waits longer before it returns; one you missed
/// comes back before the end of the session.
class ReviewPage extends StatefulWidget {
  const ReviewPage({required this.api, super.key});

  final SyncApi api;

  @override
  State<ReviewPage> createState() => _ReviewPageState();
}

class _ReviewPageState extends State<ReviewPage> {
  List<StudyCard> _queue = const [];
  int _done = 0;
  int _total = 0;
  bool _loading = true;
  bool _revealed = false;
  bool _sending = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final due = await widget.api.due();
      if (!mounted) return;
      setState(() {
        _queue = due;
        _total = due.length;
        _done = 0;
        _revealed = false;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _loading = false;
      });
    }
  }

  Future<void> _answer(String result) async {
    if (_sending || _queue.isEmpty) return;
    final card = _queue.first;
    setState(() => _sending = true);
    HapticFeedback.selectionClick();
    try {
      await widget.api.reviewed(card.id, result);
    } catch (_) {
      // The answer is worth less than the practice: a lost connection should
      // not stop the session, it only means this card keeps its old place.
    }
    if (!mounted) return;
    setState(() {
      final rest = _queue.skip(1).toList();
      // A word that would not come back goes to the end of the queue rather
      // than out of it — the point is to leave the session knowing it.
      _queue = result == 'again' ? [...rest, card] : rest;
      if (result != 'again') _done += 1;
      _revealed = false;
      _sending = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final card = _queue.isEmpty ? null : _queue.first;

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: [
            _Bar(
              done: _done,
              total: _total,
              onClose: () => Navigator.pop(context, _done),
            ),
            Expanded(
              child: _loading
                  ? Center(child: CircularProgressIndicator(color: c.green))
                  : _error != null
                  ? EmptyState(
                      icon: Icons.cloud_off_rounded,
                      title: context.t('No connection'),
                      message: context.t('Practice needs the library. Try again in a moment.'),
                      tone: c.blue,
                      action: PushButton(
                        label: context.t('Try again'),
                        icon: Icons.refresh_rounded,
                        tone: PushTone.blue,
                        expand: false,
                        onPressed: _load,
                      ),
                    )
                  : card == null
                  ? EmptyState(
                      icon: Icons.check_circle_rounded,
                      title: _total == 0
                          ? 'Nothing due right now'
                          : 'That is all of them',
                      message: _total == 0
                          ? 'Words come back a day after you save them, then '
                                'less and less often as you get them right.'
                          : '$_total words revisited. The ones you knew will '
                                'come back later than the ones you did not.',
                      action: PushButton(
                        label: context.t('Done'),
                        expand: false,
                        onPressed: () => Navigator.pop(context, _done),
                      ),
                    )
                  : _Card(card: card, revealed: _revealed),
            ),
            if (card != null && !_loading && _error == null)
              _Answers(
                revealed: _revealed,
                busy: _sending,
                onReveal: () => setState(() => _revealed = true),
                onAnswer: _answer,
              ),
          ],
        ),
      ),
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({required this.done, required this.total, required this.onClose});

  final int done, total;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.gutter,
        AppSpace.md,
        AppSpace.gutter,
        AppSpace.md,
      ),
      child: Row(
        children: [
          Expanded(
            child: ProgressTrack(
              value: total == 0 ? 0 : done / total,
              height: 10,
            ),
          ),
          const SizedBox(width: AppSpace.md),
          Text(
            '$done / $total',
            style: font(size: 14, weight: 800, color: c.ink3),
          ),
          const SizedBox(width: AppSpace.sm),
          Squish(
            onTap: onClose,
            semanticLabel: context.t('Close practice'),
            child: Padding(
              padding: const EdgeInsets.all(AppSpace.sm),
              child: Icon(Icons.close_rounded, color: c.ink3, size: 22),
            ),
          ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.card, required this.revealed});

  final StudyCard card;
  final bool revealed;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final accent = c.accentFor(card.mediaTitle);
    return ListView(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.gutter,
        AppSpace.xl,
        AppSpace.gutter,
        AppSpace.xl,
      ),
      children: [
        Center(child: Pill(label: card.mediaTitle, color: accent)),
        const SizedBox(height: AppSpace.xxl),
        Text(
          card.learningLabel,
          textAlign: TextAlign.center,
          style: font(size: 34, weight: 800, color: c.ink, height: 1.15),
        ),
        if (card.contextLine != null) ...[
          const SizedBox(height: AppSpace.lg),
          Text(
            card.contextLine!,
            textAlign: TextAlign.center,
            style: font(size: 15, weight: 600, color: c.ink3, height: 1.4),
          ),
        ],
        const SizedBox(height: AppSpace.xxl),
        // Until it is revealed the space stays empty on purpose: guessing is
        // the part that does the work.
        AnimatedOpacity(
          duration: AppMotion.quick,
          opacity: revealed ? 1 : 0,
          child: Column(
            children: [
              Text(
                card.primaryMeaning,
                textAlign: TextAlign.center,
                style: font(size: 24, weight: 800, color: c.green, height: 1.25),
              ),
              if (card.synonyms.isNotEmpty) ...[
                const SizedBox(height: AppSpace.md),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: AppSpace.sm,
                  runSpacing: AppSpace.sm,
                  children: [
                    for (final word in card.synonyms) Pill(label: word),
                  ],
                ),
              ],
              if (card.senseNote != null) ...[
                const SizedBox(height: AppSpace.md),
                Text(
                  card.senseNote!,
                  textAlign: TextAlign.center,
                  style: font(
                    size: 14,
                    weight: 600,
                    color: c.ink3,
                    height: 1.4,
                  ).copyWith(fontStyle: FontStyle.italic),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _Answers extends StatelessWidget {
  const _Answers({
    required this.revealed,
    required this.busy,
    required this.onReveal,
    required this.onAnswer,
  });

  final bool revealed, busy;
  final VoidCallback onReveal;
  final ValueChanged<String> onAnswer;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        border: Border(top: BorderSide(color: c.line, width: 1.5)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.gutter),
          child: revealed
              ? Row(
                  children: [
                    Expanded(
                      child: PushButton(
                        label: context.t('Again'),
                        tone: PushTone.red,
                        onPressed: busy ? null : () => onAnswer('again'),
                      ),
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: PushButton(
                        label: context.t('Knew it'),
                        onPressed: busy ? null : () => onAnswer('good'),
                      ),
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: PushButton(
                        label: context.t('Easy'),
                        tone: PushTone.blue,
                        onPressed: busy ? null : () => onAnswer('easy'),
                      ),
                    ),
                  ],
                )
              : PushButton(
                  label: context.t('Show the meaning'),
                  icon: Icons.visibility_rounded,
                  tone: PushTone.neutral,
                  onPressed: onReveal,
                ),
        ),
      ),
    );
  }
}
