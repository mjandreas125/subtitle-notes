import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../data.dart';
import '../design/components.dart';
import '../design/tokens.dart';
import '../i18n.dart';
import 'desktop_config.dart';

/// First run on Windows: sign in, then write the session where the VLC helper
/// will find it.
///
/// There used to be a second program for this - a small window of its own that
/// showed a code and waited for the phone to approve it. A person who had just
/// installed one program and opened it found no way in at all, because the way
/// in was in the other program. So the sign-in lives here, where the library
/// is, and it leads with Google: a phone is a fine second route, not a
/// requirement for using a computer.
class PairingScreen extends StatefulWidget {
  const PairingScreen({required this.onConnected, this.language = 'en', super.key});

  final ValueChanged<Session> onConnected;

  /// Which language to open the sign-in page in, so it is not a jolt of
  /// English in the middle of a translated program.
  final String language;

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  PairingRequest? _request;
  Timer? _poll;
  String? _error;
  bool _busy = false;
  bool _expired = false;
  bool _sentToBrowser = false;
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
      _sentToBrowser = false;
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

  /// Signing in with Google, from a program that cannot show Google's dialog.
  ///
  /// The browser can, so it is sent to the page that does it, carrying the
  /// pairing code this window is already waiting on. `straight=1` means the
  /// page redirects before it draws: the reader sees Google, not a web page
  /// with one button on it.
  Future<void> _openBrowser() async {
    final request = _request;
    if (request == null) return;
    final page =
        '${defaultApiBase.replaceFirst('/v1', '')}/link'
        '?code=${request.code}&lang=${widget.language}&straight=1';
    try {
      // Not `cmd /c start`: the address carries `&`, which the shell would
      // read as its own and cut the address in half.
      await Process.run('rundll32', ['url.dll,FileProtocolHandler', page]);
      if (mounted) setState(() => _sentToBrowser = true);
    } catch (_) {
      // No browser we can start. The code beside the button still works.
      if (mounted) setState(() => _sentToBrowser = false);
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
      await _switchOnVlcInterface();
      widget.onConnected(session);
    } on ApiException catch (error) {
      // A pairing that the server has forgotten cannot recover by polling.
      if (error.message.contains('expired')) {
        _poll?.cancel();
        if (mounted) setState(() => _expired = true);
      }
    }
  }

