import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

/// The version carried by the Windows installer.  The updater reads published
/// GitHub Release assets, not a mutable "latest.exe" URL, so a partial upload
/// can never be installed by someone who happens to open the library then.
///
/// Bump it with `AppVersion` in `installer/SubtitleNotes.iss`. Left behind, it
/// makes the program offer to install the version it is already running, over
/// and over - this one had been reading 1.6.3 since the installer was 1.7.7.
const desktopAppVersion = '1.9.1';

class DesktopRelease {
  const DesktopRelease({required this.version, required this.downloadUrl});

  final String version;
  final Uri downloadUrl;
}

class DesktopUpdates {
  static final _releaseApi = Uri.parse(
    'https://api.github.com/repos/mjandreas125/subtitle-notes/releases/latest',
  );

  /// Returns an installer only when its semantic version is newer than this
  /// copy. Failures deliberately resolve to null: opening a word library must
  /// never be held up by GitHub being offline.
  static Future<DesktopRelease?> check() async {
    try {
      final response = await http
          .get(_releaseApi, headers: const {'User-Agent': 'SubtitleNotes'})
          .timeout(const Duration(seconds: 5));
      if (response.statusCode != 200) return null;
      final body = jsonDecode(response.body);
      if (body is! Map) return null;
      final version = _version(body['tag_name']?.toString() ?? '');
      if (version == null || !_isNewer(version, desktopAppVersion)) return null;
      final assets = body['assets'];
      if (assets is! List) return null;
      for (final item in assets.whereType<Map>()) {
        final name = item['name']?.toString() ?? '';
        final url = item['browser_download_url']?.toString() ?? '';
        if (name.startsWith('SubtitleNotesSetup-') && name.endsWith('.exe')) {
          final parsed = Uri.tryParse(url);
          if (parsed != null && parsed.hasScheme) {
            return DesktopRelease(version: version, downloadUrl: parsed);
          }
        }
      }
    } catch (_) {
      // Checking again next time is enough. No desktop notification is needed
      // for a background convenience.
    }
    return null;
  }

  /// Downloads the signed/published Inno Setup installer, starts its silent
  /// update mode, then releases this process so Inno can replace every file.
  /// Windows still shows its normal elevation prompt when the current install
  /// is in Program Files; nothing runs with hidden elevated privileges.
  static Future<void> install(DesktopRelease release) async {
    final client = http.Client();
    try {
      final response = await client
          .send(http.Request('GET', release.downloadUrl))
          .timeout(const Duration(minutes: 3));
      if (response.statusCode != 200) {
        throw HttpException('The update download was not available.');
      }
      final folder = await Directory.systemTemp.createTemp('subtitle-notes-');
      final file = File('${folder.path}${Platform.pathSeparator}SubtitleNotesSetup-${release.version}.exe');
      await response.stream.pipe(file.openWrite());
      await Process.start(
        file.path,
        const ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/CLOSEAPPLICATIONS'],
        mode: ProcessStartMode.detached,
      );
      // Let the installer process claim the executable before this window
      // closes.  Inno then updates the library, helper and extension together.
      await Future<void>.delayed(const Duration(milliseconds: 450));
      exit(0);
    } finally {
      client.close();
    }
  }

  static String? _version(String raw) {
    final match = RegExp(r'(\d+)\.(\d+)\.(\d+)').firstMatch(raw);
    return match == null ? null : '${match.group(1)}.${match.group(2)}.${match.group(3)}';
  }

  static bool _isNewer(String candidate, String current) {
    List<int> parts(String value) => value.split('.').map(int.parse).toList();
    final left = parts(candidate);
    final right = parts(current);
    for (var i = 0; i < 3; i++) {
      if (left[i] != right[i]) return left[i] > right[i];
    }
    return false;
  }
}
