import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data.dart';
import '../i18n.dart';
import 'tokens.dart';

/// Wraps a child so it squishes on press. Scale only — never a layout change,
/// so nothing around it shifts while a finger is down.
class Squish extends StatefulWidget {
  const Squish({
    required this.child,
    this.onTap,
    this.onLongPress,
    this.scale = .96,
    this.semanticLabel,
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double scale;
  final String? semanticLabel;

  @override
  State<Squish> createState() => _SquishState();
}

class _SquishState extends State<Squish> {
  bool _down = false;

  void _set(bool value) {
    if (_down != value && widget.onTap != null) setState(() => _down = value);
  }

  @override
  Widget build(BuildContext context) => Semantics(
    button: widget.onTap != null,
    label: widget.semanticLabel,
    child: GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => _set(true),
      onTapUp: (_) => _set(false),
      onTapCancel: () => _set(false),
      onTap: widget.onTap == null
          ? null
          : () {
              HapticFeedback.selectionClick();
              widget.onTap!();
            },
      onLongPress: widget.onLongPress,
      child: AnimatedScale(
        scale: _down ? widget.scale : 1,
        duration: AppMotion.press,
        curve: Curves.easeOut,
        child: widget.child,
      ),
    ),
  );
}

/// A restrained 3D surface for the saved-word cards. It borrows the physical
/// "medallion" behaviour from Liisbet Native: the card leans toward a pointer,
/// lifts a little off its lower lip and catches a soft light under the cursor.
///
/// The child is kept as the static AnimatedBuilder child, so moving the mouse
/// only repaints the transform and glow. On a touch screen the same depth is
/// briefly shown while a card is pressed, without taking over its tap or swipe
/// gestures.
class TiltMedallion extends StatefulWidget {
  const TiltMedallion({
    required this.child,
    this.radius = AppRadius.card,
    super.key,
  });

  final Widget child;
  final double radius;

