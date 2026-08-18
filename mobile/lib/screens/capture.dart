import 'package:flutter/material.dart';

import '../data.dart';
import '../i18n.dart';
import '../design/components.dart';
import '../design/tokens.dart';

/// Bottom sheet shown when text arrives from another app in review mode.
class CaptureSheet extends StatefulWidget {
  const CaptureSheet({
    required this.api,
    required this.text,
    required this.onClose,
    required this.onSaved,
    super.key,
  });

  final SyncApi api;
  final String text;
  final VoidCallback onClose;
  final VoidCallback onSaved;

  @override
  State<CaptureSheet> createState() => _CaptureSheetState();
}

class _CaptureSheetState extends State<CaptureSheet>
    with SingleTickerProviderStateMixin {
  late final TextEditingController _text = TextEditingController(
    text: widget.text,
  );
  final _title = TextEditingController(text: 'Android selection');
  late final AnimationController _enter = AnimationController(
    vsync: this,
    duration: AppMotion.normal,
  )..forward();

  bool _saving = false;

  @override
  void dispose() {
    _text.dispose();
    _title.dispose();
    _enter.dispose();
    super.dispose();
  }

  Future<void> _close() async {
    await _enter.reverse();
    widget.onClose();
  }

  Future<void> _save() async {
    final selected = _text.text.trim();
    if (selected.isEmpty) return;
    setState(() => _saving = true);
    try {
      await widget.api.capture(text: selected, mediaTitle: _title.text.trim());
      widget.onSaved();
      await _close();
    } on ApiException catch (error) {
      if (!mounted) return;
      final c = context.c;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            backgroundColor: c.red,
            content: Text(
              error.message,
              style: font(size: 15, weight: 700, color: c.onRed, height: 1.3),
            ),
          ),
        );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final curve = CurvedAnimation(parent: _enter, curve: AppMotion.enter);

    return AnimatedBuilder(
      animation: curve,
      builder: (context, child) => Material(
        color: c.scrim.withValues(alpha: c.scrim.a * curve.value),
        child: GestureDetector(
          onTap: _saving ? null : _close,
          behavior: HitTestBehavior.opaque,
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
              AppSpace.lg + MediaQuery.viewInsetsOf(context).bottom,
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
                const SizedBox(height: AppSpace.lg),
                Row(
                  children: [
                    IconTile(
                      icon: Icons.download_done_rounded,
                      color: c.onGreen,
                      background: c.green,
                      size: 38,
                    ),
                    const SizedBox(width: AppSpace.md),
                    Expanded(
                      child: Text(
                        context.t('Save this selection'),
                        style: AppText.word(c.ink),
                      ),
                    ),
                    Squish(
                      onTap: _saving ? null : _close,
                      semanticLabel: context.t('Close'),
                      child: SizedBox(
                        height: 44,
                        width: 44,
                        child: Icon(
                          Icons.close_rounded,
                          color: c.ink3,
                          size: 22,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpace.lg),
                _Field(
                  label: context.t('Selected text'),
                  controller: _text,
                  maxLines: 4,
                  autofocus: false,
                ),
                const SizedBox(height: AppSpace.md),
                _Field(
                  label: context.t('Film, series or source'),
                  controller: _title,
                  maxLines: 1,
                  autofocus: false,
                ),
                const SizedBox(height: AppSpace.xl),
                PushButton(
                  label: context.t('Translate and save'),
                  icon: Icons.auto_awesome_rounded,
                  loading: _saving,
                  onPressed: _save,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.label,
    required this.controller,
    required this.maxLines,
    required this.autofocus,
  });

  final String label;
  final TextEditingController controller;
  final int maxLines;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: AppSpace.xs, bottom: 6),
          child: Text(
            label,
            style: font(size: 13, weight: 800, color: c.ink2, height: 1.2),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(AppRadius.button),
            border: Border.all(color: c.line, width: 1.5),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpace.lg,
            vertical: AppSpace.md,
          ),
          child: TextField(
            controller: controller,
            maxLines: maxLines,
            autofocus: autofocus,
            cursorColor: c.green,
            style: font(size: 16, weight: 600, color: c.ink, height: 1.45),
            decoration: const InputDecoration(
              isDense: true,
              border: InputBorder.none,
              contentPadding: EdgeInsets.zero,
            ),
          ),
        ),
      ],
    );
  }
}
