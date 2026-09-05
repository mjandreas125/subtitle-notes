import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data.dart';
import '../i18n.dart';
import '../design/components.dart';
import '../design/tokens.dart';

/// Choosing a public handle. Shown once after the first sign-in, and reachable
/// again from the profile.
///
/// The nickname is how friends find each other, so it is asked for plainly
/// rather than derived from the Google name - an e-mail-shaped handle is
/// something people would not want shown in a feed.
class NicknameSheet extends StatefulWidget {
  const NicknameSheet({
    required this.api,
    required this.profile,
    required this.onSaved,
    required this.onClose,
    this.firstTime = false,
    super.key,
  });

  final SyncApi api;
  final Profile profile;
  final ValueChanged<Profile> onSaved;
  final VoidCallback onClose;
  final bool firstTime;

  @override
  State<NicknameSheet> createState() => _NicknameSheetState();
}

class _NicknameSheetState extends State<NicknameSheet>
    with SingleTickerProviderStateMixin {
  late final TextEditingController _field = TextEditingController(
    text: widget.profile.nickname ?? _suggestion(),
  );
  late final AnimationController _enter = AnimationController(
    vsync: this,
    duration: AppMotion.normal,
  )..forward();

  bool _busy = false;
  String? _error;

  /// A first guess from the account name, cleaned to the allowed characters.
  String _suggestion() {
    final source = widget.profile.displayName.isNotEmpty
        ? widget.profile.displayName
        : widget.profile.email.split('@').first;
    final cleaned = source
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9_.]'), '')
        .replaceAll(RegExp(r'^[._]+|[._]+$'), '');
    return cleaned.length >= 3 ? cleaned.substring(0, cleaned.length.clamp(0, 20)) : '';
  }

  @override
  void initState() {
    super.initState();
    _field.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _field.dispose();
    _enter.dispose();
    super.dispose();
  }

  /// Mirrors the server's rule so the reason is shown while typing, not after
  /// a round trip.
  String? get _localProblem {
    final value = _field.text.trim();
    if (value.length < 3) return 'At least 3 characters';
    if (value.length > 20) return 'At most 20 characters';
    if (!RegExp(r'^[A-Za-z0-9_.]+$').hasMatch(value)) {
      return 'Letters, numbers, dots and underscores only';
    }
    return null;
  }

  Future<void> _save() async {
    if (_localProblem != null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final profile = await widget.api.updateProfile(nickname: _field.text.trim());
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      widget.onSaved(profile);
      await _enter.reverse();
      widget.onClose();
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _busy = false;
        });
      }
    }
  }

  Future<void> _close() async {
    await _enter.reverse();
    widget.onClose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final curve = CurvedAnimation(parent: _enter, curve: AppMotion.enter);
    final problem = _error ?? (_field.text.isEmpty ? null : _localProblem);
    final ready = _localProblem == null && !_busy;

    return AnimatedBuilder(
      animation: curve,
      builder: (context, child) => Material(
        color: c.scrim.withValues(alpha: c.scrim.a * curve.value),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          // A first-run nickname cannot be dismissed by tapping away: leaving
          // it unset means nobody can find you, which is not a state to fall
          // into by accident.
          onTap: widget.firstTime || _busy ? null : _close,
          child: Align(
            alignment: Alignment.bottomCenter,
            child: FractionalTranslation(
              translation: Offset(0, 1 - curve.value),
              child: GestureDetector(onTap: () {}, child: child),
            ),
          ),
        ),
      ),
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: c.bg,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(AppRadius.sheet),
          ),
          border: Border(top: BorderSide(color: c.line, width: 1.5)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              AppSpace.gutter,
              AppSpace.md,
              AppSpace.gutter,
              AppSpace.xl + MediaQuery.viewInsetsOf(context).bottom,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    height: 5,
                    width: 44,
                    decoration: BoxDecoration(
                      color: c.line,
                      borderRadius: BorderRadius.circular(AppRadius.chip),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpace.xl),
                Center(
                  child: IconTile(
                    icon: Icons.alternate_email_rounded,
                    color: c.onPurple,
                    background: c.purple,
                    size: 60,
                  ),
                ),
                const SizedBox(height: AppSpace.lg),
                Text(
                  widget.firstTime ? 'Pick a nickname' : 'Change your nickname',
                  textAlign: TextAlign.center,
                  style: AppText.heading(c.ink),
                ),
                const SizedBox(height: AppSpace.sm),
                Text(
                  context.t('This is how friends find you. Your e-mail is never shown to anyone.'),
                  textAlign: TextAlign.center,
                  style: AppText.bodySoft(c.ink2),
                ),
                const SizedBox(height: AppSpace.xl),
                Container(
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(AppRadius.button),
                    border: Border.all(
                      color: problem != null
                          ? c.red
                          : ready
                          ? c.green
                          : c.line,
                      width: 1.8,
                    ),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpace.lg,
                    vertical: AppSpace.xs,
                  ),
                  child: Row(
                    children: [
                      Text(
                        '@',
                        style: font(
                          size: 20,
                          weight: 800,
                          color: c.ink3,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: TextField(
                          controller: _field,
                          autofocus: true,
                          autocorrect: false,
                          enableSuggestions: false,
                          maxLength: 20,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => ready ? _save() : null,
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                              RegExp(r'[A-Za-z0-9_.]'),
                            ),
                          ],
                          cursorColor: c.green,
                          style: font(
                            size: 20,
                            weight: 800,
                            color: c.ink,
                            height: 1.4,
                          ),
                          decoration: InputDecoration(
                            counterText: '',
                            border: InputBorder.none,
                            hintText: 'nickname',
                            hintStyle: font(
                              size: 20,
                              weight: 800,
                              color: c.ink3.withValues(alpha: .5),
                              height: 1.4,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                if (problem != null) ...[
                  const SizedBox(height: AppSpace.sm),
                  Text(
                    problem,
                    textAlign: TextAlign.center,
                    style: font(
                      size: 13,
                      weight: 700,
                      color: c.red,
                      height: 1.4,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpace.xl),
                PushButton(
                  label: widget.firstTime ? 'Continue' : 'Save',
                  icon: Icons.check_rounded,
                  loading: _busy,
                  onPressed: ready ? _save : null,
                ),
                if (!widget.firstTime) ...[
                  const SizedBox(height: AppSpace.sm),
                  PushButton(
                    label: context.t('Cancel'),
                    tone: PushTone.ghost,
                    onPressed: _busy ? null : _close,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