  @override
  State<TiltMedallion> createState() => _TiltMedallionState();
}

class _TiltMedallionState extends State<TiltMedallion>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 120),
    reverseDuration: const Duration(milliseconds: 220),
  );
  late final Animation<double> _amount = CurvedAnimation(
    parent: _controller,
    curve: Curves.easeOutCubic,
    reverseCurve: Curves.easeOut,
  );

  Offset _localPosition = Offset.zero;
  Size _size = const Size(320, 176);
  bool _hovering = false;
  bool _pressing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _remember(PointerEvent event) {
    _localPosition = event.localPosition;
    final renderBox = context.findRenderObject();
    if (renderBox is RenderBox && renderBox.hasSize) {
      _size = renderBox.size;
    }
  }

  void _enter(PointerEnterEvent event) {
    _hovering = true;
    _remember(event);
    _controller.forward();
  }

  void _exit(PointerExitEvent event) {
    _hovering = false;
    if (!_pressing) _controller.reverse();
  }

  void _move(PointerEvent event) {
    if (!_hovering && !_pressing) return;
    _remember(event);
    if (_controller.value > 0) setState(() {});
  }

  void _down(PointerDownEvent event) {
    _pressing = true;
    _remember(event);
    _controller.forward();
  }

  void _up(PointerEvent event) {
    _pressing = false;
    if (!_hovering) _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.deferToChild,
      onPointerDown: _down,
      onPointerMove: _move,
      onPointerUp: _up,
      onPointerCancel: (_) {
        _pressing = false;
        if (!_hovering) _controller.reverse();
      },
      child: MouseRegion(
        onEnter: _enter,
        onExit: _exit,
        onHover: _move,
        child: AnimatedBuilder(
          animation: _amount,
          child: widget.child,
          builder: (context, child) {
            final amount = _amount.value;
            final width = _size.width <= 0 ? 1.0 : _size.width;
            final height = _size.height <= 0 ? 1.0 : _size.height;
            final x = (_localPosition.dx / width).clamp(0.0, 1.0) - .5;
            final y = (_localPosition.dy / height).clamp(0.0, 1.0) - .5;
            final transform = Matrix4.identity()
              ..setEntry(3, 2, .00115)
              ..rotateX(-y * .13 * amount)
              ..rotateY(x * .13 * amount)
              ..translateByDouble(0, -3.0 * amount, 0, 1);

            return Transform(
              transform: transform,
              alignment: Alignment.center,
              child: Stack(
                fit: StackFit.passthrough,
                children: [
                  child!,
                  if (amount > .01)
                    Positioned.fill(
                      child: IgnorePointer(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(widget.radius),
                          child: Opacity(
                            opacity: amount,
                            child: CustomPaint(
                              painter: _MedallionGlowPainter(_localPosition),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _MedallionGlowPainter extends CustomPainter {
  const _MedallionGlowPainter(this.position);

  final Offset position;

  @override
  void paint(Canvas canvas, Size size) {
    final radius = size.longestSide * .9;
    final paint = Paint()
      ..shader = RadialGradient(
        colors: const [Color(0x38FFFFFF), Color(0x16FFFFFF), Color(0x00FFFFFF)],
        stops: const [0, .34, .78],
      ).createShader(Rect.fromCircle(center: position, radius: radius));
    canvas.drawRect(Offset.zero & size, paint);
  }

  @override
  bool shouldRepaint(covariant _MedallionGlowPainter oldDelegate) =>
      oldDelegate.position != position;
}

enum PushTone { green, blue, amber, red, neutral, ghost }

/// The pressable surface the whole app is built on: a flat face sitting on a
/// solid darker lip. Pressing moves the face down onto the lip instead of
/// fading a shadow, so the control reads as a physical key. Total height never
/// changes, which keeps rows from twitching.
class PushButton extends StatefulWidget {
  const PushButton({
    required this.label,
    this.onPressed,
    this.icon,
    this.tone = PushTone.green,
    this.expand = true,
    this.loading = false,
    this.compact = false,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final PushTone tone;
  final bool expand;
  final bool loading;
  final bool compact;

  @override
  State<PushButton> createState() => _PushButtonState();
}

class _PushButtonState extends State<PushButton> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final enabled = widget.onPressed != null && !widget.loading;

    late Color face, lip, ink;
    Color? border;
    switch (widget.tone) {
      case PushTone.green:
        face = c.green;
        lip = c.greenLip;
        ink = c.onGreen;
      case PushTone.blue:
        face = c.blue;
        lip = c.blueLip;
        ink = c.onBlue;
      case PushTone.amber:
        face = c.amber;
        lip = c.amberLip;
        ink = c.onAmber;
      case PushTone.red:
        face = c.red;
        lip = c.redLip;
        ink = c.onRed;
      case PushTone.neutral:
        face = c.surface;
        lip = c.lip;
        ink = c.ink;
        border = c.line;
      case PushTone.ghost:
        face = Colors.transparent;
        lip = Colors.transparent;
        ink = c.ink2;
    }

    final pressed = _down && enabled;
    final lipHeight = widget.tone == PushTone.ghost ? 0.0 : AppLip.button;
    // 48dp minimum touch target even in the compact variant.
    final faceHeight = widget.compact ? 44.0 : 52.0;

    final content = Row(
      mainAxisSize: widget.expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (widget.loading)
          SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2.6,
              color: ink,
              strokeCap: StrokeCap.round,
            ),
          )
        else ...[
          if (widget.icon != null) ...[
            Icon(widget.icon, size: widget.compact ? 19 : 21, color: ink),
            const SizedBox(width: AppSpace.sm),
          ],
          Flexible(
            child: Text(
              context.t(widget.label),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: widget.compact
                  ? font(size: 15, weight: 800, color: ink, height: 1.1)
                  : AppText.button(ink),
            ),
          ),
        ],
      ],
    );

    return Semantics(
      button: true,
      enabled: enabled,
      label: context.t(widget.label),
      child: Opacity(
        opacity: enabled ? 1 : .45,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: enabled ? (_) => setState(() => _down = true) : null,
          onTapUp: enabled ? (_) => setState(() => _down = false) : null,
          onTapCancel: enabled ? () => setState(() => _down = false) : null,
          onTap: enabled
              ? () {
                  HapticFeedback.lightImpact();
                  widget.onPressed!();
                }
              : null,
          child: SizedBox(
            width: widget.expand ? double.infinity : null,
            height: faceHeight + lipHeight,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: lip,
                borderRadius: AppRadius.buttonR,
              ),
              child: AnimatedPadding(
                duration: AppMotion.press,
                curve: Curves.easeOut,
                padding: EdgeInsets.only(top: pressed ? lipHeight : 0),
                child: Container(
                  height: faceHeight,
                  padding: EdgeInsets.symmetric(
                    horizontal: widget.compact ? AppSpace.lg : AppSpace.xl,
                  ),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: face,
                    borderRadius: AppRadius.buttonR,
                    border: border == null
                        ? null
                        : Border.all(color: border, width: 1.5),
                  ),
                  child: content,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Flat bordered surface. `raised` adds the solid lip used for tappable cards.
class AppCard extends StatelessWidget {
  const AppCard({
    required this.child,
    this.padding = const EdgeInsets.all(AppSpace.lg),
    this.color,
    this.borderColor,
    this.raised = false,
    this.radius = AppRadius.card,
    super.key,
  });

  final Widget child;
  final EdgeInsets padding;
  final Color? color;
  final Color? borderColor;
  final bool raised;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final body = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? c.surface,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: borderColor ?? c.line, width: 1.5),
      ),
      child: child,
    );
    if (!raised) return body;
    return Container(
      decoration: BoxDecoration(
        color: borderColor ?? c.lip,
        borderRadius: BorderRadius.circular(radius),
      ),
      padding: const EdgeInsets.only(bottom: AppLip.card),
      child: body,
    );
  }
}

/// Small rounded label. `filled` uses the wash tint; otherwise it is outlined.
class Pill extends StatelessWidget {
  const Pill({
    required this.label,
    this.icon,
    this.color,
    this.background,
    this.dense = false,
    super.key,
  });

  final String label;
  final IconData? icon;
  final Color? color;
  final Color? background;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final tint = color ?? c.ink2;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? AppSpace.sm : AppSpace.md,
        vertical: dense ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: background ?? Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadius.chip),
        border: background == null
            ? Border.all(color: c.line, width: 1.5)
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: dense ? 13 : 15, color: tint),
            const SizedBox(width: 5),
          ],
          Text(
            context.t(label),
            style: dense
                ? font(size: 11, weight: 800, color: tint, height: 1.2)
                : AppText.caption(tint),
          ),
        ],
      ),
    );
  }
}

/// Rounded progress track with a lighter cap on the fill, so the bar has the
/// same tactile read as the buttons.
class ProgressTrack extends StatelessWidget {
  const ProgressTrack({
    required this.value,
    this.color,
    this.height = 14,
    super.key,
  });

  final double value;
  final Color? color;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final fill = color ?? c.green;
    final clamped = value.clamp(0.0, 1.0);
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.chip),
      child: Container(
        height: height,
        color: c.line,
        child: Align(
          alignment: Alignment.centerLeft,
          child: FractionallySizedBox(
            widthFactor: clamped == 0 ? 0 : math.max(clamped, .06),
            child: AnimatedContainer(
              duration: AppMotion.normal,
              curve: AppMotion.enter,
              decoration: BoxDecoration(
                color: fill,
                borderRadius: BorderRadius.circular(AppRadius.chip),
              ),
              child: Align(
                alignment: Alignment.topCenter,
                child: Container(
                  margin: EdgeInsets.symmetric(
                    horizontal: height * .38,
                    vertical: height * .22,
                  ),
                  height: height * .18,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .35),
                    borderRadius: BorderRadius.circular(AppRadius.chip),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Icon in a rounded square wash. One shape, one size scale, used everywhere an
/// icon needs emphasis.
class IconTile extends StatelessWidget {
  const IconTile({
    required this.icon,
    required this.color,
    required this.background,
    this.size = 40,
    super.key,
  });

  final IconData icon;
  final Color color;
  final Color background;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    height: size,
    width: size,
    decoration: BoxDecoration(
      color: background,
      borderRadius: BorderRadius.circular(size * .36),
    ),
    child: Icon(icon, color: color, size: size * .5),
  );
}

/// A description of one side of a swipe.
class SwipeAction {
  const SwipeAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTriggered,
    this.confirm,
  });

  final IconData icon;
  final String label;
  final Color color;

  /// Return false to spring the row back instead of committing.
  final Future<bool> Function() onTriggered;

  /// Runs before [onTriggered]. Irreversible actions supply one; actions that
  /// can be undone elsewhere in the app do not, so the common gesture stays
  /// fast.
  final Future<bool> Function()? confirm;
}

/// Confirmation sheet shared by every destructive path, so the same decision
/// always looks and reads the same way.
Future<bool> confirmDestructive(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  required String cancelLabel,
  IconData icon = Icons.delete_rounded,
}) async {
  final c = context.c;
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => Dialog(
      backgroundColor: c.surface,
      insetPadding: const EdgeInsets.all(AppSpace.xxl),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.sheet),
        side: BorderSide(color: c.line, width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: IconTile(
                icon: icon,
                color: c.red,
                background: c.redWash,
                size: 56,
              ),
            ),
            const SizedBox(height: AppSpace.lg),
            Text(
              context.t(title),
              textAlign: TextAlign.center,
              style: AppText.heading(c.ink),
            ),
            const SizedBox(height: AppSpace.sm),
            Text(
              context.t(message),
              textAlign: TextAlign.center,
              style: AppText.bodySoft(c.ink2),
            ),
            const SizedBox(height: AppSpace.xxl),
            PushButton(
              label: confirmLabel,
              tone: PushTone.red,
              onPressed: () => Navigator.pop(context, true),
            ),
            const SizedBox(height: AppSpace.sm),
            PushButton(
              label: cancelLabel,
              tone: PushTone.ghost,
              onPressed: () => Navigator.pop(context, false),
            ),
          ],
        ),
      ),
    ),
  );
  return result ?? false;
}

