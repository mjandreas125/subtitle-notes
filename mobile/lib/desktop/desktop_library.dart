import 'dart:io';

import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../data.dart';
import '../design/components.dart';
import '../design/tokens.dart';
import '../i18n.dart';
import '../screens/library.dart' show showAchievements;
import '../screens/review.dart';
import 'desktop_updates.dart';
import 'player_settings.dart';

/// The library on a wide screen: sources down the left, cards in the middle,
/// and the selected word opened beside them instead of on a pushed page.
class DesktopLibrary extends StatefulWidget {
  const DesktopLibrary({
    required this.session,
    required this.settings,
    required this.onSettingsChanged,
    required this.onDisconnect,
    this.update,
    this.onInstallUpdate,
    super.key,
  });

  final Session session;
  final AppSettings settings;
  final ValueChanged<AppSettings> onSettingsChanged;
  final VoidCallback onDisconnect;
  final DesktopRelease? update;
  final Future<void> Function()? onInstallUpdate;

  @override
  State<DesktopLibrary> createState() => _DesktopLibraryState();
}

class _DesktopLibraryState extends State<DesktopLibrary> {
  late final SyncApi _api = SyncApi(widget.session);

  List<StudyCard> _cards = const [];
  List<StudyCard> _learned = const [];
  StudyCard? _selected;
  StudyDetail? _detail;
  String? _source;
  String _search = '';
  Object? _error;
  bool _loading = true;
  bool _detailLoading = false;

