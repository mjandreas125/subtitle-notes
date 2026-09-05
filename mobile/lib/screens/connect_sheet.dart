import 'package:flutter/material.dart';

import '../data.dart';
import '../i18n.dart';
import '../design/components.dart';
import '../design/tokens.dart';

/// Shown when a pairing code arrives from outside the app - scanned with the
/// phone's own camera, or tapped as a link. Connecting is always a deliberate
/// confirmation, never automatic: a QR someone else shows you should not be
/// able to attach their computer to your library silently.
class ConnectSheet extends StatefulWidget {
  const ConnectSheet({
    required this.api,
    required this.code,
    required this.onClose,
    super.key,
  });

  final SyncApi api;
  final String code;
  final VoidCallback onClose;

  @override
  State<ConnectSheet> createState() => _ConnectSheetState();
}

class _ConnectSheetState extends State<ConnectSheet>
    with SingleTickerProviderStateMixin {
  late final AnimationController _enter = AnimationController(
    vsync: this,
    duration: AppMotion.normal,
  )..forward();

  bool _busy = false;
  bool _done = false;
  String? _error;

  @override
  void dispose() {
    _enter.dispose();
    super.dispose();
  }

  Future<void> _close() async {
    await _enter.reverse();
    widget.onClose();
  }

  Future<void> _connect() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.approvePairing(widget.code);
      if (!mounted) return;
      setState(() {
        _done = true;
        _busy = false;
      });
      await Future.delayed(const Duration(milliseconds: 1400));
      if (mounted) await _close();
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _busy = false;
        });
      }
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
          behavior: HitTestBehavior.opaque,
          onTap: _busy ? null : _close,
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
            padding: const EdgeInsets.fromLTRB(
              AppSpace.gutter,
              AppSpace.md,
              AppSpace.gutter,
              AppSpace.xl,
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
                    icon: _done
                        ? Icons.check_circle_rounded
                        : Icons.laptop_mac_rounded,
                    color: _done ? c.green : c.blue,
                    background: _done ? c.greenWash : c.blueWash,
                    size: 64,
                  ),
                ),
                const SizedBox(height: AppSpace.lg),
                Text(
                  _done ? 'Computer connected' : 'Connect this computer?',
                  textAlign: TextAlign.center,
                  style: AppText.heading(c.ink),
                ),
                const SizedBox(height: AppSpace.sm),
                Text(
                  _done
                      ? 'Words you select in VLC now land in this library.'
                      : 'Code ${widget.code} came from a Subtitle Notes window. '
                            'It can then send words into your library.',
                  textAlign: TextAlign.center,
                  style: AppText.bodySoft(c.ink2),
                ),
                if (_error != null) ...[
                  const SizedBox(height: AppSpace.md),
                  Text(
                    _error!,
                    textAlign: TextAlign.center,
                    style: font(
                      size: 14,
                      weight: 700,
                      color: c.red,
                      height: 1.4,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpace.xl),
                if (!_done) ...[
                  PushButton(
                    label: context.t('Connect'),
                    icon: Icons.link_rounded,
                    loading: _busy,
                    onPressed: _connect,
                  ),
                  const SizedBox(height: AppSpace.sm),
                  PushButton(
                    label: context.t('Not now'),
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
