// What the app is, before anybody is asked to sign in to it.
//
// Four screens, swiped through, each one doing on screen the thing it is
// describing: the subtitle really is selected, the wrong answer really is
// struck out and replaced, the three devices really do hand a word to each
// other. A still picture of a gesture is a diagram; the gesture is the
// explanation.
//
// Nothing here is an asset. Every drawing is widgets and a curve, so it takes
// the reader's theme, their text size and their language without a second set
// of files to keep in step.

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../i18n.dart';
import '../design/components.dart';
import '../design/tokens.dart';

class TourPage extends StatefulWidget {
  const TourPage({required this.onDone, super.key});

  /// Called when the tour is finished or skipped. The caller remembers it, so
  /// this is the last time it is ever shown.
  final VoidCallback onDone;

  @override
  State<TourPage> createState() => _TourPageState();
}

class _TourPageState extends State<TourPage> {
  final _pages = PageController();
  int _at = 0;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  void _forward() {
    if (_at >= 3) {
      widget.onDone();
      return;
    }
    _pages.nextPage(
      duration: const Duration(milliseconds: 420),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final last = _at == 3;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.only(
                  right: AppSpace.sm,
                  top: AppSpace.xs,
                ),
                child: TextButton(
                  onPressed: last ? null : widget.onDone,
                  child: Text(
                    last ? '' : context.t('Skip'),
                    style: AppText.label(c.ink3),
                  ),
                ),
              ),
            ),
            Expanded(
              child: PageView(
                controller: _pages,
                onPageChanged: (index) => setState(() => _at = index),
                children: const [
                  _Slide(
                    show: _SenseScene(),
                    title: 'Not the word - what it means here',
                    body:
                        'A dictionary translates the word by itself. Here the whole sentence is read, so the word gets the meaning it has in it.',
                  ),
                  _Slide(
                    show: _PickScene(),
                    title: 'Saving a word is one movement',
                    body:
                        'In the browser and on the computer: hold the key and drag across a word in the subtitles. On the phone: select any text and pick Subtitle Notes from the menu.',
                  ),
                  _Slide(
                    show: _DevicesScene(),
                    title: 'One library on every device',
                    body:
                        'One Google sign-in. A word saved in the browser is here on the phone straight away.',
                  ),
                  _Slide(
                    show: _ReturnScene(),
                    title: 'Words come back until they stay',
                    body:
                        'First after a day, then after three, then after a week. What you forget is shown more often.',
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpace.gutter,
                AppSpace.sm,
                AppSpace.gutter,
                AppSpace.lg,
              ),
              child: Column(
                children: [
                  _Dots(count: 4, at: _at),
                  const SizedBox(height: AppSpace.lg),
                  PushButton(
                    label: context.t(last ? 'Begin' : 'Next'),
                    icon: last ? Icons.arrow_forward_rounded : null,
                    onPressed: _forward,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Slide extends StatelessWidget {
  const _Slide({required this.show, required this.title, required this.body});

  final Widget show;
  final String title, body;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
      child: Column(
        children: [
          // A short phone with a long translation must shrink the drawing,
          // never overflow the screen with it.
          Expanded(
            child: Center(
              child: FittedBox(fit: BoxFit.scaleDown, child: show),
            ),
          ),
          Text(
            context.t(title),
            textAlign: TextAlign.center,
            style: AppText.title(c.ink),
          ),
          const SizedBox(height: AppSpace.md),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 340),
            child: Text(
              context.t(body),
              textAlign: TextAlign.center,
              style: AppText.bodySoft(c.ink2),
            ),
          ),
          const SizedBox(height: AppSpace.xl),
        ],
      ),
    );
  }
}

class _Dots extends StatelessWidget {
  const _Dots({required this.count, required this.at});

  final int count, at;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var index = 0; index < count; index += 1)
          AnimatedContainer(
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            height: 6,
            width: index == at ? 22 : 6,
            decoration: BoxDecoration(
              color: index == at ? c.green : c.line,
              borderRadius: BorderRadius.circular(AppRadius.chip),
            ),
          ),
      ],
    );
  }
}

