import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../data.dart';
import '../design/components.dart';
import '../design/tokens.dart';
import 'desktop_config.dart';

/// First run on Windows: show a QR, wait for the phone to approve it, then
/// write the session where the VLC helper will find it.
class PairingScreen extends StatefulWidget {
  const PairingScreen({required this.onConnected, super.key});

  final ValueChanged<Session> onConnected;

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  PairingRequest? _request;
  Timer? _poll;
  String? _error;
  bool _busy = false;
  bool _expired = false;
  int _secondsLeft = 0;

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _start() async {
    _poll?.cancel();
    setState(() {
      _busy = true;
      _error = null;
      _expired = false;
      _request = null;
    });
    try {
      final request = await SyncApi.startPairing(
        baseUrl: defaultApiBase,
        deviceName: Platform.localHostname,
      );
      if (!mounted) return;
      setState(() {
        _request = request;
        _busy = false;
        // The server gives the code ten minutes.
        _secondsLeft = 600;
      });
      _poll = Timer.periodic(const Duration(seconds: 2), (_) => _tick());
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _busy = false;
        });
      }
    }
  }

  Future<void> _tick() async {
    final request = _request;
    if (request == null) return;
    setState(() => _secondsLeft = (_secondsLeft - 2).clamp(0, 600));
    if (_secondsLeft == 0) {
      _poll?.cancel();
      setState(() => _expired = true);
      return;
    }
    try {
      final session = await SyncApi.pollPairing(request);
      if (session == null || !mounted) return;
      _poll?.cancel();
      DesktopConfig.save(session);
      await _flushOutbox(session);
      widget.onConnected(session);
    } on ApiException catch (error) {
      // A pairing that the server has forgotten cannot recover by polling.
      if (error.message.contains('expired')) {
        _poll?.cancel();
        if (mounted) setState(() => _expired = true);
      }
    }
  }

  /// Sends anything the VLC helper captured before this computer was
  /// connected, so the first sign-in is not also the first data loss.
  Future<void> _flushOutbox(Session session) async {
    final outbox = DesktopConfig.outbox;
    if (!outbox.existsSync()) return;
    final api = SyncApi(session);
    final remaining = <String>[];
    for (final line in outbox.readAsLinesSync()) {
      if (line.trim().isEmpty) continue;
      try {
        final payload = jsonDecode(line);
        if (payload is! Map<String, dynamic>) continue;
        await api.postSelection(payload);
      } catch (_) {
        remaining.add(line);
      }
    }
    try {
      if (remaining.isEmpty) {
        outbox.deleteSync();
      } else {
        outbox.writeAsStringSync('${remaining.join('\n')}\n');
      }
    } catch (_) {
      // A locked file is not worth failing the sign-in over.
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final pending = DesktopConfig.pendingCount();

    return Scaffold(
      backgroundColor: c.bg,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpace.h2),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 940),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: _explanation(c, pending)),
                const SizedBox(width: AppSpace.h2),
                SizedBox(width: 360, child: _codePanel(c)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _explanation(AppColors c, int pending) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          IconTile(
            icon: Icons.subtitles_rounded,
            color: c.onGreen,
            background: c.green,
            size: 44,
          ),
          const SizedBox(width: AppSpace.md),
          Text('Subtitle Notes', style: AppText.heading(c.ink)),
        ],
      ),
      const SizedBox(height: AppSpace.xxl),
      Text('Connect this computer', style: AppText.display(c.ink)),
      const SizedBox(height: AppSpace.md),
      Text(
        'Words you select in VLC land in the same library as the ones you save '
        'on your phone. Scan the code once and this computer stays connected.',
        style: AppText.body(c.ink2),
      ),
      const SizedBox(height: AppSpace.h1),
      _step(c, 1, 'Open Subtitle Notes on your phone'),
      _step(c, 2, 'Go to You → Connected devices → Connect a device'),
      _step(c, 3, 'Point the camera at the code, or type it in'),
      if (pending > 0) ...[
        const SizedBox(height: AppSpace.xxl),
        AppCard(
          color: c.amberWash,
          borderColor: c.amber.withValues(alpha: .35),
          child: Row(
            children: [
              Icon(Icons.inventory_2_rounded, color: c.amberLip, size: 20),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Text(
                  pending == 1
                      ? '1 selection is waiting to be sent. It will go up as '
                            'soon as you connect.'
                      : '$pending selections are waiting to be sent. They will '
                            'go up as soon as you connect.',
                  style: font(
                    size: 14,
                    weight: 700,
                    color: c.ink2,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    ],
  );

  Widget _step(AppColors c, int number, String text) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpace.md),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 26,
          width: 26,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: c.greenWash,
            shape: BoxShape.circle,
            border: Border.all(color: c.green.withValues(alpha: .4), width: 1.5),
          ),
          child: Text(
            '$number',
            style: font(size: 13, weight: 900, color: c.green, height: 1),
          ),
        ),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Text(text, style: AppText.bodySoft(c.ink)),
          ),
        ),
      ],
    ),
  );

  Widget _codePanel(AppColors c) {
    final request = _request;
    return AppCard(
      raised: true,
      padding: const EdgeInsets.all(AppSpace.xxl),
      child: Column(
        children: [
          if (_error != null) ...[
            IconTile(
              icon: Icons.cloud_off_rounded,
              color: c.red,
              background: c.redWash,
              size: 56,
            ),
            const SizedBox(height: AppSpace.lg),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: AppText.bodySoft(c.ink2),
            ),
            const SizedBox(height: AppSpace.xl),
            PushButton(
              label: 'Try again',
              icon: Icons.refresh_rounded,
              onPressed: _start,
            ),
          ] else if (_busy || request == null) ...[
            const SizedBox(height: 90),
            Center(child: CircularProgressIndicator(color: c.green)),
            const SizedBox(height: AppSpace.lg),
            Text('Creating a code…', style: AppText.bodySoft(c.ink3)),
            const SizedBox(height: 90),
          ] else ...[
            // The QR always sits on white: a dark surface behind the modules
            // is the classic reason a scanner refuses to lock on.
            Container(
              padding: const EdgeInsets.all(AppSpace.lg),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppRadius.panel),
                border: Border.all(color: c.line, width: 1.5),
              ),
              child: QrImageView(
                data: request.qrPayload,
                version: QrVersions.auto,
                size: 216,
                gapless: true,
                backgroundColor: Colors.white,
                eyeStyle: const QrEyeStyle(
                  eyeShape: QrEyeShape.square,
                  color: Color(0xff20302a),
                ),
                dataModuleStyle: const QrDataModuleStyle(
                  dataModuleShape: QrDataModuleShape.square,
                  color: Color(0xff20302a),
                ),
              ),
            ),
            const SizedBox(height: AppSpace.xl),
            Text(
              'OR TYPE THIS CODE',
              style: font(
                size: 11,
                weight: 800,
                color: c.ink3,
                height: 1.2,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            SelectableText(
              request.code,
              style: font(
                size: 30,
                weight: 900,
                color: c.ink,
                height: 1.2,
                letterSpacing: 6,
                tabular: true,
              ),
            ),
            const SizedBox(height: AppSpace.lg),
            if (_expired)
              PushButton(
                label: 'Create a new code',
                icon: Icons.refresh_rounded,
                onPressed: _start,
              )
            else
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    height: 14,
                    width: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: c.green,
                    ),
                  ),
                  const SizedBox(width: AppSpace.sm),
                  Text(
                    'Waiting for your phone · ${_clock(_secondsLeft)}',
                    style: font(
                      size: 13,
                      weight: 700,
                      color: c.ink3,
                      height: 1.2,
                    ),
                  ),
                ],
              ),
            const SizedBox(height: AppSpace.sm),
            Squish(
              onTap: () {
                Clipboard.setData(ClipboardData(text: request.code));
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(
                    SnackBar(
                      backgroundColor: c.ink,
                      content: Text(
                        'Code copied',
                        style: font(
                          size: 15,
                          weight: 700,
                          color: c.surface,
                          height: 1.3,
                        ),
                      ),
                    ),
                  );
              },
              child: Padding(
                padding: const EdgeInsets.all(AppSpace.sm),
                child: Text(
                  'Copy code',
                  style: font(
                    size: 13,
                    weight: 800,
                    color: c.blue,
                    height: 1.2,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _clock(int seconds) =>
      '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';
}