  /// VLC answers the translation window only when its small web interface is
  /// switched on. The installer writes that setting, but VLC may have been
  /// installed afterwards or had its settings reset - and the symptom is an
  /// empty window over the film, with nothing to suggest why. This is the same
  /// one-line helper the installer runs, so connecting also repairs it.
  Future<void> _switchOnVlcInterface() async {
    final beside = File(Platform.resolvedExecutable).parent;
    for (final folder in [beside.parent, beside]) {
      final helper = File('${folder.path}${Platform.pathSeparator}TranslatedVLCSyncSetup.exe');
      if (!helper.existsSync()) continue;
      try {
        await Process.run(helper.path, ['--configure-vlc']);
      } catch (_) {
        // VLC not installed, or its settings file is not ours to write. The
        // sign-in itself is what matters here.
      }
      return;
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
            child: LayoutBuilder(
              builder: (context, space) {
                final explanation = _explanation(context, c, pending);
                final panel = SizedBox(width: 360, child: _signInPanel(context, c));
                // A narrow window stacks the two rather than squeezing them:
                // the sign-in is the part that must stay usable.
                if (space.maxWidth < 780) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      explanation,
                      const SizedBox(height: AppSpace.h1),
                      panel,
                    ],
                  );
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: explanation),
                    const SizedBox(width: AppSpace.h2),
                    panel,
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _explanation(BuildContext context, AppColors c, int pending) => Column(
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
      Text(context.t('Connect this computer'), style: AppText.display(c.ink)),
      const SizedBox(height: AppSpace.md),
      Text(
        context.t(
          'Words you select in VLC land in the same library as the ones you save on your phone.',
        ),
        style: AppText.body(c.ink2),
      ),
      const SizedBox(height: AppSpace.sm),
      Text(
        context.t('One account for phone, computer and browser.'),
        style: AppText.bodySoft(c.ink3),
      ),
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
                  '${context.t('Waiting to be sent')}: $pending',
                  style: font(size: 14, weight: 700, color: c.ink2, height: 1.4),
                ),
              ),
            ],
          ),
        ),
      ],
    ],
  );

  Widget _signInPanel(BuildContext context, AppColors c) {
    final request = _request;
    return AppCard(
      raised: true,
      padding: const EdgeInsets.all(AppSpace.xxl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null) ...[
            Center(
              child: IconTile(
                icon: Icons.cloud_off_rounded,
                color: c.red,
                background: c.redWash,
                size: 56,
              ),
            ),
            const SizedBox(height: AppSpace.lg),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: AppText.bodySoft(c.ink2),
            ),
            const SizedBox(height: AppSpace.xl),
            PushButton(
              label: context.t('Try again'),
              icon: Icons.refresh_rounded,
              onPressed: _start,
            ),
          ] else if (_busy || request == null) ...[
            const SizedBox(height: 90),
            Center(child: CircularProgressIndicator(color: c.green)),
            const SizedBox(height: AppSpace.lg),
            Center(
              child: Text(
                context.t('Creating a code…'),
                style: AppText.bodySoft(c.ink3),
              ),
            ),
            const SizedBox(height: 90),
          ] else ...[
            // The way in that needs nothing but this computer.
            PushButton(
              label: context.t('Continue with Google'),
              icon: Icons.open_in_new_rounded,
              onPressed: _openBrowser,
            ),
            const SizedBox(height: AppSpace.md),
            Text(
              context.t(
                _sentToBrowser
                    ? 'Waiting for the phone…'
                    : 'A browser window opens for the sign-in.',
              ),
              textAlign: TextAlign.center,
              style: font(size: 12.5, weight: 600, color: c.ink3, height: 1.35),
            ),
            const SizedBox(height: AppSpace.xl),
            _divider(context, c),
            const SizedBox(height: AppSpace.xl),
            Text(
              context.t('Or approve the code in the phone app'),
              textAlign: TextAlign.center,
              style: font(size: 13, weight: 700, color: c.ink2, height: 1.35),
            ),
            const SizedBox(height: AppSpace.lg),
            // The QR always sits on white: a dark surface behind the modules
            // is the classic reason a scanner refuses to lock on.
            Center(
              child: Container(
                padding: const EdgeInsets.all(AppSpace.md),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppRadius.panel),
                  border: Border.all(color: c.line, width: 1.5),
                ),
                child: QrImageView(
                  data: request.qrPayload,
                  version: QrVersions.auto,
                  size: 152,
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
            ),
            const SizedBox(height: AppSpace.lg),
            Center(
              child: SelectableText(
                request.code,
                style: font(
                  size: 26,
                  weight: 900,
                  color: c.ink,
                  height: 1.2,
                  letterSpacing: 5,
                  tabular: true,
                ),
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            if (_expired)
              PushButton(
                label: context.t('Try again'),
                icon: Icons.refresh_rounded,
                onPressed: _start,
              )
            else
              Center(
                child: Squish(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: request.code));
                    ScaffoldMessenger.of(context)
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        SnackBar(
                          backgroundColor: c.ink,
                          content: Text(
                            context.t('Code copied'),
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
                      context.t('Copy code'),
                      style: font(size: 13, weight: 800, color: c.blue, height: 1.2),
                    ),
                  ),
                ),
              ),
            if (_expired) ...[
              const SizedBox(height: AppSpace.sm),
              Text(
                context.t('The code expired. Ask for a new one.'),
                textAlign: TextAlign.center,
                style: font(size: 12.5, weight: 600, color: c.ink3, height: 1.35),
              ),
            ],
          ],
        ],
      ),
    );
  }

  /// A hairline with a word in it, for the choice between the two ways in.
  Widget _divider(BuildContext context, AppColors c) => Row(
    children: [
      Expanded(child: Container(height: 1, color: c.line)),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
        child: Text(
          context.t('or'),
          style: font(size: 11, weight: 800, color: c.ink3, height: 1, letterSpacing: 1.1),
        ),
      ),
      Expanded(child: Container(height: 1, color: c.line)),
    ],
  );
}