/// Swipe container built specifically to keep the action panel and the card in
/// the same geometry.
///
/// The stock `Dismissible` reveals a background sized to the whole row while
/// the child slides past the layout edge: you end up with a rounded card next
/// to a panel whose leading edge is a flat vertical cut, labels clipped at the
/// screen edge, and content sliding out of the gutter. Here the panel is a
/// single rounded rectangle occupying the exact card rect, everything is
/// clipped to that one radius, and travel is capped so the card can never leave
/// its own bounds. The only edge you ever see moving is the card's own corner.
class SwipeRow extends StatefulWidget {
  const SwipeRow({
    required this.child,
    required this.radius,
    this.startAction,
    this.endAction,
    super.key,
  });

  final Widget child;
  final double radius;

  /// Revealed by dragging left-to-right.
  final SwipeAction? startAction;

  /// Revealed by dragging right-to-left.
  final SwipeAction? endAction;

  @override
  State<SwipeRow> createState() => _SwipeRowState();
}

class _SwipeRowState extends State<SwipeRow> with TickerProviderStateMixin {
  late final AnimationController _slide = AnimationController.unbounded(
    vsync: this,
  )..addListener(_onSlide);
  late final AnimationController _collapse = AnimationController(
    vsync: this,
    duration: AppMotion.normal,
  );

