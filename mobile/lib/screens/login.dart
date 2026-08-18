import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../data.dart';
import '../i18n.dart';
import '../design/components.dart';
import '../design/tokens.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({required this.onAuthenticated, super.key});
  final ValueChanged<Session> onAuthenticated;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _server = TextEditingController(text: defaultApiBase);
  bool _busy = false;
  PairingRequest? _pairing;
  String? _pairingNote;

  @override
  void dispose() {
    _server.dispose();
    super.dispose();
  }

  Future<void> _signInWithGoogle() async {
    setState(() => _busy = true);
    try {
      await GoogleSignIn.instance.initialize(
        serverClientId: googleServerClientId,
      );
      if (!GoogleSignIn.instance.supportsAuthenticate()) {
        throw ApiException('Google sign-in is not supported on this device.');
      }
      final account = await GoogleSignIn.instance.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw ApiException('Google did not return an identity token.');
      }
      final session = await SyncApi.authenticateGoogle(
        baseUrl: _server.text,
        idToken: idToken,
      );
      await SessionStore.save(session);
      if (mounted) widget.onAuthenticated(session);
    } on ApiException catch (error) {
      _report(error.message);
    } on GoogleSignInException catch (error) {
      // Swallowing every failure as "cancelled" hid the one that actually
      // happens: Google refuses an app whose package and signing certificate
      // it has never been told about, and the person is left guessing.
      _report(
        error.code == GoogleSignInExceptionCode.canceled
            ? 'Sign-in cancelled.'
            : 'Google refused this build (${error.code.name}). '
                  'Use "Use a code" below instead.',
      );
    } catch (error) {
      _report('Sign-in failed: $error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// A way in that does not depend on Google: this phone asks the server for a
  /// code, and any device already signed in confirms it. It is what you need
  /// after a reinstall, on a second phone, or when Google sign-in refuses on a
  /// particular device.
  Future<void> _connectWithCode() async {
    setState(() {
      _busy = true;
      _pairingNote = null;
    });
    try {
      final request = await SyncApi.startPairing(
        baseUrl: _server.text,
        deviceName: 'Phone',
      );
      if (!mounted) return;
      setState(() {
        _pairing = request;
        _pairingNote = 'Waiting for confirmation…';
      });
      final deadline = DateTime.now().add(const Duration(minutes: 10));
      while (mounted && _pairing != null && DateTime.now().isBefore(deadline)) {
        await Future<void>.delayed(const Duration(seconds: 2));
        if (!mounted || _pairing == null) return;
        final session = await SyncApi.pollPairing(request);
        if (session == null) continue;
        await SessionStore.save(session);
        if (mounted) widget.onAuthenticated(session);
        return;
      }
      if (mounted && _pairing != null) {
        setState(() => _pairingNote = 'The code expired. Ask for a new one.');
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _pairingNote = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _report(String message) {
    if (!mounted) return;
    final c = context.c;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          backgroundColor: c.red,
          content: Text(
            message,
            style: font(size: 15, weight: 700, color: c.onRed, height: 1.3),
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: IntrinsicHeight(
                child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpace.xxl,
                  AppSpace.xxl,
                  AppSpace.xxl,
                  AppSpace.xxl,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Spacer(),
                    const Center(child: _Mark()),
                    const SizedBox(height: AppSpace.h1),
                    Text(
                      context.t('Subtitle\\nNotes'),
                      textAlign: TextAlign.center,
                      style: AppText.display(c.ink),
                    ),
                    const SizedBox(height: AppSpace.md),
                    Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 300),
                        child: Text(
                          context.t('Every word you stop to look up, kept in one place and translated where you found it.'),
                          textAlign: TextAlign.center,
                          style: AppText.bodySoft(c.ink2),
                        ),
                      ),
                    ),
                    const Spacer(),
                    // The sign-in block stands on its own, well clear of the
                    // sentence above it.
                    const SizedBox(height: AppSpace.h1),
                    PushButton(
                      label: context.t('Continue with Google'),
                      icon: Icons.login_rounded,
                      loading: _busy,
                      onPressed: _signInWithGoogle,
                    ),
                    const SizedBox(height: AppSpace.md),
                    if (_pairing == null)
                      Center(
                        child: TextButton(
                          onPressed: _busy ? null : _connectWithCode,
                          child: Text(
                            context.t('Already signed in elsewhere? Use a code'),
                            style: font(
                              size: 14.5,
                              weight: 700,
                              color: c.ink2,
                              height: 1.3,
                            ),
                          ),
                        ),
                      )
                    else
                      AppCard(
                        child: Column(
                          children: [
                            Text(
                              _pairing!.code,
                              style: font(
                                size: 30,
                                weight: 900,
                                color: c.ink,
                                height: 1.1,
                              ),
                            ),
                            const SizedBox(height: AppSpace.sm),
                            Text(
                              context.t('Type this code on a device that is already signed in: Settings → Connected devices.'),
                              textAlign: TextAlign.center,
                              style: AppText.caption(c.ink2),
                            ),
                            if (_pairingNote != null) ...[
                              const SizedBox(height: AppSpace.sm),
                              Text(
                                _pairingNote!,
                                textAlign: TextAlign.center,
                                style: AppText.caption(c.ink3),
                              ),
                            ],
                            const SizedBox(height: AppSpace.md),
                            PushButton(
                              label: context.t('Cancel'),
                              tone: PushTone.ghost,
                              onPressed: () => setState(() {
                                _pairing = null;
                                _pairingNote = null;
                              }),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: AppSpace.lg),
                    Text(
                      context.t('One account connects your phone, computer and browser. No password to remember.'),
                      textAlign: TextAlign.center,
                      style: AppText.caption(c.ink3),
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

/// Three stacked cards standing in for a saved word — the app's own mark
/// rather than a stock book glyph in a circle.
class _Mark extends StatelessWidget {
  const _Mark();

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return SizedBox(
      height: 128,
      width: 168,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Transform.rotate(
            angle: -.14,
            child: Transform.translate(
              offset: const Offset(-26, 8),
              child: _Chip(color: c.blue, width: 96, height: 62),
            ),
          ),
          Transform.rotate(
            angle: .12,
            child: Transform.translate(
              offset: const Offset(28, 4),
              child: _Chip(color: c.amber, width: 96, height: 62),
            ),
          ),
          _Chip(
            color: c.green,
            width: 112,
            height: 74,
            child: Icon(
              Icons.subtitles_rounded,
              color: c.onGreen,
              size: 34,
            ),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.color,
    required this.width,
    required this.height,
    this.child,
  });

  final Color color;
  final double width, height;
  final Widget? child;

  @override
  Widget build(BuildContext context) => Container(
    height: height,
    width: width,
    decoration: BoxDecoration(
      color: Color.lerp(color, Colors.black, .2),
      borderRadius: BorderRadius.circular(AppRadius.panel),
    ),
    padding: const EdgeInsets.only(bottom: AppLip.button),
    child: Container(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(AppRadius.panel),
      ),
      child: child == null ? null : Center(child: child),
    ),
  );
}
