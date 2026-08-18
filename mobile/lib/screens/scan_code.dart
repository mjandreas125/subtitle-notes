import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../data.dart';
import '../i18n.dart';
import '../design/components.dart';
import '../design/tokens.dart';

/// Camera view for reading the pairing code shown on a computer. Pops with the
/// raw scanned value; the caller decides what to do with it.
class ScanCodePage extends StatefulWidget {
  const ScanCodePage({super.key});

  @override
  State<ScanCodePage> createState() => _ScanCodePageState();
}

class _ScanCodePageState extends State<ScanCodePage> {
  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );
  bool _handled = false;
  bool _failed = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue;
      if (value == null || PairingRequest.codeFrom(value) == null) continue;
      _handled = true;
      HapticFeedback.mediumImpact();
      Navigator.pop(context, value);
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Positioned.fill(
            child: MobileScanner(
              controller: _controller,
              onDetect: _onDetect,
              errorBuilder: (context, error) {
                // Runs when the camera is refused or unavailable; typing the
                // code stays possible on the previous screen.
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted && !_failed) setState(() => _failed = true);
                });
                return const SizedBox.shrink();
              },
            ),
          ),
          if (_failed)
            Positioned.fill(
              child: ColoredBox(
                color: c.bg,
                child: EmptyState(
                  icon: Icons.no_photography_rounded,
                  title: context.t('No camera access'),
                  message: context.t('Allow the camera in Android settings, or go back and type the eight-character code instead.'),
                  tone: c.amber,
                  action: PushButton(
                    label: context.t('Back'),
                    expand: false,
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
              ),
            )
          else ...[
            // A cut-out frame is the only instruction a scanner needs.
            Center(
              child: Container(
                height: 248,
                width: 248,
                decoration: BoxDecoration(
                  border: Border.all(color: c.greenBright, width: 3),
                  borderRadius: BorderRadius.circular(AppRadius.panel),
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpace.xxl),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        context.t('Point at the code on your computer'),
                        textAlign: TextAlign.center,
                        style: font(
                          size: 17,
                          weight: 800,
                          color: Colors.white,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: AppSpace.xl),
                      PushButton(
                        label: context.t('Type the code instead'),
                        tone: PushTone.neutral,
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
          Positioned(
            top: 0,
            left: 0,
            child: SafeArea(
              child: Squish(
                onTap: () => Navigator.pop(context),
                semanticLabel: context.t('Close the scanner'),
                child: Container(
                  margin: const EdgeInsets.all(AppSpace.md),
                  height: 44,
                  width: 44,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: .45),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.close_rounded,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