  double _offset = 0;
  double _width = 1;
  bool _armed = false;
  bool _busy = false;

  /// Fraction of the card that must be uncovered before the action commits.
  static const double _threshold = .34;

  /// Travel stops here: the label stays fully visible and half the card stays
  /// readable, so you can still see what you are about to act on.
  static const double _maxTravel = .5;

  void _onSlide() => setState(() => _offset = _slide.value);

  @override
  void dispose() {
    _slide
      ..removeListener(_onSlide)
      ..dispose();
    _collapse.dispose();
    super.dispose();
  }

  SwipeAction? get _active => _offset > 0
      ? widget.startAction
      : _offset < 0
      ? widget.endAction
      : null;

  void _update(DragUpdateDetails details) {
    if (_busy) return;
    var next = _offset + details.delta.dx;
    if (next > 0 && widget.startAction == null) next = 0;
    if (next < 0 && widget.endAction == null) next = 0;

    final limit = _width * _maxTravel;
    // Rubber band past the commit point so the drag keeps responding to the
    // finger but signals that there is nothing further to reach.
    if (next.abs() > limit) {
      final excess = next.abs() - limit;
      next = next.sign * (limit + excess * .28);
    }
    _slide.value = next;

    final armed = next.abs() >= _width * _threshold;
    if (armed != _armed) {
      setState(() => _armed = armed);
      if (armed) HapticFeedback.mediumImpact();
    }
  }