  StudyStats get _stats => StudyStats.from(_cards, _learned);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _cards.isEmpty;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _api.cards(),
        _api.cards(archived: true),
      ]);
      if (!mounted) return;
      setState(() {
        _cards = results[0];
        _learned = results[1];
      });
    } catch (error) {
      if (mounted && _cards.isEmpty) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(StudyCard card) async {
    setState(() {
      _selected = card;
      _detail = null;
      _detailLoading = true;
    });
    try {
      final detail = await _api.detail(card.id);
      if (mounted && _selected?.id == card.id) setState(() => _detail = detail);
    } catch (_) {
      // The headline card is already on screen; the extras simply stay absent.
    } finally {
      if (mounted) setState(() => _detailLoading = false);
    }
  }

  /// Moves a card into Learned, or back out of it. The archive is the same
  /// list the phone calls Learned; the program could see it and not touch it.
  Future<void> _setLearned(StudyCard card, {required bool learned}) async {
    setState(() {
      _selected = null;
      _detail = null;
    });
    try {
      await _api.setArchived(card.id, archived: learned);
    } catch (_) {
      // The reload below shows whatever actually happened.
    }
    await _load();
  }

  Future<void> _forget(StudyCard card) async {
    final sure = await confirmDestructive(
      context,
      icon: Icons.delete_outline_rounded,
      title: '${context.t('Delete')} “${card.learningLabel}”?',
      message: context.t('The card is removed from every device. This cannot be undone.'),
      confirmLabel: context.t('Delete'),
      cancelLabel: context.t('Keep'),
    );
    if (!sure) return;
    setState(() {
      _selected = null;
      _detail = null;
    });
    try {
      await _api.delete(card.id);
    } catch (_) {
      // Same as above: the list is reloaded either way.
    }
    await _load();
  }

  List<StudyCard> get _visible {
    final query = _search.trim().toLowerCase();
    return _cards.where((card) {
      if (_source != null && card.mediaTitle != _source) return false;
      if (query.isEmpty) return true;
      return card.learningLabel.toLowerCase().contains(query) ||
          card.primaryMeaning.toLowerCase().contains(query) ||
          card.selectedText.toLowerCase().contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      backgroundColor: c.bg,
      body: Column(
        children: [
          _TopBar(
            email: widget.session.email,
            total: _cards.length,
            themeMode: widget.settings.themeMode,
            onToggleTheme: () => widget.onSettingsChanged(
              widget.settings.copyWith(
                themeMode: widget.settings.themeMode == ThemeMode.dark
                    ? ThemeMode.light
                    : ThemeMode.dark,
              ),
            ),
            onReload: _load,
            onDisconnect: widget.onDisconnect,
            onSearch: (value) => setState(() => _search = value),
            update: widget.update,
            onInstallUpdate: widget.onInstallUpdate,
            onOpenFilm: _canOpenFilms ? _openFilm : null,
            onPractise: _cards.isEmpty ? null : _practise,
            onAchievements: _cards.isEmpty && _learned.isEmpty
                ? null
                : () => showAchievements(context, _stats),
          ),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Sidebar(
                  cards: _cards,
                  stats: _stats,
                  selected: _source,
                  onSelect: (value) => setState(() => _source = value),
                ),
                Expanded(child: _grid(c)),
                if (_selected != null)
                  _DetailPanel(
                    card: _selected!,
                    detail: _detail,
                    loading: _detailLoading,
                    learned: _learned.any((one) => one.id == _selected!.id),
                    onLearned: (value) =>
                        _setLearned(_selected!, learned: value),
                    onForget: () => _forget(_selected!),
                    onClose: () => setState(() {
                      _selected = null;
                      _detail = null;
                    }),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Opens a film through the launcher that sets VLC up on the way.
  ///
  /// Without this the program was a library with no way to fill it: somebody
  /// installed it, signed in, and was told that words appear here when a
  /// subtitle is selected in VLC — with nothing to say how VLC comes into it.
  /// The answer was a right-click in Explorer that nobody had been told about.
  /// The practice run, the same one the phone shows. It reads what is due
  /// from the server, so a word answered here is answered everywhere.
  Future<void> _practise() async {
    final done = await Navigator.of(context).push<int>(
      MaterialPageRoute(builder: (_) => ReviewPage(api: _api)),
    );
    if (done != null && done > 0) await _load();
  }

  Future<void> _openFilm() async {
    final beside = File(Platform.resolvedExecutable).parent;
    for (final folder in [beside.parent, beside]) {
      final launcher = File('${folder.path}${Platform.pathSeparator}OpenWithTranslatedVLC.exe');
      if (!launcher.existsSync()) continue;
      try {
        // Detached: the film outlives this window, and the launcher puts up
        // its own file picker when it is started without one.
        await Process.start(launcher.path, const [], mode: ProcessStartMode.detached);
      } catch (_) {
        // Nothing to say that the person cannot see for themselves.
      }
      return;
    }
  }

  /// True when the launcher is installed beside this window. Running from a
  /// checkout there is nothing to start, and a button that does nothing is
  /// worse than no button.
  bool get _canOpenFilms {
    final beside = File(Platform.resolvedExecutable).parent;
    return [beside.parent, beside].any(
      (folder) => File('${folder.path}${Platform.pathSeparator}OpenWithTranslatedVLC.exe').existsSync(),
    );
  }

  Widget _grid(AppColors c) {
    if (_loading && _cards.isEmpty) {
      return const SingleChildScrollView(
        padding: EdgeInsets.all(AppSpace.xxl),
        child: CardSkeleton(count: 5),
      );
    }
    if (_error != null && _cards.isEmpty) {
      return EmptyState(
        icon: Icons.cloud_off_rounded,
        title: context.t('No connection'),
        message: context.t('Subtitle Notes could not reach the cloud library.'),
        tone: c.blue,
        action: PushButton(
          label: context.t('Try again'),
          icon: Icons.refresh_rounded,
          tone: PushTone.blue,
          expand: false,
          onPressed: _load,
        ),
      );
    }
    final cards = _visible;
    if (cards.isEmpty) {
      return EmptyState(
        icon: _search.isEmpty
            ? Icons.subtitles_rounded
            : Icons.search_off_rounded,
        title: context.t(_search.isEmpty ? 'Nothing saved here yet' : 'No matches'),
        message: _search.isEmpty
            ? context.t('Open a film and drag across a word in the subtitle. Ctrl+Alt+S saves selected text from any other program.')
            : context.t('Try a different word.'),
        action: _search.isEmpty && _canOpenFilms
            ? PushButton(
                label: context.t('Open a film'),
                icon: Icons.movie_rounded,
                expand: false,
                onPressed: _openFilm,
              )
            : null,
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        // Cards keep a comfortable reading measure instead of stretching to
        // whatever the window happens to be.
        final columns = (constraints.maxWidth / 340).floor().clamp(1, 4);
        return GridView.builder(
          padding: const EdgeInsets.all(AppSpace.xxl),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            crossAxisSpacing: AppSpace.lg,
            mainAxisSpacing: AppSpace.lg,
            mainAxisExtent: 148,
          ),
          itemCount: cards.length,
          itemBuilder: (context, index) {
            final card = cards[index];
            return _WordCard(
              card: card,
              accent: c.accentFor(card.mediaTitle),
              selected: _selected?.id == card.id,
              onTap: () => _open(card),
            );
          },
        );
      },
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.email,
    required this.total,
    required this.themeMode,
    required this.onToggleTheme,
    required this.onReload,
    required this.onDisconnect,
    required this.onSearch,
    required this.update,
    required this.onInstallUpdate,
    this.onOpenFilm,
    this.onPractise,
    this.onAchievements,
  });

  final String email;
  final int total;
  final ThemeMode themeMode;
  final VoidCallback onToggleTheme, onReload, onDisconnect;

  /// Absent when the launcher is not installed beside this window - running
  /// from a checkout there is nothing to start.
  final VoidCallback? onOpenFilm;

  /// Absent while the library is empty: there is nothing to practise and
  /// nothing to have earned.
  final VoidCallback? onPractise, onAchievements;
  final ValueChanged<String> onSearch;
  final DesktopRelease? update;
  final Future<void> Function()? onInstallUpdate;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpace.xxl,
        vertical: AppSpace.md,
      ),
      decoration: BoxDecoration(
        color: c.surface,
        border: Border(bottom: BorderSide(color: c.line, width: 1.5)),
      ),
      child: Row(
        children: [
          IconTile(
            icon: Icons.subtitles_rounded,
            color: c.onGreen,
            background: c.green,
            size: 34,
          ),
          const SizedBox(width: AppSpace.md),
          Text('Subtitle Notes', style: AppText.word(c.ink)),
          const SizedBox(width: AppSpace.md),
          Pill(label: '$total ${context.t('words')}', color: c.ink3, background: c.surfaceAlt),
          const SizedBox(width: AppSpace.xxl),
          SizedBox(
            width: 280,
            height: 40,
            child: TextField(
              onChanged: onSearch,
              cursorColor: c.green,
              style: font(size: 14, weight: 600, color: c.ink, height: 1.3),
              decoration: InputDecoration(
                isDense: true,
                filled: true,
                fillColor: c.surfaceAlt,
                hintText: context.t('Search your words'),
                hintStyle: font(
                  size: 14,
                  weight: 600,
                  color: c.ink3,
                  height: 1.3,
                ),
                prefixIcon: Icon(Icons.search_rounded, size: 18, color: c.ink3),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpace.md,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.button),
                  borderSide: BorderSide(color: c.line, width: 1.5),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.button),
                  borderSide: BorderSide(color: c.line, width: 1.5),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.button),
                  borderSide: BorderSide(color: c.green, width: 1.8),
                ),
              ),
            ),
          ),
          const Spacer(),
          if (update != null)
            Padding(
              padding: const EdgeInsets.only(right: AppSpace.sm),
              child: PushButton(
                label: '${context.t('Update')} ${update!.version}',
                icon: Icons.system_update_rounded,
                tone: PushTone.blue,
                expand: false,
                compact: true,
                onPressed: onInstallUpdate,
              ),
            ),
          _BarAction(
            icon: themeMode == ThemeMode.dark
                ? Icons.light_mode_rounded
                : Icons.dark_mode_rounded,
            tooltip: context.t('Switch theme'),
            onTap: onToggleTheme,
          ),
          if (onOpenFilm != null)
            _BarAction(
              icon: Icons.movie_rounded,
              tooltip: context.t('Open a film'),
              onTap: onOpenFilm!,
            ),
          if (onPractise != null)
            _BarAction(
              icon: Icons.school_rounded,
              tooltip: context.t('Practice'),
              onTap: onPractise!,
            ),
          if (onAchievements != null)
            _BarAction(
              icon: Icons.workspace_premium_rounded,
              tooltip: context.t('Achievements'),
              onTap: onAchievements!,
            ),
          _BarAction(
            icon: Icons.refresh_rounded,
            tooltip: context.t('Refresh'),
            onTap: onReload,
          ),
          // What the player should do with a film: the settings the VLC
          // overlay reads. They used to live in a separate little window.
          _BarAction(
            icon: Icons.play_circle_rounded,
            tooltip: context.t('Films in VLC'),
            onTap: () => showPlayerSettings(context),
          ),
          const SizedBox(width: AppSpace.md),
          Text(
            email,
            style: font(size: 13, weight: 700, color: c.ink3, height: 1.2),
          ),
          const SizedBox(width: AppSpace.md),
          PushButton(
            label: context.t('Disconnect'),
            tone: PushTone.neutral,
            expand: false,
            compact: true,
            onPressed: () async {
              final confirmed = await confirmDestructive(
                context,
                icon: Icons.link_off_rounded,
                title: context.t('Disconnect this computer?'),
                message: context.t(
                  'VLC will stop sending selections until you pair again. '
                  'Nothing already saved is removed.',
                ),
                confirmLabel: context.t('Disconnect'),
                cancelLabel: context.t('Stay connected'),
              );
              if (confirmed) onDisconnect();
            },
          ),
        ],
      ),
    );
  }
}

