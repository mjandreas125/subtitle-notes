import 'package:flutter/material.dart';

import '../data.dart';
import '../design/components.dart';
import '../design/tokens.dart';
import 'desktop_updates.dart';

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
        title: 'No connection',
        message: 'Subtitle Notes could not reach the cloud library.',
        tone: c.blue,
        action: PushButton(
          label: 'Try again',
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
        title: _search.isEmpty ? 'Nothing saved here yet' : 'No matches',
        message: _search.isEmpty
            ? 'Select a subtitle line in VLC and it appears here.'
            : 'Try a different word.',
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
  });

  final String email;
  final int total;
  final ThemeMode themeMode;
  final VoidCallback onToggleTheme, onReload, onDisconnect;
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
          Pill(label: '$total words', color: c.ink3, background: c.surfaceAlt),
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
                hintText: 'Search your words',
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
                label: 'Update ${update!.version}',
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
            tooltip: 'Switch theme',
            onTap: onToggleTheme,
          ),
          _BarAction(
            icon: Icons.refresh_rounded,
            tooltip: 'Refresh',
            onTap: onReload,
          ),
          const SizedBox(width: AppSpace.md),
          Text(
            email,
            style: font(size: 13, weight: 700, color: c.ink3, height: 1.2),
          ),
          const SizedBox(width: AppSpace.md),
          PushButton(
            label: 'Disconnect',
            tone: PushTone.neutral,
            expand: false,
            compact: true,
            onPressed: () async {
              final confirmed = await confirmDestructive(
                context,
                icon: Icons.link_off_rounded,
                title: 'Disconnect this computer?',
                message:
                    'VLC will stop sending selections until you pair again. '
                    'Nothing already saved is removed.',
                confirmLabel: 'Disconnect',
                cancelLabel: 'Stay connected',
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
            label: 'All words',
            count: cards.length,
            accent: c.green,
            active: selected == null,
            onTap: () => onSelect(null),
          ),
          const SizedBox(height: AppSpace.lg),
          Padding(
            padding: const EdgeInsets.only(left: AppSpace.sm, bottom: AppSpace.sm),
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
                  Text(
                    'Everything unlocked.',
                    style: AppText.caption(c.ink2),
                  )
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
                decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
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
    return Squish(
      onTap: onTap,
      scale: .98,
      semanticLabel: card.learningLabel,
      child: Container(
        decoration: BoxDecoration(
          color: c.lip,
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
        padding: const EdgeInsets.only(bottom: AppLip.card),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.card),
          child: Container(
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(AppRadius.card),
              border: Border.all(
                color: selected ? accent : c.line,
                width: selected ? 2 : 1.5,
              ),
            ),
            child: Row(
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
  });

  final StudyCard card;
  final StudyDetail? detail;
  final bool loading;
  final VoidCallback onClose;

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
              Squish(
                onTap: onClose,
                semanticLabel: 'Close',
                child: SizedBox(
                  height: 34,
                  width: 34,
                  child: Icon(Icons.close_rounded, size: 18, color: c.ink3),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpace.xl),
            decoration: BoxDecoration(
              color: accent,
              borderRadius: BorderRadius.circular(AppRadius.panel),
            ),
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
                    color: c.onAccent(accent).withValues(alpha: .92),
                    height: 1.4,
                  ),
                ),
              ],
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
              _block(c, 'Selected subtitle', item.selectedText),
            if (StudyCard.bare(item.translation) !=
                StudyCard.bare(card.primaryMeaning))
              _block(c, 'Full translation', item.translation),
            if (item.variants.isNotEmpty)
              _list(c, 'Other meanings', [
                for (final variant in item.variants)
                  StudyExample(text: variant),
              ]),
            if (item.examples.isNotEmpty)
              _list(c, 'Examples', item.examples),
          ],
        ],
      ),
    );
  }

  Widget _block(AppColors c, String title, String value) => Padding(
    padding: const EdgeInsets.only(top: AppSpace.lg),
    child: AppCard(
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
  );

  Widget _list(AppColors c, String title, List<StudyExample> values) => Padding(
    padding: const EdgeInsets.only(top: AppSpace.lg),
    child: AppCard(
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
                style: font(size: 13, weight: 600, color: c.ink3, height: 1.4),
              ),
            ],
          ],
        ],
      ),
    ),
  );
}