/// A scene that runs the same few seconds over and over. Everything visual on
/// these four screens is built on it, so the timing reads the same throughout.
abstract class _SceneState<T extends StatefulWidget> extends State<T>
    with SingleTickerProviderStateMixin {
  late final AnimationController beat = AnimationController(
    vsync: this,
    duration: cycle,
  )..repeat();

  Duration get cycle => const Duration(milliseconds: 5200);

  @override
  void dispose() {
    beat.dispose();
    super.dispose();
  }

  /// `from` to `to` of the loop, eased, clamped outside it.
  double phase(double from, double to, {Curve curve = Curves.easeOutCubic}) {
    final raw = ((beat.value - from) / (to - from)).clamp(0.0, 1.0);
    return curve.transform(raw);
  }
}

// ---- 1. picking a word ------------------------------------------------------

class _PickScene extends StatefulWidget {
  const _PickScene();

  @override
  State<_PickScene> createState() => _PickSceneState();
}

class _PickSceneState extends _SceneState<_PickScene> {
  static const _width = 300.0;
  static const _film = 150.0;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AnimatedBuilder(
      animation: beat,
      builder: (context, _) {
        final sweep = phase(.16, .44);
        final card = phase(.50, .68);
        final dragging = sweep > 0 && sweep < 1;
        return SizedBox(
          width: _width,
          height: 268,
          child: Stack(
            children: [
              // The film, standing in for whatever is being watched.
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Container(
                  height: _film,
                  decoration: BoxDecoration(
                    color: const Color(0xFF10161A),
                    borderRadius: BorderRadius.circular(AppRadius.panel),
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Positioned(
                        top: 24,
                        child: Icon(
                          Icons.play_circle_outline_rounded,
                          size: 40,
                          color: Colors.white.withValues(alpha: .10),
                        ),
                      ),
                      Positioned(
                        bottom: 22,
                        left: 16,
                        right: 16,
                        child: _Subtitle(
                          progress: sweep,
                          showFinger: dragging,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // The answer, arriving under the words it belongs to - under
              // them, not over them.
              Positioned(
                top: _film + 14 + (1 - card) * 12,
                left: 26,
                right: 26,
                child: Opacity(
                  opacity: card,
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(14, 11, 14, 12),
                    decoration: BoxDecoration(
                      color: c.surface,
                      borderRadius: BorderRadius.circular(AppRadius.card),
                      border: Border(left: BorderSide(color: c.green, width: 3)),
                      boxShadow: [
                        BoxShadow(
                          color: c.scrim.withValues(alpha: .2),
                          blurRadius: 22,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.t('No one wants a criminal record.'),
                          style: AppText.body(c.green),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          context.t('No one wants a record.'),
                          style: AppText.caption(c.ink3),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// The whole selected subtitle is highlighted from edge to edge, drawn under
/// the letters rather than over them - the same mark the extension puts on a
/// line in a browser.
class _Subtitle extends StatelessWidget {
  const _Subtitle({required this.progress, required this.showFinger});

  final double progress;
  final bool showFinger;

  static const _fingerSize = 26.0;
  // In the touch icon the point of contact is ten pixels from its left edge.
  // This lets the visual fingertip sit precisely on the growing selection.
  static const _fingerTipX = 10.0;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final line = context.t('No one wants a record.');
    final style = font(
      size: 15.5,
      weight: 700,
      color: Colors.white,
      height: 1.35,
    );
    return LayoutBuilder(
      builder: (context, constraints) {
        final painter = TextPainter(
          text: TextSpan(text: line, style: style),
          textDirection: Directionality.of(context),
        )..layout(maxWidth: constraints.maxWidth);
        final lineLeft = (constraints.maxWidth - painter.width) / 2;
        final selectionEnd = lineLeft + painter.width * progress;

        return SizedBox(
          height: painter.height,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned(
                left: lineLeft,
                top: 0,
                width: painter.width,
                height: painter.height,
                child: FractionallySizedBox(
                  widthFactor: progress,
                  alignment: Alignment.centerLeft,
                  child: Container(
                    decoration: BoxDecoration(
                      color: c.green.withValues(alpha: .4),
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                ),
              ),
              Positioned(
                left: lineLeft,
                top: 0,
                width: painter.width,
                child: Text(line, style: style),
              ),
              if (showFinger)
                Positioned(
                  left: selectionEnd - _fingerTipX,
                  top: 0,
                  child: Icon(
                    Icons.touch_app_rounded,
                    size: _fingerSize,
                    color: Colors.white.withValues(alpha: .8),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

// ---- 2. the sense in this line ---------------------------------------------

class _SenseScene extends StatefulWidget {
  const _SenseScene();

  @override
  State<_SenseScene> createState() => _SenseSceneState();
}

class _SenseSceneState extends _SceneState<_SenseScene> {
  @override
  Duration get cycle => const Duration(milliseconds: 4000);

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AnimatedBuilder(
      animation: beat,
      builder: (context, _) {
        final strike = phase(.20, .46);
        final right = phase(.48, .72);
        return SizedBox(
          width: 300,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                context.t('No one wants a record.'),
                textAlign: TextAlign.center,
                style: AppText.word(c.ink),
              ),
              const SizedBox(height: AppSpace.xl),
              _Answer(
                label: context.t('A dictionary'),
                text: context.t('No one wants a best-ever score.'),
                tone: c.ink3,
                background: c.surfaceAlt,
                strike: strike,
              ),
              const SizedBox(height: AppSpace.md),
              Opacity(
                opacity: right,
                child: Transform.translate(
                  offset: Offset(0, (1 - right) * 14),
                  child: _Answer(
                    label: 'Subtitle Notes',
                    text: context.t('No one wants a criminal record.'),
                    tone: c.green,
                    background: c.greenWash,
                    strike: 0,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Answer extends StatelessWidget {
  const _Answer({
    required this.label,
    required this.text,
    required this.tone,
    required this.background,
    required this.strike,
  });

  final String label, text;
  final Color tone, background;

  /// How far the line through the wrong answer has been drawn, 0 to 1. It is
  /// drawn over the text in a stack sized by the text itself, so it is exactly
  /// as long as the words it crosses out.
  final double strike;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 11, 14, 13),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(), style: AppText.caption(c.ink3)),
          const SizedBox(height: 5),
          Stack(
            alignment: Alignment.centerLeft,
            children: [
              Text(text, style: AppText.body(tone)),
              if (strike > 0)
                Positioned.fill(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: FractionallySizedBox(
                      widthFactor: strike,
                      alignment: Alignment.centerLeft,
                      child: Container(height: 2, color: c.ink3),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

// ---- 3. one library across three places ------------------------------------

class _DevicesScene extends StatefulWidget {
  const _DevicesScene();

  @override
  State<_DevicesScene> createState() => _DevicesSceneState();
}

class _DevicesSceneState extends _SceneState<_DevicesScene> {
  static const _width = 300.0;

  /// Where the three tiles end up: a row of equal thirds, so their centres are
  /// the middle of each third. The word that falls from one of them starts at
  /// its centre and lands in the middle, where the library is.
  static const _centres = [_width / 6, _width / 2, _width * 5 / 6];

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final devices = [
      (Icons.phone_iphone_rounded, context.t('Phone'), c.green),
      (Icons.language_rounded, context.t('Browser'), c.blue),
      (Icons.desktop_windows_rounded, context.t('Computer'), c.amber),
    ];
    return AnimatedBuilder(
      animation: beat,
      builder: (context, _) {
        final travel = phase(.32, .66);
        final landed = phase(.66, .76) * (1 - phase(.80, .92));
        return SizedBox(
          width: _width,
          height: 226,
          child: Stack(
            children: [
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Row(
                  children: [
                    for (final (index, device) in devices.indexed)
                      Expanded(
                        child: Builder(
                          builder: (context) {
                            final rise = phase(
                              .04 + index * .06,
                              .28 + index * .06,
                            );
                            return Opacity(
                              opacity: rise,
                              child: Transform.translate(
                                offset: Offset(0, (1 - rise) * 12),
                                child: Column(
                                  children: [
                                    IconTile(
                                      icon: device.$1,
                                      color: device.$3,
                                      background: device.$3.withValues(
                                        alpha: .16,
                                      ),
                                    ),
                                    const SizedBox(height: AppSpace.sm),
                                    Text(
                                      device.$2,
                                      style: AppText.caption(c.ink3),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),
              // A word falling from each of them into the one library below.
              if (travel > 0 && travel < 1)
                for (final (index, device) in devices.indexed)
                  Positioned(
                    top: 74 + travel * 66,
                    left:
                        _centres[index] +
                        (_width / 2 - _centres[index]) * travel -
                        5,
                    child: Container(
                      height: 10,
                      width: 10,
                      decoration: BoxDecoration(
                        color: device.$3,
                        borderRadius: BorderRadius.circular(AppRadius.chip),
                      ),
                    ),
                  ),
              Positioned(
                top: 150,
                left: 40,
                right: 40,
                child: Transform.scale(
                  scale: 1 + landed * .05,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: c.surface,
                      borderRadius: BorderRadius.circular(AppRadius.card),
                      border: Border.all(
                        color: Color.lerp(c.line, c.green, landed)!,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.folder_rounded, size: 18, color: c.green),
                        const SizedBox(width: AppSpace.sm),
                        Flexible(
                          child: Text(
                            context.t('One library'),
                            style: AppText.label(c.ink),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ---- 4. the word comes back -------------------------------------------------

class _ReturnScene extends StatefulWidget {
  const _ReturnScene();

  @override
  State<_ReturnScene> createState() => _ReturnSceneState();
}

class _ReturnSceneState extends _SceneState<_ReturnScene> {
  static const _steps = [1, 3, 7, 16];
  static const _width = 300.0;
  static const _card = 86.0;
  static const _dot = 12.0;
  // Leave space for the word card at each end. Otherwise the clamp pins the
  // card to a side instead of centring it above the first and last markers.
  static const _trackInset = _card / 2 + 12;

  @override
  Duration get cycle => const Duration(milliseconds: 4000);

  /// The centre of each marker on the inset track, with space for the card.
  double _centre(int index) =>
      _trackInset +
      index * (_width - _trackInset * 2) / (_steps.length - 1);

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AnimatedBuilder(
      animation: beat,
      builder: (context, _) {
        // The card hops from one interval to the next and waits on the last.
        final walk = (phase(.06, .80, curve: Curves.linear) *
                (_steps.length - 1))
            .clamp(0.0, (_steps.length - 1).toDouble());
        final index = walk.floor().clamp(0, _steps.length - 2);
        final within = (walk - index).clamp(0.0, 1.0);
        final hop = math.sin(within * math.pi);
        final at =
            _centre(index) + (_centre(index + 1) - _centre(index)) * within;
        return SizedBox(
          width: _width,
          height: 212,
          child: Stack(
            children: [
              Positioned(
                top: 130,
                left: _trackInset,
                right: _trackInset,
                child: Container(height: 2, color: c.line),
              ),
              for (final (position, days) in _steps.indexed) ...[
                Positioned(
                  top: 125,
                  left: _centre(position) - _dot / 2,
                  child: Container(
                    height: _dot,
                    width: _dot,
                    decoration: BoxDecoration(
                      color: walk >= position - .02 ? c.green : c.line,
                      borderRadius: BorderRadius.circular(AppRadius.chip),
                    ),
                  ),
                ),
                Positioned(
                  top: 146,
                  left: _centre(position) - 20,
                  width: 40,
                  child: Text(
                    '$days',
                    textAlign: TextAlign.center,
                    style: AppText.caption(c.ink3),
                  ),
                ),
              ],
              Positioned(
                top: 74 - hop * 26,
                left: at - _card / 2,
                width: _card,
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: c.green,
                    borderRadius: BorderRadius.circular(AppRadius.small),
                    boxShadow: [
                      BoxShadow(
                        color: c.scrim.withValues(alpha: .18),
                        blurRadius: 14,
                        offset: Offset(0, 6 + hop * 5),
                      ),
                    ],
                  ),
                  child: Text(
                    context.t('record'),
                    textAlign: TextAlign.center,
                    style: AppText.label(c.onGreen),
                  ),
                ),
              ),
              Positioned(
                top: 178,
                left: 0,
                right: 0,
                child: Text(
                  context.t('days between repeats'),
                  textAlign: TextAlign.center,
                  style: AppText.caption(c.ink3),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