class _BarAction extends StatelessWidget {
  const _BarAction({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Tooltip(
    message: tooltip,
    child: Squish(
      onTap: onTap,
      semanticLabel: tooltip,
      child: SizedBox(
        height: 40,
        width: 40,
        child: Icon(icon, size: 19, color: context.c.ink2),
      ),
    ),
  );
}

class _Sidebar extends StatelessWidget {
  const _Sidebar({
    required this.cards,
    required this.stats,
    required this.selected,
    required this.onSelect,
  });

  final List<StudyCard> cards;
  final StudyStats stats;
  final String? selected;
  final ValueChanged<String?> onSelect;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final counts = <String, int>{};
    for (final card in cards) {
      counts[card.mediaTitle] = (counts[card.mediaTitle] ?? 0) + 1;
    }
    final sources = counts.keys.toList()..sort();

    return Container(
      width: 268,
      decoration: BoxDecoration(
        color: c.surface,
        border: Border(right: BorderSide(color: c.line, width: 1.5)),
      ),
      child: ListView(
        padding: const EdgeInsets.all(AppSpace.lg),
        children: [
          _row(
            context,
            label: context.t('All words'),
            count: cards.length,
            accent: c.green,
            active: selected == null,
            onTap: () => onSelect(null),
          ),
          const SizedBox(height: AppSpace.lg),
          Padding(
            padding: const EdgeInsets.only(
              left: AppSpace.sm,
              bottom: AppSpace.sm,
            ),
            child: Text(
              'SOURCES',
              style: font(
                size: 11,
                weight: 800,
                color: c.ink3,
                height: 1.2,
                letterSpacing: 1.1,
              ),
            ),
          ),
          for (final source in sources)
            _row(
              context,
              label: source,
              count: counts[source] ?? 0,
              accent: c.accentFor(source),
              active: selected == source,
              onTap: () => onSelect(source),
            ),
          const SizedBox(height: AppSpace.xxl),
          AppCard(
            padding: const EdgeInsets.all(AppSpace.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'ACHIEVEMENTS',
                  style: font(
                    size: 11,
                    weight: 800,
                    color: c.ink3,
                    height: 1.2,
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(height: AppSpace.md),
                if (stats.nextUp == null)
                  Text('Everything unlocked.', style: AppText.caption(c.ink2))
                else
                  AchievementRow(achievement: stats.nextUp!, dense: true),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(
    BuildContext context, {
    required String label,
    required int count,
    required Color accent,
    required bool active,
    required VoidCallback onTap,
  }) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Squish(
        onTap: onTap,
        scale: .98,
        semanticLabel: label,
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpace.md,
            vertical: AppSpace.md,
          ),
          decoration: BoxDecoration(
            color: active ? c.surfaceAlt : Colors.transparent,
            borderRadius: BorderRadius.circular(AppRadius.small),
            border: Border.all(
              color: active ? c.line : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Container(
                height: 9,
                width: 9,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: font(
                    size: 14,
                    weight: active ? 800 : 700,
                    color: active ? c.ink : c.ink2,
                    height: 1.25,
                  ),
                ),
              ),
              Text(
                '$count',
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
        ),
      ),
    );
  }
}

class _WordCard extends StatelessWidget {
  const _WordCard({
    required this.card,
    required this.accent,
    required this.selected,
    required this.onTap,
  });

  final StudyCard card;
  final Color accent;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return TiltMedallion(
      child: Squish(
        onTap: onTap,
        scale: .98,
        semanticLabel: card.learningLabel,
        child: Container(
          decoration: BoxDecoration(
            color: c.lip,
            borderRadius: BorderRadius.circular(AppRadius.card),
            boxShadow: [
              BoxShadow(
                color: c.ink.withValues(alpha: .16),
                blurRadius: 24,
                offset: const Offset(0, 13),
              ),
              BoxShadow(
                color: Colors.white.withValues(alpha: .45),
                blurRadius: 3,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          padding: const EdgeInsets.only(bottom: AppLip.card + 2),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.card),
            child: BackdropFilter(
              filter: ui.ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      c.surface.withValues(alpha: .87),
                      c.surface.withValues(alpha: .68),
                    ],
                  ),
                  border: Border.all(
                    color: selected ? accent : c.line.withValues(alpha: .82),
                    width: selected ? 2.2 : 1.5,
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.card),
                ),
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: IgnorePointer(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(AppRadius.card),
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.center,
                              colors: [
                                Color(0x54FFFFFF),
                                Color(0x14FFFFFF),
                                Color(0x00FFFFFF),
                              ],
                              stops: [0, .32, .78],
                            ),
                          ),
                        ),
                      ),
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(width: 6, color: accent),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpace.lg),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  card.learningLabel,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppText.word(c.ink),
                                ),
                                const SizedBox(height: AppSpace.xs),
                                Expanded(
                                  child: Text(
                                    card.primaryMeaning,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: font(
                                      size: 14,
                                      weight: 600,
                                      color: c.ink2,
                                      height: 1.4,
                                    ),
                                  ),
                                ),
                                Text(
                                  card.mediaTitle,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: font(
                                    size: 12,
                                    weight: 700,
                                    color: c.ink3,
                                    height: 1.2,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DetailPanel extends StatelessWidget {
  const _DetailPanel({
    required this.card,
    required this.detail,
    required this.loading,
    required this.onClose,
    required this.onLearned,
    required this.onForget,
    required this.learned,
  });

  final StudyCard card;
  final StudyDetail? detail;
  final bool loading;
  final VoidCallback onClose;
  final ValueChanged<bool> onLearned;
  final VoidCallback onForget;
  final bool learned;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final accent = c.accentFor(card.mediaTitle);
    final item = detail;

    return Container(
      width: 380,
      decoration: BoxDecoration(
        color: c.surface,
        border: Border(left: BorderSide(color: c.line, width: 1.5)),
      ),
      child: ListView(
        padding: const EdgeInsets.all(AppSpace.xl),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  card.mediaTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: font(
                    size: 13,
                    weight: 800,
                    color: c.ink3,
                    height: 1.2,
                  ),
                ),
              ),
              // Beside the title rather than under the examples: a card with
              // several senses runs past the bottom of the window, and an
              // action nobody scrolls to is an action nobody has.
              Squish(
                onTap: () => onLearned(!learned),
                semanticLabel: context.t(learned ? 'Back to the library' : 'Learned'),
                child: SizedBox(
                  height: 34,
                  width: 34,
                  child: Icon(
                    learned
                        ? Icons.undo_rounded
                        : Icons.workspace_premium_rounded,
                    size: 18,
                    color: learned ? c.ink3 : c.green,
                  ),
                ),
              ),
              Squish(
                onTap: onForget,
                semanticLabel: context.t('Delete'),
                child: SizedBox(
                  height: 34,
                  width: 34,
                  child: Icon(
                    Icons.delete_outline_rounded,
                    size: 18,
                    color: c.red,
                  ),
                ),
              ),
              Squish(
                onTap: onClose,
                semanticLabel: context.t('Close'),
                child: SizedBox(
                  height: 34,
                  width: 34,
                  child: Icon(Icons.close_rounded, size: 18, color: c.ink3),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          TiltMedallion(
            radius: AppRadius.panel,
            child: Container(
              decoration: BoxDecoration(
                color: accent.withValues(alpha: .78),
                borderRadius: BorderRadius.circular(AppRadius.panel),
                boxShadow: [
                  BoxShadow(
                    color: accent.withValues(alpha: .32),
                    blurRadius: 26,
                    offset: const Offset(0, 14),
                  ),
                  BoxShadow(
                    color: Colors.white.withValues(alpha: .34),
                    blurRadius: 3,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              padding: const EdgeInsets.only(bottom: AppLip.card + 3),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.panel),
                child: BackdropFilter(
                  filter: ui.ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          accent.withValues(alpha: .93),
                          accent.withValues(alpha: .70),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(AppRadius.panel),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: .44),
                        width: 1.5,
                      ),
                    ),
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: IgnorePointer(
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(
                                  AppRadius.panel,
                                ),
                                gradient: const LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.center,
                                  colors: [
                                    Color(0x5CFFFFFF),
                                    Color(0x16FFFFFF),
                                    Color(0x00FFFFFF),
                                  ],
                                  stops: [0, .32, .78],
                                ),
                              ),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(AppSpace.xl),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SelectableText(
                                card.learningLabel,
                                style: font(
                                  size: 26,
                                  weight: 900,
                                  color: c.onAccent(accent),
                                  height: 1.15,
                                  letterSpacing: -.5,
                                ),
                              ),
                              const SizedBox(height: AppSpace.sm),
                              SelectableText(
                                card.primaryMeaning,
                                style: font(
                                  size: 16,
                                  weight: 700,
                                  color: c
                                      .onAccent(accent)
                                      .withValues(alpha: .92),
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          if (card.sourceChips.isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final chip in card.sourceChips)
                  Pill(label: chip, color: c.ink2),
              ],
            ),
          ],
          if (loading) ...[
            const SizedBox(height: AppSpace.h1),
            Center(child: CircularProgressIndicator(color: c.green)),
          ] else if (item != null) ...[
            if (item.selectedText.trim().isNotEmpty &&
                StudyCard.bare(item.selectedText) !=
                    StudyCard.bare(card.learningLabel))
              _block(c, context.t('Selected subtitle'), item.selectedText),
            if (StudyCard.bare(item.translation) !=
                StudyCard.bare(card.primaryMeaning))
              _block(c, context.t('Full translation'), item.translation),
            if (item.variants.isNotEmpty)
              _list(c, context.t('Other meanings'), [
                for (final variant in item.variants)
                  StudyExample(text: variant),
              ]),
            if (item.examples.isNotEmpty) _list(c, context.t('Examples'), item.examples),
          ],

        ],
      ),
    );
  }

  Widget _block(AppColors c, String title, String value) => Padding(
    padding: const EdgeInsets.only(top: AppSpace.lg),
    child: TiltMedallion(
      child: AppCard(
        raised: true,
        padding: const EdgeInsets.all(AppSpace.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: font(size: 12, weight: 800, color: c.ink3, height: 1.2),
            ),
            const SizedBox(height: AppSpace.sm),
            SelectableText(
              value,
              style: font(size: 15, weight: 600, color: c.ink, height: 1.45),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _list(AppColors c, String title, List<StudyExample> values) => Padding(
    padding: const EdgeInsets.only(top: AppSpace.lg),
    child: TiltMedallion(
      child: AppCard(
        raised: true,
        padding: const EdgeInsets.all(AppSpace.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: font(size: 12, weight: 800, color: c.ink3, height: 1.2),
            ),
            const SizedBox(height: AppSpace.md),
            for (var index = 0; index < values.length; index++) ...[
              if (index > 0)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
                  child: Divider(color: c.line, height: 1.5, thickness: 1.5),
                ),
              SelectableText(
                values[index].text,
                style: font(size: 15, weight: 600, color: c.ink, height: 1.45),
              ),
              if (values[index].translation != null) ...[
                const SizedBox(height: 2),
                SelectableText(
                  values[index].translation!,
                  style: font(
                    size: 13,
                    weight: 600,
                    color: c.ink3,
                    height: 1.4,
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    ),
  );
}