  Future<void> _end(DragEndDetails details) async {
    if (_busy) return;
    final velocity = details.velocity.pixelsPerSecond.dx;
    // A fling only counts once the row has actually opened. Without this floor
    // a quick flick that ends back at rest could still commit an action the
    // user had just changed their mind about.
    final flung =
        velocity.abs() > 900 &&
        velocity.sign == _offset.sign &&
        _offset.abs() > _width * .12;
    final action = _active;

    if (action != null && (_armed || flung)) {
      setState(() => _busy = true);
      // Hold the panel open at the commit width while the request runs, so the
      // row never snaps back and forward again on a slow network.
      _settleTo(_offset.sign * _width * _threshold);
      final approved = action.confirm == null || await action.confirm!();
      if (!mounted) return;
      if (approved) {
        final committed = await action.onTriggered();
        if (!mounted) return;
        setState(() => _busy = false);
        if (committed) {
          await _collapse.forward();
          return;
        }
      } else {
        setState(() => _busy = false);
      }
    }
    _settleTo(0);
    if (_armed) setState(() => _armed = false);
  }

  void _settleTo(double target) {
    _slide.animateTo(
      target,
      duration: AppMotion.normal,
      curve: AppMotion.enter,
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final action = _active;
    final radius = BorderRadius.circular(widget.radius);

    return AnimatedBuilder(
      animation: _collapse,
      builder: (context, child) => ClipRect(
        child: Align(
          alignment: Alignment.topCenter,
          heightFactor: 1 - _collapse.value,
          child: Opacity(opacity: 1 - _collapse.value, child: child),
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          _width = constraints.maxWidth;
          final progress = (_offset.abs() / (_width * _threshold)).clamp(
            0.0,
            1.0,
          );
          final fromStart = _offset > 0;

          return GestureDetector(
            behavior: HitTestBehavior.opaque,
            onHorizontalDragUpdate: _update,
            onHorizontalDragEnd: _end,
            onHorizontalDragCancel: () => _settleTo(0),
            // One rounded clip over the whole row. The sliding card meets the
            // same corner radius as the panel behind it, so the moving edge is
            // always a rounded corner and never a flat vertical cut at the
            // page gutter.
            child: ClipRRect(
              borderRadius: radius,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: action == null
                        ? const SizedBox.shrink()
                        : _panel(action, progress, fromStart, c),
                  ),
                  // Kept fully opaque: fading it here would let the action
                  // colour bleed through the card and turn its surface muddy.
                  Transform.translate(
                    offset: Offset(_offset, 0),
                    child: widget.child,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _panel(
    SwipeAction action,
    double progress,
    bool fromStart,
    AppColors c,
  ) {
    final revealed = _offset.abs();
    // Icon and label fade in over the first third of the travel and pop once
    // the action is armed.
    final appear = ((progress - .08) / .3).clamp(0.0, 1.0);
    final scale = .72 + .28 * appear + (_armed ? .1 : 0);

    return AnimatedContainer(
      duration: AppMotion.quick,
      color: _armed
          ? action.color
          : Color.lerp(action.color, c.bg, .28) ?? action.color,
      child: Align(
        alignment: fromStart ? Alignment.centerLeft : Alignment.centerRight,
        child: SizedBox(
          width: revealed,
          child: Center(
            child: OverflowBox(
              maxWidth: double.infinity,
              alignment: Alignment.center,
              child: Opacity(
                opacity: appear,
                child: AnimatedScale(
                  scale: scale,
                  duration: AppMotion.quick,
                  curve: AppMotion.spring,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        height: 40,
                        width: 40,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(
                            alpha: _armed ? .22 : .12,
                          ),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(action.icon, color: Colors.white, size: 22),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        action.label,
                        maxLines: 1,
                        style: font(
                          size: 12,
                          weight: 800,
                          color: Colors.white,
                          height: 1.1,
                          letterSpacing: .2,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// One achievement row: medal, name, what it takes, and how far along it is.
/// Locked levels stay legible rather than being greyed into nothing — there is
/// no penalty for not having reached them.
class AchievementRow extends StatelessWidget {
  const AchievementRow({
    required this.achievement,
    this.dense = false,
    super.key,
  });

  final Achievement achievement;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final (accent, wash) = switch (achievement.tone) {
      AchievementTone.green => (c.green, c.greenWash),
      AchievementTone.blue => (c.blue, c.blueWash),
      AchievementTone.amber => (c.amber, c.amberWash),
      AchievementTone.purple => (c.purple, c.purpleWash),
      AchievementTone.red => (c.red, c.redWash),
    };
    final started = achievement.level > 0;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Medal(
          icon: achievement.icon,
          accent: accent,
          wash: wash,
          level: achievement.level,
          complete: achievement.complete,
          size: dense ? 44 : 52,
        ),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      achievement.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: font(
                        size: dense ? 15 : 16,
                        weight: 800,
                        color: started ? c.ink : c.ink2,
                        height: 1.2,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpace.sm),
                  if (achievement.complete)
                    Icon(Icons.verified_rounded, size: 18, color: accent)
                  else
                    Text(
                      '${achievement.value}/${achievement.target}',
                      style: font(
                        size: 12,
                        weight: 800,
                        color: c.ink3,
                        height: 1.2,
                        tabular: true,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                achievement.complete
                    ? 'Every level unlocked'
                    : achievement.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: font(size: 13, weight: 600, color: c.ink3, height: 1.35),
              ),
              const SizedBox(height: AppSpace.sm),
              ProgressTrack(
                value: achievement.progress,
                color: accent,
                height: 10,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Rounded medal with the level stamped on it once the first tier is passed.
class _Medal extends StatelessWidget {
  const _Medal({
    required this.icon,
    required this.accent,
    required this.wash,
    required this.level,
    required this.complete,
    required this.size,
  });

  final IconData icon;
  final Color accent, wash;
  final int level;
  final bool complete;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final earned = level > 0;
    return SizedBox(
      height: size,
      width: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            height: size,
            width: size,
            decoration: BoxDecoration(
              color: earned ? wash : c.surfaceAlt,
              borderRadius: BorderRadius.circular(size * .34),
              border: Border.all(
                color: earned ? accent.withValues(alpha: .45) : c.line,
                width: 1.5,
              ),
            ),
            child: Icon(
              icon,
              size: size * .46,
              color: earned ? accent : c.ink3,
            ),
          ),
          if (earned)
            Positioned(
              right: -4,
              bottom: -4,
              child: Container(
                height: 20,
                width: 20,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                  border: Border.all(color: c.surface, width: 2),
                ),
                child: complete
                    ? Icon(Icons.star_rounded, size: 11, color: c.surface)
                    : Text(
                        '$level',
                        style: font(
                          size: 11,
                          weight: 900,
                          color: c.onAccent(accent),
                          height: 1,
                        ),
                      ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Composed empty/error view: a large soft mark, a headline, one line of
/// explanation and an optional action. Never a bare centred sentence.
class EmptyState extends StatelessWidget {
  const EmptyState({
    required this.icon,
    required this.title,
    this.message,
    this.action,
    this.tone,
    super.key,
  });

  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final accent = tone ?? c.green;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpace.h1,
          vertical: AppSpace.h2,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 108,
              width: 108,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: .12),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Container(
                  height: 76,
                  width: 76,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: .16),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 34, color: accent),
                ),
              ),
            ),
            const SizedBox(height: AppSpace.xxl),
            Text(
              context.t(title),
              textAlign: TextAlign.center,
              style: AppText.heading(c.ink),
            ),
            if (message != null) ...[
              const SizedBox(height: AppSpace.sm),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 300),
                child: Text(
                  context.t(message!),
                  textAlign: TextAlign.center,
                  style: AppText.bodySoft(c.ink2),
                ),
              ),
            ],
            if (action != null) ...[
              const SizedBox(height: AppSpace.xxl),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

/// Shimmering placeholder rows shaped like the real cards, so the list does not
/// resize when data lands.
class CardSkeleton extends StatefulWidget {
  const CardSkeleton({this.count = 4, super.key});
  final int count;

  @override
  State<CardSkeleton> createState() => _CardSkeletonState();
}

class _CardSkeletonState extends State<CardSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, _) {
        final tint = Color.lerp(c.line, c.surfaceAlt, _pulse.value)!;
        return Column(
          children: [
            for (var index = 0; index < widget.count; index++)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.md),
                child: AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _bar(tint, 132, 20),
                      const SizedBox(height: AppSpace.md),
                      _bar(tint, 210, 14),
                      const SizedBox(height: AppSpace.sm),
                      _bar(tint, 96, 12),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _bar(Color tint, double width, double height) => Container(
    height: height,
    width: width,
    decoration: BoxDecoration(
      color: tint,
      borderRadius: BorderRadius.circular(AppRadius.chip),
    ),
  );
}
